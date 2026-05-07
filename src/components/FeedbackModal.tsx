import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PitchItem, PitchFeedback } from '../types'

interface Props {
  item: PitchItem
  sessionId: string
  existing?: PitchFeedback
  userId: string
  onClose: () => void
}

const FIELDS: { key: keyof Pick<PitchFeedback, 'feasibility' | 'originality' | 'money_potential' | 'fun_to_play' | 'fun_to_make' | 'pitching_skills'>; label: string }[] = [
  { key: 'feasibility', label: 'Feasibility' },
  { key: 'originality', label: 'Originality' },
  { key: 'money_potential', label: 'Money-Making Potential' },
  { key: 'fun_to_play', label: 'Fun to Play' },
  { key: 'fun_to_make', label: 'Fun to Make' },
  { key: 'pitching_skills', label: 'Pitching Skills' },
]

type Ratings = Record<string, number>

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              n <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function FeedbackModal({ item, sessionId, existing, userId, onClose }: Props) {
  const [ratings, setRatings] = useState<Ratings>(() => {
    if (existing) {
      return {
        feasibility: existing.feasibility ?? 0,
        originality: existing.originality ?? 0,
        money_potential: existing.money_potential ?? 0,
        fun_to_play: existing.fun_to_play ?? 0,
        fun_to_make: existing.fun_to_make ?? 0,
        pitching_skills: existing.pitching_skills ?? 0,
      }
    }
    return { feasibility: 0, originality: 0, money_potential: 0, fun_to_play: 0, fun_to_make: 0, pitching_skills: 0 }
  })
  const [comments, setComments] = useState(existing?.comments ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    await supabase.from('pitch_feedback').upsert({
      session_id: sessionId,
      pitch_item_id: item.id,
      user_id: userId,
      ...ratings,
      comments: comments || null,
    }, { onConflict: 'pitch_item_id,user_id' })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Feedback</h2>
            <p className="text-zinc-400 text-sm">{item.name} — {item.pitcher_name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-zinc-500 text-xs mb-4 bg-zinc-800 rounded-lg px-3 py-2">
          Your feedback is private and will be sent directly to the pitcher after the session.
        </p>

        <div className="flex flex-col gap-4 mb-4">
          {FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <span className="text-zinc-300 text-sm">{f.label}</span>
              <StarRating value={ratings[f.key] ?? 0} onChange={v => setRatings(r => ({ ...r, [f.key]: v }))} />
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-zinc-400 text-sm mb-1">Comments</label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            rows={3}
            placeholder="Any additional thoughts…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Submit Feedback'}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
