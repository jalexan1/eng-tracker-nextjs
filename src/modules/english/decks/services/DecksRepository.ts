/**
 * @file src/modules/english/decks/services/DecksRepository.ts
 * @description Repositorio de acceso a datos para flashcard_decks y flashcards.
 * Implementa IRepository para cumplir SOLID (Liskov Substitution).
 *
 * Solo accede a: english.flashcard_decks, english.flashcards, english.card_reviews
 * NUNCA accede a: spanish.*, languages.*
 */
import { eq, and, lte, desc, sql } from 'drizzle-orm'
import db, { english } from '@lib/db'
import type { IRepository } from '@shared/types'
import type { FlashcardDeck, NewFlashcardDeck, Flashcard, NewFlashcard } from '@lib/db/schemas/english.schema'
import { calculateNextReview, type Difficulty } from './SM2Algorithm'

// ── Decks Repository ───────────────────────────────────────────
export class DecksRepository implements IRepository<FlashcardDeck, NewFlashcardDeck> {

  async findById(id: string): Promise<FlashcardDeck | null> {
    const result = await db
      .select()
      .from(english.flashcardDecks)
      .where(eq(english.flashcardDecks.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findByUserId(userId: string): Promise<FlashcardDeck[]> {
    return db
      .select()
      .from(english.flashcardDecks)
      .where(
        and(
          eq(english.flashcardDecks.userId, userId),
          eq(english.flashcardDecks.status, 'active')
        )
      )
      .orderBy(desc(english.flashcardDecks.updatedAt))
  }

  async create(data: NewFlashcardDeck): Promise<FlashcardDeck> {
    const result = await db
      .insert(english.flashcardDecks)
      .values(data)
      .returning()

    return result[0]
  }

  async update(id: string, data: Partial<NewFlashcardDeck>): Promise<FlashcardDeck> {
    const result = await db
      .update(english.flashcardDecks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(english.flashcardDecks.id, id))
      .returning()

    return result[0]
  }

  async delete(id: string): Promise<void> {
    await db
      .update(english.flashcardDecks)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(english.flashcardDecks.id, id))
  }

  // ── Métodos específicos del dominio ──────────────────────────

  async updateCardCounts(deckId: string): Promise<void> {
    // Recalcular contadores del deck desde las tarjetas
    const counts = await db
      .select({
        total:    sql<number>`COUNT(*)`,
        newCards: sql<number>`COUNT(*) FILTER (WHERE status = 'new')`,
        due:      sql<number>`COUNT(*) FILTER (WHERE next_review_at <= NOW())`,
        mastered: sql<number>`COUNT(*) FILTER (WHERE status = 'mastered')`,
      })
      .from(english.flashcards)
      .where(eq(english.flashcards.deckId, deckId))

    const { total, newCards, due, mastered } = counts[0]

    await db
      .update(english.flashcardDecks)
      .set({
        totalCards:    total,
        newCards:      newCards,
        dueCards:      due,
        masteredCards: mastered,
        updatedAt:     new Date(),
      })
      .where(eq(english.flashcardDecks.id, deckId))
  }
}

// ── Cards Repository ───────────────────────────────────────────
export class CardsRepository implements IRepository<Flashcard, NewFlashcard> {

  async findById(id: string): Promise<Flashcard | null> {
    const result = await db
      .select()
      .from(english.flashcards)
      .where(eq(english.flashcards.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async findByUserId(userId: string): Promise<Flashcard[]> {
    return db
      .select()
      .from(english.flashcards)
      .where(eq(english.flashcards.userId, userId))
      .orderBy(english.flashcards.nextReviewAt)
  }

  async findDueCards(userId: string, deckId?: string): Promise<Flashcard[]> {
    const conditions = [
      eq(english.flashcards.userId, userId),
      lte(english.flashcards.nextReviewAt, new Date()),
    ]

    if (deckId) {
      conditions.push(eq(english.flashcards.deckId, deckId))
    }

    return db
      .select()
      .from(english.flashcards)
      .where(and(...conditions))
      .orderBy(english.flashcards.nextReviewAt)
      .limit(50) // máximo 50 tarjetas por sesión
  }

  async create(data: NewFlashcard): Promise<Flashcard> {
    const result = await db
      .insert(english.flashcards)
      .values(data)
      .returning()

    return result[0]
  }

  async update(id: string, data: Partial<NewFlashcard>): Promise<Flashcard> {
    const result = await db
      .update(english.flashcards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(english.flashcards.id, id))
      .returning()

    return result[0]
  }

  async delete(id: string): Promise<void> {
    await db.delete(english.flashcards).where(eq(english.flashcards.id, id))
  }

  /**
   * Aplica SM-2 y guarda el resultado.
   * Registra la revisión en el log inmutable (card_reviews).
   */
  async applyReview(
    card: Flashcard,
    difficulty: Difficulty,
    responseTimeMs?: number
  ): Promise<Flashcard> {
    const stateBefore = {
      easinessFactor: card.easinessFactor!,
      intervalDays:   card.intervalDays!,
      repetitions:    card.repetitions!,
    }

    const result = calculateNextReview(stateBefore, difficulty)

    const newStatus: Flashcard['status'] =
      result.repetitions === 0 ? 'learning' :
      result.repetitions >= 5  ? 'mastered' :
      result.intervalDays > 21 ? 'review'   : 'learning'

    // Actualizar tarjeta
    const [updated] = await db
      .update(english.flashcards)
      .set({
        easinessFactor: result.easinessFactor,
        intervalDays:   result.intervalDays,
        repetitions:    result.repetitions,
        nextReviewAt:   result.nextReviewAt,
        status:         newStatus,
        totalReviews:   sql`${english.flashcards.totalReviews} + 1`,
        correctReviews: difficulty !== 'again'
          ? sql`${english.flashcards.correctReviews} + 1`
          : english.flashcards.correctReviews,
        updatedAt: new Date(),
      })
      .where(eq(english.flashcards.id, card.id))
      .returning()

    // Log inmutable
    await db.insert(english.cardReviews).values({
      cardId:             card.id,
      userId:             card.userId,
      deckId:             card.deckId,
      difficulty,
      efBefore:           stateBefore.easinessFactor,
      intervalBefore:     stateBefore.intervalDays,
      repetitionsBefore:  stateBefore.repetitions,
      efAfter:            result.easinessFactor,
      intervalAfter:      result.intervalDays,
      repetitionsAfter:   result.repetitions,
      responseTimeMs:     responseTimeMs ?? null,
    })

    return updated
  }
}

// Singleton exports
export const decksRepository = new DecksRepository()
export const cardsRepository = new CardsRepository()
