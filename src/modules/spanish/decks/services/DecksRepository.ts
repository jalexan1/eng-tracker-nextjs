/**
 * @file src/modules/spanish/decks/services/DecksRepository.ts
 * @description Repositorios para mazos y tarjetas en el módulo ESPAÑOL.
 * Solo accede a: spanish.flashcardDecks, spanish.flashcards, spanish.cardReviews
 * NUNCA importa de english.* ni de modules/english/
 */
import { eq, and, lte, desc, sql } from 'drizzle-orm'
import db, { spanish } from '@lib/db'
import type { FlashcardDeck, Flashcard, NewFlashcardDeck, NewFlashcard } from '@lib/db/schemas/spanish.schema'
import type { IRepository } from '@shared/types'
import { calculateNextReview, INITIAL_SM2_STATE } from './SM2Algorithm'
import type { Difficulty } from './SM2Algorithm'

// ─── Decks Repository ─────────────────────────────────────────────────────────

export class DecksRepository implements IRepository<FlashcardDeck, NewFlashcardDeck> {
  async findById(id: string): Promise<FlashcardDeck | null> {
    const rows = await db
      .select()
      .from(spanish.flashcardDecks)
      .where(eq(spanish.flashcardDecks.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByUserId(userId: string): Promise<FlashcardDeck[]> {
    return db
      .select()
      .from(spanish.flashcardDecks)
      .where(
        and(
          eq(spanish.flashcardDecks.userId, userId),
          eq(spanish.flashcardDecks.status, 'active'),
        ),
      )
      .orderBy(desc(spanish.flashcardDecks.updatedAt))
  }

  async create(data: NewFlashcardDeck): Promise<FlashcardDeck> {
    const rows = await db
      .insert(spanish.flashcardDecks)
      .values(data)
      .returning()
    return rows[0]
  }

  async update(id: string, data: Partial<NewFlashcardDeck>): Promise<FlashcardDeck> {
    const rows = await db
      .update(spanish.flashcardDecks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(spanish.flashcardDecks.id, id))
      .returning()
    return rows[0]
  }

  async delete(id: string): Promise<void> {
    // Soft-delete: archiva el mazo
    await db
      .update(spanish.flashcardDecks)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(spanish.flashcardDecks.id, id))
  }

  async updateCardCounts(deckId: string): Promise<void> {
    const counts = await db
      .select({
        total: sql<number>`count(*)`,
        due:   sql<number>`count(*) filter (where ${spanish.flashcards.nextReviewAt} <= now())`,
      })
      .from(spanish.flashcards)
      .where(eq(spanish.flashcards.deckId, deckId))

    await db
      .update(spanish.flashcardDecks)
      .set({
        totalCards: counts[0].total,
        dueCards:   counts[0].due,
        updatedAt:  new Date(),
      })
      .where(eq(spanish.flashcardDecks.id, deckId))
  }
}

// ─── Cards Repository ─────────────────────────────────────────────────────────

export class CardsRepository implements IRepository<Flashcard, NewFlashcard> {
  async findById(id: string): Promise<Flashcard | null> {
    const rows = await db
      .select()
      .from(spanish.flashcards)
      .where(eq(spanish.flashcards.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async findByUserId(userId: string): Promise<Flashcard[]> {
    return db
      .select()
      .from(spanish.flashcards)
      .where(eq(spanish.flashcards.userId, userId))
  }

  /** Tarjetas vencidas para revisión (máx. 50 por sesión) */
  async findDueCards(userId: string, deckId?: string): Promise<Flashcard[]> {
    const baseCondition = and(
      eq(spanish.flashcards.userId, userId),
      lte(spanish.flashcards.nextReviewAt, new Date()),
      deckId ? eq(spanish.flashcards.deckId, deckId) : undefined,
    )

    return db
      .select()
      .from(spanish.flashcards)
      .where(baseCondition)
      .orderBy(spanish.flashcards.nextReviewAt)
      .limit(50)
  }

  async create(data: NewFlashcard): Promise<Flashcard> {
    const rows = await db
      .insert(spanish.flashcards)
      .values({
        ...data,
        // Estado SM-2 inicial
        easinessFactor: String(INITIAL_SM2_STATE.easinessFactor),
        intervalDays:   INITIAL_SM2_STATE.intervalDays,
        repetitions:    INITIAL_SM2_STATE.repetitions,
        nextReviewAt:   new Date(),
      })
      .returning()
    return rows[0]
  }

  async update(id: string, data: Partial<NewFlashcard>): Promise<Flashcard> {
    const rows = await db
      .update(spanish.flashcards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(spanish.flashcards.id, id))
      .returning()
    return rows[0]
  }

  async delete(id: string): Promise<void> {
    await db.delete(spanish.flashcards).where(eq(spanish.flashcards.id, id))
  }

  /**
   * Aplica SM-2 a una tarjeta y registra el log inmutable en spanish.cardReviews.
   * Actualiza el estado de la tarjeta con el nuevo intervalo.
   */
  async applyReview(
    card:            Flashcard,
    difficulty:      Difficulty,
    responseTimeMs?: number,
  ): Promise<Flashcard> {
    const currentState = {
      easinessFactor: parseFloat(String(card.easinessFactor)),
      intervalDays:   card.intervalDays,
      repetitions:    card.repetitions,
    }

    const result = calculateNextReview(currentState, difficulty)

    // Actualiza la tarjeta
    const [updated] = await db
      .update(spanish.flashcards)
      .set({
        easinessFactor: String(result.easinessFactor),
        intervalDays:   result.intervalDays,
        repetitions:    result.repetitions,
        nextReviewAt:   result.nextReviewAt,
        updatedAt:      new Date(),
      })
      .where(eq(spanish.flashcards.id, card.id))
      .returning()

    // Log inmutable (INSERT ONLY por RLS) — no se puede modificar
    await db.insert(spanish.cardReviews).values({
      cardId:         card.id,
      userId:         card.userId,
      difficulty:     difficulty,
      easinessFactor: String(result.easinessFactor),
      intervalDays:   result.intervalDays,
      responseTimeMs: responseTimeMs ?? null,
    })

    return updated
  }
}

// ─── Singleton exports ────────────────────────────────────────────────────────
export const decksRepository = new DecksRepository()
export const cardsRepository = new CardsRepository()
