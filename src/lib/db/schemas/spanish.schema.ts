/**
 * @file spanish.schema.ts
 * @schema spanish
 * @description Todas las tablas exclusivas de la App de Español.
 *
 * REGLAS DE ARQUITECTURA (INQUEBRANTABLES):
 *   ❌ NUNCA importa de english.schema.ts
 *   ❌ NUNCA importa de languages.schema.ts
 *   ✅ Puede referenciar shared.user_profiles (FK lógica, no Drizzle relation)
 *   ✅ SM2Algorithm vive SOLO aquí — copia intencional para aislamiento
 *
 * PRINCIPIO DE DISEÑO:
 *   Esta app tiene su propia identidad visual (amber/orange) y sus propios
 *   módulos de aprendizaje. La duplicación de SM-2 es CORRECTA arquitectura
 *   porque permite que cada app evolucione su algoritmo independientemente.
 *
 * ESTADO MVP: Scaffold completo — listo para desarrollo iterativo.
 */
import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  real,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Schema namespace ───────────────────────────────────────────
export const spanishSchema = pgSchema('spanish')

// ── Enums (exclusivos del módulo Spanish — COPIA INTENCIONAL) ──
// Nota: mismos valores que english pero en namespace separado.
// Esto es correcto — cada schema es un dominio independiente.
export const deckStatusEnum = spanishSchema.enum('deck_status', [
  'active', 'paused', 'archived',
])

export const cardStatusEnum = spanishSchema.enum('card_status', [
  'new', 'learning', 'review', 'mastered',
])

export const difficultyEnum = spanishSchema.enum('difficulty', [
  'again', 'hard', 'good', 'easy',
])

export const lessonStatusEnum = spanishSchema.enum('lesson_status', [
  'not_started', 'in_progress', 'completed',
])

export const exerciseTypeEnum = spanishSchema.enum('exercise_type', [
  'multiple_choice', 'fill_blank', 'translation', 'listening', 'speaking',
])

// ─────────────────────────────────────────────────────────────────
// MÓDULO: DECKS (Flashcards con SM-2 — COPIA INTENCIONAL)
// ─────────────────────────────────────────────────────────────────

/**
 * spanish.flashcard_decks
 * Mazos de tarjetas para App de Español.
 */
export const flashcardDecks = spanishSchema.table('flashcard_decks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull(),
  title:       text('title').notNull(),
  description: text('description'),
  coverColor:  text('cover_color').default('#F59E0B'), // spanish brand color (amber)
  status:      deckStatusEnum('status').default('active'),
  // Estadísticas agregadas
  totalCards:    integer('total_cards').default(0),
  newCards:      integer('new_cards').default(0),
  dueCards:      integer('due_cards').default(0),
  masteredCards: integer('mastered_cards').default(0),
  lastStudiedAt: timestamp('last_studied_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:   index('spanish_decks_user_idx').on(t.userId),
  statusIdx: index('spanish_decks_status_idx').on(t.status),
}))

/**
 * spanish.flashcards
 * Tarjeta individual con estado SM-2 propio.
 * Para español nativo aprendiendo otro idioma — fronts/backs pueden ser
 * en español, inglés u otros idiomas objetivo.
 */
export const flashcards = spanishSchema.table('flashcards', {
  id:             uuid('id').primaryKey().defaultRandom(),
  deckId:         uuid('deck_id').notNull(),
  userId:         uuid('user_id').notNull(),
  front:          text('front').notNull(),
  back:           text('back').notNull(),
  phonetic:       text('phonetic'),
  exampleSentence: text('example_sentence'),
  imageUrl:       text('image_url'),
  audioUrl:       text('audio_url'),
  tags:           text('tags').array(),
  // SM-2 Algorithm state (COPIA INTENCIONAL — no importa de english)
  status:         cardStatusEnum('status').default('new'),
  easinessFactor: real('easiness_factor').default(2.5),
  intervalDays:   integer('interval_days').default(0),
  repetitions:    smallint('repetitions').default(0),
  nextReviewAt:   timestamp('next_review_at', { withTimezone: true })
                    .defaultNow(),
  totalReviews:   integer('total_reviews').default(0),
  correctReviews: integer('correct_reviews').default(0),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  deckIdx:   index('spanish_cards_deck_idx').on(t.deckId),
  userIdx:   index('spanish_cards_user_idx').on(t.userId),
  reviewIdx: index('spanish_cards_review_idx').on(t.userId, t.nextReviewAt),
  statusIdx: index('spanish_cards_status_idx').on(t.status),
  efCheck:   check('spanish_cards_ef_check', sql`${t.easinessFactor} >= 1.3`),
}))

/**
 * spanish.card_reviews
 * Log inmutable de revisiones SM-2 para App de Español.
 */
export const cardReviews = spanishSchema.table('card_reviews', {
  id:               uuid('id').primaryKey().defaultRandom(),
  cardId:           uuid('card_id').notNull(),
  userId:           uuid('user_id').notNull(),
  deckId:           uuid('deck_id').notNull(),
  difficulty:       difficultyEnum('difficulty').notNull(),
  efBefore:         real('ef_before').notNull(),
  intervalBefore:   integer('interval_before').notNull(),
  repetitionsBefore: smallint('repetitions_before').notNull(),
  efAfter:          real('ef_after').notNull(),
  intervalAfter:    integer('interval_after').notNull(),
  repetitionsAfter: smallint('repetitions_after').notNull(),
  responseTimeMs:   integer('response_time_ms'),
  reviewedAt:       timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cardIdx: index('spanish_reviews_card_idx').on(t.cardId),
  userIdx: index('spanish_reviews_user_idx').on(t.userId),
  dateIdx: index('spanish_reviews_date_idx').on(t.userId, t.reviewedAt),
}))

// ─────────────────────────────────────────────────────────────────
// MÓDULO: RAE (Real Academia Española — scaffold)
// ─────────────────────────────────────────────────────────────────

/**
 * spanish.rae_lookups
 * Búsquedas del usuario en el diccionario RAE.
 * Permite tracking de vocabulario y sugerir flashcards.
 */
export const raeLookups = spanishSchema.table('rae_lookups', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull(),
  word:       text('word').notNull(),
  definition: text('definition'),
  etymology:  text('etymology'),
  examples:   text('examples').array(),
  // Si se convirtió en flashcard
  flashcardId: uuid('flashcard_id'),
  lookedUpAt: timestamp('looked_up_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('spanish_rae_user_idx').on(t.userId),
  wordIdx: index('spanish_rae_word_idx').on(t.word),
}))

/**
 * spanish.reading_sessions
 * Sesiones de lectura para comprensión lectora (módulo futuro).
 */
export const readingSessions = spanishSchema.table('reading_sessions', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull(),
  title:            text('title').notNull(),
  textContent:      text('text_content'),
  sourceUrl:        text('source_url'),
  status:           lessonStatusEnum('status').default('not_started'),
  wordsCount:       integer('words_count').default(0),
  readingTimeSeconds: integer('reading_time_seconds').default(0),
  comprehension:    smallint('comprehension').default(0),
  notes:            text('notes'),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('spanish_reading_user_idx').on(t.userId),
}))

/**
 * spanish.grammar_exercises
 * Ejercicios de gramática española (módulo futuro).
 */
export const grammarExercises = spanishSchema.table('grammar_exercises', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').notNull(),
  type:          exerciseTypeEnum('type').notNull(),
  question:      text('question').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  userAnswer:    text('user_answer'),
  isCorrect:     boolean('is_correct'),
  grammarTopic:  text('grammar_topic'),  // 'subjuntivo', 'ser_vs_estar'
  cefrLevel:     text('cefr_level').default('B1'),
  completedAt:   timestamp('completed_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:  index('spanish_grammar_user_idx').on(t.userId),
  topicIdx: index('spanish_grammar_topic_idx').on(t.grammarTopic),
}))

// ── TypeScript types ───────────────────────────────────────────
export type FlashcardDeck    = typeof flashcardDecks.$inferSelect
export type NewFlashcardDeck = typeof flashcardDecks.$inferInsert
export type Flashcard        = typeof flashcards.$inferSelect
export type NewFlashcard     = typeof flashcards.$inferInsert
export type CardReview       = typeof cardReviews.$inferSelect
export type NewCardReview    = typeof cardReviews.$inferInsert
export type RaeLookup        = typeof raeLookups.$inferSelect
export type NewRaeLookup     = typeof raeLookups.$inferInsert
export type ReadingSession   = typeof readingSessions.$inferSelect
