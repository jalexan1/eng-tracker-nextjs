/**
 * @file src/modules/spanish/decks/types.ts
 * @description Tipos del sub-módulo de mazos para ESPAÑOL.
 */
import type { Flashcard } from '@lib/db/schemas/spanish.schema'

export interface ReviewSession {
  deckId:         string
  cards:          Flashcard[]
  currentIndex:   number
  totalCards:     number
  completedCards: number
  startedAt:      Date
}
