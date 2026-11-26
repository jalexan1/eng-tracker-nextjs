/**
 * POST /api/english/videos/import
 * Pipeline: YouTube URL → transcript → IA extrae verbos/frases/categoría → DB
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq } from 'drizzle-orm'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'openai/gpt-oss-120b'

// ── Extrae el ID de YouTube de cualquier formato de URL ──────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

// ── Convierte XML de captions en texto plano ─────────────────────
function parseXmlToText(xml: string): string | null {
  const textParts = xml.match(/<text[^>]*>([^<]*)<\/text>/g) ?? []
  const transcript = textParts
    .map((t) =>
      t
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join(' ')
  return transcript.length > 50 ? transcript : null
}

// ── Obtiene el transcript via YouTube InnerTube API + fallback scraping ──
// Estrategia dual para funcionar desde IPs de datacenter (Vercel)
async function fetchTranscript(videoId: string): Promise<string | null> {

  // ── Enfoque 1: InnerTube API (YouTube interno, sin scraping) ─────
  // Es la misma API que usa yt-dlp; funciona sin cookies desde servidor
  try {
    const innerTubeRes = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'X-YouTube-Client-Name':    '1',
          'X-YouTube-Client-Version': '2.20231121.09.00',
          'Origin':  'https://www.youtube.com',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName:    'WEB',
              clientVersion: '2.20231121.09.00',
              hl:            'en',
              gl:            'US',
              utcOffsetMinutes: 0,
            },
          },
          racyCheckOk:  true,
          contentCheckOk: true,
        }),
      },
    )

    if (innerTubeRes.ok) {
      const data = (await innerTubeRes.json()) as Record<string, unknown>
      const captionsList = (
        data as { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: unknown[] } } }
      ).captions?.playerCaptionsTracklistRenderer?.captionTracks

      if (Array.isArray(captionsList) && captionsList.length > 0) {
        type CaptionTrack = { languageCode?: string; kind?: string; baseUrl?: string }
        const tracks = captionsList as CaptionTrack[]

        // Preferir CC manual en inglés → CC auto-generated → cualquier track
        const enTrack =
          tracks.find((t) => t.languageCode === 'en' && !t.kind) ??
          tracks.find((t) => t.languageCode === 'en') ??
          tracks[0]

        const captionUrl = enTrack?.baseUrl
        if (captionUrl) {
          const captionRes = await fetch(captionUrl)
          if (captionRes.ok) {
            const result = parseXmlToText(await captionRes.text())
            if (result) return result
          }
        }
      }
    }
  } catch {
    // Continúa con el enfoque 2
  }

  // ── Enfoque 2: Scraping del HTML con UA real de Chrome ───────────
  // YouTube puede bloquear IPs de datacenter, pero intentamos con UA completo
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control':   'no-cache',
        'Sec-Fetch-Dest':  'document',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Site':  'none',
      },
    })

    if (!pageRes.ok) return null
    const html = await pageRes.text()

    // Múltiples patrones para captionTracks (el formato del HTML varía)
    const trackPatterns = [
      /"captionTracks":(\[.*?\]),"audioTracks"/s,
      /"captionTracks":(\[.*?\]),"translationLanguages"/s,
      /"captionTracks":(\[.*?\])}/s,
    ]

    let tracksJson: string | null = null
    for (const p of trackPatterns) {
      const m = html.match(p)
      if (m?.[1]) {
        tracksJson = m[1]
        break
      }
    }
    if (!tracksJson) return null

    // Intentar parsear el array JSON completo
    let tracks: { languageCode?: string; kind?: string; baseUrl?: string }[]
    try {
      tracks = JSON.parse(tracksJson) as typeof tracks
    } catch {
      // Fallback: extraer baseUrl con regex si el JSON no parsea bien
      const rawUrl = tracksJson.match(/"baseUrl":"(https:[^"]+)"/)
      if (!rawUrl?.[1]) return null
      const captionUrl = rawUrl[1]
        .replace(/\\u0026/g, '&')
        .replace(/\\u003d/g, '=')
        .replace(/\\u003D/g, '=')
      const r = await fetch(captionUrl)
      if (!r.ok) return null
      return parseXmlToText(await r.text())
    }

    // Preferir CC manual en inglés → CC auto-generated → primer track disponible
    const enTrack =
      tracks.find((t) => t.languageCode === 'en' && !t.kind) ??
      tracks.find((t) => t.languageCode === 'en') ??
      tracks[0]

    if (!enTrack?.baseUrl) return null

    // Decodificar escapes unicode en la URL (& = &, = = =)
    const captionUrl = enTrack.baseUrl
      .replace(/\\u0026/g, '&')
      .replace(/\\u003d/g, '=')
      .replace(/\\u003D/g, '=')

    const captionRes = await fetch(captionUrl)
    if (!captionRes.ok) return null
    return parseXmlToText(await captionRes.text())
  } catch {
    return null
  }
}

// ── Llama a Groq para analizar el transcript ─────────────────────
async function analyzeWithAI(transcript: string, groqKey: string) {
  const systemPrompt = `You are an English language learning assistant.
Analyze this video transcript and extract educational data in JSON format.
Return ONLY valid JSON, no markdown, no explanation.`

  const userPrompt = `Analyze this English video transcript and return a JSON object with:
{
  "title": "short descriptive title for the video content (max 60 chars)",
  "category": "one of: irregular-verbs, phrasal-verbs, pronunciation, grammar, vocabulary, listening, general",
  "verbs": [
    {
      "verbBase": "go",
      "verbPast": "went",
      "verbParticiple": "gone",
      "contextSentence": "exact sentence from transcript where verb appears"
    }
  ],
  "sentences": [
    {
      "sentenceEn": "key English sentence from transcript",
      "sentenceEs": "Spanish translation",
      "difficulty": "beginner|intermediate|advanced"
    }
  ]
}

Rules:
- Extract up to 15 most important irregular verbs found in the transcript
- Extract up to 20 key sentences (useful for language learning)
- Keep verbBase as the infinitive without "to"
- If a verb is regular or not notable, skip it
- sentenceEs must be accurate Spanish translation

Transcript:
${transcript.slice(0, 6000)}`

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  3000,
      temperature: 0.3,
    }),
  })

  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`)
  const data = await res.json()
  const content = (data.choices?.[0]?.message?.content as string) ?? '{}'

  // Limpiar posible markdown code block
  const clean = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(clean)
}

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────
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
  const userId = session.user.id

  // ── Body ───────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({})) as { url?: string }
  const url = body.url?.trim()
  if (!url) {
    return NextResponse.json({ error: 'El campo url es requerido' }, { status: 400 })
  }

  const youtubeId = extractYouTubeId(url)
  if (!youtubeId) {
    return NextResponse.json({ error: 'URL de YouTube no válida' }, { status: 400 })
  }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada en Vercel' }, { status: 503 })
  }

  // ── Crear registro en estado processing ───────────────────────
  const [newVideo] = await db
    .insert(english.videos)
    .values({
      userId,
      youtubeUrl:  url,
      youtubeId,
      title:       'Procesando…',
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      status:      'processing',
    })
    .returning()

  if (!newVideo) {
    return NextResponse.json({ error: 'Error al crear el registro del video' }, { status: 500 })
  }

  // ── Obtener transcript ─────────────────────────────────────────
  const transcript = await fetchTranscript(youtubeId)

  if (!transcript) {
    // Guardar como pendiente automáticamente
    await db.insert(english.pendingFeatures).values({
      userId,
      title:       `Video sin subtítulos: ${url}`,
      description: 'Este video no tiene subtítulos CC disponibles. Se requiere investigar método alternativo de extracción.',
      context:     'import-video',
      status:      'pending',
      priority:    1,
    })

    // Marcar el video como error
    await db
      .update(english.videos)
      .set({ status: 'error', errorMessage: 'Sin subtítulos disponibles. Guardado en Pendientes.' })
      .where(eq(english.videos.id, newVideo.id))

    return NextResponse.json(
      {
        error:    'Este video no tiene subtítulos disponibles.',
        detail:   'La función de importar videos sin CC está en desarrollo. El video fue guardado en la lista de Pendientes para cuando esté disponible.',
        videoId:  newVideo.id,
        pending:  true,
      },
      { status: 422 },
    )
  }

  // ── Analizar con IA ────────────────────────────────────────────
  let aiData: {
    title?: string
    category?: string
    verbs?: { verbBase: string; verbPast?: string; verbParticiple?: string; contextSentence?: string }[]
    sentences?: { sentenceEn: string; sentenceEs?: string; difficulty?: string }[]
  }

  try {
    aiData = await analyzeWithAI(transcript, groqKey)
  } catch (err) {
    console.error('[AI Analysis Error]', err)
    await db.update(english.videos).set({ status: 'error', errorMessage: 'Error en análisis IA' }).where(eq(english.videos.id, newVideo.id))
    return NextResponse.json({ error: 'Error al analizar el video con IA' }, { status: 500 })
  }

  // ── Actualizar video con datos extraídos ───────────────────────
  await db
    .update(english.videos)
    .set({
      title:      aiData.title ?? `Video ${youtubeId}`,
      category:   aiData.category ?? 'general',
      transcript,
      status:     'ready',
      updatedAt:  new Date(),
    })
    .where(eq(english.videos.id, newVideo.id))

  // ── Guardar verbos ─────────────────────────────────────────────
  if (aiData.verbs && aiData.verbs.length > 0) {
    await db.insert(english.videoVerbs).values(
      aiData.verbs.map((v) => ({
        videoId:        newVideo.id,
        verbBase:       v.verbBase,
        verbPast:       v.verbPast,
        verbParticiple: v.verbParticiple,
        contextSentence: v.contextSentence,
      })),
    )
  }

  // ── Guardar frases ─────────────────────────────────────────────
  if (aiData.sentences && aiData.sentences.length > 0) {
    await db.insert(english.videoSentences).values(
      aiData.sentences.map((s) => ({
        videoId:    newVideo.id,
        sentenceEn: s.sentenceEn,
        sentenceEs: s.sentenceEs,
        difficulty: s.difficulty ?? 'intermediate',
      })),
    )
  }

  return NextResponse.json({
    success:  true,
    videoId:  newVideo.id,
    title:    aiData.title,
    category: aiData.category,
    verbsCount:    aiData.verbs?.length    ?? 0,
    sentencesCount: aiData.sentences?.length ?? 0,
  })
}
