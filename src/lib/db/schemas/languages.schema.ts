/**
 * @file languages.schema.ts
 * @schema languages
 * @description Repositorio de recursos lingüísticos compartidos entre apps.
 *
 * PROPÓSITO:
 *   Este schema es el "repositorio de contenido lingüístico" de la plataforma.
 *   Contiene datos CURADOS y REUTILIZABLES entre idiomas:
 *   - Banco de vocabulario multiidioma
 *   - Traducciones cruzadas
 *   - Patrones gramaticales
 *   - Pronunciaciones y etimologías
 *
 * QUIÉN LO USA:
 *   - Los módulos de app (english, spanish) LEEN este schema para enriquecer
 *     contenido (ej: buscar pronunciación de una palabra).
 *   - Los administradores del sistema ESCRIBEN aquí para curar el contenido.
 *   - Los usuarios NUNCA escriben aquí directamente.
 *
 * REGLAS:
 *   ✅ Los módulos english/spanish pueden LEER este schema
 *   ❌ Los módulos english/spanish NUNCA escriben aquí
 *   ❌ NUNCA importa de english.schema o spanish.schema
 *   ✅ Puede referenciar shared.languages (FK a códigos de idioma)
 */
import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  smallint,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ── Schema namespace ───────────────────────────────────────────
export const languagesSchema = pgSchema('languages')

// ── Enums ──────────────────────────────────────────────────────
export const wordCategoryEnum = languagesSchema.enum('word_category', [
  'noun', 'verb', 'adjective', 'adverb', 'preposition',
  'conjunction', 'pronoun', 'interjection', 'article', 'phrase',
])

export const difficultyTierEnum = languagesSchema.enum('difficulty_tier', [
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
])

export const translationQualityEnum = languagesSchema.enum('translation_quality', [
  'machine', 'human_reviewed', 'certified',
])

// ─────────────────────────────────────────────────────────────────
// VOCABULARIO Y TRADUCCIONES
// ─────────────────────────────────────────────────────────────────

/**
 * languages.vocabulary_bank
 * Repositorio centralizado de palabras y frases.
 * Independiente del idioma — cada entrada tiene su idioma base.
 *
 * Ejemplo: 'run' (en), 'correr' (es), 'courir' (fr) son 3 entradas separadas
 * vinculadas por word_translations.
 */
export const vocabularyBank = languagesSchema.table('vocabulary_bank', {
  id:              uuid('id').primaryKey().defaultRandom(),
  word:            text('word').notNull(),
  languageCode:    text('language_code').notNull(),   // 'en', 'es', 'fr'
  category:        wordCategoryEnum('category'),
  cefrLevel:       difficultyTierEnum('cefr_level'),
  phonetic:        text('phonetic'),                  // IPA: /rʌn/
  audioUrl:        text('audio_url'),
  definition:      text('definition'),               // en su propio idioma
  etymology:       text('etymology'),
  tags:            text('tags').array(),              // ['irregular', 'common', 'B2']
  frequency:       integer('frequency').default(0),  // frecuencia de uso (0-100)
  isActive:        boolean('is_active').default(true),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  wordLangUnique: uniqueIndex('lang_vocab_word_lang_unique').on(t.word, t.languageCode),
  langIdx:        index('lang_vocab_lang_idx').on(t.languageCode),
  categoryIdx:    index('lang_vocab_category_idx').on(t.category),
  levelIdx:       index('lang_vocab_level_idx').on(t.cefrLevel),
  frequencyIdx:   index('lang_vocab_frequency_idx').on(t.frequency),
}))

/**
 * languages.word_translations
 * Vincula palabras entre idiomas.
 *
 * Ejemplo: vocabulary_bank('run', 'en') ↔ vocabulary_bank('correr', 'es')
 * Permite buscar: "¿Cómo se dice 'run' en español?" sin queries complejos.
 */
export const wordTranslations = languagesSchema.table('word_translations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  sourceWordId:    uuid('source_word_id').notNull(),   // → vocabulary_bank.id
  targetWordId:    uuid('target_word_id').notNull(),   // → vocabulary_bank.id
  quality:         translationQualityEnum('quality').default('machine'),
  confidence:      smallint('confidence').default(80),  // 0-100
  contextNotes:    text('context_notes'),               // 'formal register only'
  exampleSource:   text('example_source'),              // frase en idioma origen
  exampleTarget:   text('example_target'),              // frase en idioma destino
  isPreferred:     boolean('is_preferred').default(false),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pairUnique:  uniqueIndex('lang_translations_pair_unique').on(t.sourceWordId, t.targetWordId),
  sourceIdx:   index('lang_translations_source_idx').on(t.sourceWordId),
  targetIdx:   index('lang_translations_target_idx').on(t.targetWordId),
}))

// ─────────────────────────────────────────────────────────────────
// GRAMÁTICA
// ─────────────────────────────────────────────────────────────────

/**
 * languages.grammar_patterns
 * Reglas y patrones gramaticales por idioma.
 * Las apps pueden consultar aquí para enriquecer feedback al usuario.
 */
export const grammarPatterns = languagesSchema.table('grammar_patterns', {
  id:              uuid('id').primaryKey().defaultRandom(),
  languageCode:    text('language_code').notNull(),
  topic:           text('topic').notNull(),           // 'present_perfect', 'ser_vs_estar'
  title:           text('title').notNull(),
  explanation:     text('explanation').notNull(),
  structure:       text('structure'),                 // 'Subject + have/has + V3'
  examples:        text('examples').array(),          // ['I have eaten', 'She has gone']
  antiExamples:    text('anti_examples').array(),     // ['I have ate' — WRONG]
  cefrLevel:       difficultyTierEnum('cefr_level').default('B1'),
  relatedTopics:   text('related_topics').array(),
  isActive:        boolean('is_active').default(true),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  topicIdx:  index('lang_grammar_topic_idx').on(t.languageCode, t.topic),
  levelIdx:  index('lang_grammar_level_idx').on(t.cefrLevel),
}))

/**
 * languages.irregular_verbs
 * Tabla de verbos irregulares por idioma.
 * Reutilizable por english (irregular verbs en/es) y spanish.
 */
export const irregularVerbs = languagesSchema.table('irregular_verbs', {
  id:             uuid('id').primaryKey().defaultRandom(),
  languageCode:   text('language_code').notNull(),
  infinitive:     text('infinitive').notNull(),       // 'go'
  simplePast:     text('simple_past'),                // 'went'
  pastParticiple: text('past_participle'),            // 'gone'
  presentParticiple: text('present_participle'),      // 'going'
  spanish:        text('spanish'),                    // 'ir' (traducción)
  exampleSentence: text('example_sentence'),
  cefrLevel:      difficultyTierEnum('cefr_level').default('A2'),
  frequency:      integer('frequency').default(0),
  tags:           text('tags').array(),              // ['motion', 'common']
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  infLangUnique: uniqueIndex('lang_verbs_inf_lang_unique').on(t.infinitive, t.languageCode),
  langIdx:       index('lang_verbs_lang_idx').on(t.languageCode),
  levelIdx:      index('lang_verbs_level_idx').on(t.cefrLevel),
  frequencyIdx:  index('lang_verbs_frequency_idx').on(t.frequency),
}))

/**
 * languages.idioms
 * Modismos y expresiones idiomáticas por idioma.
 */
export const idioms = languagesSchema.table('idioms', {
  id:              uuid('id').primaryKey().defaultRandom(),
  languageCode:    text('language_code').notNull(),
  expression:      text('expression').notNull(),      // 'break a leg'
  meaning:         text('meaning').notNull(),         // 'good luck'
  literal:         text('literal'),                   // 'romper una pierna'
  origin:          text('origin'),
  examples:        text('examples').array(),
  register:        text('register').default('informal'), // 'formal', 'informal', 'slang'
  cefrLevel:       difficultyTierEnum('cefr_level').default('B2'),
  tags:            text('tags').array(),
  isActive:        boolean('is_active').default(true),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  exprLangUnique: uniqueIndex('lang_idioms_expr_lang_unique').on(t.expression, t.languageCode),
  langIdx:        index('lang_idioms_lang_idx').on(t.languageCode),
  levelIdx:       index('lang_idioms_level_idx').on(t.cefrLevel),
}))

// ── TypeScript types ───────────────────────────────────────────
export type VocabularyItem    = typeof vocabularyBank.$inferSelect
export type NewVocabularyItem = typeof vocabularyBank.$inferInsert
export type WordTranslation   = typeof wordTranslations.$inferSelect
export type GrammarPattern    = typeof grammarPatterns.$inferSelect
export type IrregularVerb     = typeof irregularVerbs.$inferSelect
export type NewIrregularVerb  = typeof irregularVerbs.$inferInsert
export type Idiom             = typeof idioms.$inferSelect
