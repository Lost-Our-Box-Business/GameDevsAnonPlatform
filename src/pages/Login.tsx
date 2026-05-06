import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Gamepad2, Mail, Lock, ArrowRight } from 'lucide-react'

type Mode = 'signin' | 'signup' | 'magic'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate(from, { replace: true })
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) { setError('Display name is required.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) setError(error.message)
    else navigate(from, { replace: true })
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + from },
    })
    if (error) setError(error.message)
    else setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Gamepad2 className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-zinc-400 mt-1">
            {mode === 'signup' ? 'Join the Lost Our Box community' : 'Sign in to access your projects'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {magicSent ? (
            <div className="text-center py-4">
              <Mail className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h2 className="text-white font-semibold mb-2">Check your email</h2>
              <p className="text-zinc-400 text-sm">
                We sent a magic link to <span className="text-white">{email}</span>. Click it to sign in.
              </p>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 mb-6">
                {(['signin', 'signup', 'magic'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                      mode === m
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Magic Link'}
                  </button>
                ))}
              </div>

              <form onSubmit={mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleMagicLink} className="flex flex-col gap-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-zinc-400 text-sm mb-1">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 text-sm mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {mode !== 'magic' && (
                  <div>
                    <label className="block text-zinc-400 text-sm mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-red-400 text-sm bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Please wait…' : (
                    <>
                      {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Magic Link'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-4">
          By signing up you agree to participate in the group's collaboration guidelines.{' '}
          <Link to="/" className="text-purple-400 hover:text-purple-300">Learn more</Link>
        </p>
      </div>
    </div>
  )
}
