/**
 * GET  /api/settings?language=en
 * PUT  /api/settings
 * Gestiona los parámetros del sistema por usuario e idioma.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq, and } from 'drizzle-orm'

// Parámetros por defecto para el idioma 'en'
const EN_DEFAULTS: Record<string, { value: string; label: string }> = {
  eval_questions_count:    { value: '10',       label: 'Número de preguntas por evaluación' },
  review_block_size:       { value: '20',       label: 'Tamaño del bloque de repaso' },
  spaced_repetition_days:  { value: '1,3,7,14,30', label: 'Intervalos de repetición espaciada (días)' },
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const userId = session.user.id

  const language = req.nextUrl.searchParams.get('language') ?? 'en'

  // Cargar parámetros guardados
  const saved = await db
    .select()
    .from(english.systemParameters)
    .where(and(
      eq(english.systemParameters.userId,   userId),
      eq(english.systemParameters.language, language),
    ))

  // Mezclar con defaults para idioma en
  const defaults = language === 'en' ? EN_DEFAULTS : {}
  const result: Record<string, { value: string; label: string; key: string }> = {}

  // Primero los defaults
  for (const [key, def] of Object.entries(defaults)) {
    result[key] = { key, ...def }
  }

  // Luego overwrites con valores guardados
  for (const param of saved) {
    result[param.key] = {
      key:   param.key,
      value: param.value,
      label: param.label ?? defaults[param.key]?.label ?? param.key,
    }
  }

  return NextResponse.json({ language, parameters: Object.values(result) })
}

export async function PUT(req: NextRequest) {
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
  const { language = 'en', parameters } = body as {
    language?: string
    parameters: { key: string; value: string; label?: string }[]
  }

  if (!Array.isArray(parameters) || parameters.length === 0) {
    return NextResponse.json({ error: 'parameters es requerido' }, { status: 400 })
  }

  const defaults = language === 'en' ? EN_DEFAULTS : {}

  for (const param of parameters) {
    const label = param.label ?? defaults[param.key]?.label ?? param.key

    // Upsert — unique on (userId, language, key)
    const existing = await db
      .select()
      .from(english.systemParameters)
      .where(and(
        eq(english.systemParameters.userId,   userId),
        eq(english.systemParameters.language, language),
        eq(english.systemParameters.key,      param.key),
      ))

    if (existing.length > 0 && existing[0]) {
      await db
        .update(english.systemParameters)
        .set({ value: param.value, label, updatedAt: new Date() })
        .where(eq(english.systemParameters.id, existing[0].id))
    } else {
      await db.insert(english.systemParameters).values({
        userId,
        language,
        key:   param.key,
        value: param.value,
        label,
      })
    }
  }

  return NextResponse.json({ ok: true, updated: parameters.length })
}
