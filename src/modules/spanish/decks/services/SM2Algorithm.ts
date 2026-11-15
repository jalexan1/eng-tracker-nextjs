/**
 * @file src/modules/spanish/decks/services/SM2Algorithm.ts
 * @description Algoritmo SM-2 para el módulo de ESPAÑOL.
 *
 * ⚠️  COPIA INTENCIONAL — no importa de modules/english/
 * Este módulo es autónomo. Si se modifica el SM2 de inglés, actualizar
 * este archivo de forma independiente (misma lógica, namespace separado).
 *
 * Algoritmo SuperMemo 2 (SM-2):
 * https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 */

export type Difficulty = 'again' | 'hard' | 'good' | 'easy'

export interface SM2State {
  easinessFactor: number  // EF — mínimo 1.3, inicio 2.5
  intervalDays:   number  // días hasta próxima revisión
  repetitions:    number  // revisiones consecutivas exitosas
}

export interface SM2Result extends SM2State {
  nextReviewAt: Date
}

/** Mapeo de dificultad → quality score (q) */
const QUALITY_MAP: Record<Difficulty, number> = {
  again: 0,
  hard:  3,
  good:  4,
  easy:  5,
}

const MIN_EF          = 1.3
const INITIAL_EF      = 2.5
const EF_CLAMP        = (ef: number) => Math.max(MIN_EF, ef)

/**
 * Calcula el próximo estado SM-2 dado el estado actual y la dificultad.
 * q < 3 (again/fail): reinicia repeticiones, intervalo = 1 día.
 */
export function calculateNextReview(current: SM2State, difficulty: Difficulty): SM2Result {
  const q  = QUALITY_MAP[difficulty]
  const ef = current.easinessFactor

  let newEF          = EF_CLAMP(ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  let newRepetitions = current.repetitions
  let newInterval    = current.intervalDays

  if (q < 3) {
    // Respuesta incorrecta — reiniciar
    newRepetitions = 0
    newInterval    = 1
    newEF          = ef  // EF no cambia en fallo
  } else {
    newRepetitions += 1
    if (newRepetitions === 1)      newInterval = 1
    else if (newRepetitions === 2) newInterval = 6
    else                           newInterval = Math.round(current.intervalDays * ef)
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)

  return {
    easinessFactor: newEF,
    intervalDays:   newInterval,
    repetitions:    newRepetitions,
    nextReviewAt,
  }
}

/** Estado inicial para una tarjeta nueva */
export const INITIAL_SM2_STATE: SM2State = {
  easinessFactor: INITIAL_EF,
  intervalDays:   0,
  repetitions:    0,
}
