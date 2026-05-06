import type { Meeting } from '../types'
import { Calendar, MapPin, ExternalLink } from 'lucide-react'
import { formatDate } from '../lib/utils'

interface Props {
  meeting: Meeting
}

export function MeetingCard({ meeting }: Props) {
  const isPast = new Date(meeting.date) < new Date()

  return (
    <div className={`bg-zinc-900 border rounded-xl p-5 ${isPast ? 'border-zinc-800 opacity-60' : 'border-purple-500/30 bg-purple-950/10'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className={isPast ? '' : 'text-purple-300 font-medium'}>
              {formatDate(meeting.date)}
            </span>
          </div>
          <h3 className="text-white font-semibold text-lg">{meeting.title}</h3>
          {meeting.location && (
            <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
              <MapPin className="w-3 h-3" />
              {meeting.location}
            </div>
          )}
          {meeting.description && (
            <p className="text-zinc-400 text-sm mt-2">{meeting.description}</p>
          )}
        </div>
        {meeting.meetup_url && !isPast && (
          <a
            href={meeting.meetup_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            RSVP <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}
