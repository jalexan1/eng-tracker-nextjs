/**
 * @file src/modules/english/decks/actions/decks.actions.ts
 * @description Server Actions para el módulo English Decks.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@lib/supabase/server'
import { createDeckSchema, createCardSchema, reviewCardSchema } from '@lib/validations/english/decks'
import { decksRepository, cardsRepository } from '../services/DecksRepository'
import { ok, fail, type ActionResult } from '@shared/types'
import type { FlashcardDeck, Flashcard } from '@lib/db/schemas/english.schema'

// ── Crear mazo ─────────────────────────────────────────────────
export async function createDeckAction(formData: FormData): Promise<ActionResult<FlashcardDeck>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  const parsed = createDeckSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description'),
    coverColor:  formData.get('coverColor'),
  })

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const deck = await decksRepository.create({
    userId:      user.id,
    title:       parsed.data.title,
    description: parsed.data.description ?? null,
    coverColor:  parsed.data.coverColor ?? '#6366F1',
  })

  revalidatePath('/english/decks')
  return ok(deck, 'Mazo creado exitosamente')
}

// ── Crear tarjeta ──────────────────────────────────────────────
export async function createCardAction(formData: FormData): Promise<ActionResult<Flashcard>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  const parsed = createCardSchema.safeParse({
    deckId:          formData.get('deckId'),
    front:           formData.get('front'),
    back:            formData.get('back'),
    phonetic:        formData.get('phonetic'),
    exampleSentence: formData.get('exampleSentence'),
  })

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const card = await cardsRepository.create({
    userId:          user.id,
    deckId:          parsed.data.deckId,
    front:           parsed.data.front,
    back:            parsed.data.back,
    phonetic:        parsed.data.phonetic ?? null,
    exampleSentence: parsed.data.exampleSentence ?? null,
  })

  // Actualizar contadores del deck
  await decksRepository.updateCardCounts(parsed.data.deckId)

  revalidatePath(`/english/decks`)
  return ok(card, 'Tarjeta creada')
}

// ── Revisar tarjeta (SM-2) ─────────────────────────────────────
export async function reviewCardAction(input: {
  cardId: string
  deckId: string
  difficulty: 'again' | 'hard' | 'good' | 'easy'
  responseTimeMs?: number
}): Promise<ActionResult<Flashcard>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  const parsed = reviewCardSchema.safeParse(input)
  if (!parsed.success) return fail('Datos inválidos')

  const card = await cardsRepository.findById(parsed.data.cardId)
  if (!card || card.userId !== user.id) return fail('Tarjeta no encontrada')

  const updated = await cardsRepository.applyReview(
    card,
    parsed.data.difficulty,
    parsed.data.responseTimeMs
  )

  // Actualizar contadores del deck
  await decksRepository.updateCardCounts(parsed.data.deckId)

  revalidatePath(`/english/decks/${parsed.data.deckId}/review`)
  return ok(updated)
}

// ── Obtener tarjetas vencidas ──────────────────────────────────
export async function getDueCardsAction(deckId?: string): Promise<ActionResult<Flashcard[]>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('No autenticado')

  const cards = await cardsRepository.findDueCards(user.id, deckId)
  return ok(cards)
}
