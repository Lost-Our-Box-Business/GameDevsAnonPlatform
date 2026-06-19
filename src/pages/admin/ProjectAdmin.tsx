import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../types'
import { slugify } from '../../lib/utils'
import { Plus, Pencil, ArrowLeft, Save } from 'lucide-react'

const EMPTY_FORM: Partial<Project> = {
  title: '', slug: '', status: 'active', description: '',
  cover_image_url: '', steam_url: '',
  github_repo_url: '', github_repo_owner: '', github_repo_name: '',
  github_project_number: undefined, github_project_owner_type: 'user',
  drive_folder_url: '', discord_invite_url: '', discord_channel_id: '',
  hashtag: '', gdd_content: '', profit_share_text: '',
}

export function ProjectAdmin() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState<Partial<Project>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'basic' | 'integrations' | 'content'>('basic')

  useEffect(() => {
    supabase.from('projects').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  useEffect(() => {
    if (!id) { setForm(EMPTY_FORM); return }
    supabase.from('projects').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setForm(data) })
  }, [id])

  function setField<K extends keyof Project>(key: K, value: Project[K]) {
    setForm(f => ({
      ...f,
      [key]: value,
      ...(key === 'title' && isNew ? { slug: slugify(value as string) } : {}),
    }))
  }

  async function save() {
    if (!form.title || !form.slug) { setError('Title and slug are required.'); return }
    setSaving(true)
    setError('')
    if (isNew) {
      const { data, error: err } = await supabase.from('projects').insert(form).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      navigate(`/admin/projects/${data.id}`)
    } else {
      const { error: err } = await supabase.from('projects').update(form).eq('id', id)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false)
  }

  type FieldConfig = { label: string; key: string; type: string; placeholder?: string; options?: string[]; span?: number }
  const FIELDS: Record<'basic' | 'integrations' | 'content', FieldConfig[]> = {
    basic: [
      { label: 'Title *', key: 'title', type: 'text', placeholder: 'Bullet Barrage Basketball' },
      { label: 'URL Slug *', key: 'slug', type: 'text', placeholder: 'bullet-barrage-basketball' },
      { label: 'Status', key: 'status', type: 'select', options: ['active', 'completed', 'archived'] },
      { label: 'Cover Image URL', key: 'cover_image_url', type: 'url', placeholder: 'https://…' },
      { label: 'Steam URL', key: 'steam_url', type: 'url', placeholder: 'https://store.steampowered.com/…' },
      { label: 'Description', key: 'description', type: 'textarea', placeholder: 'A short description…', span: 2 },
    ],
    integrations: [
      { label: 'GitHub Repo URL', key: 'github_repo_url', type: 'url', placeholder: 'https://github.com/org/repo' },
      { label: 'GitHub Owner', key: 'github_repo_owner', type: 'text', placeholder: 'lostourbox' },
      { label: 'GitHub Repo Name', key: 'github_repo_name', type: 'text', placeholder: 'bullet-barrage-basketball' },
      { label: 'GitHub Project Number', key: 'github_project_number', type: 'number', placeholder: '1' },
      { label: 'Owner Type', key: 'github_project_owner_type', type: 'select', options: ['user', 'org'] },
      { label: 'Discord Channel ID', key: 'discord_channel_id', type: 'text', placeholder: '1234567890' },
      { label: 'Discord Invite URL', key: 'discord_invite_url', type: 'url', placeholder: 'https://discord.gg/…' },
      { label: 'Discord Role ID', key: 'discord_role_id', type: 'text', placeholder: '1234567890123456789' },
      { label: 'GitHub Team Slug', key: 'github_team_slug', type: 'text', placeholder: 'bullet-barrage-programmers' },
      { label: 'Google Drive URL', key: 'drive_folder_url', type: 'url', placeholder: 'https://drive.google.com/…' },
      { label: 'Hashtag', key: 'hashtag', type: 'text', placeholder: '#BulletBarrage' },
    ],
    content: [
      { label: 'GDD URL (Google Doc)', key: 'gdd_content', type: 'url', placeholder: 'https://docs.google.com/…' },
      { label: 'Profit Share Agreement Text', key: 'profit_share_text', type: 'textarea-large', placeholder: 'This Profit Share Agreement…', span: 2 },
    ],
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/projects" className="text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">{isNew ? 'New Project' : 'Edit Project'}</h1>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Project list sidebar */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">All Projects</p>
            <Link to="/admin/projects"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
              <Plus className="w-3 h-3" /> New
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            {projects.map(p => (
              <Link key={p.id} to={`/admin/projects/${p.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  p.id === id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <span className="truncate">{p.title}</span>
                <Pencil className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-4">
            {(['basic', 'integrations', 'content'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-sm py-1.5 rounded-lg capitalize transition-colors ${
                  tab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS[tab].map(field => (
                <div key={field.key} className={field.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="block text-zinc-400 text-sm mb-1">{field.label}</label>
                  {field.type === 'select' ? (
                    <select value={(form as any)[field.key] ?? ''}
                      onChange={e => setField(field.key as any, e.target.value as any)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea value={(form as any)[field.key] ?? ''} rows={3}
                      placeholder={field.placeholder}
                      onChange={e => setField(field.key as any, e.target.value as any)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 resize-none" />
                  ) : field.type === 'textarea-large' ? (
                    <textarea value={(form as any)[field.key] ?? ''} rows={12}
                      placeholder={field.placeholder}
                      onChange={e => setField(field.key as any, e.target.value as any)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 resize-y font-mono text-sm" />
                  ) : (
                    <input type={field.type} value={(form as any)[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={e => setField(field.key as any, (field.type === 'number' ? (parseInt(e.target.value) || undefined) : e.target.value) as any)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500" />
                  )}
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

            <div className="flex gap-3 mt-5 pt-4 border-t border-zinc-800">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Project'}
              </button>
              {!isNew && (
                <Link to={`/projects/${form.slug}`} target="_blank"
                  className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  View public page →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
