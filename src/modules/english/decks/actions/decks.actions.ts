/**
 * @file src/modules/english/decks/actions/decks.actions.ts
 * @description Server Actions para los decks y tarjetas de inglés (spaced repetition).
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@lib/supabase/server'
import { db } from '@lib/db'
import {
  englishDecks,
  englishCards,
  englishCardReviews,
} from '@lib/db/schema/english'
import { eq, and, lte, or, isNull } from 'drizzle-orm'
import { fail, ok, type ActionResult } from '@shared/types'

// ── Crear deck ─────────────────────────────────────────────────
export async function createDeckAction(
  name: string,
  description?: string
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return fail('No autenticado')

  try {
    await db.insert(englishDecks).values({
      userId: user.id,
      name,
      description: description ?? null,
    })

    revalidatePath('/english/decks')
    return ok(undefined, 'Deck creado correctamente')
  } catch (error) {
    console.error('createDeckAction error:', error)
    return fail('Error al crear el deck')
  }
}

// ── Crear tarjeta ──────────────────────────────────────────────
export async function createCardAction(
  deckId: string,
  front: string,
  back: string,
  notes?: string
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return fail('No autenticado')

  try {
    // Verificar que el deck pertenece al usuario
    const deck = await db.query.englishDecks.findFirst({
      where: and(
        eq(englishDecks.id, deckId),
        eq(englishDecks.userId, user.id)
      ),
    })

    if (!deck) return fail('Deck no encontrado')

    await db.insert(englishCards).values({
      deckId,
      front,
      back,
      notes: notes ?? null,
    })

    revalidatePath(`/english/decks/${deckId}`)
    return ok(undefined, 'Tarjeta creada correctamente')
  } catch (error) {
    console.error('createCardAction error:', error)
    return fail('Error al crear la tarjeta')
  }
}

// ── Revisar tarjeta (spaced repetition) ───────────────────────
export async function reviewCardAction(
  cardId: string,
  quality: number  // 0-5 (SM-2 algorithm)
): Promise<ActionResult> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return fail('No autenticado')

  try {
    const card = await db.query.englishCards.findFirst({
      where: eq(englishCards.id, cardId),
      with: { deck: true },
    })

    if (!card || card.deck.userId !== user.id) {
      return fail('Tarjeta no encontrada')
    }

    // SM-2 algorithm
    const q = Math.max(0, Math.min(5, quality))
    let { easeFactor = 2.5, interval = 1, repetitions = 0 } = card

    if (q >= 3) {
      if (repetitions === 0) interval = 1
      else if (repetitions === 1) interval = 6
      else interval = Math.round(interval * easeFactor)

      repetitions += 1
    } else {
      repetitions = 0
      interval = 1
    }

    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    )

    const nextReviewAt = new Date()
    nextReviewAt.setDate(nextReviewAt.getDate() + interval)

    await db.update(englishCards)
      .set({
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        lastReviewedAt: new Date(),
      })
      .where(eq(englishCards.id, cardId))

    // Registrar review
    await db.insert(englishCardReviews).values({
      cardId,
      userId: user.id,
      quality: q,
    })

    revalidatePath(`/english/decks/${card.deckId}/review`)
    return ok(undefined)
  } catch (error) {
    console.error('reviewCardAction error:', error)
    return fail('Error al registrar la revisión')
  }
}

// ── Obtener tarjetas pendientes de revisión ────────────────────
export async function getDueCardsAction(
  deckId: string
): Promise<ActionResult<typeof englishCards.$inferSelect[]>> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return fail('No autenticado')

  try {
    const deck = await db.query.englishDecks.findFirst({
      where: and(
        eq(englishDecks.id, deckId),
        eq(englishDecks.userId, user.id)
      ),
    })

    if (!deck) return fail('Deck no encontrado')

    const now = new Date()
    const cards = await db.query.englishCards.findMany({
      where: and(
        eq(englishCards.deckId, deckId),
        or(
          isNull(englishCards.nextReviewAt),
          lte(englishCards.nextReviewAt, now)
        )
      ),
    })

    return ok(cards)
  } catch (error) {
    console.error('getDueCardsAction error:', error)
    return fail('Error al obtener las tarjetas')
  }
}
