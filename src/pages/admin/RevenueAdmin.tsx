import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, ProjectRevenue } from '../../types'
import { formatCurrency, formatDateShort } from '../../lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { useAuthContext } from '../../contexts/AuthContext'

const EMPTY_FORM = { project_id: '', amount_cents: '', currency: 'USD', platform: '', period_start: '', period_end: '' }

export function RevenueAdmin() {
  const { session } = useAuthContext()
  const [projects, setProjects] = useState<Project[]>([])
  const [records, setRecords] = useState<ProjectRevenue[]>([])
  const [filterProject, setFilterProject] = useState<string>('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: projs }, { data: rev }] = await Promise.all([
      supabase.from('projects').select('*').order('title'),
      supabase.from('project_revenue').select('*').order('recorded_at', { ascending: false }),
    ])
    setProjects(projs ?? [])
    setRecords(rev ?? [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.project_id || !form.amount_cents) return
    setSaving(true)
    await supabase.from('project_revenue').insert({
      project_id: form.project_id,
      amount_cents: Math.round(parseFloat(form.amount_cents) * 100),
      currency: form.currency,
      platform: form.platform || null,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      recorded_by: session?.user.id,
    })
    setForm(EMPTY_FORM)
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this revenue record?')) return
    await supabase.from('project_revenue').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filtered = filterProject === 'all' ? records : records.filter(r => r.project_id === filterProject)
  const totalFiltered = filtered.reduce((s, r) => s + r.amount_cents, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Revenue Records</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">New Revenue Record</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Project *</label>
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                <option value="">Select…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Amount (USD) *</label>
              <input type="number" step="0.01" value={form.amount_cents} onChange={e => setForm(f => ({ ...f, amount_cents: e.target.value }))}
                placeholder="123.45"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Platform</label>
              <input type="text" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                placeholder="Steam, itch.io…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Period Start</label>
                <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Period End</label>
                <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save Record'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 items-center justify-between flex-wrap">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        {filtered.length > 0 && (
          <span className="text-zinc-400 text-sm">Total: <span className="text-white font-medium">{formatCurrency(totalFiltered)}</span></span>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Project</th>
              <th className="text-right text-zinc-500 font-medium px-4 py-3">Amount</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3 hidden sm:table-cell">Platform</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3 hidden md:table-cell">Period</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Recorded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-zinc-300">{projects.find(p => p.id === r.project_id)?.title ?? '—'}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(r.amount_cents, r.currency)}</td>
                <td className="px-4 py-3 text-zinc-400 hidden sm:table-cell">{r.platform ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-400 text-xs hidden md:table-cell">
                  {r.period_start && r.period_end ? `${formatDateShort(r.period_start)} – ${formatDateShort(r.period_end)}` : '—'}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{formatDateShort(r.recorded_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteRecord(r.id)} className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No revenue records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
