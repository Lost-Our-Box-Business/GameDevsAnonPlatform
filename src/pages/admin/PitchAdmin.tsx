import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { PitchSession, PitchItem } from '../../types'
import { Plus, Trash2, Pencil, ExternalLink, ChevronLeft, Download, Mail } from 'lucide-react'

const EMPTY_SETTINGS = {
  title: '',
  pitch_timer_seconds: '',
  qa_timer_seconds: '',
  voting_timer_seconds: '',
  enable_feedback: true,
  result_display: 'winner' as 'winner' | 'pie_chart',
  votes_per_user: '1',
  max_votes_per_entry: '',
}

const STATUS_COLORS: Record<string, string> = {
  setup: 'text-zinc-400 bg-zinc-800',
  pitching: 'text-emerald-400 bg-emerald-500/10',
  voting: 'text-yellow-400 bg-yellow-500/10',
  closed: 'text-zinc-500 bg-zinc-800',
}

export function PitchAdmin() {
  const [sessions, setSessions] = useState<PitchSession[]>([])
  const [selected, setSelected] = useState<PitchSession | null>(null)
  const [items, setItems] = useState<PitchItem[]>([])
  const [showNewSession, setShowNewSession] = useState(false)
  const [form, setForm] = useState(EMPTY_SETTINGS)
  const [saving, setSaving] = useState(false)

  const [newItem, setNewItem] = useState({ name: '', pitcher_name: '', pitcher_email: '' })
  const [addingItem, setAddingItem] = useState(false)
  const [editItem, setEditItem] = useState<PitchItem | null>(null)
  const [editItemForm, setEditItemForm] = useState({ name: '', pitcher_name: '', pitcher_email: '' })

  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState('')
  const [resendOk, setResendOk] = useState(false)

  async function downloadFeedbackCSV() {
    if (!selected) return
    // Don't join users — PostgREST drops rows where user_id is null when using an embedded join.
    // Fetch feedback and pitch_items separately, then resolve display names in a second query.
    const { data: feedback } = await supabase
      .from('pitch_feedback')
      .select('*, pitch_items(name, pitcher_name)')
      .eq('session_id', selected.id)
    if (!feedback?.length) { alert('No feedback to export.'); return }

    // Look up display names only for rows that have a user_id
    const userIds = [...new Set(feedback.map(f => f.user_id).filter(Boolean))]
    const { data: userRows } = userIds.length
      ? await supabase.from('users').select('id, display_name').in('id', userIds)
      : { data: [] }
    const userMap = Object.fromEntries((userRows ?? []).map(u => [u.id, u.display_name]))

    const headers = ['Pitch', 'Pitcher', 'Respondent', 'Feasibility', 'Originality', 'Money Potential', 'Fun to Play', 'Fun to Make', 'Pitching Skills', 'Comments']
    const rows = feedback.map(f => [
      (f.pitch_items as any)?.name ?? '',
      (f.pitch_items as any)?.pitcher_name ?? '',
      f.user_id ? (userMap[f.user_id] ?? 'Registered User') : 'Guest',
      f.feasibility ?? '',
      f.originality ?? '',
      f.money_potential ?? '',
      f.fun_to_play ?? '',
      f.fun_to_make ?? '',
      f.pitching_skills ?? '',
      f.comments ? `"${String(f.comments).replace(/"/g, '""')}"` : '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pitch-feedback-${selected.id.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function resendFeedbackEmails() {
    if (!selected) return
    setResending(true)
    setResendError('')
    setResendOk(false)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      const res = await fetch('/.netlify/functions/send-pitch-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sessionId: selected.id, sendOnly: true }),
      })
      if (res.ok) {
        const body = await res.json().catch(() => ({}))
        const failedEmails: string[] = body.errors ?? []
        if (failedEmails.length) {
          setResendError(`Sent ${body.sent}, failed: ${failedEmails.join('; ')}`)
        } else {
          setResendOk(true)
          setTimeout(() => setResendOk(false), 4000)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        setResendError(err.error ?? 'Failed to send emails')
      }
    } catch {
      setResendError('Network error')
    }
    setResending(false)
  }

  async function loadSessions() {
    const { data } = await supabase.from('pitch_sessions').select('*').order('created_at', { ascending: false })
    setSessions(data ?? [])
  }

  async function loadItems(sessionId: string) {
    const { data } = await supabase.from('pitch_items').select('*').eq('session_id', sessionId).order('order_index')
    setItems(data ?? [])
  }

  useEffect(() => { loadSessions() }, [])

  useEffect(() => {
    if (selected) loadItems(selected.id)
  }, [selected])

  function openSession(s: PitchSession) {
    setSelected(s)
    setForm({
      title: s.title,
      pitch_timer_seconds: s.pitch_timer_seconds?.toString() ?? '',
      qa_timer_seconds: s.qa_timer_seconds?.toString() ?? '',
      voting_timer_seconds: s.voting_timer_seconds?.toString() ?? '',
      enable_feedback: s.enable_feedback,
      result_display: s.result_display,
      votes_per_user: s.votes_per_user.toString(),
      max_votes_per_entry: s.max_votes_per_entry?.toString() ?? '',
    })
  }

  function parseOptInt(s: string) { const n = parseInt(s, 10); return isNaN(n) ? null : n }

  async function createSession() {
    if (!form.title) return
    setSaving(true)
    const { data } = await supabase.from('pitch_sessions').insert({
      title: form.title,
      pitch_timer_seconds: parseOptInt(form.pitch_timer_seconds),
      qa_timer_seconds: parseOptInt(form.qa_timer_seconds),
      voting_timer_seconds: parseOptInt(form.voting_timer_seconds),
      enable_feedback: form.enable_feedback,
      result_display: form.result_display,
      votes_per_user: parseInt(form.votes_per_user, 10) || 1,
      max_votes_per_entry: parseOptInt(form.max_votes_per_entry),
    }).select().single()
    if (data) { setSelected(data); setShowNewSession(false) }
    await loadSessions()
    setSaving(false)
  }

  async function saveSettings() {
    if (!selected) return
    setSaving(true)
    const { data } = await supabase.from('pitch_sessions').update({
      title: form.title,
      pitch_timer_seconds: parseOptInt(form.pitch_timer_seconds),
      qa_timer_seconds: parseOptInt(form.qa_timer_seconds),
      voting_timer_seconds: parseOptInt(form.voting_timer_seconds),
      enable_feedback: form.enable_feedback,
      result_display: form.result_display,
      votes_per_user: parseInt(form.votes_per_user, 10) || 1,
      max_votes_per_entry: parseOptInt(form.max_votes_per_entry),
    }).eq('id', selected.id).select().single()
    if (data) setSelected(data)
    await loadSessions()
    setSaving(false)
  }

  async function startSession() {
    if (!selected) return
    setSaving(true)
    const { data } = await supabase.from('pitch_sessions').update({ status: 'pitching' }).eq('id', selected.id).select().single()
    if (data) setSelected(data)
    await loadSessions()
    setSaving(false)
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this pitch session and all its data?')) return
    await supabase.from('pitch_sessions').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    loadSessions()
  }

  async function addItem() {
    if (!selected || !newItem.name || !newItem.pitcher_name || !newItem.pitcher_email) return
    setAddingItem(true)
    const maxOrder = items.reduce((m, it) => Math.max(m, it.order_index), -1)
    await supabase.from('pitch_items').insert({ session_id: selected.id, ...newItem, order_index: maxOrder + 1 })
    setNewItem({ name: '', pitcher_name: '', pitcher_email: '' })
    loadItems(selected.id)
    setAddingItem(false)
  }

  async function deleteItem(id: string) {
    if (!selected) return
    await supabase.from('pitch_items').delete().eq('id', id)
    loadItems(selected.id)
  }

  async function saveEditItem() {
    if (!editItem || !selected) return
    await supabase.from('pitch_items').update(editItemForm).eq('id', editItem.id)
    setEditItem(null)
    loadItems(selected.id)
  }

  // ── Session List View ────────────────────────────────────────────────────────
  if (!selected && !showNewSession) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Pitch Day</h1>
          <button onClick={() => { setForm(EMPTY_SETTINGS); setShowNewSession(true) }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {sessions.map(s => (
            <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <button onClick={() => openSession(s)} className="flex-1 text-left">
                <p className="text-white font-medium">{s.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </button>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? STATUS_COLORS.closed}`}>
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
                <button onClick={() => openSession(s)} className="text-zinc-500 hover:text-white p-1.5 rounded transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteSession(s.id)} className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-zinc-500 text-sm py-4">No pitch sessions yet.</p>}
        </div>
      </div>
    )
  }

  // ── New Session Form ─────────────────────────────────────────────────────────
  if (showNewSession) {
    return (
      <div>
        <button onClick={() => setShowNewSession(false)} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">New Pitch Session</h1>
        <SessionSettingsForm form={form} setForm={setForm} />
        <div className="flex gap-3 mt-6">
          <button onClick={createSession} disabled={saving || !form.title}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors">
            {saving ? 'Creating…' : 'Create Session'}
          </button>
          <button onClick={() => setShowNewSession(false)} className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!selected) return null

  // ── Session Detail View ──────────────────────────────────────────────────────
  return (
    <div>
      <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> All Sessions
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{selected.title}</h1>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${STATUS_COLORS[selected.status] ?? STATUS_COLORS.closed}`}>
            {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
          </span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to={`/pitch/${selected.id}`} target="_blank"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open Session
          </Link>
        </div>
      </div>

      {/* Settings — only editable in setup */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Settings</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <SessionSettingsForm form={form} setForm={setForm} disabled={selected.status !== 'setup'} />
          {selected.status === 'setup' && (
            <div className="flex gap-3 mt-5">
              <button onClick={saveSettings} disabled={saving}
                className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
              <button onClick={startSession} disabled={saving || items.length === 0}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                {saving ? '…' : 'Start Session →'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Pitch Items */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Pitch Items</h2>
          <button onClick={() => setAddingItem(v => !v)}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs px-3 py-1 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {addingItem && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3 flex flex-col gap-3">
            {(['name', 'pitcher_name', 'pitcher_email'] as const).map(k => (
              <input key={k} type={k === 'pitcher_email' ? 'email' : 'text'}
                placeholder={k === 'name' ? 'Game / project name' : k === 'pitcher_name' ? 'Pitcher name' : 'Pitcher email'}
                value={newItem[k]} onChange={e => setNewItem(v => ({ ...v, [k]: e.target.value }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500" />
            ))}
            <div className="flex gap-2">
              <button onClick={addItem} disabled={!newItem.name || !newItem.pitcher_name || !newItem.pitcher_email}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                Add
              </button>
              <button onClick={() => setAddingItem(false)} className="text-zinc-400 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {items.map(it => (
            <div key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              {editItem?.id === it.id ? (
                <div className="flex flex-col gap-2">
                  {(['name', 'pitcher_name', 'pitcher_email'] as const).map(k => (
                    <input key={k} type={k === 'pitcher_email' ? 'email' : 'text'}
                      value={editItemForm[k]} onChange={e => setEditItemForm(v => ({ ...v, [k]: e.target.value }))}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                  ))}
                  <div className="flex gap-2">
                    <button onClick={saveEditItem} className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-lg transition-colors">Save</button>
                    <button onClick={() => setEditItem(null)} className="text-zinc-400 hover:text-white text-xs px-3 py-1 rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{it.name}</p>
                    <p className="text-zinc-500 text-xs">{it.pitcher_name} · {it.pitcher_email}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {it.pitched_at && <span className="text-xs text-emerald-400 mr-1">✓ Pitched</span>}
                    <button onClick={() => { setEditItem(it); setEditItemForm({ name: it.name, pitcher_name: it.pitcher_name, pitcher_email: it.pitcher_email }) }}
                      className="text-zinc-500 hover:text-white p-1.5 rounded transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteItem(it.id)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-zinc-500 text-sm py-2">No pitch items yet.</p>}
        </div>
      </section>

      {/* Feedback export / resend — shown once session is underway */}
      {selected.status !== 'setup' && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Feedback</h2>
            <div className="flex gap-2">
              <button onClick={downloadFeedbackCSV}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
              <button onClick={resendFeedbackEmails} disabled={resending}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 transition-colors">
                <Mail className="w-3.5 h-3.5" /> {resending ? 'Sending…' : 'Resend Emails'}
              </button>
            </div>
          </div>
          {resendError && <p className="text-red-400 text-xs">{resendError}</p>}
          {resendOk && <p className="text-emerald-400 text-xs">Emails sent successfully!</p>}
          {!resendError && !resendOk && <p className="text-zinc-600 text-xs">Download feedback as a CSV backup, or resend feedback emails to pitchers.</p>}
        </section>
      )}
    </div>
  )
}

function SessionSettingsForm({ form, setForm, disabled }: {
  form: typeof EMPTY_SETTINGS
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_SETTINGS>>
  disabled?: boolean
}) {
  const cls = `w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-zinc-400 text-xs mb-1">Session Title *</label>
        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          disabled={disabled} placeholder="Spring 2026 Pitch Day" className={cls} />
      </div>

      {[
        { key: 'pitch_timer_seconds' as const, label: 'Pitch Timer (seconds)', hint: 'Leave blank for no timer' },
        { key: 'qa_timer_seconds' as const, label: 'Q&A Timer (seconds)', hint: 'Leave blank for no timer' },
        { key: 'voting_timer_seconds' as const, label: 'Voting Timer (seconds)', hint: 'Leave blank for manual close' },
        { key: 'votes_per_user' as const, label: 'Votes Per User', hint: '' },
        { key: 'max_votes_per_entry' as const, label: 'Max Votes Per Entry', hint: 'Leave blank for no limit' },
      ].map(({ key, label, hint }) => (
        <div key={key}>
          <label className="block text-zinc-400 text-xs mb-1">{label}</label>
          <input type="number" min={1} value={(form[key] as string) ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            disabled={disabled} placeholder={hint} className={cls} />
        </div>
      ))}

      <div>
        <label className="block text-zinc-400 text-xs mb-1">Result Display</label>
        <select value={form.result_display} onChange={e => setForm(f => ({ ...f, result_display: e.target.value as 'winner' | 'pie_chart' }))}
          disabled={disabled}
          className={cls}>
          <option value="winner">Winner only</option>
          <option value="pie_chart">Pie chart</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <input type="checkbox" id="enable_feedback" checked={form.enable_feedback}
          onChange={e => setForm(f => ({ ...f, enable_feedback: e.target.checked }))}
          disabled={disabled} className="w-4 h-4 rounded" />
        <label htmlFor="enable_feedback" className="text-zinc-300 text-sm">Enable feedback phase</label>
      </div>
    </div>
  )
}
