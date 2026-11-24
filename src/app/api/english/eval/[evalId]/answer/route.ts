/**
 * POST /api/english/eval/[evalId]/answer
 * Recibe la respuesta del estudiante, pide a la IA que la califique,
 * guarda el error en studentErrors si está mal, o en learnedWords si está bien.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, and } from 'drizzle-orm'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'openai/gpt-oss-120b'

// SM-2 interval progression (days)
const SM2_INTERVALS = [1, 3, 7, 14, 30]

function nextReviewDate(reviewCount: number): Date {
  const days = SM2_INTERVALS[Math.min(reviewCount, SM2_INTERVALS.length - 1)] ?? 30
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(
  req: NextRequest,
  { params }: { params: { evalId: string } },
) {
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

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 503 })

  const body = await req.json()
  const { questionId, studentAnswer } = body as { questionId: string; studentAnswer: string }

  if (!questionId || studentAnswer === undefined) {
    return NextResponse.json({ error: 'questionId y studentAnswer son requeridos' }, { status: 400 })
  }

  // ── Cargar evaluación + pregunta ───────────────────────────────
  const [evaluation] = await db
    .select()
    .from(english.evaluations)
    .where(and(eq(english.evaluations.id, params.evalId), eq(english.evaluations.userId, userId)))

  if (!evaluation) return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })

  const [question] = await db
    .select()
    .from(english.evaluationQuestions)
    .where(and(
      eq(english.evaluationQuestions.id, questionId),
      eq(english.evaluationQuestions.evaluationId, params.evalId),
    ))

  if (!question) return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 })

  // ── Calificación por IA ────────────────────────────────────────
  const prompt = `You are an English language teacher grading a student's answer.

Question (${question.questionType}): ${question.questionText}
Correct Answer: ${question.correctAnswer}
Student Answer: ${studentAnswer}

Grade the student's answer. Be somewhat lenient with minor spelling variations but strict on grammar concepts.

Return ONLY a JSON object (no markdown):
{
  "isCorrect": true,
  "grade": "correct",
  "feedback": "Great job! 'Went' is the correct past tense of 'go'."
}

Rules:
- isCorrect: boolean
- grade: "correct" | "partial" | "incorrect"
- feedback: 1-2 sentences explaining the result in a helpful, encouraging tone
- For open_ended, grade based on grammar accuracy and understanding shown`

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens:  300,
      temperature: 0.2,
    }),
  })

  let isCorrect = false
  let grade     = 'incorrect'
  let feedback  = ''

  if (res.ok) {
    const aiData  = await res.json()
    const content = (aiData.choices?.[0]?.message?.content as string) ?? '{}'
    const clean   = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    try {
      const parsed = JSON.parse(clean)
      isCorrect = parsed.isCorrect === true
      grade     = parsed.grade ?? (isCorrect ? 'correct' : 'incorrect')
      feedback  = parsed.feedback ?? ''
    } catch {
      // fallback: simple string comparison
      isCorrect = studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
    }
  }

  // ── Actualizar la pregunta con respuesta del estudiante ────────
  await db
    .update(english.evaluationQuestions)
    .set({
      studentAnswer,
      aiGrade:    grade,
      aiFeedback: feedback,
      isCorrect,
      answeredAt: new Date(),
    })
    .where(eq(english.evaluationQuestions.id, questionId))

  // ── Spaced repetition / learned words ─────────────────────────
  if (isCorrect) {
    // Guardar en learnedWords si no existe aún
    const word = question.questionText.match(/\b[a-zA-Z]{3,}\b/)?.[0] ?? question.correctAnswer
    await db.insert(english.learnedWords).values({
      userId,
      sourceVideoId: evaluation.videoId,
      word:          word.toLowerCase(),
      status:        'learning',
    }).onConflictDoNothing()
  } else {
    // Guardar en studentErrors para spaced repetition
    const existing = await db
      .select()
      .from(english.studentErrors)
      .where(and(
        eq(english.studentErrors.userId,      userId),
        eq(english.studentErrors.questionId,  questionId),
      ))

    if (existing.length > 0 && existing[0]) {
      const prev     = existing[0]
      const newCount = (prev.reviewCount ?? 0) + 1
      await db
        .update(english.studentErrors)
        .set({
          reviewCount:    newCount,
          intervalDays:   SM2_INTERVALS[Math.min(newCount, SM2_INTERVALS.length - 1)] ?? 30,
          nextReviewAt:   nextReviewDate(newCount),
          lastReviewedAt: new Date(),
        })
        .where(eq(english.studentErrors.id, prev.id))
    } else {
      await db.insert(english.studentErrors).values({
        userId,
        evaluationId:   params.evalId,
        questionId,
        videoId:        evaluation.videoId,
        wordOrConcept:  question.correctAnswer,
        errorType:      question.questionType,
        nextReviewAt:   nextReviewDate(0),
        reviewCount:    1,
        intervalDays:   SM2_INTERVALS[0] ?? 1,
        lastReviewedAt: new Date(),
      })
    }
  }

  // ── Verificar si la evaluación está completa ───────────────────
  const allQuestions = await db
    .select()
    .from(english.evaluationQuestions)
    .where(eq(english.evaluationQuestions.evaluationId, params.evalId))

  const answeredCount = allQuestions.filter((q) => q.answeredAt !== null).length
  const correctCount  = allQuestions.filter((q) => q.isCorrect === true).length
  const isComplete    = answeredCount >= allQuestions.length

  if (isComplete) {
    const scorePercentage = Math.round((correctCount / allQuestions.length) * 100)
    await db
      .update(english.evaluations)
      .set({
        status:        'completed',
        scorePercentage,
        correctCount,
        completedAt:   new Date(),
      })
      .where(eq(english.evaluations.id, params.evalId))
  }

  return NextResponse.json({
    isCorrect,
    grade,
    feedback,
    correctAnswer: isCorrect ? undefined : question.correctAnswer,
    isEvalComplete:    isComplete,
    answeredCount,
    totalQuestions:    allQuestions.length,
  })
}
