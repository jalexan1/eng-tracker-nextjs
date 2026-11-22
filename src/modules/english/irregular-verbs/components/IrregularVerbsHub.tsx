/**
 * @file src/modules/english/irregular-verbs/components/IrregularVerbsHub.tsx
 * @description Hub central del módulo Verbos Irregulares.
 *   Muestra las secciones disponibles como tarjetas de acceso rápido.
 */
'use client'

import Link from 'next/link'
import { FROM_RAP_COUNT, VERB_COUNT } from '../data/irregular-verbs'

interface HubCard {
  href: string
  icon: string
  title: string
  description: string
  stat?: string
  badge?: string
  available: boolean
  color: string
}

const HUB_CARDS: HubCard[] = [
  {
    href:        '/english/irregular-verbs/video',
    icon:        '🎬',
    title:       'Ver Video Rap',
    description: 'Escucha el patrón sonoro antes de practicar. El ritmo fija la memoria más que las reglas.',
    stat:        `${FROM_RAP_COUNT} verbos en el video`,
    available:   true,
    color:       'border-english/40 hover:border-english',
  },
  {
    href:        '/english/irregular-verbs/practice',
    icon:        '🃏',
    title:       'Practicar — Flip Cards',
    description: 'Tarjetas estilo Anki con SM-2. Pregunta/respuesta con grupos sonoros y frases de contexto.',
    badge:       'Próximamente',
    available:   false,
    color:       'border-border',
  },
  {
    href:        '/english/irregular-verbs/groups',
    icon:        '🔊',
    title:       'Grupos Sonoros',
    description: 'Aprende por patrón fonético: i→a→u, -ought/-aught, invariable, -ew/-own y más.',
    stat:        '8 grupos sonoros',
    badge:       'Próximamente',
    available:   false,
    color:       'border-border',
  },
  {
    href:        '/english/irregular-verbs/production',
    icon:        '✍️',
    title:       'Producción Activa',
    description: 'Escribe frases completas usando los verbos. El cerebro necesita producir para retener de verdad.',
    badge:       'Próximamente',
    available:   false,
    color:       'border-border',
  },
  {
    href:        '/english/irregular-verbs/progress',
    icon:        '📊',
    title:       'Mi Progreso',
    description: 'Dashboard personal: verbos dominados, racha de práctica y tasa de retención por grupo.',
    badge:       'Próximamente',
    available:   false,
    color:       'border-border',
  },
]

export function IrregularVerbsHub() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📚</span>
          <h1 className="text-2xl font-bold text-white">Verbos Irregulares</h1>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Domina los {VERB_COUNT} verbos irregulares más usados del inglés con el método de los 5 pilares:
          grupos sonoros, micro-dosis, retroalimentación que enseña, narrativa progresiva y producción activa.
        </p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-english">{VERB_COUNT}</p>
          <p className="text-xs text-gray-400 mt-1">Verbos totales</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-primary-light">8</p>
          <p className="text-xs text-gray-400 mt-1">Grupos sonoros</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-success">3</p>
          <p className="text-xs text-gray-400 mt-1">Verbos/día</p>
        </div>
      </div>

      {/* Cards de secciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {HUB_CARDS.map(card => (
          <div key={card.href} className="relative">
            {card.available ? (
              <Link
                href={card.href as never}
                className={`card flex flex-col gap-3 h-full border transition-all duration-200 ${card.color} hover:shadow-lg hover:shadow-english/5`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{card.icon}</span>
                  {card.stat && (
                    <span className="text-xs text-english bg-english/10 px-2 py-0.5 rounded-full">
                      {card.stat}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{card.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{card.description}</p>
                </div>
                <div className="mt-auto pt-2 text-xs text-english font-medium">
                  Comenzar →
                </div>
              </Link>
            ) : (
              <div className={`card flex flex-col gap-3 h-full border ${card.color} opacity-60 cursor-not-allowed select-none`}>
                <div className="flex items-start justify-between">
                  <span className="text-2xl grayscale">{card.icon}</span>
                  {card.badge && (
                    <span className="text-xs text-gray-500 bg-elevated px-2 py-0.5 rounded-full border border-border">
                      {card.badge}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400">{card.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{card.description}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filosof­ía */}
      <div className="card border-dashed border-border/50 bg-surface/50">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">⚡ ¿Por qué este método es diferente a Anki?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
          <div className="space-y-1.5">
            <p className="text-gray-500 font-medium uppercase tracking-wide text-[10px]">Anki estándar</p>
            <p>→ Algoritmo frío, tarjeta sola</p>
            <p>→ Error = saltar a la siguiente</p>
            <p>→ Lista alfabética</p>
            <p>→ Solo reconocimiento pasivo</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-english font-medium uppercase tracking-wide text-[10px]">Esta plataforma</p>
            <p>→ Verbo en contexto vivo con frase</p>
            <p>→ Error = enseña el patrón sonoro</p>
            <p>→ Grupos fonéticos (el ritmo memoriza)</p>
            <p>→ Producción activa: tú escribes la frase</p>
          </div>
        </div>
      </div>

    </div>
  )
}
