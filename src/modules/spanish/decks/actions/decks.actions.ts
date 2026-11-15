'use server'
/**
 * @file src/modules/spanish/decks/actions/decks.actions.ts
 * @description Server Actions para mazos de español.
 */
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@lib/supabase/server'
import { decksRepository, cardsRepository } from '../services/DecksRepository'
import { createDeckSchema, createCardSchema, reviewCardSchema } from '@lib/validations/spanish/decks'
import { ok, fail } from '@shared/types'
import type { ActionResult } from '@shared/types'
import type { FlashcardDeck, Flashcard } from '@lib/db/schemas/spanish.schema'
import type { ReviewSession } from '../types'

export async function createDeckAction(
  input: unknown,
): Promise<ActionResult<FlashcardDeck>> {
  const parsed = createDeckSchema.safeParse(input)
  if (!parsed.success)
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    const deck = await decksRepository.create({
      userId:      user.id,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
    })

    revalidatePath('/spanish/decks')
    return ok(deck, 'Mazo creado')
  } catch (err) {
    console.error('[createDeckAction:spanish]', err)
    return fail('Error al crear mazo')
  }
}

export async function createCardAction(
  input: unknown,
): Promise<ActionResult<Flashcard>> {
  const parsed = createCardSchema.safeParse(input)
  if (!parsed.success)
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    const card = await cardsRepository.create({
      userId:  user.id,
      deckId:  parsed.data.deckId,
      front:   parsed.data.front,
      back:    parsed.data.back,
      example: parsed.data.example ?? null,
    })

    await decksRepository.updateCardCounts(parsed.data.deckId)
    revalidatePath('/spanish/decks')
    return ok(card, 'Tarjeta creada')
  } catch (err) {
    console.error('[createCardAction:spanish]', err)
    return fail('Error al crear tarjeta')
  }
}

export async function getDueCardsAction(
  deckId?: string,
): Promise<ActionResult<ReviewSession>> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    const cards = await cardsRepository.findDueCards(user.id, deckId)

    if (cards.length === 0)
      return ok({
        deckId:         deckId ?? 'all',
        cards:          [],
        currentIndex:   0,
        totalCards:     0,
        completedCards: 0,
        startedAt:      new Date(),
      }, 'No hay tarjetas pendientes 🎉')

    return ok({
      deckId:         deckId ?? 'all',
      cards,
      currentIndex:   0,
      totalCards:     cards.length,
      completedCards: 0,
      startedAt:      new Date(),
    })
  } catch (err) {
    console.error('[getDueCardsAction:spanish]', err)
    return fail('Error al cargar tarjetas')
  }
}

export async function reviewCardAction(
  input: unknown,
): Promise<ActionResult<Flashcard>> {
  const parsed = reviewCardSchema.safeParse(input)
  if (!parsed.success)
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    const card = await cardsRepository.findById(parsed.data.cardId)
    if (!card)                   return fail('Tarjeta no encontrada')
    if (card.userId !== user.id) return fail('Sin permiso')

    const updated = await cardsRepository.applyReview(
      card,
      parsed.data.difficulty,
      parsed.data.responseTimeMs,
    )

    await decksRepository.updateCardCounts(card.deckId)
    return ok(updated)
  } catch (err) {
    console.error('[reviewCardAction:spanish]', err)
    return fail('Error al registrar revisión')
  }
}
