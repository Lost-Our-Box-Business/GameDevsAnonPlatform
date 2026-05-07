import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Project, Meeting } from '../../types'
import { formatDate } from '../../lib/utils'
import { Plus, Trash2, Pencil } from 'lucide-react'

const EMPTY_FORM = { project_id: '', title: '', date: '', location: '', meetup_url: '', description: '' }

export function MeetingsAdmin() {
  const [projects, setProjects] = useState<Project[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [filterProject, setFilterProject] = useState<string>('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const [{ data: projs }, { data: meets }] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'active').order('title'),
      supabase.from('meetings').select('*').order('date', { ascending: false }),
    ])
    setProjects(projs ?? [])
    setMeetings(meets ?? [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.project_id || !form.title || !form.date) return
    setSaving(true)
    if (editing) {
      await supabase.from('meetings').update(form).eq('id', editing)
    } else {
      await supabase.from('meetings').insert(form)
    }
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteMeeting(id: string) {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('meetings').delete().eq('id', id)
    setMeetings(prev => prev.filter(m => m.id !== id))
  }

  function startEdit(m: Meeting) {
    setForm({ project_id: m.project_id, title: m.title, date: m.date.slice(0, 16), location: m.location ?? '', meetup_url: m.meetup_url ?? '', description: m.description ?? '' })
    setEditing(m.id)
    setShowForm(true)
  }

  const filtered = filterProject === 'all' ? meetings : meetings.filter(m => m.project_id === filterProject)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Meetings</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add Meeting
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">{editing ? 'Edit Meeting' : 'New Meeting'}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Project *', key: 'project_id', type: 'select' },
              { label: 'Title *', key: 'title', type: 'text', placeholder: 'Planning Meeting 1' },
              { label: 'Date & Time *', key: 'date', type: 'datetime-local' },
              { label: 'Location', key: 'location', type: 'text', placeholder: 'Lost Our Box Office, Plano TX' },
              { label: 'Meetup URL', key: 'meetup_url', type: 'url', placeholder: 'https://meetup.com/...' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-zinc-400 text-sm mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                    <option value="">Select project…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={(form as any)[field.key]} placeholder={field.placeholder}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-zinc-400 text-sm mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="What will we cover?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Meeting'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map(m => (
          <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-zinc-500 text-xs mb-1">{projects.find(p => p.id === m.project_id)?.title ?? m.project_id}</p>
              <p className="text-white font-medium">{m.title}</p>
              <p className="text-zinc-400 text-sm">{formatDate(m.date)}</p>
              {m.location && <p className="text-zinc-500 text-xs">{m.location}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => startEdit(m)} className="text-zinc-500 hover:text-white p-1.5 rounded transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => deleteMeeting(m.id)} className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-zinc-500 text-sm py-4">No meetings yet.</p>}
      </div>
    </div>
  )
}
