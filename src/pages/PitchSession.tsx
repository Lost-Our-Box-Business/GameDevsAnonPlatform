import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { PitchSession, PitchItem, PitchFeedback, PitchVote } from '../types'
import { PitchTimer } from '../components/PitchTimer'
import { WheelSpinner } from '../components/WheelSpinner'
import { CheckCircle2, Mic, ChevronLeft, Plus, Star } from 'lucide-react'

// ── SVG Pie Chart ──────────────────────────────────────────────────────────────
const PIE_COLORS = ['#7c3aed','#db2777','#059669','#d97706','#2563eb','#dc2626','#0891b2','#65a30d','#9333ea','#ea580c']

function PieChart({ items, votes }: { items: PitchItem[]; votes: PitchVote[] }) {
  const counts = items.map(it => votes.filter(v => v.pitch_item_id === it.id).length)
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return <p className="text-zinc-500 text-sm text-center py-8">No votes recorded.</p>

  const cx = 120, cy = 120, r = 100
  let angle = -Math.PI / 2
  const slices = items.map((it, i) => {
    const share = counts[i] / total
    const startAngle = angle
    angle += share * 2 * Math.PI
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const large = share > 0.5 ? 1 : 0
    // For 100% slice, split into two arcs — SVG can't draw a complete arc with identical start/end
    const midX = cx + r * Math.cos(startAngle + Math.PI)
    const midY = cy + r * Math.sin(startAngle + Math.PI)
    const path = share >= 0.9999
      ? `M${cx},${cy} L${x1},${y1} A${r},${r} 0 1,1 ${midX},${midY} A${r},${r} 0 1,1 ${x2},${y2} Z`
      : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`
    return { it, count: counts[i], share, path, color: PIE_COLORS[i % PIE_COLORS.length] }
  }).filter(s => s.count > 0)

  const sorted = [...slices].sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 240 240" className="w-56 h-56">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#18181b" strokeWidth={2} />
        ))}
      </svg>
      <div className="w-full flex flex-col gap-2">
        {sorted.map((s, i) => (
          <div key={s.it.id} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{i === 0 && <span className="text-yellow-400 mr-1">🏆</span>}{s.it.name}</p>
              <p className="text-zinc-500 text-xs">{s.it.pitcher_name}</p>
            </div>
            <span className="text-zinc-300 text-sm tabular-nums">{s.count} vote{s.count !== 1 ? 's' : ''} · {Math.round(s.share * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Inline Feedback Form ───────────────────────────────────────────────────────
const FEEDBACK_FIELDS: { key: keyof Pick<PitchFeedback,'feasibility'|'originality'|'money_potential'|'fun_to_play'|'fun_to_make'|'pitching_skills'>; label: string }[] = [
  { key: 'feasibility', label: 'Feasibility' },
  { key: 'originality', label: 'Originality' },
  { key: 'money_potential', label: 'Money-Making Potential' },
  { key: 'fun_to_play', label: 'Fun to Play' },
  { key: 'fun_to_make', label: 'Fun to Make' },
  { key: 'pitching_skills', label: 'Pitching Skills' },
]

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} className="p-0.5">
          <Star className={`w-5 h-5 transition-colors ${n <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`} />
        </button>
      ))}
    </div>
  )
}

function InlineFeedbackForm({
  item, sessionId, userId, guestToken, existing, onSaved,
}: { item: PitchItem; sessionId: string; userId: string | null; guestToken: string; existing?: PitchFeedback; onSaved: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    existing ? {
      feasibility: existing.feasibility ?? 0, originality: existing.originality ?? 0,
      money_potential: existing.money_potential ?? 0, fun_to_play: existing.fun_to_play ?? 0,
      fun_to_make: existing.fun_to_make ?? 0, pitching_skills: existing.pitching_skills ?? 0,
    } : { feasibility: 0, originality: 0, money_potential: 0, fun_to_play: 0, fun_to_make: 0, pitching_skills: 0 }
  )
  const [comments, setComments] = useState(existing?.comments ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit() {
    setSaving(true)
    const base = { session_id: sessionId, pitch_item_id: item.id, ...ratings, comments: comments || null }
    if (userId) {
      await supabase.from('pitch_feedback').upsert(
        { ...base, user_id: userId },
        { onConflict: 'pitch_item_id,user_id' }
      )
    } else {
      await supabase.from('pitch_feedback').upsert(
        { ...base, guest_token: guestToken },
        { onConflict: 'pitch_item_id,guest_token' }
      )
    }
    setSaving(false)
    setSaved(true)
    onSaved()
  }

  if (saved) {
    return (
      <div className="text-center py-4">
        <p className="text-emerald-400 font-medium">✓ Feedback submitted</p>
        <p className="text-zinc-500 text-sm mt-1">Your feedback will be sent directly to {item.pitcher_name}.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-zinc-500 text-xs bg-zinc-800 rounded-lg px-3 py-2">
        Your feedback is private and will be sent directly to the pitcher — not shown to anyone else.
      </p>
      {FEEDBACK_FIELDS.map(f => (
        <div key={f.key} className="flex items-center justify-between gap-4">
          <span className="text-zinc-300 text-sm">{f.label}</span>
          <StarRow value={ratings[f.key] ?? 0} onChange={v => setRatings(r => ({ ...r, [f.key]: v }))} />
        </div>
      ))}
      <div>
        <textarea value={comments} onChange={e => setComments(e.target.value)} rows={2}
          placeholder="Any additional thoughts…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500 resize-none" />
      </div>
      <button onClick={submit} disabled={saving}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
        {saving ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PitchSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false

  // Persistent guest token — used when not logged in
  const [guestToken] = useState<string>(() => {
    let token = localStorage.getItem('pitch_guest_token')
    if (!token) { token = crypto.randomUUID(); localStorage.setItem('pitch_guest_token', token) }
    return token
  })

  const [session, setSession] = useState<PitchSession | null>(null)
  const [items, setItems] = useState<PitchItem[]>([])
  const [votes, setVotes] = useState<PitchVote[]>([])
  const [myFeedback, setMyFeedback] = useState<Record<string, PitchFeedback>>({})
  const [showWheel, setShowWheel] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [newItemForm, setNewItemForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', pitcher_name: '', pitcher_email: '' })
  const [openVotingLoading, setOpenVotingLoading] = useState(false)
  const [openVotingError, setOpenVotingError] = useState('')

  const loadSession = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.from('pitch_sessions').select('*').eq('id', sessionId).single()
    if (data) setSession(data)
  }, [sessionId])

  const loadItems = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.from('pitch_items').select('*').eq('session_id', sessionId).order('order_index')
    setItems(data ?? [])
  }, [sessionId])

  const loadVotes = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.from('pitch_votes').select('*').eq('session_id', sessionId)
    setVotes(data ?? [])
  }, [sessionId])

  const loadMyFeedback = useCallback(async () => {
    if (!sessionId) return
    let query = supabase.from('pitch_feedback').select('*').eq('session_id', sessionId)
    if (user) {
      query = query.eq('user_id', user.id)
    } else {
      query = query.eq('guest_token', guestToken)
    }
    const { data } = await query
    const map: Record<string, PitchFeedback> = {}
    for (const f of (data ?? [])) map[f.pitch_item_id] = f
    setMyFeedback(map)
  }, [sessionId, user, guestToken])

  useEffect(() => {
    if (!sessionId) return
    loadSession()
    loadItems()
    loadVotes()
    loadMyFeedback()

    // Poll every 2s — reliable fallback for all clients regardless of realtime config
    const poll = setInterval(() => {
      loadSession()
      loadItems()
      loadVotes()
    }, 2000)

    // Realtime subscription (bonus: instant for clients with publication enabled)
    const channel = supabase
      .channel('pitch_session_' + sessionId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as PitchSession))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_items', filter: `session_id=eq.${sessionId}` },
        () => loadItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_votes', filter: `session_id=eq.${sessionId}` },
        () => loadVotes())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [sessionId, loadSession, loadItems, loadVotes, loadMyFeedback])

  // ── Admin actions ────────────────────────────────────────────────────────────
  async function updateSession(patch: Partial<PitchSession>) {
    if (!sessionId) return
    setActionLoading(true)
    const { data } = await supabase.from('pitch_sessions').update(patch).eq('id', sessionId).select().single()
    if (data) setSession(data)  // apply immediately — don't wait for poll
    setActionLoading(false)
  }

  async function startPitch(item: PitchItem) {
    await updateSession({ current_pitch_item_id: item.id, current_sub_phase: 'presenting', phase_started_at: new Date().toISOString() })
  }

  async function advanceToQA() {
    await updateSession({ current_sub_phase: 'qa', phase_started_at: new Date().toISOString() })
  }

  // Called when QA timer expires or admin clicks "Done Q&A"
  // If feedback disabled, skip straight to done
  async function advanceToFeedback() {
    if (!session) return
    if (!session.enable_feedback) {
      await donePitch()
    } else {
      await updateSession({ current_sub_phase: 'feedback', phase_started_at: null })
    }
  }

  async function donePitch() {
    if (!session?.current_pitch_item_id || !sessionId) return
    setActionLoading(true)
    await supabase.from('pitch_items').update({ pitched_at: new Date().toISOString() }).eq('id', session.current_pitch_item_id)
    const { data } = await supabase.from('pitch_sessions').update({ current_pitch_item_id: null, current_sub_phase: null, phase_started_at: null }).eq('id', sessionId).select().single()
    if (data) setSession(data)
    await loadItems()  // refresh items so pitched_at shows immediately
    setActionLoading(false)
  }

  async function openVoting() {
    setOpenVotingLoading(true)
    setOpenVotingError('')
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      const res = await fetch('/.netlify/functions/send-pitch-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const body = await res.json().catch(() => ({}))
        const failedEmails: string[] = body.errors ?? []
        if (failedEmails.length) {
          setOpenVotingError(`${body.sent} sent, ${failedEmails.length} failed — check admin feedback panel to resend`)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        setOpenVotingError(err.error ?? 'Failed to send feedback emails')
      }
    } catch {
      setOpenVotingError('Network error sending feedback emails')
    }
    setOpenVotingLoading(false)
  }

  async function endVoting() {
    await updateSession({ status: 'closed' })
  }

  async function reopenTiebreaker() {
    if (!sessionId || !session) return
    const counts = items.map(it => ({ id: it.id, count: votes.filter(v => v.pitch_item_id === it.id).length }))
    const maxCount = Math.max(...counts.map(c => c.count), 0)
    const tiedIds = counts.filter(c => c.count === maxCount && maxCount > 0).map(c => c.id)
    setActionLoading(true)
    await supabase.from('pitch_votes').delete().eq('session_id', sessionId)
    const { data } = await supabase.from('pitch_sessions').update({
      status: 'voting',
      tiebreaker_item_ids: tiedIds,
      phase_started_at: session.voting_timer_seconds ? new Date().toISOString() : null,
    }).eq('id', sessionId).select().single()
    if (data) setSession(data)
    await loadVotes()
    setActionLoading(false)
  }

  async function addNewItem() {
    if (!newItem.name || !newItem.pitcher_name || !newItem.pitcher_email || !sessionId) return
    setActionLoading(true)
    const maxOrder = items.reduce((m, it) => Math.max(m, it.order_index), -1)
    await supabase.from('pitch_items').insert({ session_id: sessionId, ...newItem, order_index: maxOrder + 1 })
    setNewItem({ name: '', pitcher_name: '', pitcher_email: '' })
    setNewItemForm(false)
    setActionLoading(false)
  }

  function handleWheelSelect(name: string) {
    setShowWheel(false)
    const found = items.find(it => it.name === name && !it.pitched_at)
    if (found) startPitch(found)
  }

  // ── Voting ───────────────────────────────────────────────────────────────────
  function myVote(itemId: string) {
    return votes.find(v =>
      v.pitch_item_id === itemId &&
      (user ? v.user_id === user.id : v.guest_token === guestToken)
    )
  }

  function myVoteCount() {
    return votes.filter(v => user ? v.user_id === user.id : v.guest_token === guestToken).length
  }

  async function toggleVote(item: PitchItem) {
    if (!sessionId) return
    const existing = myVote(item.id)
    if (existing) {
      await supabase.from('pitch_votes').delete().eq('id', existing.id)
    } else {
      if (myVoteCount() >= (session?.votes_per_user ?? 1)) return
      await supabase.from('pitch_votes').insert({
        session_id: sessionId,
        pitch_item_id: item.id,
        user_id: user?.id ?? null,
        guest_token: user ? null : guestToken,
      })
    }
    loadVotes()
  }

  if (!session) return <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-500">Loading…</div>

  const pitched = items.filter(it => it.pitched_at)
  const unpitched = items.filter(it => !it.pitched_at)
  const currentItem = items.find(it => it.id === session.current_pitch_item_id)
  const userVoteCount = myVoteCount()
  const totalVotes = votes.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/pitch" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> All Sessions
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{session.title}</h1>
          <StatusBadge status={session.status} subPhase={session.current_sub_phase} />
        </div>
      </div>

      {/* ── PITCHING PHASE ─────────────────────────────────────────────────── */}
      {session.status === 'pitching' && (
        <div className="flex flex-col gap-6">

          {/* Sub-phase: no active pitch — show queue */}
          {!currentItem && (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
                {items.length === 0 ? 'No pitches added yet.' :
                 unpitched.length === 0 ? 'All pitches complete.' :
                 'Waiting for next pitch…'}
              </div>

              {isAdmin && (
                <div className="flex flex-wrap gap-3">
                  {unpitched.length > 1 && (
                    <button onClick={() => setShowWheel(true)}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                      🎡 Randomize
                    </button>
                  )}
                  <button onClick={() => setNewItemForm(v => !v)}
                    className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors">
                    <Plus className="w-4 h-4" /> Add Pitch
                  </button>
                  {pitched.length > 0 && unpitched.length === 0 && (
                    <div className="ml-auto">
                      {openVotingError && <p className="text-red-400 text-xs mb-1">{openVotingError}</p>}
                      <button onClick={openVoting} disabled={openVotingLoading}
                        className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                        {openVotingLoading ? 'Sending…' : 'Open Voting →'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {newItemForm && isAdmin && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-sm font-medium text-white">Add Pitch Item</p>
                  {(['name', 'pitcher_name', 'pitcher_email'] as const).map(k => (
                    <input key={k} type={k === 'pitcher_email' ? 'email' : 'text'}
                      placeholder={k === 'name' ? 'Game name' : k === 'pitcher_name' ? 'Pitcher name' : 'Pitcher email'}
                      value={newItem[k]} onChange={e => setNewItem(v => ({ ...v, [k]: e.target.value }))}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500" />
                  ))}
                  <div className="flex gap-2">
                    <button onClick={addNewItem} disabled={actionLoading}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">Add</button>
                    <button onClick={() => setNewItemForm(false)}
                      className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sub-phase: presenting or qa */}
          {currentItem && (session.current_sub_phase === 'presenting' || session.current_sub_phase === 'qa') && (
            <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-6">
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-1">
                {session.current_sub_phase === 'qa' ? 'Q&A' : 'Now Presenting'}
              </p>
              <h2 className="text-2xl font-bold text-white mb-1">{currentItem.name}</h2>
              <p className="text-zinc-400 text-sm mb-4">by {currentItem.pitcher_name}</p>

              {(() => {
                const timerSecs = session.current_sub_phase === 'qa' ? session.qa_timer_seconds : session.pitch_timer_seconds
                return timerSecs && session.phase_started_at ? (
                  <div className="mb-4">
                    <PitchTimer
                      seconds={timerSecs}
                      startedAt={session.phase_started_at}
                      onExpire={isAdmin
                        ? session.current_sub_phase === 'qa'
                          ? advanceToFeedback   // QA timer ends → auto-advance to feedback
                          : advanceToQA         // Pitch timer ends → nudge to Q&A
                        : undefined}
                    />
                  </div>
                ) : null
              })()}

              {isAdmin && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {session.current_sub_phase === 'presenting' && (
                    <button onClick={advanceToQA} disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                      Start Q&A →
                    </button>
                  )}
                  {session.current_sub_phase === 'qa' && (
                    <button onClick={advanceToFeedback} disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                      Done Q&A →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sub-phase: feedback — for current pitcher only */}
          {currentItem && session.current_sub_phase === 'feedback' && (
            <div className="bg-zinc-900 border border-blue-500/20 rounded-2xl p-6">
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wider mb-1">Feedback</p>
              <h2 className="text-xl font-bold text-white mb-1">{currentItem.name}</h2>
              <p className="text-zinc-400 text-sm mb-5">by {currentItem.pitcher_name}</p>

              <InlineFeedbackForm
                item={currentItem}
                sessionId={session.id}
                userId={user?.id ?? null}
                guestToken={guestToken}
                existing={myFeedback[currentItem.id]}
                onSaved={loadMyFeedback}
              />

              {isAdmin && (
                <button onClick={donePitch} disabled={actionLoading}
                  className="mt-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors">
                  {actionLoading ? '…' : 'Next Pitch →'}
                </button>
              )}
            </div>
          )}

          {/* Pitch queue (always visible so everyone can see progress) */}
          {items.length > 0 && (
            <div className="flex flex-col gap-2">
              {items.map(it => (
                <div key={it.id} className={`flex items-center justify-between gap-4 p-3 rounded-xl border ${
                  it.id === session.current_pitch_item_id ? 'border-purple-500/40 bg-purple-500/5' :
                  it.pitched_at ? 'border-zinc-800 opacity-40' : 'border-zinc-800 bg-zinc-900'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {it.pitched_at
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : it.id === session.current_pitch_item_id
                      ? <Mic className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{it.name}</p>
                      <p className="text-zinc-500 text-xs">{it.pitcher_name}</p>
                    </div>
                  </div>
                  {isAdmin && !it.pitched_at && it.id !== session.current_pitch_item_id && !currentItem && (
                    <button onClick={() => startPitch(it)}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg transition-colors flex-shrink-0">
                      Start Pitch
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Open voting early (if some pitched but not all) */}
          {isAdmin && pitched.length > 0 && unpitched.length > 0 && !currentItem && (
            <div className="pt-2 border-t border-zinc-800">
              {openVotingError && <p className="text-red-400 text-xs mb-1">{openVotingError}</p>}
              <button onClick={openVoting} disabled={openVotingLoading}
                className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors">
                {openVotingLoading ? 'Sending…' : 'Skip remaining & Open Voting'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── VOTING PHASE ───────────────────────────────────────────────────── */}
      {session.status === 'voting' && (() => {
        const votingItems = session.tiebreaker_item_ids?.length
          ? items.filter(it => session.tiebreaker_item_ids!.includes(it.id))
          : items
        return (
          <div className="flex flex-col gap-6">
            {session.tiebreaker_item_ids?.length ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 text-yellow-400 text-sm font-medium">
                Tiebreaker — only the tied pitches are shown
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-lg">Cast Your Vote</p>
                <p className="text-zinc-500 text-sm">{totalVotes} total vote{totalVotes !== 1 ? 's' : ''} cast</p>
                {user && <p className="text-zinc-500 text-xs mt-0.5">{userVoteCount} / {session.votes_per_user} vote{session.votes_per_user !== 1 ? 's' : ''} used</p>}
              </div>
              {session.voting_timer_seconds && session.phase_started_at && (
                <div className="text-right">
                  <p className="text-zinc-500 text-xs mb-1">Time remaining</p>
                  <PitchTimer seconds={session.voting_timer_seconds} startedAt={session.phase_started_at}
                    onExpire={isAdmin ? endVoting : undefined} />
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {votingItems.map(it => {
                const hasVoted = !!myVote(it.id)
                const canVote = !hasVoted && userVoteCount < (session.votes_per_user ?? 1)
                return (
                  <div key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-white font-medium">{it.name}</p>
                      <p className="text-zinc-500 text-sm">{it.pitcher_name}</p>
                    </div>
                    <button onClick={() => toggleVote(it)} disabled={!canVote && !hasVoted}
                      className={`w-full text-sm py-2 rounded-lg font-medium transition-colors ${
                        !canVote && !hasVoted ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}>
                      Vote
                    </button>
                  </div>
                )
              })}
            </div>

            {isAdmin && (
              <button onClick={endVoting} disabled={actionLoading}
                className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors self-start">
                End Voting
              </button>
            )}
          </div>
        )
      })()}

      {/* ── RESULTS ────────────────────────────────────────────────────────── */}
      {session.status === 'closed' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold text-white">Results</h2>
          {session.result_display === 'pie_chart' || isAdmin ? (
            <PieChart items={items} votes={votes} />
          ) : (
            <WinnerCard items={items} votes={votes} isAdmin={isAdmin} onReopen={reopenTiebreaker} />
          )}
        </div>
      )}

      {/* ── WHEEL MODAL ────────────────────────────────────────────────────── */}
      {showWheel && (
        <WheelSpinner
          items={unpitched.map(it => it.name)}
          onSelect={handleWheelSelect}
          onClose={() => setShowWheel(false)}
        />
      )}
    </div>
  )
}

function StatusBadge({ status, subPhase }: { status: string; subPhase: string | null }) {
  const label = subPhase === 'presenting' ? 'Now Presenting'
    : subPhase === 'qa' ? 'Q&A'
    : subPhase === 'feedback' ? 'Feedback'
    : status === 'pitching' ? 'Pitching'
    : status === 'voting' ? 'Voting Open'
    : status === 'closed' ? 'Closed'
    : status.charAt(0).toUpperCase() + status.slice(1)

  const color = subPhase === 'feedback' ? 'text-blue-400 bg-blue-500/10'
    : subPhase ? 'text-emerald-400 bg-emerald-500/10'
    : status === 'voting' ? 'text-yellow-400 bg-yellow-500/10'
    : status === 'closed' ? 'text-zinc-500 bg-zinc-800'
    : 'text-zinc-400 bg-zinc-800'

  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${color}`}>{label}</span>
}

function WinnerCard({ items, votes, isAdmin, onReopen }: {
  items: PitchItem[]; votes: PitchVote[]; isAdmin: boolean; onReopen: () => void
}) {
  const counts = items.map(it => ({ it, count: votes.filter(v => v.pitch_item_id === it.id).length }))
  const maxCount = Math.max(...counts.map(c => c.count), 0)
  if (maxCount === 0) return <p className="text-zinc-500 text-sm">No votes recorded.</p>

  const topItems = counts.filter(c => c.count === maxCount)

  if (topItems.length > 1) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">🤝</p>
        <p className="text-white font-bold text-2xl mb-2">It's a Tie!</p>
        <p className="text-zinc-400 text-sm mb-5">These pitches are tied with {maxCount} vote{maxCount !== 1 ? 's' : ''} each:</p>
        <div className="flex flex-col gap-2 mb-6 text-left max-w-xs mx-auto">
          {topItems.map(({ it }) => (
            <div key={it.id} className="bg-zinc-800 rounded-xl px-4 py-3">
              <p className="text-white font-medium">{it.name}</p>
              <p className="text-zinc-500 text-sm">{it.pitcher_name}</p>
            </div>
          ))}
        </div>
        {isAdmin && (
          <button onClick={onReopen}
            className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            Reopen Tiebreaker Vote
          </button>
        )}
      </div>
    )
  }

  const winner = topItems[0]
  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-purple-500/10 border border-yellow-500/20 rounded-2xl p-8 text-center">
      <p className="text-4xl mb-3">🏆</p>
      <p className="text-zinc-400 text-sm mb-1">Winner</p>
      <h2 className="text-3xl font-bold text-white mb-2">{winner.it.name}</h2>
      <p className="text-zinc-400">Pitched by {winner.it.pitcher_name}</p>
      <p className="text-zinc-500 text-sm mt-2">{winner.count} vote{winner.count !== 1 ? 's' : ''}</p>
    </div>
  )
}
