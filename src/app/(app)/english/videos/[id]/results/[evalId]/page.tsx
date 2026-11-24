'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface QuestionResult {
  id:            string
  questionNumber: number
  questionType:   string
  questionText:   string
  correctAnswer:  string
  studentAnswer:  string | null
  aiFeedback:     string | null
  isCorrect:      boolean | null
}

interface EvalResult {
  score:         number | null
  totalQuestions: number
  correctCount:   number
  questions:      QuestionResult[]
}

export default function ResultsPage() {
  const { id: videoId, evalId } = useParams<{ id: string; evalId: string }>()
  const [data,    setData]    = useState<EvalResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!evalId) return
    fetch(`/api/english/eval/${evalId}/results`)
      .then((r) => r.json())
      .then((d: EvalResult) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [evalId])

  if (loading) return <div className="p-10 text-sm text-gray-400">Cargando resultados…</div>
  if (!data)   return <div className="p-10 text-sm text-red-500">No se encontraron resultados.</div>

  const score        = data.score ?? 0
  const scoreColor   = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Score hero */}
      <div className="text-center mb-8">
        <div className={`text-6xl font-bold ${scoreColor}`}>{score}%</div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {data.correctCount} de {data.totalQuestions} correctas
        </p>
        {score >= 80 && <p className="mt-2 text-green-600 font-medium">¡Excelente trabajo! 🎉</p>}
        {score >= 60 && score < 80 && <p className="mt-2 text-yellow-600 font-medium">¡Buen trabajo! Sigue practicando.</p>}
        {score < 60 && <p className="mt-2 text-red-600 font-medium">Necesitas más práctica. ¡No te rindas!</p>}
      </div>

      {/* Per-question feedback */}
      <div className="space-y-3 mb-8">
        {data.questions.map((q) => (
          <div
            key={q.id}
            className={`rounded-xl border p-4 ${
              q.isCorrect
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">{q.isCorrect ? '✅' : '❌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{q.questionText}</p>
                {!q.isCorrect && (
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                    Tu respuesta: <span className="text-red-600">{q.studentAnswer ?? '—'}</span>
                    {' · '}
                    Correcta: <span className="text-green-600">{q.correctAnswer}</span>
                  </p>
                )}
                {q.aiFeedback && (
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 italic">{q.aiFeedback}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link
          href={`/english/videos/${videoId}`}
          className="w-full text-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-medium"
        >
          Volver al video
        </Link>
        <Link
          href="/english/repaso"
          className="w-full text-center rounded-lg border border-gray-300 dark:border-gray-600
                     text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                     py-3 text-sm font-medium"
        >
          Ver errores para repasar →
        </Link>
      </div>
    </div>
  )
}
