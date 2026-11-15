/**
 * @file src/shared/types/index.ts
 * @description Tipos compartidos entre TODOS los módulos de la plataforma.
 *
 * REGLA: Solo tipos genéricos aquí.
 * Tipos específicos de un módulo van en su propio types.ts.
 */

// ── ActionResult<T> — respuesta estándar para Server Actions ───
export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

// Helpers de construcción
export const ok = <T>(data: T, message?: string): ActionResult<T> =>
  ({ success: true, data, message })

export const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> =>
  ({ success: false, error, fieldErrors })

// ── IRepository<T> — contrato base para repositorios (SOLID) ──
export interface IRepository<T, TInsert = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> {
  findById(id: string): Promise<T | null>
  findByUserId(userId: string): Promise<T[]>
  create(data: TInsert): Promise<T>
  update(id: string, data: Partial<TInsert>): Promise<T>
  delete(id: string): Promise<void>
}

// ── Pagination ─────────────────────────────────────────────────
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── CEFR Level ─────────────────────────────────────────────────
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const CEFR_LABELS: Record<CefrLevel, string> = {
  A1: 'Principiante',
  A2: 'Básico',
  B1: 'Intermedio',
  B2: 'Intermedio Alto',
  C1: 'Avanzado',
  C2: 'Maestría',
}

// ── App Names ──────────────────────────────────────────────────
export type AppName = 'english' | 'spanish' | 'french' | 'german' | 'portuguese'

// ── Stats generales para dashboard ────────────────────────────
export interface StudyStats {
  totalCards: number
  dueCards: number
  newCards: number
  masteredCards: number
  streakDays: number
  minutesToday: number
  xpToday: number
}

// ── Session User (hydratado desde Supabase Auth) ───────────────
export interface SessionUser {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
}
