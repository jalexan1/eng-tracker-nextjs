'use server'
/**
 * @file src/modules/english/bbc/actions/bbc.actions.ts
 * @description Server Actions para BBC Learning English.
 * Utiliza RLS de Supabase — el usuario solo ve SU progreso.
 */
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@lib/supabase/server'
import {
  bbcEpisodesRepository,
  bbcProgressRepository,
  bbcVocabularyRepository,
} from '../services/BbcRepository'
import { updateProgressSchema, saveVocabularySchema } from '@lib/validations/english/bbc'
import { ok, fail } from '@shared/types'
import type { ActionResult } from '@shared/types'
import type { BbcEpisodeWithProgress, UpdateProgressInput, SaveVocabularyInput } from '../types'

// ─── Obtener episodios con progreso del usuario ──────────────────────────────

export async function getEpisodesAction(filters?: {
  series?:    string
  cefrLevel?: string
}): Promise<ActionResult<BbcEpisodeWithProgress[]>> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    const [episodes, progressList] = await Promise.all([
      bbcEpisodesRepository.findAll(filters),
      bbcProgressRepository.findByUser(user.id),
    ])

    const progressMap = new Map(progressList.map(p => [p.episodeId, p]))

    const result: BbcEpisodeWithProgress[] = episodes.map(ep => {
      const prog = progressMap.get(ep.id)
      return {
        id:            ep.id,
        title:         ep.title,
        series:        ep.series,
        episodeNumber: ep.episodeNumber,
        cefrLevel:     ep.cefrLevel,
        audioUrl:      ep.audioUrl,
        transcriptUrl: ep.transcriptUrl,
        publishedAt:   ep.publishedAt,
        progress: prog
          ? {
              status:         prog.status,
              comprehension:  prog.comprehension,
              lastAccessedAt: prog.lastAccessedAt,
            }
          : null,
      }
    })

    return ok(result)
  } catch (err) {
    console.error('[getEpisodesAction]', err)
    return fail('Error al cargar episodios')
  }
}

// ─── Actualizar progreso de un episodio ──────────────────────────────────────

export async function updateProgressAction(
  input: UpdateProgressInput,
): Promise<ActionResult<void>> {
  const parsed = updateProgressSchema.safeParse(input)
  if (!parsed.success)
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    await bbcProgressRepository.upsert({
      userId:        user.id,
      episodeId:     parsed.data.episodeId,
      status:        parsed.data.status,
      comprehension: parsed.data.comprehension ?? null,
      notes:         parsed.data.notes ?? null,
    })

    revalidatePath('/english/bbc')
    return ok(undefined, 'Progreso actualizado')
  } catch (err) {
    console.error('[updateProgressAction]', err)
    return fail('Error al actualizar progreso')
  }
}

// ─── Guardar vocabulario de un episodio ──────────────────────────────────────

export async function saveVocabularyAction(
  input: SaveVocabularyInput,
): Promise<ActionResult<void>> {
  const parsed = saveVocabularySchema.safeParse(input)
  if (!parsed.success)
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('No autenticado')

    await bbcVocabularyRepository.save({
      userId:     user.id,
      episodeId:  parsed.data.episodeId,
      word:       parsed.data.word,
      definition: parsed.data.definition ?? null,
      context:    parsed.data.context    ?? null,
      phonetic:   parsed.data.phonetic   ?? null,
    })

    revalidatePath('/english/bbc')
    return ok(undefined, 'Palabra guardada')
  } catch (err) {
    console.error('[saveVocabularyAction]', err)
    return fail('Error al guardar vocabulario')
  }
}
