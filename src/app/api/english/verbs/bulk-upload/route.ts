import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@lib/db'
import { verbs as verbsTable, verbSentences as verbSentencesTable } from '@/db/schema/english/verbs'
import { sql, inArray } from 'drizzle-orm'

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
  verbBase:    string
  form:        'base' | 'past' | 'participle'
  sentence:    string
  sentenceEs?: string
}

export async function POST(req: NextRequest) {
  // ── Auth guard (Supabase auth — no usa .schema()) ─────────────────────────
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

  // ── Cargue de VERBOS — un solo batch upsert via Drizzle ───────────────────
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

    try {
      await db
        .insert(verbsTable)
        .values(records)
        .onConflictDoUpdate({
          target: verbsTable.base,
          set: {
            past:       sql`excluded.past`,
            participle: sql`excluded.participle`,
            spanish:    sql`excluded.spanish`,
            type:       sql`excluded.type`,
            group:      sql`excluded."group"`,
            difficulty: sql`excluded.difficulty`,
          },
        })

      return NextResponse.json({
        ok:       true,
        inserted: records.length,
        skipped:  0,
        errors:   [],
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({
        ok:       false,
        inserted: 0,
        skipped:  0,
        errors:   [{ row: 0, error: msg }],
      })
    }
  }

  // ── Cargue de ORACIONES — batch en dos pasos via Drizzle ─────────────────
  if (type === 'sentences') {
    const sentRows = rows as SentenceRow[]

    const uniqueBases = [...new Set(sentRows.map((s) => s.verbBase.toLowerCase().trim()))]

    // 1) Obtener todos los verb_id en una sola consulta
    const verbData = await db
      .select({ id: verbsTable.id, base: verbsTable.base })
      .from(verbsTable)
      .where(inArray(verbsTable.base, uniqueBases))

    // Mapa base → id
    const verbMap = new Map<string, string>(
      verbData.map((v) => [v.base, v.id]),
    )

    // 2) Construir registros — omitir filas con verbo no encontrado
    const sentRecords: {
      verbId: string
      form: 'base' | 'past' | 'participle'
      sentence: string
      sentenceEs: string | null
    }[] = []
    const errors: { row: number; error: string }[] = []

    sentRows.forEach((s, idx) => {
      const base   = s.verbBase.toLowerCase().trim()
      const verbId = verbMap.get(base)
      if (!verbId) {
        errors.push({ row: idx + 2, error: `Verbo '${s.verbBase}' no encontrado en BD` })
        return
      }
      sentRecords.push({
        verbId,
        form:       s.form,
        sentence:   s.sentence.trim(),
        sentenceEs: s.sentenceEs?.trim() ?? null,
      })
    })

    // 3) Batch insert de oraciones
    if (sentRecords.length > 0) {
      try {
        await db.insert(verbSentencesTable).values(sentRecords)
        return NextResponse.json({
          ok:       errors.length === 0,
          inserted: sentRecords.length,
          errors,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json({
          ok: false, inserted: 0,
          errors: [{ row: 0, error: msg }],
        })
      }
    }

    return NextResponse.json({ ok: false, inserted: 0, errors })
  }

  return NextResponse.json({ error: `Tipo '${type}' no soportado` }, { status: 400 })
}
