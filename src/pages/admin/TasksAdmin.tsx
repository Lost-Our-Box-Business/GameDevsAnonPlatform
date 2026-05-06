import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, GitHubTask, User } from '../../types'
import { Star, RefreshCw } from 'lucide-react'

export function TasksAdmin() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<GitHubTask[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filterProject, setFilterProject] = useState<string>('all')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    const [{ data: projs }, { data: allTasks }, { data: allUsers }] = await Promise.all([
      supabase.from('projects').select('*').in('status', ['active', 'completed']).order('title'),
      supabase.from('github_tasks').select('*').order('status'),
      supabase.from('users').select('*').order('display_name'),
    ])
    setProjects(projs ?? [])
    setTasks(allTasks ?? [])
    setUsers(allUsers ?? [])
  }

  useEffect(() => { load() }, [])

  async function updateTask(taskId: string, patch: Partial<GitHubTask>) {
    setSaving(taskId)
    await supabase.from('github_tasks').update(patch).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t))
    setSaving(null)
  }

  async function syncProject(projectId: string) {
    setSyncing(true)
    await fetch(`/.netlify/functions/sync-github-tasks?project_id=${projectId}`)
    await load()
    setSyncing(false)
  }

  const filtered = filterProject === 'all' ? tasks : tasks.filter(t => t.project_id === filterProject)
  const selectedProject = projects.find(p => p.id === filterProject)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <div className="flex gap-2">
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {selectedProject && (
            <button onClick={() => syncProject(selectedProject.id)} disabled={syncing}
              className="flex items-center gap-1.5 text-sm border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync GitHub
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-500 font-medium px-4 py-3">Task</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3 hidden md:table-cell">Status</th>
              <th className="text-left text-zinc-500 font-medium px-4 py-3 hidden lg:table-cell">Assigned To</th>
              <th className="text-center text-zinc-500 font-medium px-4 py-3">Points</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => (
              <tr key={task.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-white font-medium line-clamp-1">{task.title}</p>
                      {task.html_url && (
                        <a href={task.html_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-zinc-500 hover:text-purple-400 transition-colors">
                          #{task.github_issue_number}
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-zinc-400">{task.status ?? '—'}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <select
                    value={task.assignee_user_id ?? ''}
                    onChange={e => updateTask(task.id, { assignee_user_id: e.target.value || null })}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500 w-40"
                  >
                    <option value="">{task.assignee_github_username ?? 'Unassigned'}</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.display_name}{u.github_username ? ` (@${u.github_username})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-purple-400" />
                    <input
                      type="number"
                      min={0}
                      value={task.points}
                      onChange={e => updateTask(task.id, { points: parseInt(e.target.value) || 0 })}
                      className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-center text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  {saving === task.id && <span className="text-xs text-zinc-500">saving…</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-sm">
                  No tasks. Sync with GitHub to load tasks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
