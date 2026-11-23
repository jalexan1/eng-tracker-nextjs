import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
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
  const page     = Math.max(1, Number(searchParams.get('page')  ?? '1'))
  const limit    = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
  const search   = (searchParams.get('search') ?? '').trim().toLowerCase()
  const typeFilter  = searchParams.get('type')  ?? ''   // 'regular' | 'irregular' | ''
  const groupFilter = searchParams.get('group') ?? ''
  const download = searchParams.get('download') === '1'

  // ── Construir query ──────────────────────────────────────────────────────
  let query = supabase
    .schema('english')
    .from('verbs')
    .select('id, base, past, participle, spanish, type, group, difficulty', { count: 'exact' })
    .order('base', { ascending: true })

  if (search) {
    query = query.or(`base.ilike.%${search}%,spanish.ilike.%${search}%,past.ilike.%${search}%`)
  }
  if (typeFilter === 'regular' || typeFilter === 'irregular') {
    query = query.eq('type', typeFilter)
  }
  if (groupFilter) {
    query = query.eq('group', groupFilter)
  }

  // Para descarga: sin paginación (todos los resultados filtrados)
  if (download) {
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: data?.length ?? 0 })
  }

  // Con paginación
  const from = (page - 1) * limit
  const to   = from + limit - 1
  const { data, error, count } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total      = count ?? 0
  const totalPages = Math.ceil(total / limit)

  // Grupos únicos (para el filtro — consultamos aparte sin filtros de grupo)
  const { data: groupData } = await supabase
    .schema('english')
    .from('verbs')
    .select('group')
    .not('group', 'is', null)
    .order('group', { ascending: true })

  const groups = [...new Set((groupData ?? []).map((r: { group: string | null }) => r.group).filter(Boolean))] as string[]

  return NextResponse.json({ data: data ?? [], total, page, totalPages, limit, groups })
}
