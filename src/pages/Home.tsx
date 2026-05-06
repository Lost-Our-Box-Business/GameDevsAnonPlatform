import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import { ProjectCard } from '../components/ProjectCard'
import { Gamepad2, Users, Trophy, Zap, Calendar, ExternalLink } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    icon: Zap,
    title: 'Pitch Day',
    desc: 'Members pitch their game ideas. The group votes on which project to build next.',
  },
  {
    icon: Users,
    title: 'Form a Team',
    desc: 'Join the project, select your role, sign the profit share agreement, and get access to all tools.',
  },
  {
    icon: Calendar,
    title: 'Build Together',
    desc: 'Meet every Thursday to demo progress, collaborate, and push the game forward.',
  },
  {
    icon: Trophy,
    title: 'Ship & Share Profits',
    desc: 'Release on Steam. Revenue is split proportionally based on each member\'s contribution points.',
  },
]

export function Home() {
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [completedProjects, setCompletedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })

      if (data) {
        setActiveProjects(data.filter(p => p.status === 'active'))
        setCompletedProjects(data.filter(p => p.status === 'completed'))
      }
      setLoading(false)
    }
    fetchProjects()
  }, [])

  const featuredProject = activeProjects[0]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-3xl rounded-full" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm px-4 py-1.5 rounded-full mb-6">
            <Gamepad2 className="w-4 h-4" />
            Game dev meetup · Every Thursday
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Make games.<br />
            <span className="text-purple-400">Share the win.</span>
          </h1>
          <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-10">
            Lost Our Box is a weekly game development group in the Orlando area. We build complete, shippable games together and split the profits based on contribution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projects"
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              See Our Projects
            </Link>
            <a
              href="https://www.meetup.com/lost-our-box-game-developers/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Join on Meetup <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Current project spotlight */}
      {featuredProject && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Currently Building</h2>
            <Link to="/projects" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
              All projects →
            </Link>
          </div>
          <div className="bg-zinc-900 border border-purple-500/20 rounded-2xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-80 flex-shrink-0 bg-zinc-800 aspect-video md:aspect-auto">
                {featuredProject.cover_image_url ? (
                  <img
                    src={featuredProject.cover_image_url}
                    alt={featuredProject.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center min-h-48">
                    <Gamepad2 className="w-16 h-16 text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-2">Active Project</span>
                <h3 className="text-3xl font-bold text-white mb-3">{featuredProject.title}</h3>
                {featuredProject.description && (
                  <p className="text-zinc-400 mb-6 leading-relaxed">{featuredProject.description}</p>
                )}
                <div className="flex gap-3">
                  <Link
                    to={`/projects/${featuredProject.slug}`}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                  >
                    Learn More
                  </Link>
                  <Link
                    to={`/projects/${featuredProject.slug}/join`}
                    className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium px-6 py-2 rounded-lg transition-colors"
                  >
                    Join Project
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-zinc-900/40 border-y border-zinc-800/50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              We run a structured process that takes a game from pitch to published, with every contributor sharing in the success.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <step.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Past projects */}
      {!loading && completedProjects.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Games We've Shipped</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-br from-purple-950/50 to-zinc-900 border border-purple-500/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to build something?</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Show up on Thursday, get involved, and start earning your share of the next game we ship.
          </p>
          <a
            href="https://www.meetup.com/lost-our-box-game-developers/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Find us on Meetup <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
