/**
 * POST /api/english/videos/import
 * Pipeline: YouTube URL → transcript → IA extrae verbos/frases/categoría → DB
 *
 * fetchTranscript usa 4 estrategias encadenadas:
 *   1. InnerTube ANDROID  — cliente más permisivo desde servidores (igual que yt-dlp)
 *   2. InnerTube TVHTML5  — segundo cliente sin bot-detection de browser
 *   3. timedtext directo  — API pública /api/timedtext para videos con CC
 *   4. HTML scraping      — extrae ytInitialPlayerResponse del HTML con UA de Chrome
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, english } from '@lib/db'
import { eq } from 'drizzle-orm'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = 'openai/gpt-oss-120b'

// InnerTube API keys (claves públicas de los clientes oficiales de YouTube)
const YT_ANDROID_KEY = 'AIzaSyA8eiZmM1LaS1KkMBDqnFhJzJy9XMuZq9Y'
const YT_WEB_KEY     = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

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

// ── Decodifica escapes unicode en URLs de YouTube ────────────────
function decodeYtUrl(raw: string): string {
  return raw
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
}

// ── Busca el mejor track de captions en inglés ───────────────────
type CaptionTrack = { languageCode?: string; kind?: string; baseUrl?: string }

function pickEnglishTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  return (
    tracks.find((t) => t.languageCode === 'en' && !t.kind) ??   // CC manual
    tracks.find((t) => t.languageCode === 'en') ??               // CC auto-generated
    tracks.find((t) => t.languageCode?.startsWith('en')) ??      // en-US, en-GB, etc.
    tracks[0] ??                                                  // cualquier track
    null
  )
}

// ── Llama a un endpoint InnerTube y devuelve el transcript ───────
async function fetchFromInnerTube(
  videoId: string,
  clientName: string,
  clientVersion: string,
  apiKey: string,
  extraHeaders: Record<string, string> = {},
  extraClientFields: Record<string, unknown> = {},
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName,
              clientVersion,
              hl:  'en',
              gl:  'US',
              ...extraClientFields,
            },
          },
          racyCheckOk:    true,
          contentCheckOk: true,
        }),
      },
    )

    if (!res.ok) return null

    const data = (await res.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: CaptionTrack[]
        }
      }
    }

    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!Array.isArray(tracks) || tracks.length === 0) return null

    const track = pickEnglishTrack(tracks)
    if (!track?.baseUrl) return null

    const captionUrl = decodeYtUrl(track.baseUrl)
    const captionRes = await fetch(captionUrl)
    if (!captionRes.ok) return null

    return parseXmlToText(await captionRes.text())
  } catch {
    return null
  }
}

// ── Estrategia 3: timedtext API directo ──────────────────────────
async function fetchFromTimedtext(videoId: string): Promise<string | null> {
  try {
    // Primero obtener la lista de tracks disponibles
    const listRes = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&type=list`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      },
    )
    if (!listRes.ok) return null
    const listXml = await listRes.text()

    // Buscar track en inglés (manual o auto)
    const trackMatch =
      listXml.match(/lang_code="en"[^/]*/i) ??
      listXml.match(/lang_code="en-[A-Z]+"[^/]*/i)

    const langCode = trackMatch
      ? (trackMatch[0].match(/lang_code="([^"]+)"/i)?.[1] ?? 'en')
      : 'en'

    // Intentar obtener el transcript en ese idioma
    const captionRes = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${langCode}&fmt=srv3`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      },
    )
    if (!captionRes.ok) return null
    const xml = await captionRes.text()
    if (!xml.includes('<text')) return null
    return parseXmlToText(xml)
  } catch {
    return null
  }
}

// ── Estrategia 4: HTML scraping → ytInitialPlayerResponse ────────
async function fetchFromHtmlScraping(videoId: string): Promise<string | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
        'Sec-Fetch-Dest':  'document',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Site':  'none',
      },
    })
    if (!pageRes.ok) return null
    const html = await pageRes.text()

    // Extraer ytInitialPlayerResponse del script inline
    const scriptPatterns = [
      /var ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var |<\/script>)/s,
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var |window\[)/s,
    ]

    let playerJson: string | null = null
    for (const pattern of scriptPatterns) {
      const m = html.match(pattern)
      if (m?.[1]) { playerJson = m[1]; break }
    }

    // Fallback: buscar captionTracks directamente
    if (!playerJson) {
      const trackPatterns = [
        /"captionTracks":(\[.*?\]),"audioTracks"/s,
        /"captionTracks":(\[.*?\]),"translationLanguages"/s,
      ]
      for (const p of trackPatterns) {
        const m = html.match(p)
        if (m?.[1]) {
          try {
            const tracks = JSON.parse(m[1]) as CaptionTrack[]
            const track  = pickEnglishTrack(tracks)
            if (!track?.baseUrl) return null
            const captionRes = await fetch(decodeYtUrl(track.baseUrl))
            if (!captionRes.ok) return null
            return parseXmlToText(await captionRes.text())
          } catch { return null }
        }
      }
      return null
    }

    // Parsear el JSON completo del player
    let playerData: {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: CaptionTrack[]
        }
      }
    }
    try {
      playerData = JSON.parse(playerJson) as typeof playerData
    } catch {
      return null
    }

    const tracks = playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!Array.isArray(tracks) || tracks.length === 0) return null

    const track = pickEnglishTrack(tracks)
    if (!track?.baseUrl) return null

    const captionRes = await fetch(decodeYtUrl(track.baseUrl))
    if (!captionRes.ok) return null
    return parseXmlToText(await captionRes.text())
  } catch {
    return null
  }
}

// ── Orquestador principal: 4 estrategias en cascada ─────────────
async function fetchTranscript(videoId: string): Promise<string | null> {

  // ── Estrategia 1: InnerTube ANDROID ─────────────────────────────
  // El cliente Android de YouTube bypasea el bot-detection de browser.
  // YouTube no aplica las mismas restricciones a peticiones de la app oficial.
  const androidResult = await fetchFromInnerTube(
    videoId,
    'ANDROID',
    '19.09.37',
    YT_ANDROID_KEY,
    {
      'User-Agent':              'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
      'X-YouTube-Client-Name':   '3',
      'X-YouTube-Client-Version': '19.09.37',
    },
    { androidSdkVersion: 30 },
  )
  if (androidResult) return androidResult

  // ── Estrategia 2: InnerTube TV Embedded ─────────────────────────
  // Smart TV client — también menos restrictivo que WEB desde servidores
  const tvResult = await fetchFromInnerTube(
    videoId,
    'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    '2.0',
    YT_WEB_KEY,
    {
      'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
      'Origin':     'https://www.youtube.com',
    },
    {},
  )
  if (tvResult) return tvResult

  // ── Estrategia 3: timedtext API directo ─────────────────────────
  const timedtextResult = await fetchFromTimedtext(videoId)
  if (timedtextResult) return timedtextResult

  // ── Estrategia 4: HTML scraping con UA real de Chrome ───────────
  return fetchFromHtmlScraping(videoId)
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
      youtubeUrl:   url,
      youtubeId,
      title:        'Procesando…',
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      status:       'processing',
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
      description: 'Este video no tiene subtítulos CC disponibles o no fue posible extraerlos.',
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
        error:   'Este video no tiene subtítulos disponibles.',
        detail:  'La función de importar videos sin CC está en desarrollo. El video fue guardado en la lista de Pendientes para cuando esté disponible.',
        videoId: newVideo.id,
        pending: true,
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
    await db
      .update(english.videos)
      .set({ status: 'error', errorMessage: 'Error en análisis IA' })
      .where(eq(english.videos.id, newVideo.id))
    return NextResponse.json({ error: 'Error al analizar el video con IA' }, { status: 500 })
  }

  // ── Actualizar video con datos extraídos ───────────────────────
  await db
    .update(english.videos)
    .set({
      title:     aiData.title ?? `Video ${youtubeId}`,
      category:  aiData.category ?? 'general',
      transcript,
      status:    'ready',
      updatedAt: new Date(),
    })
    .where(eq(english.videos.id, newVideo.id))

  // ── Guardar verbos ─────────────────────────────────────────────
  if (aiData.verbs && aiData.verbs.length > 0) {
    await db.insert(english.videoVerbs).values(
      aiData.verbs.map((v) => ({
        videoId:         newVideo.id,
        verbBase:        v.verbBase,
        verbPast:        v.verbPast,
        verbParticiple:  v.verbParticiple,
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
    success:        true,
    videoId:        newVideo.id,
    title:          aiData.title,
    category:       aiData.category,
    verbsCount:     aiData.verbs?.length    ?? 0,
    sentencesCount: aiData.sentences?.length ?? 0,
  })
}
