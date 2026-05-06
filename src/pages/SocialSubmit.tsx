import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project, SocialPost } from '../types'
import { useAuthContext } from '../contexts/AuthContext'
import { formatDateShort } from '../lib/utils'
import { Share2, Check, Clock, X, ExternalLink } from 'lucide-react'
import type { SocialPlatform } from '../types'

const PLATFORMS: { id: SocialPlatform; label: string; color: string }[] = [
  { id: 'x', label: 'X (Twitter)', color: 'text-zinc-300' },
  { id: 'instagram', label: 'Instagram', color: 'text-pink-400' },
  { id: 'tiktok', label: 'TikTok', color: 'text-cyan-400' },
  { id: 'youtube', label: 'YouTube', color: 'text-red-400' },
]

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-amber-400" />,
  approved: <Check className="w-4 h-4 text-emerald-400" />,
  rejected: <X className="w-4 h-4 text-red-400" />,
}

export function SocialSubmit() {
  const { slug } = useParams<{ slug: string }>()
  const { session } = useAuthContext()

  const [project, setProject] = useState<Project | null>(null)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [platform, setPlatform] = useState<SocialPlatform>('x')
  const [url, setUrl] = useState('')
  const [_note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!slug || !session) return
      const { data: proj } = await supabase.from('projects').select('*').eq('slug', slug).single()
      if (!proj) return
      setProject(proj)

      const { data: myPosts } = await supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', proj.id)
        .eq('user_id', session.user.id)
        .order('submitted_at', { ascending: false })

      setPosts(myPosts ?? [])
      setLoading(false)
    }
    load()
  }, [slug, session])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) { setError('Please enter a post URL.'); return }
    setSubmitting(true)
    setError('')

    const { error: insertError } = await supabase.from('social_posts').insert({
      project_id: project!.id,
      user_id: session!.user.id,
      platform,
      post_url: url.trim(),
    })

    if (insertError) { setError(insertError.message); setSubmitting(false); return }

    setUrl('')
    setNote('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)

    const { data: updated } = await supabase
      .from('social_posts')
      .select('*')
      .eq('project_id', project!.id)
      .eq('user_id', session!.user.id)
      .order('submitted_at', { ascending: false })
    setPosts(updated ?? [])
    setSubmitting(false)
  }

  if (loading || !project) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Social Media Marketing</h1>
        <p className="text-zinc-400 text-sm">
          Earn points by promoting <strong className="text-white">{project.title}</strong> on social media.
          Submit a link to your post and an admin will review it.
          {project.hashtag && <> Use the hashtag <span className="text-purple-400">{project.hashtag}</span>.</>}
        </p>
      </div>

      {/* Submit form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-purple-400" /> Submit a Post
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={`text-sm py-2 px-3 rounded-lg border transition-colors text-left ${
                    platform === p.id
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className={p.color}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-zinc-400 text-sm mb-1">Post URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={submitting}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
            {submitted ? <><Check className="w-4 h-4" /> Submitted!</> : submitting ? 'Submitting…' : 'Submit for Review'}
          </button>
        </form>
      </div>

      {/* Past submissions */}
      {posts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">My Submissions</h2>
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                {STATUS_ICONS[post.status]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">{post.platform}</span>
                    <span className="text-zinc-600 text-xs">{formatDateShort(post.submitted_at)}</span>
                    <span className={`text-xs capitalize ml-auto ${
                      post.status === 'approved' ? 'text-emerald-400' : post.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {post.status}
                    </span>
                  </div>
                  <a href={post.post_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-zinc-300 hover:text-purple-400 truncate block transition-colors">
                    {post.post_url}
                  </a>
                  {post.status === 'approved' && post.points_awarded && (
                    <p className="text-emerald-400 text-xs mt-1">+{post.points_awarded} points awarded</p>
                  )}
                  {post.status === 'rejected' && post.review_note && (
                    <p className="text-red-400 text-xs mt-1">{post.review_note}</p>
                  )}
                </div>
                <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400 flex-shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
