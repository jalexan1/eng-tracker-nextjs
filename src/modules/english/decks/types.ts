/**
 * @file src/modules/english/decks/types.ts
 * @description Tipos del módulo English Decks.
 */
export type { FlashcardDeck, Flashcard, CardReview } from '@lib/db/schemas/english.schema'

export interface ReviewSession {
  deckId: string
  cards: import('@lib/db/schemas/english.schema').Flashcard[]
  currentIndex: number
  reviewed: number
  correct: number
  startedAt: Date
}
