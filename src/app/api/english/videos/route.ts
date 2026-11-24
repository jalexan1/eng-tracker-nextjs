/**
 * GET /api/english/videos
 * Lista los videos del usuario autenticado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rows = await db
    .select({
      id:           english.videos.id,
      youtubeId:    english.videos.youtubeId,
      youtubeUrl:   english.videos.youtubeUrl,
      title:        english.videos.title,
      thumbnailUrl: english.videos.thumbnailUrl,
      category:     english.videos.category,
      status:       english.videos.status,
      errorMessage: english.videos.errorMessage,
      createdAt:    english.videos.createdAt,
    })
    .from(english.videos)
    .where(eq(english.videos.userId, session.user.id))
    .orderBy(desc(english.videos.createdAt))

  return NextResponse.json({ videos: rows })
}
