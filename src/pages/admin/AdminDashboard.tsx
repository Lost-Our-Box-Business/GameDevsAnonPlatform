import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { Gamepad2, Users, Share2, CheckSquare } from 'lucide-react'

interface Stats {
  activeProjects: number
  totalMembers: number
  pendingSocial: number
  totalTasks: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ activeProjects: 0, totalMembers: 0, pendingSocial: 0, totalTasks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: activeProjects },
        { count: totalMembers },
        { count: pendingSocial },
        { count: totalTasks },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('project_members').select('*', { count: 'exact', head: true }),
        supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('github_tasks').select('*', { count: 'exact', head: true }),
      ])
      setStats({
        activeProjects: activeProjects ?? 0,
        totalMembers: totalMembers ?? 0,
        pendingSocial: pendingSocial ?? 0,
        totalTasks: totalTasks ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const CARDS = [
    { icon: Gamepad2, label: 'Active Projects', value: stats.activeProjects, to: '/admin/projects', color: 'text-purple-400' },
    { icon: Users, label: 'Total Members', value: stats.totalMembers, to: '/admin/members', color: 'text-blue-400' },
    { icon: Share2, label: 'Pending Social Posts', value: stats.pendingSocial, to: '/admin/social', color: 'text-amber-400' },
    { icon: CheckSquare, label: 'Total Tasks', value: stats.totalTasks, to: '/admin/tasks', color: 'text-emerald-400' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map(card => (
            <Link key={card.to} to={card.to}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-colors">
              <card.icon className={`w-5 h-5 ${card.color} mb-3`} />
              <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
              <div className="text-zinc-500 text-sm">{card.label}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
