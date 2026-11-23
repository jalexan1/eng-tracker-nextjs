import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Modelo Groq — gratuito, 30 RPM, 14 400 req/día
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'llama-3.1-70b-versatile'

// Fallback: Gemini si GROQ_API_KEY no está configurado
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

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

  // ── Body ──────────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const { prompt, systemPrompt } = body as {
    prompt?:       string
    systemPrompt?: string
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'El campo prompt es requerido' }, { status: 400 })
  }

  // ── Groq ──────────────────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const messages: { role: string; content: string }[] = []
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
      messages.push({ role: 'user', content: prompt.trim() })

      const start = Date.now()
      const groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model:       GROQ_MODEL,
          messages,
          max_tokens:  2048,
          temperature: 0.7,
        }),
      })

      if (!groqRes.ok) {
        const err = await groqRes.text()
        console.error('[Groq] error:', err)
        // Si falla Groq, cae al bloque de Gemini (si está configurado)
        throw new Error(err)
      }

      const data = await groqRes.json()
      const text  = (data.choices?.[0]?.message?.content as string) ?? ''

      return NextResponse.json({
        response:  text,
        provider:  'groq',
        model:     data.model ?? GROQ_MODEL,
        usage:     data.usage ?? null,
        latencyMs: Date.now() - start,
      })
    } catch {
      // Continúa hacia Gemini si está configurado
    }
  }

  // ── Gemini (fallback) ─────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const start    = Date.now()
      const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt.trim() }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      })

      if (!geminiRes.ok) throw new Error(await geminiRes.text())

      const data = await geminiRes.json()
      const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      return NextResponse.json({
        response:  text,
        provider:  'gemini',
        model:     'gemini-1.5-flash',
        usage:     null,
        latencyMs: Date.now() - start,
      })
    } catch (err) {
      console.error('[Gemini] error:', err)
    }
  }

  // ── Sin API key configurada ───────────────────────────────────────────────
  return NextResponse.json(
    {
      error: 'No hay API key configurada. Agrega GROQ_API_KEY o GEMINI_API_KEY en tus variables de entorno en Vercel.',
    },
    { status: 503 },
  )
}
