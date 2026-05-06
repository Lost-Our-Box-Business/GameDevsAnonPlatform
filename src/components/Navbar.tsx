import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Gamepad2, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { session, user } = useAuthContext()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg hover:text-purple-400 transition-colors">
          <Gamepad2 className="w-6 h-6 text-purple-500" />
          Lost Our Box
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/projects" className="text-zinc-400 hover:text-white transition-colors">Projects</Link>
          {session && (
            <Link to="/profile" className="text-zinc-400 hover:text-white transition-colors">Profile</Link>
          )}
          {user?.is_admin && (
            <Link to="/admin" className="text-zinc-400 hover:text-purple-400 transition-colors">Admin</Link>
          )}
          {session ? (
            <button
              onClick={handleSignOut}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-zinc-400"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 flex flex-col gap-4 text-sm">
          <Link to="/projects" className="text-zinc-400 hover:text-white" onClick={() => setMobileOpen(false)}>Projects</Link>
          {session && (
            <Link to="/profile" className="text-zinc-400 hover:text-white" onClick={() => setMobileOpen(false)}>Profile</Link>
          )}
          {user?.is_admin && (
            <Link to="/admin" className="text-zinc-400 hover:text-purple-400" onClick={() => setMobileOpen(false)}>Admin</Link>
          )}
          {session ? (
            <button onClick={handleSignOut} className="text-left text-zinc-400 hover:text-white">Sign Out</button>
          ) : (
            <Link to="/login" className="text-purple-400" onClick={() => setMobileOpen(false)}>Sign In</Link>
          )}
        </div>
      )}
    </nav>
  )
}
