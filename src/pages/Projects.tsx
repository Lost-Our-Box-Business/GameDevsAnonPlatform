import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import { ProjectCard } from '../components/ProjectCard'
import { Gamepad2 } from 'lucide-react'

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? [])
        setLoading(false)
      })
  }, [])

  const active = projects.filter(p => p.status === 'active')
  const completed = projects.filter(p => p.status === 'completed')

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Projects</h1>
        <p className="text-zinc-400">All games built by the Lost Our Box community.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                Active Projects
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {active.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-zinc-500 rounded-full" />
                Completed Games
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {completed.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </section>
          )}

          {projects.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No projects yet. Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
