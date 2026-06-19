import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, User } from '../../types'
import { formatDateShort } from '../../lib/utils'
import { Check, X, Plus, FileSignature, Download, GitBranch, MessageSquare } from 'lucide-react'

interface MemberRow {
  id: string
  project_id: string
  user_id: string
  roles: string[]
  joined_at: string
  agreement_acknowledged_at: string | null
  agreement_signature_url: string | null
  onboarding_completed_at: string | null
  users: User
}

export function MembersAdmin() {
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [filterProject, setFilterProject] = useState<string>('all')
  const [pointsMap, setPointsMap] = useState<Map<string, number>>(new Map())
  const [awardForm, setAwardForm] = useState<{ userId: string; projectId: string; points: string; note: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignResults, setAssignResults] = useState<Record<string, { github: string; discord: string }>>({})

  async function load() {
    const [{ data: projs }, { data: mems }] = await Promise.all([
      supabase.from('projects').select('*').order('title'),
      supabase.from('project_members')
        .select('*, users(id, display_name, discord_name, discord_user_id, github_username, is_admin)')
        .order('joined_at', { ascending: false }),
    ])
    setProjects(projs ?? [])
    setMembers((mems as any[]) ?? [])
  }

  useEffect(() => { load() }, [])

  // Reload points when project filter changes
  useEffect(() => {
    async function loadPoints() {
      if (filterProject === 'all') { setPointsMap(new Map()); return }
      const completedStatuses = ['Done', 'In Review']
      const [{ data: tasks }, { data: ledger }] = await Promise.all([
        supabase.from('github_tasks').select('assignee_user_id, points, status').eq('project_id', filterProject),
        supabase.from('point_ledger').select('user_id, points').eq('project_id', filterProject).neq('source', 'task'),
      ])
      const map = new Map<string, number>()
      for (const t of (tasks ?? [])) {
        if (!completedStatuses.includes(t.status ?? '')) continue
        if (!t.assignee_user_id) continue
        map.set(t.assignee_user_id, (map.get(t.assignee_user_id) ?? 0) + (t.points ?? 0))
      }
      for (const e of (ledger ?? [])) {
        map.set(e.user_id, (map.get(e.user_id) ?? 0) + (e.points ?? 0))
      }
      setPointsMap(map)
    }
    loadPoints()
  }, [filterProject])

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
    if (filterProject !== 'all') {
      // re-trigger points reload by toggling
      setPointsMap(new Map())
    }
  }

  async function viewSignature(projectId: string, userId: string) {
    const path = `${projectId}/${userId}.png`
    const { data, error } = await supabase.storage.from('agreements').createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) { alert('Could not generate signature URL. Check storage policy.'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function downloadAllSignatures() {
    const filtered = filterProject === 'all' ? members : members.filter(m => m.project_id === filterProject)
    const withSigs = filtered.filter(m => m.agreement_signature_url)
    if (withSigs.length === 0) { alert('No signed agreements found for this selection.'); return }
    for (const m of withSigs) {
      const path = `${m.project_id}/${m.user_id}.png`
      const { data } = await supabase.storage.from('agreements').createSignedUrl(path, 3600)
      if (!data?.signedUrl) continue
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = `agreement_${m.users?.display_name ?? m.user_id}.png`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  async function assignMember(m: MemberRow) {
    setAssigningId(m.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/assign-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ project_id: m.project_id, user_id: m.user_id }),
      })
      const json = await res.json()
      setAssignResults(prev => ({ ...prev, [m.id]: { github: json.github ?? '?', discord: json.discord ?? '?' } }))
    } catch {
      setAssignResults(prev => ({ ...prev, [m.id]: { github: 'error', discord: 'error' } }))
    }
    setAssigningId(null)
  }

  const filtered = filterProject === 'all' ? members : members.filter(m => m.project_id === filterProject)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <div className="flex items-center gap-3">
          {filtered.some(m => m.agreement_signature_url) && (
            <button
              onClick={downloadAllSignatures}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download All Signatures
            </button>
          )}
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
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
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Member</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Project</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Roles</th>
              {filterProject !== 'all' && (
                <th className="text-right text-zinc-500 font-medium px-4 py-3">Points</th>
              )}
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Agreement</th>
              <th className="text-center text-zinc-500 font-medium px-4 py-3">Signature</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Joined</th>
              <th className="text-center text-zinc-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const proj = projects.find(p => p.id === m.project_id)
              const pts = pointsMap.get(m.user_id)
              const result = assignResults[m.id]
              return (
                <tr key={m.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{m.users?.display_name ?? '—'}</p>
                    {m.users?.discord_name && <p className="text-zinc-500 text-xs">{m.users.discord_name}</p>}
                    {m.users?.github_username && <p className="text-zinc-600 text-xs">@{m.users.github_username}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{proj?.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.roles.map(r => (
                        <span key={r} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">{r}</span>
                      ))}
                    </div>
                  </td>
                  {filterProject !== 'all' && (
                    <td className="px-4 py-3 text-right">
                      <span className={pts ? 'text-purple-400 font-medium' : 'text-zinc-600'}>
                        {pts != null ? pts.toLocaleString() : '0'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {m.agreement_acknowledged_at ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <Check className="w-3 h-3" />
                        {formatDateShort(m.agreement_acknowledged_at)}
                      </span>
                    ) : (
                      <X className="w-4 h-4 text-zinc-600" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.agreement_signature_url ? (
                      <button
                        onClick={() => viewSignature(m.project_id, m.user_id)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mx-auto"
                      >
                        <FileSignature className="w-3.5 h-3.5" /> View
                      </button>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{formatDateShort(m.joined_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => setAwardForm({ userId: m.user_id, projectId: m.project_id, points: '', note: '' })}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Points
                      </button>
                      <button
                        onClick={() => assignMember(m)}
                        disabled={assigningId === m.id}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
                      >
                        <GitBranch className="w-3 h-3" />
                        <MessageSquare className="w-3 h-3" />
                        {assigningId === m.id ? 'Assigning…' : 'Assign'}
                      </button>
                      {result && (
                        <div className="text-xs text-center">
                          <span className={result.github === 'ok' ? 'text-emerald-400' : result.github === 'skipped' ? 'text-zinc-500' : 'text-red-400'}>
                            GH:{result.github}
                          </span>
                          {' '}
                          <span className={result.discord === 'ok' ? 'text-emerald-400' : result.discord === 'skipped' ? 'text-zinc-500' : 'text-red-400'}>
                            DC:{result.discord}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={filterProject !== 'all' ? 8 : 7} className="px-4 py-8 text-center text-zinc-500">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}