import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Calendar, CheckSquare, Users, Share2, DollarSign, Mic } from 'lucide-react'

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/admin/meetings', icon: Calendar, label: 'Meetings' },
  { to: '/admin/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/admin/members', icon: Users, label: 'Members' },
  { to: '/admin/social', icon: Share2, label: 'Social Posts' },
  { to: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
  { to: '/admin/pitch', icon: Mic, label: 'Pitch Day' },
]

export function AdminLayout() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
      {/* Sidebar */}
      <nav className="w-48 flex-shrink-0">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Admin</p>
        <div className="flex flex-col gap-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-500/15 text-purple-300 font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
