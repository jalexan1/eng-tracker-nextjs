import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@lib/db'
import { verbs as verbsTable } from '@/db/schema/english/verbs'
import { eq, ilike, or, and, isNotNull, asc, count } from 'drizzle-orm'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  // ── Auth (Supabase auth — no usa .schema()) ───────────────────────────────
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } },
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page        = Math.max(1, Number(searchParams.get('page')  ?? '1'))
  const limit       = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
  const search      = (searchParams.get('search') ?? '').trim().toLowerCase()
  const typeFilter  = searchParams.get('type')  ?? ''
  const groupFilter = searchParams.get('group') ?? ''
  const download    = searchParams.get('download') === '1'

  // ── Condiciones dinámicas via Drizzle (bypassa PostgREST) ─────────────────
  const whereClause = and(
    search
      ? or(
          ilike(verbsTable.base,    `%${search}%`),
          ilike(verbsTable.spanish, `%${search}%`),
          ilike(verbsTable.past,    `%${search}%`),
        )
      : undefined,
    typeFilter === 'regular' || typeFilter === 'irregular'
      ? eq(verbsTable.type, typeFilter as 'regular' | 'irregular')
      : undefined,
    groupFilter
      ? eq(verbsTable.group, groupFilter)
      : undefined,
  )

  const selectedCols = {
    id:         verbsTable.id,
    base:       verbsTable.base,
    past:       verbsTable.past,
    participle: verbsTable.participle,
    spanish:    verbsTable.spanish,
    type:       verbsTable.type,
    group:      verbsTable.group,
    difficulty: verbsTable.difficulty,
  }

  try {
    // ── Descarga: sin paginación ─────────────────────────────────────────────
    if (download) {
      const data = await db
        .select(selectedCols)
        .from(verbsTable)
        .where(whereClause)
        .orderBy(asc(verbsTable.base))

      return NextResponse.json({ data, total: data.length })
    }

    // ── Count total (con mismos filtros) ─────────────────────────────────────
    const countResult = await db
      .select({ total: count() })
      .from(verbsTable)
      .where(whereClause)
    const total = countResult[0]?.total ?? 0

    // ── Datos paginados ──────────────────────────────────────────────────────
    const data = await db
      .select(selectedCols)
      .from(verbsTable)
      .where(whereClause)
      .orderBy(asc(verbsTable.base))
      .limit(limit)
      .offset((page - 1) * limit)

    const totalPages = Math.ceil(total / limit)

    // ── Grupos únicos (sin filtro de grupo) ──────────────────────────────────
    const groupsRaw = await db
      .select({ group: verbsTable.group })
      .from(verbsTable)
      .where(isNotNull(verbsTable.group))
      .orderBy(asc(verbsTable.group))

    const groups = [...new Set(
      groupsRaw.map((r) => r.group).filter((g): g is string => g !== null),
    )]

    return NextResponse.json({ data, total, page, totalPages, limit, groups })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
