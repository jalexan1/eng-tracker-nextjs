'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DueError {
  id:            string
  wordOrConcept: string
  errorType:     string
  nextReviewAt:  string
  reviewCount:   number
  videoId:       string | null
  videoTitle:    string | null
}

interface FeedbackItem {
  evalId:       string
  videoId:      string | null
  videoTitle:   string | null
  score:        number | null
  completedAt:  string | null
  wrongQuestions: {
    questionText:  string
    correctAnswer: string
    studentAnswer: string | null
    aiFeedback:    string | null
  }[]
}

interface VocabWord {
  word:       string
  status:     string
  videoTitle: string | null
}

interface RepasoData {
  dueCount:        number
  dueErrors:       DueError[]
  suggestedVideo:  { id: string; count: number; title: string | null } | null
  recentFeedback:  FeedbackItem[]
  vocabToReinforce: VocabWord[]
}

export default function RepasoPage() {
  const [data,    setData]    = useState<RepasoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/english/repaso')
      .then((r) => r.json())
      .then((d: RepasoData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-10 text-sm text-gray-400">Cargando repaso…</div>

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Repaso</h1>

      {/* Suggested video */}
      {data?.suggestedVideo && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
            Video sugerido
          </p>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">
            {data.suggestedVideo.title ?? 'Video sin título'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {data.suggestedVideo.count} error{data.suggestedVideo.count !== 1 ? 'es' : ''} pendientes de repaso
          </p>
          <Link
            href={`/english/videos/${data.suggestedVideo.id}`}
            className="inline-block rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
          >
            Ir al video →
          </Link>
        </div>
      )}

      {(!data?.suggestedVideo) && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tienes errores pendientes de repaso por hoy.
          </p>
        </div>
      )}

      {/* Due errors */}
      {(data?.dueErrors?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Errores pendientes hoy ({data!.dueCount})
          </h2>
          <div className="space-y-2">
            {data!.dueErrors.map((e) => (
              <div key={e.id} className="rounded-lg border border-gray-200 dark:border-gray-700
                                          bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300
                                  rounded-full px-2 py-0.5">
                  {e.errorType}
                </span>
                <span className="font-medium text-gray-900 dark:text-white text-sm">{e.wordOrConcept}</span>
                {e.videoTitle && (
                  <span className="text-xs text-gray-400 ml-auto truncate max-w-[180px]">{e.videoTitle}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vocab to reinforce */}
      {(data?.vocabToReinforce?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Vocabulario a reforzar
          </h2>
          <div className="flex flex-wrap gap-2">
            {data!.vocabToReinforce.map((w) => (
              <span key={w.word} className="rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700
                                             dark:text-gray-300 text-xs px-3 py-1">
                {w.word}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Recent feedback history */}
      {(data?.recentFeedback?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Historial reciente
          </h2>
          <div className="space-y-4">
            {data!.recentFeedback.map((ev) => (
              <div key={ev.evalId} className="rounded-xl border border-gray-200 dark:border-gray-700
                                               bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {ev.videoTitle ?? 'Video'}
                  </p>
                  <span className={`text-sm font-bold ${
                    (ev.score ?? 0) >= 80 ? 'text-green-600' : (ev.score ?? 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {ev.score ?? 0}%
                  </span>
                </div>
                {ev.wrongQuestions.length > 0 && (
                  <div className="space-y-1">
                    {ev.wrongQuestions.map((wq, i) => (
                      <div key={i} className="text-xs text-gray-500 dark:text-gray-400 pl-2 border-l-2 border-red-300">
                        <span className="text-gray-700 dark:text-gray-300">{wq.questionText}</span>
                        {' → '}
                        <span className="text-green-600">{wq.correctAnswer}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
