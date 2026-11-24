/**
 * GET /api/english/videos/[id]
 * Retorna video + verbos + frases del video solicitado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const [video] = await db
    .select()
    .from(english.videos)
    .where(and(
      eq(english.videos.id,     params.id),
      eq(english.videos.userId, session.user.id),
    ))

  if (!video) return NextResponse.json({ error: 'Video no encontrado' }, { status: 404 })

  const verbs = await db
    .select()
    .from(english.videoVerbs)
    .where(eq(english.videoVerbs.videoId, params.id))

  const sentences = await db
    .select()
    .from(english.videoSentences)
    .where(eq(english.videoSentences.videoId, params.id))

  return NextResponse.json({ video, verbs, sentences })
}
