/**
 * @file shared.schema.ts
 * @schema shared
 * @description Infraestructura común a TODAS las aplicaciones de la plataforma.
 *
 * REGLA DE ARQUITECTURA:
 *   - Solo contiene tablas que son independientes del idioma/app.
 *   - Ningún módulo de app (english, spanish) define tablas aquí.
 *   - Los módulos de app LEEN este schema (JOIN con shared.user_profiles).
 *   - Este schema NUNCA importa de english.schema o spanish.schema.
 */
import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ── Schema namespace ───────────────────────────────────────────
export const sharedSchema = pgSchema('shared')

// ── Enums compartidos ──────────────────────────────────────────
export const cefrLevelEnum = sharedSchema.enum('cefr_level', [
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
])

export const appNameEnum = sharedSchema.enum('app_name', [
  'english', 'spanish', 'french', 'german', 'portuguese',
])

// ── shared.languages — catálogo de idiomas soportados ──────────
export const languages = sharedSchema.table('languages', {
  code:        text('code').primaryKey(),             // 'en', 'es', 'fr'
  name:        text('name').notNull(),                // 'English'
  nativeName:  text('native_name').notNull(),         // 'English'
  flagEmoji:   text('flag_emoji'),                    // '🇬🇧'
  isActive:    boolean('is_active').default(true),
  sortOrder:   smallint('sort_order').default(0),
})

// ── shared.user_profiles — un perfil por usuario, todas las apps
export const userProfiles = sharedSchema.table('user_profiles', {
  id:                uuid('id').primaryKey(),          // FK → auth.users.id
  fullName:          text('full_name'),
  avatarUrl:         text('avatar_url'),
  preferredLanguage: text('preferred_language').default('en'), // FK → languages.code
  timezone:          text('timezone').default('America/Bogota'),
  // Racha global (suma de todas las apps)
  studyStreakDays:    integer('study_streak_days').default(0),
  longestStreakDays:  integer('longest_streak_days').default(0),
  lastStudiedAt:      timestamp('last_studied_at',    { withTimezone: true }),
  createdAt:          timestamp('created_at',          { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp('updated_at',          { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  idIdx: index('shared_user_profiles_id_idx').on(t.id),
}))

// ── shared.app_enrollments — qué apps tiene activas el usuario ──
export const appEnrollments = sharedSchema.table('app_enrollments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull(),
  appName:   appNameEnum('app_name').notNull(),
  cefrLevel: cefrLevelEnum('cefr_level').default('B1'),
  targetLevel: cefrLevelEnum('target_level').default('C1'),
  dailyGoalMinutes: integer('daily_goal_minutes').default(60),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  isActive:  boolean('is_active').default(true),
}, (t) => ({
  userAppUnique: uniqueIndex('shared_app_enrollments_user_app_unique').on(t.userId, t.appName),
  userIdx:       index('shared_app_enrollments_user_idx').on(t.userId),
}))

// ── shared.daily_progress — métricas diarias por app ───────────
// Una fila por (usuario, fecha, app). El dashboard agrega todas las apps.
export const dailyProgress = sharedSchema.table('daily_progress', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull(),
  appName:          appNameEnum('app_name').notNull(),
  studyDate:        text('study_date').notNull(),       // 'YYYY-MM-DD'
  minutesStudied:   integer('minutes_studied').default(0),
  cardsReviewed:    integer('cards_reviewed').default(0),
  cardsCorrect:     integer('cards_correct').default(0),
  lessonsCompleted: integer('lessons_completed').default(0),
  streakDay:        integer('streak_day').default(0),
  xpEarned:         integer('xp_earned').default(0),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Un registro por usuario/app/día
  uniqueIdx: uniqueIndex('shared_daily_progress_unique').on(t.userId, t.appName, t.studyDate),
  userIdx:   index('shared_daily_progress_user_idx').on(t.userId),
  dateIdx:   index('shared_daily_progress_date_idx').on(t.studyDate),
}))

// ── shared.subscriptions — monetización futura ─────────────────
export const subscriptions = sharedSchema.table('subscriptions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull(),
  appName:     appNameEnum('app_name'),                // null = all apps
  plan:        text('plan').notNull().default('free'), // 'free' | 'pro' | 'enterprise'
  validFrom:   timestamp('valid_from',  { withTimezone: true }).defaultNow().notNull(),
  validUntil:  timestamp('valid_until', { withTimezone: true }),
  createdAt:   timestamp('created_at',  { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('shared_subscriptions_user_idx').on(t.userId),
}))

// ── TypeScript types ───────────────────────────────────────────
export type Language       = typeof languages.$inferSelect
export type UserProfile    = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type AppEnrollment  = typeof appEnrollments.$inferSelect
export type DailyProgress  = typeof dailyProgress.$inferSelect
export type NewDailyProgress = typeof dailyProgress.$inferInsert
