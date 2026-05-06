import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import { useAuthContext } from '../contexts/AuthContext'
import { Check, GitBranch, MessageSquare, HardDrive, ArrowRight, FileText, Copy, ChevronRight } from 'lucide-react'

type Step = 1 | 2 | 3 | 4

const ROLES = [
  { id: 'programmer', label: 'Programmer' },
  { id: 'artist', label: 'Artist' },
  { id: 'designer', label: 'Game Designer' },
  { id: 'sound', label: 'Sound / Music' },
  { id: 'lead', label: 'Project Lead' },
  { id: 'other', label: 'Other' },
]

export function Onboarding() {
  const { slug } = useParams<{ slug: string }>()
  const { session, user } = useAuthContext()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Step 1 fields
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [discordName, setDiscordName] = useState(user?.discord_name ?? '')
  const [githubUsername, setGitBranchUsername] = useState(user?.github_username ?? '')

  // Step 2 fields
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  // Step 3 fields
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? '')
      setDiscordName(user.discord_name ?? '')
      setGitBranchUsername(user.github_username ?? '')
    }
  }, [user])

  useEffect(() => {
    async function load() {
      if (!slug || !session) return

      const { data: proj } = await supabase.from('projects').select('*').eq('slug', slug).single()
      if (!proj) { navigate('/projects'); return }
      setProject(proj)

      const { data: existing } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', proj.id)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existing?.onboarding_completed_at) {
        navigate(`/projects/${slug}/dashboard`)
        return
      }
      if (existing) setStep(2)

      setLoading(false)
    }
    load()
  }, [slug, session, navigate])

  function toggleRole(roleId: string) {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    )
  }

  async function saveStep1() {
    if (!displayName.trim()) { setError('Display name is required.'); return }
    setSaving(true)
    setError('')
    await supabase.from('users').update({
      display_name: displayName.trim(),
      discord_name: discordName.trim() || null,
      github_username: githubUsername.trim() || null,
    }).eq('id', session!.user.id)
    setSaving(false)
    setStep(2)
  }

  async function saveStep2() {
    if (selectedRoles.length === 0) { setError('Please select at least one role.'); return }
    setSaving(true)
    setError('')
    await supabase.from('project_members').upsert({
      project_id: project!.id,
      user_id: session!.user.id,
      roles: selectedRoles,
    }, { onConflict: 'project_id,user_id' })
    setSaving(false)
    setStep(3)
  }

  async function saveStep3() {
    if (!agreed) { setError('Please read and check the agreement box.'); return }
    setSaving(true)
    setError('')

    const ip = await fetch('https://api64.ipify.org?format=json')
      .then(r => r.json())
      .then(d => d.ip)
      .catch(() => 'unknown')

    await supabase.from('project_members').update({
      agreement_acknowledged_at: new Date().toISOString(),
      agreement_ip: ip,
    }).eq('project_id', project!.id).eq('user_id', session!.user.id)

    setSaving(false)
    setStep(4)
  }

  async function completeOnboarding() {
    await supabase.from('project_members').update({
      onboarding_completed_at: new Date().toISOString(),
    }).eq('project_id', project!.id).eq('user_id', session!.user.id)
    navigate(`/projects/${slug}/dashboard`)
  }

  function copyCloneCommand() {
    if (!project?.github_repo_url) return
    const url = project.github_repo_url.replace('https://github.com/', '')
    navigator.clipboard.writeText(`git clone https://github.com/${url}.git`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!project) return null

  const steps = ['Profile', 'Your Role', 'Agreement', 'Access']

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Progress */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-6">Joining <span className="text-purple-400">{project.title}</span></h1>
        <div className="flex items-center gap-0">
          {steps.map((s, i) => {
            const n = (i + 1) as Step
            const done = step > n
            const current = step === n
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium flex-shrink-0 ${
                  done ? 'bg-purple-600 text-white' : current ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400' : 'bg-zinc-800 text-zinc-600'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`ml-2 text-xs hidden sm:block ${current ? 'text-white' : done ? 'text-zinc-400' : 'text-zinc-600'}`}>{s}</span>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${step > n ? 'bg-purple-600' : 'bg-zinc-800'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Confirm your profile</h2>
            <p className="text-zinc-400 text-sm mb-6">This info helps the team know who you are and how to reach you.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Display Name *</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">Discord Username</label>
                <input value={discordName} onChange={e => setDiscordName(e.target.value)}
                  placeholder="e.g. brandon#1234"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-1">GitHub Username</label>
                <input value={githubUsername} onChange={e => setGitBranchUsername(e.target.value)}
                  placeholder="e.g. brandonhansford"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={saveStep1} disabled={saving}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Roles */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">What will you be doing?</h2>
            <p className="text-zinc-400 text-sm mb-6">Select all roles that apply. You're not locked in — this helps with task assignment.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {ROLES.map(role => {
                const selected = selectedRoles.includes(role.id)
                return (
                  <button key={role.id} onClick={() => toggleRole(role.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                    }`}>
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selected ? 'bg-purple-500 border-purple-500' : 'border-zinc-600'}`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium">{role.label}</span>
                  </button>
                )
              })}
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={saveStep2} disabled={saving}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors w-full">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Agreement */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Profit Share Agreement</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Please read the full agreement below. Your points earned on this project determine your share of any revenue it generates.
            </p>
            <div
              className="bg-zinc-950 border border-zinc-700 rounded-xl p-4 max-h-80 overflow-y-auto text-sm text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap"
              onScroll={e => {
                const el = e.currentTarget
                if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) setScrolledToBottom(true)
              }}
            >
              {project.profit_share_text ?? 'Profit share agreement text will be added by the project admin. Please check back or contact Brandon directly.'}
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-purple-500" />
              <span className="text-zinc-300 text-sm">
                I have read and agree to the profit share agreement for <strong className="text-white">{project.title}</strong>. I understand a formal copy will be sent to my email to sign.
              </span>
            </label>
            {!scrolledToBottom && !agreed && (
              <p className="text-amber-400 text-xs mb-3">Scroll through the entire agreement before checking the box.</p>
            )}
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={saveStep3} disabled={saving || !agreed}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors w-full">
              Agree & Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: Access links */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">You're in!</h2>
              <p className="text-zinc-400 text-sm">Here's everything you need to get started on <strong className="text-white">{project.title}</strong>.</p>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              {project.github_repo_url && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-4 h-4 text-zinc-400" />
                    <span className="text-white text-sm font-medium">GitHub Repository</span>
                  </div>
                  <p className="text-zinc-500 text-xs mb-2">Clone with HTTPS:</p>
                  <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2">
                    <code className="text-xs text-zinc-300 flex-1 font-mono truncate">
                      git clone {project.github_repo_url}.git
                    </code>
                    <button onClick={copyCloneCommand} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <a href={project.github_repo_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-flex items-center gap-1">
                    Open on GitHub <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {project.discord_invite_url && (
                  <a href={project.discord_invite_url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 bg-zinc-800 border border-zinc-700 hover:border-indigo-500/50 rounded-xl p-4 text-center transition-colors">
                    <MessageSquare className="w-6 h-6 text-indigo-400" />
                    <span className="text-white text-sm font-medium">Discord</span>
                    <span className="text-zinc-500 text-xs">Join the channel</span>
                  </a>
                )}
                {project.drive_folder_url && (
                  <a href={project.drive_folder_url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 bg-zinc-800 border border-zinc-700 hover:border-yellow-500/50 rounded-xl p-4 text-center transition-colors">
                    <HardDrive className="w-6 h-6 text-yellow-400" />
                    <span className="text-white text-sm font-medium">Google Drive</span>
                    <span className="text-zinc-500 text-xs">Art & documents</span>
                  </a>
                )}
                {project.gdd_content && (
                  <div className="flex flex-col items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                    <FileText className="w-6 h-6 text-emerald-400" />
                    <span className="text-white text-sm font-medium">GDD</span>
                    <span className="text-zinc-500 text-xs">Available on dashboard</span>
                  </div>
                )}
              </div>

              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
                A formal profit share agreement will be emailed to you within 48 hours. Please sign it when you receive it.
              </div>
            </div>

            <button onClick={completeOnboarding}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 rounded-lg transition-colors w-full">
              Go to My Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
