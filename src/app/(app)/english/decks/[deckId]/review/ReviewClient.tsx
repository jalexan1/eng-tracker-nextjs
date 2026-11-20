'use client'
/**
 * @file ReviewClient.tsx
 * @description Componente interactivo de revisión SM-2 para tarjetas de inglés.
 * Flip card + botones again/hard/good/easy
 */
import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { reviewCardAction }        from '@english/decks/actions/decks.actions'
import type { ReviewSession }      from '@english/decks/types'
import type { Difficulty }         from '@english/decks/services/SM2Algorithm'

interface Props {
  session: ReviewSession
}

const DIFFICULTY_BUTTONS: { label: string; value: Difficulty; color: string }[] = [
  { label: 'Again',  value: 'again', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { label: 'Hard',   value: 'hard',  color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { label: 'Good',   value: 'good',  color: 'bg-english/10 text-english hover:bg-english/20' },
  { label: 'Easy',   value: 'easy',  color: 'bg-green-100 text-green-700 hover:bg-green-200' },
]

export function ReviewClient({ session }: Props) {
  const router                  = useRouter()
  const [isPending, startTrans] = useTransition()
  const [currentIdx, setIdx]    = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [completed, setCompleted] = useState(0)

  const card = session.cards[currentIdx]

  if (!card) {
    return (
      <div className="card text-center py-12">
        <p className="text-4xl mb-3">🎉</p>
        <h2 className="text-xl font-bold text-gray-900">¡Sesión completada!</h2>
        <p className="text-sm text-gray-500 mt-2">Revisaste {completed} tarjetas.</p>
        <button onClick={() => router.push('/english/decks')} className="btn-primary mt-6">
          Volver a mazos
        </button>
      </div>
    )
  }

  async function handleDifficulty(difficulty: Difficulty) {
    const responseTimeMs = Date.now() - startTime
    startTrans(async () => {
	  if (!card) return
      await reviewCardAction({ cardId: card.id, difficulty, responseTimeMs })
      setCompleted(c => c + 1)
      setIdx(i => i + 1)
      setFlipped(false)
      setStartTime(Date.now())
    })
  }

  const totalCards = session.cards.length
  const progress = totalCards > 0 ? Math.round((currentIdx / totalCards) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{currentIdx}/{totalCards}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-english transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tarjeta flip */}
      <div
        className="cursor-pointer select-none"
        onClick={() => !flipped && setFlipped(true)}
      >
        <div
          className={`card min-h-[220px] flex flex-col items-center justify-center text-center
                      transition-all duration-300 ${flipped ? 'bg-indigo-50' : 'bg-white'}`}
        >
          {!flipped ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{card.front}</p>
              <p className="mt-4 text-sm text-gray-400">Toca para ver la respuesta</p>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold text-english">{card.back}</p>
              {card.example && (
                <p className="mt-3 text-sm italic text-gray-500 max-w-xs">"{card.example}"</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botones de dificultad (solo visibles al voltear) */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {DIFFICULTY_BUTTONS.map(btn => (
            <button
              key={btn.value}
              disabled={isPending}
              onClick={() => handleDifficulty(btn.value)}
              className={`rounded-lg px-3 py-3 text-sm font-medium transition-colors
                         disabled:opacity-50 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
