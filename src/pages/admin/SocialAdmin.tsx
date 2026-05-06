import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SocialPost } from '../../types'
import { formatDateShort } from '../../lib/utils'
import { Check, X, ExternalLink } from 'lucide-react'

type EnrichedPost = Omit<SocialPost, 'projects'> & {
  users: { display_name: string }
  projects: { title: string; slug: string }
}

export function SocialAdmin() {
  const [posts, setPosts] = useState<EnrichedPost[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [approvePoints, setApprovePoints] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('social_posts')
      .select('*, users(display_name), projects(title, slug)')
      .eq('status', filter)
      .order('submitted_at', { ascending: filter === 'pending' })
    setPosts((data as EnrichedPost[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(post: EnrichedPost) {
    const pts = parseInt(approvePoints[post.id] ?? '10') || 10
    setProcessingId(post.id)
    const { data: { user } } = await supabase.auth.getUser()
    await Promise.all([
      supabase.from('social_posts').update({
        status: 'approved',
        points_awarded: pts,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', post.id),
      supabase.from('point_ledger').insert({
        project_id: post.project_id,
        user_id: post.user_id,
        source: 'social_post',
        points: pts,
        reference_id: post.id,
        note: `Social media post approved (${post.platform})`,
        awarded_by: user?.id,
      }),
    ])
    setPosts(prev => prev.filter(p => p.id !== post.id))
    setProcessingId(null)
  }

  async function reject(post: EnrichedPost, note: string) {
    setProcessingId(post.id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('social_posts').update({
      status: 'rejected',
      review_note: note || 'Does not meet requirements.',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', post.id)
    setPosts(prev => prev.filter(p => p.id !== post.id))
    setProcessingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Social Posts</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors capitalize ${
              filter === s ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-zinc-500 text-sm py-8">No {filter} posts.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-medium">{post.users?.display_name}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">{post.platform}</span>
                    <span className="text-zinc-500 text-xs">{post.projects?.title}</span>
                    <span className="text-zinc-600 text-xs ml-auto">{formatDateShort(post.submitted_at)}</span>
                  </div>
                  <a href={post.post_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    {post.post_url.length > 60 ? post.post_url.slice(0, 60) + '…' : post.post_url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>

                {filter === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      value={approvePoints[post.id] ?? '10'}
                      onChange={e => setApprovePoints(prev => ({ ...prev, [post.id]: e.target.value }))}
                      className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-center text-sm text-white focus:outline-none focus:border-purple-500"
                      title="Points to award"
                    />
                    <span className="text-zinc-600 text-xs">pts</span>
                    <button onClick={() => approve(post)} disabled={processingId === post.id}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):') ?? ''
                        reject(post, reason)
                      }}
                      disabled={processingId === post.id}
                      className="flex items-center gap-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800/40 disabled:opacity-50 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors">
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}

                {filter === 'approved' && (
                  <span className="text-emerald-400 text-sm font-medium flex-shrink-0">+{post.points_awarded} pts</span>
                )}

                {filter === 'rejected' && post.review_note && (
                  <span className="text-red-400 text-sm flex-shrink-0">{post.review_note}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
