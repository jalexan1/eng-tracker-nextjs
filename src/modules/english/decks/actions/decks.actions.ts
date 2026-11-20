/**
 * @file src/modules/english/decks/actions/decks.actions.ts
 * @description Server Actions para los decks y tarjetas de inglés (spaced repetition).
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@lib/supabase/server'
import { decksRepository, cardsRepository } from '../services/DecksRepository'
import { createDeckSchema, createCardSchema, reviewCardSchema } from '@lib/validations/english/decks'
import { ok, fail } from '@shared/types'
import type { ActionResult } from '@shared/types'
import type { FlashcardDeck, Flashcard } from '@lib/db/schemas/english.schema'
import type { ReviewSession } from '../types'

// ── Crear deck ─────────────────────────────────────────────────
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
      title:       parsed.data.title,
      description: parsed.data.description ?? null,
      coverColor:  parsed.data.coverColor ?? '#6366F1',
    })

    revalidatePath('/english/decks')
    return ok(deck, 'Mazo creado correctamente')
  } catch (error) {
    console.error('createDeckAction error:', error)
    return fail('Error al crear el mazo')
  }
}

// ── Crear tarjeta ──────────────────────────────────────────────
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

    // Verificar que el deck pertenece al usuario
    const deck = await decksRepository.findById(parsed.data.deckId)
    if (!deck || deck.userId !== user.id)
      return fail('Mazo no encontrado')

    const card = await cardsRepository.create({
      deckId:          parsed.data.deckId,
      userId:          user.id,
      front:           parsed.data.front,
      back:            parsed.data.back,
      phonetic:        parsed.data.phonetic ?? null,
      exampleSentence: parsed.data.exampleSentence ?? null,
      tags:            parsed.data.tags ?? null,
    })

    // Actualizar contadores del deck
    await decksRepository.updateCardCounts(parsed.data.deckId)

    revalidatePath(`/english/decks/${parsed.data.deckId}`)
    return ok(card, 'Tarjeta creada correctamente')
  } catch (error) {
    console.error('createCardAction error:', error)
    return fail('Error al crear la tarjeta')
  }
}

// ── Revisar tarjeta (spaced repetition SM-2) ──────────────────
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
    if (!card || card.userId !== user.id)
      return fail('Tarjeta no encontrada')

    const updated = await cardsRepository.applyReview(
      card,
      parsed.data.difficulty,
      parsed.data.responseTimeMs,
    )

    // Actualizar contadores del deck
    await decksRepository.updateCardCounts(parsed.data.deckId)

    revalidatePath(`/english/decks/${parsed.data.deckId}/review`)
    return ok(updated)
  } catch (error) {
    console.error('reviewCardAction error:', error)
    return fail('Error al registrar la revisión')
  }
}

// ── Obtener tarjetas pendientes de revisión ────────────────────
export async function getDueCardsAction(
  deckId: string,
): Promise<ActionResult<ReviewSession>> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    // Verificar que el deck pertenece al usuario
    const deck = await decksRepository.findById(deckId)
    if (!deck || deck.userId !== user.id)
      return fail('Mazo no encontrado')

    const cards = await cardsRepository.findDueCards(user.id, deckId)

    const session: ReviewSession = {
      deckId,
      cards,
      currentIndex: 0,
      reviewed:     0,
      correct:      0,
      startedAt:    new Date(),
    }

    return ok(session)
  } catch (error) {
    console.error('getDueCardsAction error:', error)
    return fail('Error al obtener las tarjetas')
  }
}
