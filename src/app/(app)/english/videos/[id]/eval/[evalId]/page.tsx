'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Question {
  id:            string
  questionNumber: number
  questionType:   string
  questionText:   string
  options:        { label: string; value: string }[] | null
}

export default function EvalPage() {
  const { id: videoId, evalId } = useParams<{ id: string; evalId: string }>()
  const router = useRouter()

  const [questions,   setQuestions]   = useState<Question[]>([])
  const [current,     setCurrent]     = useState(0)
  const [answer,      setAnswer]      = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [feedback,    setFeedback]    = useState<{
    isCorrect: boolean; grade: string; feedback: string; correctAnswer?: string
  } | null>(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!evalId) return
    // Cargar preguntas de la evaluación
    fetch(`/api/english/eval/${evalId}/questions`)
      .then((r) => r.json())
      .then((d: { questions?: Question[] }) => {
        setQuestions(d.questions ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [evalId])

  async function handleSubmit() {
    const q = questions[current]
    if (!q || !answer.trim()) return
    setSubmitting(true)

    const res  = await fetch(`/api/english/eval/${evalId}/answer`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ questionId: q.id, studentAnswer: answer }),
    })
    const data = await res.json() as {
      isCorrect: boolean; grade: string; feedback: string;
      correctAnswer?: string; isEvalComplete?: boolean
    }

    setFeedback({
      isCorrect:     data.isCorrect,
      grade:         data.grade,
      feedback:      data.feedback,
      correctAnswer: data.correctAnswer,
    })
    setSubmitting(false)

    if (data.isEvalComplete) {
      setTimeout(() => router.push(`/english/videos/${videoId}/results/${evalId}`), 1800)
    }
  }

  function handleNext() {
    setFeedback(null)
    setAnswer('')
    setCurrent((c) => c + 1)
  }

  if (loading) return <div className="p-10 text-sm text-gray-400">Cargando evaluación…</div>
  if (questions.length === 0) return <div className="p-10 text-sm text-red-500">No se encontraron preguntas.</div>

  const q       = questions[current]
  const isLast  = current >= questions.length - 1

  if (!q) return <div className="p-10 text-sm text-gray-400">Evaluación completada.</div>

  const qTypeLabel: Record<string, string> = {
    multiple_choice: 'Selección múltiple',
    fill_blank:      'Completa la frase',
    translation:     'Traducción',
    open_ended:      'Respuesta abierta',
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Pregunta {current + 1} de {questions.length}</span>
          <span className="text-blue-500">{qTypeLabel[q.questionType] ?? q.questionType}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((current) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-5">
        <p className="text-base font-medium text-gray-900 dark:text-white mb-5">
          {q.questionText}
        </p>

        {/* Multiple choice */}
        {q.questionType === 'multiple_choice' && q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => !feedback && setAnswer(opt.value)}
                disabled={!!feedback}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                  answer === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                }`}
              >
                <span className="font-semibold mr-2">{opt.label}.</span>
                {opt.value}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        {q.questionType !== 'multiple_choice' && (
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !feedback && handleSubmit()}
            disabled={!!feedback}
            placeholder="Tu respuesta…"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white
                       dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl px-5 py-4 mb-5 text-sm border ${
          feedback.isCorrect
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
        }`}>
          <p className="font-semibold mb-1">{feedback.isCorrect ? '✅ Correcto' : '❌ Incorrecto'}</p>
          {!feedback.isCorrect && feedback.correctAnswer && (
            <p className="mb-1">Respuesta correcta: <strong>{feedback.correctAnswer}</strong></p>
          )}
          <p>{feedback.feedback}</p>
        </div>
      )}

      {/* Actions */}
      {!feedback ? (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || submitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                     text-white py-3 text-sm font-medium transition-colors"
        >
          {submitting ? 'Calificando…' : 'Responder'}
        </button>
      ) : (
        <button
          onClick={isLast ? () => router.push(`/english/videos/${videoId}/results/${evalId}`) : handleNext}
          className="w-full rounded-lg bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100
                     text-white dark:text-gray-900 py-3 text-sm font-medium transition-colors"
        >
          {isLast ? 'Ver resultados →' : 'Siguiente pregunta →'}
        </button>
      )}
    </div>
  )
}
