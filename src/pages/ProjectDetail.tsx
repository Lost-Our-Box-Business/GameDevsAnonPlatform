import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project, ProjectMember } from '../types'
import { useAuthContext } from '../contexts/AuthContext'
import { Gamepad2, ExternalLink, GitBranch, MessageSquare, HardDrive, ArrowRight, FileText } from 'lucide-react'
import { formatDateShort } from '../lib/utils'

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { session } = useAuthContext()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [membership, setMembership] = useState<ProjectMember | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!proj) { setLoading(false); return }
      setProject(proj)

      const [{ count }, { data: mem }] = await Promise.all([
        supabase.from('project_members').select('*', { count: 'exact', head: true }).eq('project_id', proj.id),
        session
          ? supabase.from('project_members').select('*').eq('project_id', proj.id).eq('user_id', session.user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      setMemberCount(count ?? 0)
      setMembership(mem)
      setLoading(false)
    }
    load()
  }, [slug, session])

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!project) return (
    <div className="max-w-6xl mx-auto px-4 py-32 text-center">
      <p className="text-zinc-400">Project not found.</p>
    </div>
  )

  const isMember = !!membership
  const isActive = project.status === 'active'

  function handleJoin() {
    if (!session) navigate('/login', { state: { from: { pathname: `/projects/${slug}/join` } } })
    else navigate(`/projects/${slug}/join`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:w-96 flex-shrink-0 bg-zinc-800">
            {project.cover_image_url ? (
              <img src={project.cover_image_url} alt={project.title} className="w-full h-full object-cover aspect-video md:aspect-auto min-h-56" />
            ) : (
              <div className="w-full flex items-center justify-center min-h-56">
                <Gamepad2 className="w-20 h-20 text-zinc-700" />
              </div>
            )}
          </div>
          <div className="p-8 flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full border capitalize ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                }`}>
                  {project.status}
                </span>
                {project.hashtag && (
                  <span className="text-xs text-purple-400">{project.hashtag}</span>
                )}
                <span className="text-xs text-zinc-600 ml-auto">{memberCount} members</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">{project.title}</h1>
              {project.description && (
                <p className="text-zinc-400 leading-relaxed">{project.description}</p>
              )}
              {project.released_at && (
                <p className="text-zinc-500 text-sm mt-2">Released {formatDateShort(project.released_at)}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              {isMember ? (
                <Link
                  to={`/projects/${slug}/dashboard`}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : isActive ? (
                <button
                  onClick={handleJoin}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Join Project <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
              {project.steam_url && (
                <a
                  href={project.steam_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  View on Steam <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Member links (only shown to members) */}
      {isMember && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {project.github_repo_url && (
            <a href={project.github_repo_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
              <GitBranch className="w-5 h-5 text-zinc-400" />
              <span className="text-white text-sm font-medium">GitHub Repo</span>
            </a>
          )}
          {project.discord_invite_url && (
            <a href={project.discord_invite_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span className="text-white text-sm font-medium">Discord</span>
            </a>
          )}
          {project.drive_folder_url && (
            <a href={project.drive_folder_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
              <HardDrive className="w-5 h-5 text-yellow-400" />
              <span className="text-white text-sm font-medium">Google Drive</span>
            </a>
          )}
          {project.gdd_content && (
            <a href={project.gdd_content} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span className="text-white text-sm font-medium">Game Design Doc</span>
            </a>
          )}
        </div>
      )}

      {/* Not a member CTA */}
      {!isMember && isActive && (
        <div className="bg-gradient-to-br from-purple-950/40 to-zinc-900 border border-purple-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Want to contribute?</h2>
          <p className="text-zinc-400 mb-6">
            Join this project to get access to the GitHub repo, Discord channel, Google Drive, and start earning points toward a share of the profits.
          </p>
          <button
            onClick={handleJoin}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Join This Project
          </button>
          {!session && (
            <p className="text-zinc-500 text-sm mt-3">You'll be asked to sign in first.</p>
          )}
        </div>
      )}
    </div>
  )
}
