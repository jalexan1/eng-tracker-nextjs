/**
 * @file src/modules/english/irregular-verbs/components/VideoLearning.tsx
 * @description Player del video rap de verbos irregulares (YouTube embed).
 *   Permite controlar el punto de inicio y muestra info pedagógica al lado.
 */
'use client'

import { useState } from 'react'
import { FROM_RAP_COUNT, GROUP_LABELS, GROUP_ORDER, IRREGULAR_VERBS, VERB_COUNT } from '../data/irregular-verbs'

const VIDEO_ID = 'KiLcb9WS_XE'

const VIDEO_CHAPTERS = [
  { label: 'Intro',                   start: 0   },
  { label: 'Base / Past / Participle', start: 10  },
  { label: 'Grupo i → a → u',         start: 60  },
  { label: 'Grupo -ought/-aught',      start: 120 },
  { label: 'Sin cambio (invariable)',  start: 180 },
  { label: 'Grupo -ew/-own',          start: 240 },
  { label: 'Verbos de alta freq.',    start: 300 },
]

export function VideoLearning() {
  const [startAt, setStartAt]       = useState(0)
  const [iframeKey, setIframeKey]   = useState(0)
  const [autoplay, setAutoplay]     = useState(true)

  const embedUrl = `https://www.youtube.com/embed/${VIDEO_ID}?start=${startAt}&autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`

  function jumpTo(seconds: number) {
    setStartAt(seconds)
    setIframeKey(k => k + 1)   // fuerza recarga del iframe para aplicar start
  }

  const groupStats = GROUP_ORDER.map(g => ({
    group: g,
    label: GROUP_LABELS[g],
    count: IRREGULAR_VERBS.filter(v => v.group === g).length,
    fromRap: IRREGULAR_VERBS.filter(v => v.group === g && v.fromRap).length,
  }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🎬 Video Rap — Verbos Irregulares</h1>
        <p className="text-sm text-gray-400 mt-1">
          Escucha el patrón sonoro antes de practicar. El ritmo fija la memoria.
        </p>
      </div>

      {/* Layout 2 col en desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Player col */}
        <div className="xl:col-span-2 space-y-4">

          {/* Iframe */}
          <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-2xl"
               style={{ paddingBottom: '56.25%' }}>
            <iframe
              key={iframeKey}
              src={embedUrl}
              title="Irregular Verbs Rap"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Controles */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">Capítulos del video</h3>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={e => setAutoplay(e.target.checked)}
                  className="rounded"
                />
                Autoplay al saltar
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {VIDEO_CHAPTERS.map(ch => (
                <button
                  key={ch.start}
                  onClick={() => jumpTo(ch.start)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    startAt === ch.start
                      ? 'bg-english/20 text-english border-english/40'
                      : 'border-border text-gray-400 hover:border-english/30 hover:text-white'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tip pedagógico */}
          <div className="card bg-english/5 border-english/20">
            <p className="text-xs text-gray-400 leading-relaxed">
              💡 <span className="text-english font-semibold">Consejo:</span> No memorices la lista —
              escucha el <em>ritmo</em>. El cerebro retiene patrones sonoros, no reglas. Después del video,
              practica con las tarjetas de cada grupo sonoro.
            </p>
          </div>
        </div>

        {/* Sidebar info col */}
        <div className="space-y-4">

          {/* Stats */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">📊 Base de datos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-english/10 rounded-lg">
                <p className="text-2xl font-bold text-english">{VERB_COUNT}</p>
                <p className="text-xs text-gray-400 mt-1">verbos totales</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary-light">{FROM_RAP_COUNT}</p>
                <p className="text-xs text-gray-400 mt-1">del video rap</p>
              </div>
            </div>
          </div>

          {/* Grupos sonoros */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">🔊 Grupos sonoros</h3>
            <div className="space-y-2">
              {groupStats.map(g => (
                <div key={g.group} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{g.label}</p>
                    <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-english rounded-full"
                        style={{ width: `${(g.count / VERB_COUNT) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right shrink-0">{g.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos pasos */}
          <div className="card border-dashed border-border/50">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">🗺️ Ruta de aprendizaje</h3>
            <ol className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-english/20 text-english flex items-center justify-center shrink-0 font-bold">1</span>
                <span><span className="text-white font-medium">Ver el video</span> — activa la memoria musical</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-elevated text-gray-500 flex items-center justify-center shrink-0 font-bold">2</span>
                <span className="text-gray-600">Practicar flip-cards <span className="text-gray-500 italic">(próximamente)</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-elevated text-gray-500 flex items-center justify-center shrink-0 font-bold">3</span>
                <span className="text-gray-600">Grupos sonoros interactivos <span className="text-gray-500 italic">(próximamente)</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-elevated text-gray-500 flex items-center justify-center shrink-0 font-bold">4</span>
                <span className="text-gray-600">Producción activa — escribe frases <span className="text-gray-500 italic">(próximamente)</span></span>
              </li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  )
}
