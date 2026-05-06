import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft } from 'lucide-react'

export function GDD() {
  const { slug } = useParams<{ slug: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('projects').select('*').eq('slug', slug).single()
      .then(({ data }) => { setProject(data); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!project) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to={`/projects/${slug}/dashboard`}
        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">{project.title}</h1>
        <p className="text-zinc-400 mt-1">Game Design Document</p>
      </div>

      {project.gdd_content ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-10 prose prose-invert prose-purple max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {project.gdd_content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
          <p>No GDD content has been added yet. Check back soon.</p>
        </div>
      )}
    </div>
  )
}
