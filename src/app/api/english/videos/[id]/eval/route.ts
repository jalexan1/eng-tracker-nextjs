/**
 * POST /api/english/videos/[id]/eval
 * Genera una evaluación (mix de preguntas) usando la IA para el video dado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, and } from 'drizzle-orm'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'openai/gpt-oss-120b'

type QuestionType = 'multiple_choice' | 'fill_blank' | 'translation' | 'open_ended'

interface AiQuestion {
  questionNumber: number
  questionType:   QuestionType
  questionText:   string
  options?:       { label: string; value: string }[]
  correctAnswer:  string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
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

  // ── Cargar video + contenido ───────────────────────────────────
  const [video] = await db
    .select()
    .from(english.videos)
    .where(and(eq(english.videos.id, params.id), eq(english.videos.userId, userId)))

  if (!video) return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })
  if (video.status !== 'ready') return NextResponse.json({ error: 'El video aún no está procesado' }, { status: 400 })

  const verbs     = await db.select().from(english.videoVerbs).where(eq(english.videoVerbs.videoId, params.id))
  const sentences = await db.select().from(english.videoSentences).where(eq(english.videoSentences.videoId, params.id))

  // ── Parámetros: cantidad de preguntas ──────────────────────────
  const [param] = await db
    .select()
    .from(english.systemParameters)
    .where(and(
      eq(english.systemParameters.userId,   userId),
      eq(english.systemParameters.language, 'en'),
      eq(english.systemParameters.key,      'eval_questions_count'),
    ))
  const totalQuestions = parseInt(param?.value ?? '10', 10)

  // ── Construir contexto para la IA ─────────────────────────────
  const verbsText = verbs
    .map((v) => `${v.verbBase} / ${v.verbPast ?? '?'} / ${v.verbParticiple ?? '?'} — "${v.contextSentence ?? ''}"`)
    .join('\n')

  const sentencesText = sentences
    .map((s) => `EN: ${s.sentenceEn} | ES: ${s.sentenceEs ?? '?'}`)
    .join('\n')

  const prompt = `You are an English language evaluation generator. Create exactly ${totalQuestions} questions based on this learning material.

VIDEO TITLE: ${video.title}
CATEGORY: ${video.category}

VERBS FROM VIDEO:
${verbsText || '(no verbs extracted)'}

KEY SENTENCES FROM VIDEO:
${sentencesText || '(no sentences extracted)'}

Generate a MIX of question types:
- multiple_choice: 4 options (a, b, c, d), one correct
- fill_blank: sentence with ___ to fill
- translation: translate EN→ES or ES→EN
- open_ended: short answer about grammar or usage

Return ONLY a JSON array (no markdown):
[
  {
    "questionNumber": 1,
    "questionType": "multiple_choice",
    "questionText": "What is the past tense of 'go'?",
    "options": [
      {"label": "A", "value": "goed"},
      {"label": "B", "value": "went"},
      {"label": "C", "value": "gone"},
      {"label": "D", "value": "going"}
    ],
    "correctAnswer": "went"
  },
  {
    "questionNumber": 2,
    "questionType": "fill_blank",
    "questionText": "Yesterday I ___ to the store. (go)",
    "correctAnswer": "went"
  }
]

Rules:
- Distribute question types evenly across ${totalQuestions} questions
- Base questions strictly on the verbs and sentences provided
- For fill_blank and translation, options field is null/omitted
- correctAnswer must be a single string`

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens:  3000,
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: `Error IA: ${await res.text()}` }, { status: 500 })
  }

  const aiData   = await res.json()
  const content  = (aiData.choices?.[0]?.message?.content as string) ?? '[]'
  const clean    = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  let questions: AiQuestion[]
  try {
    questions = JSON.parse(clean)
  } catch {
    return NextResponse.json({ error: 'Error parseando preguntas de la IA' }, { status: 500 })
  }

  // ── Crear evaluación en DB ────────────────────────────────────
  const [evaluation] = await db
    .insert(english.evaluations)
    .values({
      userId,
      videoId:        params.id,
      totalQuestions,
      status:         'pending',
    })
    .returning()

  if (!evaluation) {
    return NextResponse.json({ error: 'Error al crear la evaluación' }, { status: 500 })
  }

  // ── Guardar preguntas ─────────────────────────────────────────
  await db.insert(english.evaluationQuestions).values(
    questions.map((q) => ({
      evaluationId:   evaluation.id,
      questionNumber: q.questionNumber,
      questionType:   q.questionType,
      questionText:   q.questionText,
      options:        q.options ?? null,
      correctAnswer:  q.correctAnswer,
    })),
  )

  // ── Marcar como en progreso ───────────────────────────────────
  await db
    .update(english.evaluations)
    .set({ status: 'in_progress' })
    .where(eq(english.evaluations.id, evaluation.id))

  return NextResponse.json({
    evalId:   evaluation.id,
    videoId:  params.id,
    total:    questions.length,
  })
}
