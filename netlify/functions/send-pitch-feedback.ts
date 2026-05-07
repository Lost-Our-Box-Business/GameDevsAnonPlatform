import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FEEDBACK_FIELDS = [
  { key: 'feasibility', label: 'Feasibility' },
  { key: 'originality', label: 'Originality' },
  { key: 'money_potential', label: 'Money-Making Potential' },
  { key: 'fun_to_play', label: 'Fun to Play' },
  { key: 'fun_to_make', label: 'Fun to Make' },
  { key: 'pitching_skills', label: 'Pitching Skills' },
] as const

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify admin via JWT
  const authHeader = event.headers.authorization ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  } else {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { sessionId, sendOnly } = JSON.parse(event.body ?? '{}')
  if (!sessionId) return { statusCode: 400, body: JSON.stringify({ error: 'sessionId required' }) }

  // Load session
  const { data: session } = await supabase.from('pitch_sessions').select('*').eq('id', sessionId).single()
  if (!session) return { statusCode: 404, body: JSON.stringify({ error: 'Session not found' }) }

  // Load all pitch items
  const { data: pitchItems } = await supabase.from('pitch_items').select('*').eq('session_id', sessionId).order('order_index')
  if (!pitchItems?.length) {
    if (!sendOnly) {
      await supabase.from('pitch_sessions').update({ status: 'voting', phase_started_at: session.voting_timer_seconds ? new Date().toISOString() : null }).eq('id', sessionId)
    }
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) }
  }

  // Load all feedback for this session with user display names
  const { data: allFeedback } = await supabase
    .from('pitch_feedback')
    .select('*, users(display_name)')
    .eq('session_id', sessionId)

  let sent = 0

  for (const item of pitchItems) {
    const feedbackRows = (allFeedback ?? []).filter(f => f.pitch_item_id === item.id)
    if (!feedbackRows.length) continue

    const rows = feedbackRows.map((f, idx) => {
      const name = (f.users as any)?.display_name ?? `Attendee ${idx + 1}`
      const ratings = FEEDBACK_FIELDS
        .map(({ key, label }) => `${label}: ${f[key] ?? '—'}/5`)
        .join(' &nbsp;|&nbsp; ')
      const comments = f.comments ? `<br><em style="color:#9ca3af">"${f.comments}"</em>` : ''
      return `
        <tr style="border-bottom:1px solid #27272a">
          <td style="padding:10px 0;color:#a1a1aa;font-size:13px;white-space:nowrap;padding-right:16px">${name}</td>
          <td style="padding:10px 0;color:#e4e4e7;font-size:13px">${ratings}${comments}</td>
        </tr>`
    }).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#09090b;font-family:system-ui,sans-serif">
        <div style="max-width:640px;margin:40px auto;padding:32px;background:#18181b;border-radius:16px;border:1px solid #27272a">
          <p style="color:#7c3aed;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Lost Our Box · Pitch Day Feedback</p>
          <h1 style="color:#ffffff;font-size:24px;margin:0 0 6px">${item.name}</h1>
          <p style="color:#71717a;font-size:14px;margin:0 0 24px">Pitched by ${item.pitcher_name}</p>
          <p style="color:#a1a1aa;font-size:14px;margin:0 0 16px">Here is the anonymous feedback your pitch received from session attendees:</p>
          <table style="width:100%;border-collapse:collapse">${rows}</table>
          <p style="color:#52525b;font-size:12px;margin:24px 0 0">This feedback was compiled automatically at the end of the pitch day session.</p>
        </div>
      </body>
      </html>`

    if (!resend) {
      console.log(`[send-pitch-feedback] RESEND_API_KEY not set — skipping email to ${item.pitcher_email}`)
      continue
    }
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@resend.dev',
        to: item.pitcher_email,
        subject: `Feedback for "${item.name}" — Lost Our Box Pitch Day`,
        html,
      })
      sent++
    } catch (err) {
      console.error(`Failed to send to ${item.pitcher_email}:`, err)
    }
  }

  // Advance session to voting (skip if sendOnly — used for resending emails after the fact)
  if (!sendOnly) {
    await supabase.from('pitch_sessions').update({
      status: 'voting',
      phase_started_at: session.voting_timer_seconds ? new Date().toISOString() : null,
    }).eq('id', sessionId)
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent }),
  }
}
