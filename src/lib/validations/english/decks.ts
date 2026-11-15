/**
 * @file src/lib/validations/english/decks.ts
 * @description Validaciones Zod para el módulo English Decks.
 */
import { z } from 'zod'

export const createDeckSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(100, 'El título no puede superar 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede superar 500 caracteres')
    .optional(),
  coverColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional(),
})

export const createCardSchema = z.object({
  deckId: z.string().uuid('ID de mazo inválido'),
  front: z
    .string()
    .min(1, 'El frente de la tarjeta es requerido')
    .max(500, 'El frente no puede superar 500 caracteres'),
  back: z
    .string()
    .min(1, 'El reverso de la tarjeta es requerido')
    .max(1000, 'El reverso no puede superar 1000 caracteres'),
  phonetic: z.string().max(100).optional(),
  exampleSentence: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const reviewCardSchema = z.object({
  cardId: z.string().uuid('ID de tarjeta inválido'),
  deckId: z.string().uuid('ID de mazo inválido'),
  difficulty: z.enum(['again', 'hard', 'good', 'easy']),
  responseTimeMs: z.number().int().positive().optional(),
})

export type CreateDeckInput  = z.infer<typeof createDeckSchema>
export type CreateCardInput  = z.infer<typeof createCardSchema>
export type ReviewCardInput  = z.infer<typeof reviewCardSchema>
