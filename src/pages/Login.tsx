import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Gamepad2 } from 'lucide-react'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function Login() {
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signInWithGitHub() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + from },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success the browser redirects to GitHub — no further action needed here
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Gamepad2 className="w-10 h-10 text-purple-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Welcome to Lost Our Box</h1>
          <p className="text-zinc-400 mt-1 text-sm">Sign in to access your projects and track contributions</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={signInWithGitHub}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
          >
            <GitHubIcon />
            {loading ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
          </button>

          <p className="text-zinc-600 text-xs text-center mt-4 leading-relaxed">
            Your GitHub account is used to access repositories and automatically credit your completed tasks.
          </p>
        </div>
      </div>
    </div>
  )
}
