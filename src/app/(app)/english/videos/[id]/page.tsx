'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Verb {
  id:               string
  verbBase:         string
  verbPast:         string | null
  verbParticiple:   string | null
  contextSentence:  string | null
}

interface Sentence {
  id:          string
  sentenceEn:  string
  sentenceEs:  string | null
}

interface VideoDetail {
  id:           string
  youtubeId:    string
  title:        string
  category:     string | null
  description:  string | null
}

type Data = { video: VideoDetail; verbs: Verb[]; sentences: Sentence[] }

export default function VideoViewerPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [data,       setData]       = useState<Data | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [creating,   setCreating]   = useState(false)
  const [activeTab,  setActiveTab]  = useState<'verbs' | 'sentences'>('verbs')

  useEffect(() => {
    if (!id) return
    fetch(`/api/english/videos/${id}`)
      .then((r) => r.json())
      .then((d: Data) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function handleCreateEval() {
    if (!id) return
    setCreating(true)
    try {
      const res  = await fetch(`/api/english/videos/${id}/eval`, { method: 'POST' })
      const d    = await res.json() as { evalId?: string; error?: string }
      if (!res.ok || !d.evalId) {
        alert(d.error ?? 'Error al crear la evaluación')
        return
      }
      router.push(`/english/videos/${id}/eval/${d.evalId}`)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="p-10 text-sm text-gray-400">Cargando…</div>
  if (!data)   return <div className="p-10 text-sm text-red-500">Video no encontrado.</div>

  const { video, verbs, sentences } = data

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* YouTube embed */}
      <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden mb-6 bg-black">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          allowFullScreen
        />
      </div>

      {/* Title + meta */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {video.title}
          </h1>
          {video.category && (
            <span className="mt-1 inline-block text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700
                             dark:text-blue-300 rounded-full px-2 py-0.5">
              {video.category}
            </span>
          )}
          {video.description && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
              {video.description}
            </p>
          )}
        </div>
        <button
          onClick={handleCreateEval}
          disabled={creating}
          className="shrink-0 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50
                     text-white px-5 py-2 text-sm font-medium transition-colors"
        >
          {creating ? 'Generando…' : '📝 Crear Evaluación'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {(['verbs', 'sentences'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab === 'verbs' ? `Verbos (${verbs.length})` : `Frases (${sentences.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'verbs' && (
        <div className="space-y-2">
          {verbs.length === 0 && <p className="text-sm text-gray-400">No se extrajeron verbos.</p>}
          {verbs.map((v) => (
            <div key={v.id} className="rounded-lg border border-gray-200 dark:border-gray-700
                                       bg-white dark:bg-gray-800 px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white">{v.verbBase}</span>
                {v.verbPast && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">→ {v.verbPast}</span>
                )}
                {v.verbParticiple && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">→ {v.verbParticiple}</span>
                )}
              </div>
              {v.contextSentence && (
                <p className="mt-1 text-xs text-gray-400 italic">"{v.contextSentence}"</p>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sentences' && (
        <div className="space-y-3">
          {sentences.length === 0 && <p className="text-sm text-gray-400">No se extrajeron frases.</p>}
          {sentences.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-200 dark:border-gray-700
                                       bg-white dark:bg-gray-800 px-4 py-3 space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{s.sentenceEn}</p>
              {s.sentenceEs && (
                <p className="text-xs text-gray-400 italic">{s.sentenceEs}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
