import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project, Meeting, GitHubTask, ProjectMember } from '../types'
import { useAuthContext } from '../contexts/AuthContext'
import { MeetingCard } from '../components/MeetingCard'
import { TaskCard } from '../components/TaskCard'
import { KanbanBoard } from '../components/KanbanBoard'
import { GitBranch, MessageSquare, HardDrive, FileText, Star, LayoutGrid, List, Share2 } from 'lucide-react'

interface Props {
  boardView?: boolean
}

export function Dashboard({ boardView = false }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const { session, user } = useAuthContext()

  const [project, setProject] = useState<Project | null>(null)
  const [_membership, setMembership] = useState<ProjectMember | null>(null)
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null)
  const [myTasks, setMyTasks] = useState<GitHubTask[]>([])
  const [allTasks, setAllTasks] = useState<GitHubTask[]>([])
  const [myPoints, setMyPoints] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [notMember, setNotMember] = useState(false)

  const loadData = useCallback(async () => {
    if (!slug || !session || !user) return

    const { data: proj } = await supabase.from('projects').select('*').eq('slug', slug).single()
    if (!proj) return

    const { data: mem } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', proj.id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!mem) { setNotMember(true); setLoading(false); return }
    if (!mem.onboarding_completed_at) {
      window.location.href = `/projects/${slug}/join`
      return
    }
    if (!mem.agreement_signature_url) {
      window.location.href = `/projects/${slug}/join`
      return
    }

    setProject(proj)
    setMembership(mem)

    const now = new Date().toISOString()

    const [
      { data: meetings },
      { data: tasks },
      { data: bonusLedger },
    ] = await Promise.all([
      supabase.from('meetings').select('*').eq('project_id', proj.id).gte('date', now).order('date').limit(1),
      supabase.from('github_tasks').select('*').eq('project_id', proj.id).order('status'),
      // Social post + bonus points that aren't tied to a specific task
      supabase.from('point_ledger').select('user_id, points').eq('project_id', proj.id).neq('source', 'task'),
    ])

    const allTasksData = tasks ?? []
    const completedStatuses = ['Done', 'In Review']
    const earnedTasks = allTasksData.filter(t => completedStatuses.includes(t.status ?? ''))

    // Task points: sum points on completed/reviewed tasks
    const myTaskPoints = earnedTasks
      .filter(t => t.assignee_user_id === session.user.id)
      .reduce((s, t) => s + t.points, 0)
    const totalTaskPoints = earnedTasks.reduce((s, t) => s + t.points, 0)

    // Bonus/social points from ledger
    const myBonusPoints = (bonusLedger ?? [])
      .filter(e => e.user_id === session.user.id)
      .reduce((s, e) => s + e.points, 0)
    const totalBonusPoints = (bonusLedger ?? []).reduce((s, e) => s + e.points, 0)

    setNextMeeting(meetings?.[0] ?? null)
    setAllTasks(allTasksData)
    setMyTasks(allTasksData.filter(t => t.assignee_user_id === session.user.id))
    setMyPoints(myTaskPoints + myBonusPoints)
    setTotalPoints(totalTaskPoints + totalBonusPoints)
    setLoading(false)
  }, [slug, session, user])

  useEffect(() => { loadData() }, [loadData])

  async function syncGitHub() {
    if (!project) return
    setSyncing(true)
    try {
      await fetch(`/.netlify/functions/sync-github-tasks?project_id=${project.id}`)
      await loadData()
    } catch {
      // sync failed silently, user can retry
    }
    setSyncing(false)
  }

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notMember) return <Navigate to={`/projects/${slug}`} replace />
  if (!project) return null

  const sharePercent = totalPoints > 0 ? ((myPoints / totalPoints) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-zinc-500 text-sm mb-1">Your dashboard for</p>
          <h1 className="text-2xl font-bold text-white">{project.title}</h1>
          {project.hashtag && <p className="text-purple-400 text-sm">{project.hashtag}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            to={`/projects/${slug}/dashboard`}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              !boardView ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" /> Overview
          </Link>
          <Link
            to={`/projects/${slug}/board`}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              boardView ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Board
          </Link>
        </div>
      </div>

      {boardView ? (
        <KanbanBoard tasks={allTasks} projectId={project.id} columnOrder={project.github_column_order} onSync={syncGitHub} syncing={syncing} />
      ) : (
        <div className="space-y-6">
          {/* Next meeting */}
          {nextMeeting && (
            <section>
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Next Meeting</h2>
              <MeetingCard meeting={nextMeeting} />
            </section>
          )}

          {/* Stats + Quick links */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Points */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">My Points</h2>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-white">{myPoints.toLocaleString()}</span>
                <span className="text-zinc-500 text-lg mb-1">/ {totalPoints.toLocaleString()}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalPoints > 0 ? (myPoints / totalPoints) * 100 : 0}%` }}
                />
              </div>
              <p className="text-zinc-400 text-sm">
                <span className="text-purple-400 font-semibold">{sharePercent}%</span> of project contribution
              </p>
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <Link to={`/projects/${slug}/social`} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Share2 className="w-3 h-3" /> Earn points by sharing on social media
                </Link>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Project Links</h2>
              <div className="grid grid-cols-2 gap-2">
                {project.github_repo_url && (
                  <a href={project.github_repo_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2.5 transition-colors">
                    <GitBranch className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-300">GitHub</span>
                  </a>
                )}
                {project.discord_invite_url && (
                  <a href={project.discord_invite_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2.5 transition-colors">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-zinc-300">Discord</span>
                  </a>
                )}
                {project.drive_folder_url && (
                  <a href={project.drive_folder_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2.5 transition-colors">
                    <HardDrive className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-zinc-300">Drive</span>
                  </a>
                )}
                {project.gdd_content && (
                  <a href={project.gdd_content} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2.5 transition-colors">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-zinc-300">GDD</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* My tasks */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">My Tasks</h2>
              <div className="flex items-center gap-1 text-purple-400 text-sm">
                <Star className="w-4 h-4" />
                <span>{myTasks.reduce((s, t) => s + t.points, 0)} pts</span>
              </div>
            </div>
            {myTasks.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500 text-sm">
                No tasks assigned to you yet.{' '}
                <button onClick={syncGitHub} className="text-purple-400 hover:text-purple-300 underline">Sync with GitHub</button>
                {' '}to load tasks.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myTasks.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
