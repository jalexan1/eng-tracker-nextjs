/**
 * english.verbs — tablas para verbos regulares e irregulares
 * Integrar en src/db/schema/english/index.ts (o donde el proyecto
 * reexporte los schemas de Drizzle).
 *
 * Después de añadir este archivo ejecuta:
 *   npx drizzle-kit push
 * para crear las tablas en Supabase.
 */
import {
  pgSchema,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

// Reutiliza el schema 'english' ya existente en tu proyecto.
// Si ya tienes `export const englishSchema = pgSchema('english')` en otro archivo,
// importa desde allí en lugar de redefinirlo aquí.
const englishSchema = pgSchema('english')

// ─── Enums ──────────────────────────────────────────────────────────────────
export const verbTypeEnum = englishSchema.enum('verb_type', [
  'regular',
  'irregular',
])

export const verbFormEnum = englishSchema.enum('verb_form', [
  'base',
  'past',
  'participle',
])

// ─── Tabla: english.verbs ────────────────────────────────────────────────────
export const verbs = englishSchema.table(
  'verbs',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    base:        text('base').notNull(),
    past:        text('past').notNull(),
    participle:  text('participle').notNull(),
    spanish:     text('spanish').notNull(),
    type:        verbTypeEnum('type').notNull(),           // regular | irregular
    group:       text('group'),                            // grupo sonoro (solo irregulares)
    difficulty:  integer('difficulty').default(1).notNull(), // 1 | 2 | 3
    createdAt:   timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    baseIdx: index('english_verbs_base_idx').on(t.base),
    typeIdx: index('english_verbs_type_idx').on(t.type),
  }),
)

// ─── Tabla: english.verb_sentences ──────────────────────────────────────────
// 5 oraciones por forma (base, past, participle) = hasta 15 oraciones por verbo
export const verbSentences = englishSchema.table(
  'verb_sentences',
  {
    id:         uuid('id').defaultRandom().primaryKey(),
    verbId:     uuid('verb_id')
                  .references(() => verbs.id, { onDelete: 'cascade' })
                  .notNull(),
    form:       verbFormEnum('form').notNull(),
    sentence:   text('sentence').notNull(),
    sentenceEs: text('sentence_es'),
    createdAt:  timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    verbIdx: index('english_verb_sentences_verb_idx').on(t.verbId),
    formIdx: index('english_verb_sentences_form_idx').on(t.form),
  }),
)

// ─── Tabla: english.verb_phrases ────────────────────────────────────────────
// Frases contextuales referenciadas al verbo base
export const verbPhrases = englishSchema.table(
  'verb_phrases',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    verbId:      uuid('verb_id')
                   .references(() => verbs.id, { onDelete: 'cascade' })
                   .notNull(),
    phrase:      text('phrase').notNull(),
    translation: text('translation'),
    createdAt:   timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    verbIdx: index('english_verb_phrases_verb_idx').on(t.verbId),
  }),
)

// ─── Types inferidos ─────────────────────────────────────────────────────────
export type Verb         = typeof verbs.$inferSelect
export type NewVerb      = typeof verbs.$inferInsert
export type VerbSentence = typeof verbSentences.$inferSelect
export type VerbPhrase   = typeof verbPhrases.$inferSelect
