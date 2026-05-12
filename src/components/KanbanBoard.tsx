import type { GitHubTask } from '../types'
import { TaskCard } from './TaskCard'
import { RefreshCw } from 'lucide-react'

interface Props {
  tasks: GitHubTask[]
  projectId: string
  columnOrder?: string[] | null
  onSync?: () => void
  syncing?: boolean
}

const COLUMN_ORDER_FALLBACK = ['Todo', 'In Progress', 'In Review', 'Blocked', 'Done']

export function KanbanBoard({ tasks, projectId: _projectId, columnOrder, onSync, syncing }: Props) {
  const order = columnOrder?.length ? columnOrder : COLUMN_ORDER_FALLBACK
  const statuses = [...new Set(tasks.map(t => t.status ?? 'No Status'))]
  const orderedStatuses = [
    ...order.filter(s => statuses.includes(s)),
    ...statuses.filter(s => !order.includes(s)),
  ]

  const columns = orderedStatuses.map(status => ({
    status,
    tasks: tasks.filter(t => (t.status ?? 'No Status') === status),
  }))

  return (
    <div>
      {onSync && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync with GitHub'}
          </button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.status} className="flex-shrink-0 w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-zinc-300 font-medium text-sm">{col.status}</h3>
              <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                {col.tasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {col.tasks.map(task => (
                <TaskCard key={task.id} task={task} compact />
              ))}
              {col.tasks.length === 0 && (
                <div className="border border-dashed border-zinc-800 rounded-lg p-4 text-center text-zinc-600 text-sm">
                  Empty
                </div>
              )}
            </div>
          </div>
        ))}
        {columns.length === 0 && (
          <p className="text-zinc-500 text-sm py-8">
            No tasks yet. Sync with GitHub to load tasks.
          </p>
        )}
      </div>
    </div>
  )
}
