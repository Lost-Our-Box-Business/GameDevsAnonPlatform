import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import { useAuthContext } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../lib/utils'
import { Star, Gamepad2, TrendingUp } from 'lucide-react'

interface ProjectSummary {
  project: Project
  myPoints: number
  totalPoints: number
  revenue: number
  currency: string
}

export function Profile() {
  const { session, user } = useAuthContext()
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [discordName, setDiscordName] = useState(user?.discord_name ?? '')
  const [githubUsername, setGithubUsername] = useState(user?.github_username ?? '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? '')
      setDiscordName(user.discord_name ?? '')
      setGithubUsername(user.github_username ?? '')
    }
  }, [user])

  useEffect(() => {
    async function loadProjects() {
      if (!session) return

      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', session.user.id)
        .not('onboarding_completed_at', 'is', null)

      if (!memberships?.length) { setLoading(false); return }

      const projectIds = memberships.map(m => m.project_id)
      const projects = memberships.map(m => (m as any).projects as Project)

      const [{ data: allLedger }, { data: allRevenue }] = await Promise.all([
        supabase.from('point_ledger').select('project_id, user_id, points').in('project_id', projectIds),
        supabase.from('project_revenue').select('project_id, amount_cents, currency').in('project_id', projectIds),
      ])

      const summaries: ProjectSummary[] = projects.map(proj => {
        const projLedger = (allLedger ?? []).filter(e => e.project_id === proj.id)
        const myPts = projLedger.filter(e => e.user_id === session.user.id).reduce((s, e) => s + e.points, 0)
        const totalPts = projLedger.reduce((s, e) => s + e.points, 0)
        const projRevenue = (allRevenue ?? []).filter(r => r.project_id === proj.id)
        const totalRevenue = projRevenue.reduce((s, r) => s + r.amount_cents, 0)
        const myRevenue = totalPts > 0 ? (myPts / totalPts) * totalRevenue : 0
        return {
          project: proj,
          myPoints: myPts,
          totalPoints: totalPts,
          revenue: myRevenue,
          currency: projRevenue[0]?.currency ?? 'USD',
        }
      })

      setProjectSummaries(summaries.sort((a, b) => b.myPoints - a.myPoints))
      setLoading(false)
    }
    loadProjects()
  }, [session])

  async function saveProfile() {
    if (!session) return
    setSaving(true)
    await supabase.from('users').update({
      display_name: displayName.trim(),
      discord_name: discordName.trim() || null,
      github_username: githubUsername.trim() || null,
    }).eq('id', session.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalEarnings = projectSummaries.reduce((s, p) => s + p.revenue, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile form */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account Info</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Discord Username</label>
                <input value={discordName} onChange={e => setDiscordName(e.target.value)}
                  placeholder="username#0000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">GitHub Username</label>
                <input value={githubUsername} onChange={e => setGithubUsername(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Earnings summary */}
        <div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">All-Time Earnings</h2>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-2xl font-bold text-white">{formatCurrency(totalEarnings)}</span>
            </div>
            <p className="text-zinc-500 text-xs">Across {projectSummaries.length} project{projectSummaries.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Project history */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Project History</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projectSummaries.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>You haven't joined any projects yet.</p>
            <Link to="/projects" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">Browse projects →</Link>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-500 font-medium px-5 py-3">Project</th>
                  <th className="text-right text-zinc-500 font-medium px-5 py-3">Points</th>
                  <th className="text-right text-zinc-500 font-medium px-5 py-3 hidden sm:table-cell">Share</th>
                  <th className="text-right text-zinc-500 font-medium px-5 py-3">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {projectSummaries.map(({ project, myPoints, totalPoints, revenue, currency }) => (
                  <tr key={project.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${project.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        <Link to={`/projects/${project.slug}/dashboard`} className="text-white hover:text-purple-400 transition-colors">
                          {project.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-purple-400">
                        <Star className="w-3 h-3" />
                        {myPoints.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-400 hidden sm:table-cell">
                      {totalPoints > 0 ? `${((myPoints / totalPoints) * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={revenue > 0 ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>
                        {revenue > 0 ? formatCurrency(revenue, currency) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
