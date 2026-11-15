/**
 * @file src/lib/validations/spanish/decks.ts
 * @description Validaciones Zod para el módulo Spanish Decks.
 * Copia intencional de english/decks.ts — cada app evoluciona independientemente.
 */
import { z } from 'zod'

export const createDeckSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(100, 'El título no puede superar 100 caracteres'),
  description: z
    .string()
    .max(500)
    .optional(),
  coverColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional(),
})

export const createCardSchema = z.object({
  deckId:          z.string().uuid(),
  front:           z.string().min(1).max(500),
  back:            z.string().min(1).max(1000),
  phonetic:        z.string().max(100).optional(),
  exampleSentence: z.string().max(500).optional(),
  tags:            z.array(z.string().max(50)).max(10).optional(),
})

export const reviewCardSchema = z.object({
  cardId:        z.string().uuid(),
  deckId:        z.string().uuid(),
  difficulty:    z.enum(['again', 'hard', 'good', 'easy']),
  responseTimeMs: z.number().int().positive().optional(),
})

export type CreateDeckInput = z.infer<typeof createDeckSchema>
export type CreateCardInput = z.infer<typeof createCardSchema>
export type ReviewCardInput = z.infer<typeof reviewCardSchema>
