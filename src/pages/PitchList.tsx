import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { PitchSession } from '../types'
import { Mic, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  setup: { label: 'Setup', color: 'text-zinc-400 bg-zinc-800' },
  pitching: { label: 'Live — Pitching', color: 'text-emerald-400 bg-emerald-500/10' },
  voting: { label: 'Live — Voting', color: 'text-yellow-400 bg-yellow-500/10' },
  closed: { label: 'Closed', color: 'text-zinc-500 bg-zinc-800' },
}

export function PitchList() {
  const [sessions, setSessions] = useState<PitchSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('pitch_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? [])
        setLoading(false)
      })
  }, [])

  const active = sessions.filter(s => ['pitching', 'voting'].includes(s.status))
  const past = sessions.filter(s => s.status === 'closed')

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Mic className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pitch Day</h1>
          <p className="text-zinc-400 text-sm">Vote on which game we build next</p>
        </div>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Loading…</p>}

      {!loading && active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Live Now</h2>
          <div className="flex flex-col gap-3">
            {active.map(s => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {!loading && past.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Past Sessions</h2>
          <div className="flex flex-col gap-3">
            {past.map(s => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {!loading && sessions.length === 0 && (
        <p className="text-zinc-500 text-sm py-8 text-center">No pitch sessions yet.</p>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: PitchSession }) {
  const badge = STATUS_LABELS[session.status] ?? STATUS_LABELS.closed
  const isLive = ['pitching', 'feedback', 'voting'].includes(session.status)
  return (
    <Link
      to={`/pitch/${session.id}`}
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        {isLive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />}
        <div>
          <p className="text-white font-medium">{session.title}</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
      </div>
    </Link>
  )
}
