import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
  verbBase:   string   // referencia al verbo por su forma base
  form:       'base' | 'past' | 'participle'
  sentence:   string
  sentenceEs?: string
}

export async function POST(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
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

  // ── Cargue de VERBOS ─────────────────────────────────────────────────────
  if (type === 'verbs') {
    const verbRows = rows as VerbRow[]
    const inserted: string[] = []
    const skipped:  string[] = []
    const errors:   { row: number; error: string }[] = []

    for (let i = 0; i < verbRows.length; i++) {
      const v = verbRows[i]
      try {
        const { error } = await supabase
          .schema('english')
          .from('verbs')
          .upsert(
            {
              base:       v.base.toLowerCase().trim(),
              past:       v.past.toLowerCase().trim(),
              participle: v.participle.toLowerCase().trim(),
              spanish:    v.spanish.trim(),
              type:       v.type,
              group:      v.group ?? null,
              difficulty: v.difficulty ?? 1,
            },
            { onConflict: 'base' },
          )

        if (error) throw new Error(error.message)
        inserted.push(v.base)
      } catch (err) {
        errors.push({ row: i + 2, error: (err as Error).message })
        skipped.push(v.base)
      }
    }

    return NextResponse.json({
      ok:       errors.length === 0,
      inserted: inserted.length,
      skipped:  skipped.length,
      errors,
    })
  }

  // ── Cargue de ORACIONES ──────────────────────────────────────────────────
  if (type === 'sentences') {
    const sentRows = rows as SentenceRow[]
    const inserted: number[] = []
    const errors:   { row: number; error: string }[] = []

    for (let i = 0; i < sentRows.length; i++) {
      const s = sentRows[i]
      try {
        // Buscar el verb_id por base
        const { data: verb, error: vErr } = await supabase
          .schema('english')
          .from('verbs')
          .select('id')
          .eq('base', s.verbBase.toLowerCase().trim())
          .single()

        if (vErr || !verb) throw new Error(`Verbo '${s.verbBase}' no encontrado en BD`)

        const { error } = await supabase
          .schema('english')
          .from('verb_sentences')
          .insert({
            verb_id:     verb.id,
            form:        s.form,
            sentence:    s.sentence.trim(),
            sentence_es: s.sentenceEs?.trim() ?? null,
          })

        if (error) throw new Error(error.message)
        inserted.push(i)
      } catch (err) {
        errors.push({ row: i + 2, error: (err as Error).message })
      }
    }

    return NextResponse.json({
      ok:       errors.length === 0,
      inserted: inserted.length,
      errors,
    })
  }

  return NextResponse.json({ error: `Tipo '${type}' no soportado` }, { status: 400 })
}
