/**
 * @file english.schema.ts
 * @schema english
 * @description Todas las tablas exclusivas de la App de Inglés.
 *
 * REGLAS DE ARQUITECTURA (INQUEBRANTABLES):
 *   ❌ NUNCA importa de spanish.schema.ts
 *   ❌ NUNCA importa de languages.schema.ts
 *   ✅ Puede referenciar shared.user_profiles (FK lógica, no Drizzle relation)
 *   ✅ SM2Algorithm vive SOLO aquí — no se reutiliza en spanish
 *
 * Si algún día english necesita vocabulario multiidioma,
 * ese vocabulario se modela en este schema, NO en languages.schema.
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
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── Schema namespace ───────────────────────────────────────────
export const englishSchema = pgSchema('english')

// ── Enums (exclusivos del módulo English) ──────────────────────
export const deckStatusEnum = englishSchema.enum('deck_status', [
  'active', 'paused', 'archived',
])

export const cardStatusEnum = englishSchema.enum('card_status', [
  'new', 'learning', 'review', 'mastered',
])

export const difficultyEnum = englishSchema.enum('difficulty', [
  'again', 'hard', 'good', 'easy',
])

export const lessonStatusEnum = englishSchema.enum('lesson_status', [
  'not_started', 'in_progress', 'completed',
])

export const exerciseTypeEnum = englishSchema.enum('exercise_type', [
  'multiple_choice', 'fill_blank', 'translation', 'listening', 'speaking',
])

// ─────────────────────────────────────────────────────────────────
// MÓDULO: DECKS (Flashcards con SM-2)
// ─────────────────────────────────────────────────────────────────

/**
 * english.flashcard_decks
 * Mazos de tarjetas creados por el usuario.
 */
export const flashcardDecks = englishSchema.table('flashcard_decks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull(),            // FK → shared.user_profiles.id
  title:       text('title').notNull(),
  description: text('description'),
  coverColor:  text('cover_color').default('#6366F1'), // english brand color
  status:      deckStatusEnum('status').default('active'),
  // Estadísticas agregadas (denormalizadas para performance)
  totalCards:  integer('total_cards').default(0),
  newCards:    integer('new_cards').default(0),
  dueCards:    integer('due_cards').default(0),
  masteredCards: integer('mastered_cards').default(0),
  lastStudiedAt: timestamp('last_studied_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:     index('english_decks_user_idx').on(t.userId),
  statusIdx:   index('english_decks_status_idx').on(t.status),
}))

/**
 * english.flashcards
 * Tarjeta individual. Almacena estado SM-2 directamente en la tarjeta.
 *
 * SM-2 campos:
 *   easinessFactor: qué tan fácil es la tarjeta (2.5 default, mín 1.3)
 *   intervalDays:   días hasta próxima revisión
 *   repetitions:    veces respondida correctamente consecutivas
 *   nextReviewAt:   fecha de próxima revisión programada
 */
export const flashcards = englishSchema.table('flashcards', {
  id:             uuid('id').primaryKey().defaultRandom(),
  deckId:         uuid('deck_id').notNull(),
  userId:         uuid('user_id').notNull(),
  // Contenido
  front:          text('front').notNull(),            // Palabra / pregunta
  back:           text('back').notNull(),             // Traducción / respuesta
  phonetic:       text('phonetic'),                   // /trænsˈleɪʃən/
  exampleSentence: text('example_sentence'),
  imageUrl:       text('image_url'),
  audioUrl:       text('audio_url'),
  tags:           text('tags').array(),               // ['verb', 'irregular', 'B2']
  // SM-2 Algorithm state
  status:         cardStatusEnum('status').default('new'),
  easinessFactor: real('easiness_factor').default(2.5),    // EF ≥ 1.3
  intervalDays:   integer('interval_days').default(0),
  repetitions:    smallint('repetitions').default(0),
  nextReviewAt:   timestamp('next_review_at', { withTimezone: true })
                    .defaultNow(),
  // Acumulados
  totalReviews:   integer('total_reviews').default(0),
  correctReviews: integer('correct_reviews').default(0),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  deckIdx:        index('english_cards_deck_idx').on(t.deckId),
  userIdx:        index('english_cards_user_idx').on(t.userId),
  reviewIdx:      index('english_cards_review_idx').on(t.userId, t.nextReviewAt),
  statusIdx:      index('english_cards_status_idx').on(t.status),
  efCheck:        check('english_cards_ef_check', sql`${t.easinessFactor} >= 1.3`),
}))

/**
 * english.card_reviews
 * Log inmutable de cada revisión (audit trail del SM-2).
 * Permite recalcular estadísticas y analizar patrones de aprendizaje.
 */
export const cardReviews = englishSchema.table('card_reviews', {
  id:               uuid('id').primaryKey().defaultRandom(),
  cardId:           uuid('card_id').notNull(),
  userId:           uuid('user_id').notNull(),
  deckId:           uuid('deck_id').notNull(),
  difficulty:       difficultyEnum('difficulty').notNull(),
  // Snapshot del estado SM-2 ANTES de esta revisión
  efBefore:         real('ef_before').notNull(),
  intervalBefore:   integer('interval_before').notNull(),
  repetitionsBefore: smallint('repetitions_before').notNull(),
  // Snapshot del estado SM-2 DESPUÉS de esta revisión
  efAfter:          real('ef_after').notNull(),
  intervalAfter:    integer('interval_after').notNull(),
  repetitionsAfter: smallint('repetitions_after').notNull(),
  // Tiempo de respuesta en ms
  responseTimeMs:   integer('response_time_ms'),
  reviewedAt:       timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cardIdx:  index('english_reviews_card_idx').on(t.cardId),
  userIdx:  index('english_reviews_user_idx').on(t.userId),
  dateIdx:  index('english_reviews_date_idx').on(t.userId, t.reviewedAt),
}))

// ─────────────────────────────────────────────────────────────────
// MÓDULO: BBC LEARNING ENGLISH
// ─────────────────────────────────────────────────────────────────

/**
 * english.bbc_episodes
 * Episodios de BBC Learning English (6 Minute English, etc.)
 */
export const bbcEpisodes = englishSchema.table('bbc_episodes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  episodeCode: text('episode_code').notNull(),       // 'ep-250113'
  title:       text('title').notNull(),
  series:      text('series').notNull(),             // '6 Minute English'
  topic:       text('topic'),
  cefrLevel:   text('cefr_level').default('B1'),     // A1-C2
  audioUrl:    text('audio_url'),
  transcriptUrl: text('transcript_url'),
  durationSeconds: integer('duration_seconds'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  tags:        text('tags').array(),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  codeUnique: uniqueIndex('english_bbc_code_unique').on(t.episodeCode),
  seriesIdx:  index('english_bbc_series_idx').on(t.series),
  levelIdx:   index('english_bbc_level_idx').on(t.cefrLevel),
}))

/**
 * english.bbc_user_progress
 * Progreso del usuario por episodio de BBC.
 */
export const bbcUserProgress = englishSchema.table('bbc_user_progress', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull(),
  episodeId:       uuid('episode_id').notNull(),
  status:          lessonStatusEnum('status').default('not_started'),
  listenCount:     smallint('listen_count').default(0),
  comprehension:   smallint('comprehension').default(0),  // 0-100%
  notes:           text('notes'),
  vocabularyCount: smallint('vocabulary_count').default(0), // palabras guardadas
  completedAt:     timestamp('completed_at', { withTimezone: true }),
  lastAccessedAt:  timestamp('last_accessed_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unique:   uniqueIndex('english_bbc_progress_unique').on(t.userId, t.episodeId),
  userIdx:  index('english_bbc_progress_user_idx').on(t.userId),
}))

/**
 * english.bbc_vocabulary
 * Palabras/frases que el usuario guardó de un episodio de BBC.
 * Pueden convertirse en flashcards (relación opcional con flashcards).
 */
export const bbcVocabulary = englishSchema.table('bbc_vocabulary', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull(),
  episodeId:  uuid('episode_id').notNull(),
  word:       text('word').notNull(),
  definition: text('definition'),
  context:    text('context'),               // oración del episodio donde apareció
  phonetic:   text('phonetic'),
  // Si se convirtió en flashcard
  flashcardId: uuid('flashcard_id'),         // → english.flashcards.id (nullable)
  savedAt:    timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:   index('english_bbc_vocab_user_idx').on(t.userId),
  episodeIdx: index('english_bbc_vocab_episode_idx').on(t.episodeId),
}))

// ─────────────────────────────────────────────────────────────────
// MÓDULO: GRAMMAR (futuro — scaffold)
// ─────────────────────────────────────────────────────────────────

/**
 * english.grammar_exercises
 * Ejercicios de gramática (módulo futuro).
 */
export const grammarExercises = englishSchema.table('grammar_exercises', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull(),
  type:         exerciseTypeEnum('type').notNull(),
  question:     text('question').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  userAnswer:   text('user_answer'),
  isCorrect:    boolean('is_correct'),
  grammarTopic: text('grammar_topic'),               // 'present_perfect', 'conditionals'
  cefrLevel:    text('cefr_level').default('B1'),
  completedAt:  timestamp('completed_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:  index('english_grammar_user_idx').on(t.userId),
  topicIdx: index('english_grammar_topic_idx').on(t.grammarTopic),
}))

// ─────────────────────────────────────────────────────────────────
// MÓDULO: VIDEOS DE APRENDIZAJE
// ─────────────────────────────────────────────────────────────────

export const videoStatusEnum = englishSchema.enum('video_status', [
  'processing', 'ready', 'error',
])

export const evalStatusEnum = englishSchema.enum('eval_status', [
  'pending', 'in_progress', 'completed',
])

export const questionTypeEnum = englishSchema.enum('question_type', [
  'multiple_choice', 'fill_blank', 'translation', 'open_ended',
])

export const wordStatusEnum = englishSchema.enum('word_status', [
  'learning', 'learned', 'mastered',
])

export const featureStatusEnum = englishSchema.enum('feature_status', [
  'pending', 'in_progress', 'done', 'cancelled',
])

/**
 * english.videos
 * Videos de YouTube importados por el usuario.
 */
export const videos = englishSchema.table('videos', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull(),
  youtubeUrl:       text('youtube_url').notNull(),
  youtubeId:        text('youtube_id').notNull(),
  title:            text('title').notNull(),
  description:      text('description'),
  thumbnailUrl:     text('thumbnail_url'),
  durationSeconds:  integer('duration_seconds'),
  category:         text('category'),          // AI-detected
  transcript:       text('transcript'),        // full transcript text
  status:           videoStatusEnum('status').default('processing'),
  errorMessage:     text('error_message'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:    index('english_videos_user_idx').on(t.userId),
  ytIdIdx:    index('english_videos_ytid_idx').on(t.youtubeId),
  statusIdx:  index('english_videos_status_idx').on(t.status),
}))

/**
 * english.video_verbs
 * Verbos irregulares extraídos de un video por la IA.
 */
export const videoVerbs = englishSchema.table('video_verbs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  videoId:          uuid('video_id').notNull(),
  verbBase:         text('verb_base').notNull(),
  verbPast:         text('verb_past'),
  verbParticiple:   text('verb_participle'),
  contextSentence:  text('context_sentence'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  videoIdx: index('english_video_verbs_video_idx').on(t.videoId),
}))

/**
 * english.video_sentences
 * Frases/oraciones clave extraídas de un video.
 */
export const videoSentences = englishSchema.table('video_sentences', {
  id:            uuid('id').primaryKey().defaultRandom(),
  videoId:       uuid('video_id').notNull(),
  sentenceEn:    text('sentence_en').notNull(),
  sentenceEs:    text('sentence_es'),
  difficulty:    text('difficulty').default('intermediate'), // beginner/intermediate/advanced
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  videoIdx: index('english_video_sentences_video_idx').on(t.videoId),
}))

/**
 * english.evaluations
 * Sesión de evaluación de un usuario sobre un video.
 */
export const evaluations = englishSchema.table('evaluations', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull(),
  videoId:          uuid('video_id').notNull(),
  totalQuestions:   integer('total_questions').default(10),
  correctCount:     integer('correct_count').default(0),
  scorePercentage:  real('score_percentage'),
  status:           evalStatusEnum('status').default('pending'),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  userIdx:  index('english_evals_user_idx').on(t.userId),
  videoIdx: index('english_evals_video_idx').on(t.videoId),
}))

/**
 * english.evaluation_questions
 * Pregunta individual dentro de una evaluación.
 * options almacena array JSON para multiple_choice: [{label, value}]
 */
export const evaluationQuestions = englishSchema.table('evaluation_questions', {
  id:              uuid('id').primaryKey().defaultRandom(),
  evaluationId:    uuid('evaluation_id').notNull(),
  questionNumber:  integer('question_number').notNull(),
  questionType:    questionTypeEnum('question_type').notNull(),
  questionText:    text('question_text').notNull(),
  options:         jsonb('options'),              // [{label: string, value: string}]
  correctAnswer:   text('correct_answer').notNull(),
  studentAnswer:   text('student_answer'),
  aiGrade:         real('ai_grade'),             // 0-100
  aiFeedback:      text('ai_feedback'),
  isCorrect:       boolean('is_correct'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  answeredAt:      timestamp('answered_at', { withTimezone: true }),
}, (t) => ({
  evalIdx: index('english_eval_q_eval_idx').on(t.evaluationId),
}))

/**
 * english.student_errors
 * Errores cometidos en evaluaciones — base del spaced repetition.
 */
export const studentErrors = englishSchema.table('student_errors', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull(),
  evaluationId:    uuid('evaluation_id').notNull(),
  questionId:      uuid('question_id').notNull(),
  videoId:         uuid('video_id').notNull(),
  wordOrConcept:   text('word_or_concept').notNull(),
  errorType:       text('error_type'),           // grammar/vocabulary/translation
  nextReviewAt:    timestamp('next_review_at', { withTimezone: true }).defaultNow(),
  reviewCount:     integer('review_count').default(0),
  intervalDays:    integer('interval_days').default(1),
  lastReviewedAt:  timestamp('last_reviewed_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:   index('english_errors_user_idx').on(t.userId),
  reviewIdx: index('english_errors_review_idx').on(t.userId, t.nextReviewAt),
}))

/**
 * english.learned_words
 * Palabras/verbos que el usuario domina (correctas consistentemente).
 */
export const learnedWords = englishSchema.table('learned_words', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  userId:              uuid('user_id').notNull(),
  word:                text('word').notNull(),
  wordType:            text('word_type').default('verb'),    // verb/phrase/expression
  sourceVideoId:       uuid('source_video_id'),
  consecutiveCorrect:  integer('consecutive_correct').default(1),
  status:              wordStatusEnum('status').default('learning'),
  lastTestedAt:        timestamp('last_tested_at', { withTimezone: true }),
  createdAt:           timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:   index('english_learned_user_idx').on(t.userId),
  statusIdx: index('english_learned_status_idx').on(t.userId, t.status),
  wordUniq:  uniqueIndex('english_learned_word_user_uniq').on(t.userId, t.word),
}))

/**
 * english.system_parameters
 * Parámetros configurables del sistema por usuario.
 * Ejemplos de key: 'eval_questions_count', 'review_block_size', 'spaced_repetition_days'
 */
export const systemParameters = englishSchema.table('system_parameters', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull(),
  language:  text('language').default('en'),     // 'en' | 'es'
  key:       text('key').notNull(),
  value:     text('value').notNull(),
  label:     text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('english_params_user_key_uniq').on(t.userId, t.language, t.key),
}))

/**
 * english.pending_features
 * Funcionalidades pendientes de investigar/desarrollar.
 */
export const pendingFeatures = englishSchema.table('pending_features', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull(),
  title:       text('title').notNull(),
  description: text('description'),
  context:     text('context'),                  // dónde se originó el pendiente
  status:      featureStatusEnum('status').default('pending'),
  priority:    smallint('priority').default(2),  // 1=alta, 2=media, 3=baja
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx:   index('english_pending_user_idx').on(t.userId),
  statusIdx: index('english_pending_status_idx').on(t.status),
}))

// ── TypeScript types ───────────────────────────────────────────
export type FlashcardDeck    = typeof flashcardDecks.$inferSelect
export type NewFlashcardDeck = typeof flashcardDecks.$inferInsert
export type Flashcard        = typeof flashcards.$inferSelect
export type NewFlashcard     = typeof flashcards.$inferInsert
export type CardReview       = typeof cardReviews.$inferSelect
export type NewCardReview    = typeof cardReviews.$inferInsert
export type BbcEpisode       = typeof bbcEpisodes.$inferSelect
export type BbcUserProgress  = typeof bbcUserProgress.$inferSelect
export type NewBbcUserProgress = typeof bbcUserProgress.$inferInsert
export type BbcVocabulary      = typeof bbcVocabulary.$inferSelect
export type NewBbcVocabulary   = typeof bbcVocabulary.$inferInsert
// Video learning types
export type Video              = typeof videos.$inferSelect
export type NewVideo           = typeof videos.$inferInsert
export type VideoVerb          = typeof videoVerbs.$inferSelect
export type NewVideoVerb       = typeof videoVerbs.$inferInsert
export type VideoSentence      = typeof videoSentences.$inferSelect
export type NewVideoSentence   = typeof videoSentences.$inferInsert
export type Evaluation         = typeof evaluations.$inferSelect
export type NewEvaluation      = typeof evaluations.$inferInsert
export type EvaluationQuestion = typeof evaluationQuestions.$inferSelect
export type NewEvaluationQuestion = typeof evaluationQuestions.$inferInsert
export type StudentError       = typeof studentErrors.$inferSelect
export type NewStudentError    = typeof studentErrors.$inferInsert
export type LearnedWord        = typeof learnedWords.$inferSelect
export type NewLearnedWord     = typeof learnedWords.$inferInsert
export type SystemParameter    = typeof systemParameters.$inferSelect
export type NewSystemParameter = typeof systemParameters.$inferInsert
export type PendingFeature     = typeof pendingFeatures.$inferSelect
export type NewPendingFeature  = typeof pendingFeatures.$inferInsert
