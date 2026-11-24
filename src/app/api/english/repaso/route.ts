/**
 * GET /api/english/repaso
 * Devuelve sugerencias de repaso basadas en errores con spaced repetition.
 * - Lista de errores con nextReviewAt <= hoy
 * - Video sugerido (el que tiene más errores pendientes)
 * - Historial de feedback de las últimas evaluaciones
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, and, lte, desc, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = session.user.id

  const now = new Date()

  // ── Errores pendientes de hoy ──────────────────────────────────
  const dueErrors = await db
    .select({
      id:            english.studentErrors.id,
      wordOrConcept: english.studentErrors.wordOrConcept,
      errorType:     english.studentErrors.errorType,
      nextReviewAt:  english.studentErrors.nextReviewAt,
      reviewCount:   english.studentErrors.reviewCount,
      intervalDays:  english.studentErrors.intervalDays,
      videoId:       english.studentErrors.videoId,
      videoTitle:    english.videos.title,
    })
    .from(english.studentErrors)
    .leftJoin(english.videos, eq(english.studentErrors.videoId, english.videos.id))
    .where(and(
      eq(english.studentErrors.userId, userId),
      lte(english.studentErrors.nextReviewAt, now),
    ))
    .orderBy(english.studentErrors.nextReviewAt)

  // ── Video sugerido (más errores pendientes) ────────────────────
  const errorsByVideo = dueErrors.reduce<Record<string, { count: number; title: string | null }>>(
    (acc, e) => {
      if (!e.videoId) return acc
      if (!acc[e.videoId]) acc[e.videoId] = { count: 0, title: e.videoTitle }
      acc[e.videoId]!.count++
      return acc
    },
    {},
  )

  const suggestedVideoId = Object.entries(errorsByVideo).sort(
    ([, a], [, b]) => b.count - a.count,
  )[0]?.[0] ?? null

  const suggestedVideo = suggestedVideoId
    ? { id: suggestedVideoId, ...errorsByVideo[suggestedVideoId] }
    : null

  // ── Historial de feedback (últimas 5 evaluaciones) ─────────────
  const recentEvals = await db
    .select({
      evalId:        english.evaluations.id,
      videoId:       english.evaluations.videoId,
      videoTitle:    english.videos.title,
      score:         english.evaluations.scorePercentage,
      completedAt:   english.evaluations.completedAt,
    })
    .from(english.evaluations)
    .leftJoin(english.videos, eq(english.evaluations.videoId, english.videos.id))
    .where(and(
      eq(english.evaluations.userId,  userId),
      eq(english.evaluations.status, 'completed'),
    ))
    .orderBy(desc(english.evaluations.completedAt))
    .limit(5)

  // Para cada eval, obtener preguntas incorrectas con feedback
  const evalFeedback = await Promise.all(
    recentEvals.map(async (ev) => {
      const wrongQuestions = await db
        .select({
          questionText:  english.evaluationQuestions.questionText,
          correctAnswer: english.evaluationQuestions.correctAnswer,
          studentAnswer: english.evaluationQuestions.studentAnswer,
          aiFeedback:    english.evaluationQuestions.aiFeedback,
        })
        .from(english.evaluationQuestions)
        .where(and(
          eq(english.evaluationQuestions.evaluationId, ev.evalId),
          eq(english.evaluationQuestions.isCorrect,    false),
        ))
        .limit(5)

      return { ...ev, wrongQuestions }
    }),
  )

  // ── Vocabulario a reforzar (learnedWords con status learning) ──
  const vocabToReinforce = await db
    .select({
      word:       english.learnedWords.word,
      status:     english.learnedWords.status,
      videoTitle: english.videos.title,
    })
    .from(english.learnedWords)
    .leftJoin(english.videos, eq(english.learnedWords.sourceVideoId, english.videos.id))
    .where(and(
      eq(english.learnedWords.userId,  userId),
      eq(english.learnedWords.status, 'learning'),
    ))
    .orderBy(desc(english.learnedWords.createdAt))
    .limit(20)

  return NextResponse.json({
    dueErrors,
    dueCount:        dueErrors.length,
    suggestedVideo,
    recentFeedback:  evalFeedback,
    vocabToReinforce,
  })
}
