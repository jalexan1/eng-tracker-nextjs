/**
 * GET /api/english/eval/[evalId]/questions
 * Devuelve las preguntas de una evaluación (sin las respuestas correctas).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: { evalId: string } },
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = session.user.id

  const [evaluation] = await db
    .select()
    .from(english.evaluations)
    .where(and(eq(english.evaluations.id, params.evalId), eq(english.evaluations.userId, userId)))

  if (!evaluation) return NextResponse.json({ error: 'Evaluación no encontrada' }, { status: 404 })

  const questions = await db
    .select({
      id:             english.evaluationQuestions.id,
      questionNumber: english.evaluationQuestions.questionNumber,
      questionType:   english.evaluationQuestions.questionType,
      questionText:   english.evaluationQuestions.questionText,
      options:        english.evaluationQuestions.options,
      answeredAt:     english.evaluationQuestions.answeredAt,
    })
    .from(english.evaluationQuestions)
    .where(eq(english.evaluationQuestions.evaluationId, params.evalId))
    .orderBy(english.evaluationQuestions.questionNumber)

  return NextResponse.json({ questions, total: questions.length })
}
