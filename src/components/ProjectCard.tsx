import { Link } from 'react-router-dom'
import type { Project } from '../types'
import { ExternalLink, Gamepad2 } from 'lucide-react'

interface Props {
  project: Project
  memberCount?: number
}

export function ProjectCard({ project, memberCount }: Props) {
  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    completed: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    archived: 'bg-zinc-700/20 text-zinc-600 border-zinc-700/30',
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group">
      <div className="aspect-video bg-zinc-800 relative overflow-hidden">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`text-xs px-2 py-1 rounded-full border capitalize ${statusColors[project.status]}`}>
            {project.status}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-1">{project.title}</h3>
        {project.description && (
          <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{project.description}</p>
        )}
        <div className="flex items-center justify-between">
          {memberCount !== undefined && (
            <span className="text-zinc-500 text-xs">{memberCount} members</span>
          )}
          <div className="flex gap-2 ml-auto">
            {project.status === 'completed' && project.steam_url && (
              <a
                href={project.steam_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <Link
              to={`/projects/${project.slug}`}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg transition-colors"
            >
              {project.status === 'active' ? 'View' : 'Details'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
