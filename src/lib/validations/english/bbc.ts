/**
 * @file src/lib/validations/english/bbc.ts
 * @description Validaciones Zod para el módulo BBC Learning English.
 */
import { z } from 'zod'

export const updateProgressSchema = z.object({
  episodeId:    z.string().uuid('ID de episodio inválido'),
  status:       z.enum(['not_started', 'in_progress', 'completed']).optional(),
  comprehension: z.number().int().min(0).max(100).optional(),
  notes:        z.string().max(2000).optional(),
})

export const saveVocabularySchema = z.object({
  episodeId:  z.string().uuid(),
  word:       z.string().min(1).max(100),
  definition: z.string().max(500).optional(),
  context:    z.string().max(500).optional(),
  phonetic:   z.string().max(100).optional(),
})

export type UpdateProgressInput  = z.infer<typeof updateProgressSchema>
export type SaveVocabularyInput  = z.infer<typeof saveVocabularySchema>
