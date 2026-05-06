import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, User } from '../../types'
import { formatDateShort } from '../../lib/utils'
import { Check, X, Plus } from 'lucide-react'

interface MemberRow {
  id: string
  project_id: string
  user_id: string
  roles: string[]
  joined_at: string
  agreement_acknowledged_at: string | null
  onboarding_completed_at: string | null
  users: User
}

export function MembersAdmin() {
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [filterProject, setFilterProject] = useState<string>('all')
  const [awardForm, setAwardForm] = useState<{ userId: string; projectId: string; points: string; note: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: projs }, { data: mems }] = await Promise.all([
      supabase.from('projects').select('*').order('title'),
      supabase.from('project_members').select('*, users(id, display_name, discord_name, github_username, is_admin)').order('joined_at', { ascending: false }),
    ])
    setProjects(projs ?? [])
    setMembers((mems as any[]) ?? [])
  }

  useEffect(() => { load() }, [])

  async function awardPoints() {
    if (!awardForm || !awardForm.points) return
    setSaving(true)
    await supabase.from('point_ledger').insert({
      project_id: awardForm.projectId,
      user_id: awardForm.userId,
      source: 'bonus',
      points: parseInt(awardForm.points),
      note: awardForm.note || null,
    })
    setAwardForm(null)
    setSaving(false)
  }

  const filtered = filterProject === 'all' ? members : members.filter(m => m.project_id === filterProject)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {awardForm && (
        <div className="bg-zinc-900 border border-purple-500/30 rounded-xl p-4 mb-4">
          <h3 className="text-white font-medium mb-3">Award Bonus Points</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="number" value={awardForm.points} onChange={e => setAwardForm(f => f && ({ ...f, points: e.target.value }))}
              placeholder="Points"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            <input type="text" value={awardForm.note} onChange={e => setAwardForm(f => f && ({ ...f, note: e.target.value }))}
              placeholder="Reason (optional)"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={awardPoints} disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Award Points'}
            </button>
            <button onClick={() => setAwardForm(null)} className="text-zinc-400 hover:text-white text-sm px-4 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Member</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Project</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Roles</th>
              <th className="text-center text-zinc-500 font-medium px-4 py-3">Agreement</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Joined</th>
              <th className="text-center text-zinc-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const proj = projects.find(p => p.id === m.project_id)
              return (
                <tr key={m.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{m.users?.display_name ?? '—'}</p>
                    {m.users?.discord_name && <p className="text-zinc-500 text-xs">{m.users.discord_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{proj?.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map(r => (
                        <span key={r} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.agreement_acknowledged_at
                      ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                      : <X className="w-4 h-4 text-zinc-600 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{formatDateShort(m.joined_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setAwardForm({ userId: m.user_id, projectId: m.project_id, points: '', note: '' })}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors mx-auto"
                    >
                      <Plus className="w-3 h-3" /> Points
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
