import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ── Vercel: aumentar timeout a 60s para cargas grandes ────────────────────────
export const maxDuration = 60

// Tipos esperados del cliente (ya validados en el browser)
interface VerbRow {
  base:        string
  past:        string
  participle:  string
  spanish:     string
  type:        'regular' | 'irregular'
  group?:      string
  difficulty?: number
}

interface SentenceRow {
  verbBase:    string   // referencia al verbo por su forma base
  form:        'base' | 'past' | 'participle'
  sentence:    string
  sentenceEs?: string
}

export async function POST(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
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

  const body = await req.json().catch(() => ({}))
  const { type, rows } = body as {
    type: 'verbs' | 'sentences' | 'phrases'
    rows: VerbRow[] | SentenceRow[]
  }

  if (!type || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  // ── Cargue de VERBOS — un solo batch upsert ───────────────────────────────
  if (type === 'verbs') {
    const verbRows = rows as VerbRow[]

    const records = verbRows.map((v) => ({
      base:       v.base.toLowerCase().trim(),
      past:       v.past.toLowerCase().trim(),
      participle: v.participle.toLowerCase().trim(),
      spanish:    v.spanish.trim(),
      type:       v.type,
      group:      v.group ?? null,
      difficulty: v.difficulty ?? 1,
    }))

    const { error, count } = await supabase
      .schema('english')
      .from('verbs')
      .upsert(records, { onConflict: 'base', count: 'exact' })

    if (error) {
      return NextResponse.json({
        ok:       false,
        inserted: 0,
        skipped:  0,
        errors:   [{ row: 0, error: error.message }],
      })
    }

    return NextResponse.json({
      ok:       true,
      inserted: count ?? records.length,
      skipped:  0,
      errors:   [],
    })
  }

  // ── Cargue de ORACIONES — batch en dos pasos ─────────────────────────────
  if (type === 'sentences') {
    const sentRows = rows as SentenceRow[]

    // 1) Obtener todos los verb_id en una sola consulta
    const uniqueBases = [...new Set(sentRows.map((s) => s.verbBase.toLowerCase().trim()))]
    const { data: verbData, error: vErr } = await supabase
      .schema('english')
      .from('verbs')
      .select('id, base')
      .in('base', uniqueBases)

    if (vErr) {
      return NextResponse.json({
        ok: false, inserted: 0,
        errors: [{ row: 0, error: vErr.message }],
      })
    }

    // Mapa base → id
    const verbMap = new Map<string, number>(
      (verbData ?? []).map((v: { id: number; base: string }) => [v.base, v.id])
    )

    // 2) Construir registros — omitir filas con verbo no encontrado
    const sentRecords: { verb_id: number; form: string; sentence: string; sentence_es: string | null }[] = []
    const errors: { row: number; error: string }[] = []

    sentRows.forEach((s, idx) => {
      const base = s.verbBase.toLowerCase().trim()
      const verbId = verbMap.get(base)
      if (!verbId) {
        errors.push({ row: idx + 2, error: `Verbo '${s.verbBase}' no encontrado en BD` })
        return
      }
      sentRecords.push({
        verb_id:     verbId,
        form:        s.form,
        sentence:    s.sentence.trim(),
        sentence_es: s.sentenceEs?.trim() ?? null,
      })
    })

    // 3) Batch insert de oraciones
    if (sentRecords.length > 0) {
      const { error: insErr, count } = await supabase
        .schema('english')
        .from('verb_sentences')
        .insert(sentRecords, { count: 'exact' })

      if (insErr) {
        return NextResponse.json({
          ok: false, inserted: 0,
          errors: [{ row: 0, error: insErr.message }],
        })
      }

      return NextResponse.json({
        ok:       errors.length === 0,
        inserted: count ?? sentRecords.length,
        errors,
      })
    }

    return NextResponse.json({ ok: false, inserted: 0, errors })
  }

  return NextResponse.json({ error: `Tipo '${type}' no soportado` }, { status: 400 })
}
