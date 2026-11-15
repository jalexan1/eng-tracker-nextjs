/**
 * @file src/modules/english/decks/services/SM2Algorithm.ts
 * @description Implementación del algoritmo SM-2 (SuperMemo 2) para App INGLÉS.
 *
 * IMPORTANTE: Esta implementación vive SOLO en el módulo english.
 * El módulo spanish tiene su PROPIA COPIA en spanish/decks/services/SM2Algorithm.ts.
 * Esta duplicación es INTENCIONAL para aislamiento total entre apps.
 *
 * Algoritmo SM-2 original de Piotr Wozniak (1987).
 * Referencia: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 *
 * Parámetros:
 *   q (quality):        0-5  (5 = perfecta, 0 = fallo completo)
 *   EF (easiness):      factor de facilidad, mínimo 1.3, default 2.5
 *   n (repetitions):    número de repeticiones exitosas consecutivas
 *   I (interval):       días hasta próxima revisión
 */

export type Difficulty = 'again' | 'hard' | 'good' | 'easy'

// Mapeo Difficulty → quality score SM-2 (0-5)
const QUALITY_MAP: Record<Difficulty, number> = {
  again: 0, // Fallo total — reiniciar
  hard:  3, // Correcto con mucho esfuerzo
  good:  4, // Correcto con pequeño esfuerzo
  easy:  5, // Correcto sin esfuerzo
}

export interface SM2State {
  easinessFactor: number  // EF ≥ 1.3
  intervalDays:   number  // días hasta próxima revisión
  repetitions:    number  // repeticiones exitosas consecutivas
}

export interface SM2Result extends SM2State {
  nextReviewAt: Date
}

/**
 * Calcula el próximo estado SM-2 basado en la dificultad reportada.
 *
 * @param current - Estado actual de la tarjeta
 * @param difficulty - Dificultad reportada por el usuario
 * @returns Nuevo estado SM-2 con fecha de próxima revisión
 */
export function calculateNextReview(
  current: SM2State,
  difficulty: Difficulty
): SM2Result {
  const q = QUALITY_MAP[difficulty]

  let { easinessFactor, intervalDays, repetitions } = current

  if (q < 3) {
    // Respuesta incorrecta — reiniciar intervalos pero mantener EF
    repetitions = 0
    intervalDays = 1
  } else {
    // Respuesta correcta — calcular nuevo intervalo
    if (repetitions === 0) {
      intervalDays = 1
    } else if (repetitions === 1) {
      intervalDays = 6
    } else {
      intervalDays = Math.round(intervalDays * easinessFactor)
    }
    repetitions += 1
  }

  // Actualizar EF (Easiness Factor) — fórmula SM-2
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  easinessFactor = easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easinessFactor = Math.max(1.3, parseFloat(easinessFactor.toFixed(2)))

  // Calcular fecha de próxima revisión
  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays)
  nextReviewAt.setHours(0, 0, 0, 0) // normalizar a medianoche

  return {
    easinessFactor,
    intervalDays,
    repetitions,
    nextReviewAt,
  }
}

/**
 * Estado inicial para una tarjeta nueva.
 */
export const INITIAL_SM2_STATE: SM2State = {
  easinessFactor: 2.5,
  intervalDays:   0,
  repetitions:    0,
}

/**
 * Determina si una tarjeta está vencida para revisión.
 */
export function isCardDue(nextReviewAt: Date): boolean {
  return new Date() >= nextReviewAt
}

/**
 * Calcula la racha de estudio (días consecutivos).
 * Retorna la nueva racha basada en la última fecha de estudio.
 */
export function calculateStreak(
  currentStreak: number,
  lastStudiedAt: Date | null
): number {
  if (!lastStudiedAt) return 1

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const lastDate = new Date(lastStudiedAt)
  lastDate.setHours(0, 0, 0, 0)

  if (lastDate.getTime() === today.getTime()) {
    return currentStreak // Ya estudió hoy
  } else if (lastDate.getTime() === yesterday.getTime()) {
    return currentStreak + 1 // Continuó la racha
  } else {
    return 1 // Racha rota — reiniciar
  }
}
