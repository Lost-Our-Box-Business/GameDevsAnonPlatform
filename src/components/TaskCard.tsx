import type { GitHubTask } from '../types'
import { ExternalLink, Star } from 'lucide-react'

interface Props {
  task: GitHubTask
  compact?: boolean
}

const statusColors: Record<string, string> = {
  'Todo': 'bg-zinc-700 text-zinc-300',
  'In Progress': 'bg-blue-500/20 text-blue-400',
  'Done': 'bg-emerald-500/20 text-emerald-400',
  'Blocked': 'bg-red-500/20 text-red-400',
  'In Review': 'bg-amber-500/20 text-amber-400',
}

export function TaskCard({ task, compact = false }: Props) {
  const statusColor = task.status ? (statusColors[task.status] ?? 'bg-zinc-700 text-zinc-300') : 'bg-zinc-700 text-zinc-300'

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-lg ${compact ? 'p-3' : 'p-4'} hover:border-zinc-600 transition-colors`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {task.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                {task.status}
              </span>
            )}
            {task.labels.map(label => (
              <span key={label} className="text-xs px-2 py-0.5 bg-zinc-700 text-zinc-400 rounded-full">
                {label}
              </span>
            ))}
          </div>
          <p className={`text-white font-medium ${compact ? 'text-sm' : ''} line-clamp-2`}>
            {task.title}
          </p>
          {!compact && task.description && (
            <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.points > 0 && (
            <span className="flex items-center gap-1 text-purple-400 text-xs font-medium">
              <Star className="w-3 h-3" />
              {task.points}
            </span>
          )}
          {task.html_url && (
            <a
              href={task.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
      {!compact && task.assignee_github_username && (
        <p className="text-zinc-500 text-xs mt-2">@{task.assignee_github_username}</p>
      )}
    </div>
  )
}
