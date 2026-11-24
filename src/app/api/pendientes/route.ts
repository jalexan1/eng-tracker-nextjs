/**
 * GET  /api/pendientes  — lista features pendientes del usuario
 * POST /api/pendientes  — crea un nuevo feature pendiente
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
  const userId = session.user.id

  const items = await db
    .select()
    .from(english.pendingFeatures)
    .where(eq(english.pendingFeatures.userId, userId))
    .orderBy(desc(english.pendingFeatures.createdAt))

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json()
  const { title, description, context } = body as {
    title?: string
    description?: string
    context?: string
  }

  const [item] = await db
    .insert(english.pendingFeatures)
    .values({
      userId,
      title:       title ?? 'Feature pendiente',
      description: description ?? '',
      context:     context ?? '',
      status:      'pending',
    })
    .returning()

  return NextResponse.json({ item }, { status: 201 })
}
