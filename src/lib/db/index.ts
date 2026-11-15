/**
 * @file src/lib/db/index.ts
 * @description Instancia única de Drizzle ORM con los 4 schemas de la plataforma.
 *
 * ARQUITECTURA DE CONEXIONES:
 *   - DATABASE_URL          → pgBouncer port 6543 (pooled, para Server Actions en Vercel)
 *   - DATABASE_URL_UNPOOLED → Supabase direct port 5432 (para migraciones y seeds)
 *
 * USO:
 *   import { db } from '@lib/db'
 *   import { english } from '@lib/db'    // tablas del schema english
 *   import { shared } from '@lib/db'     // tablas del schema shared
 *
 * NUNCA importes schemas cross-módulo en los módulos de app:
 *   ✅ src/modules/english/**  usa  english.*, shared.*
 *   ✅ src/modules/spanish/**  usa  spanish.*, shared.*
 *   ❌ src/modules/english/**  NUNCA importa spanish.*
 *   ❌ src/modules/spanish/**  NUNCA importa english.*
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// ── Schemas ────────────────────────────────────────────────────
import * as sharedTables   from './schemas/shared.schema'
import * as englishTables  from './schemas/english.schema'
import * as spanishTables  from './schemas/spanish.schema'
import * as languagesTables from './schemas/languages.schema'

// ── Re-export schemas con namespace limpio ─────────────────────
export const shared    = sharedTables
export const english   = englishTables
export const spanish   = spanishTables
export const languages = languagesTables

// ── Re-export schemas de Drizzle (para drizzle.config.ts) ──────
export const schema = {
  // shared.*
  languages:      sharedTables.languages,
  userProfiles:   sharedTables.userProfiles,
  appEnrollments: sharedTables.appEnrollments,
  dailyProgress:  sharedTables.dailyProgress,
  subscriptions:  sharedTables.subscriptions,

  // english.*
  enFlashcardDecks:  englishTables.flashcardDecks,
  enFlashcards:      englishTables.flashcards,
  enCardReviews:     englishTables.cardReviews,
  enBbcEpisodes:     englishTables.bbcEpisodes,
  enBbcUserProgress: englishTables.bbcUserProgress,
  enBbcVocabulary:   englishTables.bbcVocabulary,
  enGrammarExercises: englishTables.grammarExercises,

  // spanish.*
  esFlashcardDecks:  spanishTables.flashcardDecks,
  esFlashcards:      spanishTables.flashcards,
  esCardReviews:     spanishTables.cardReviews,
  esRaeLookups:      spanishTables.raeLookups,
  esReadingSessions: spanishTables.readingSessions,
  esGrammarExercises: spanishTables.grammarExercises,

  // languages.*
  vocabularyBank:    languagesTables.vocabularyBank,
  wordTranslations:  languagesTables.wordTranslations,
  grammarPatterns:   languagesTables.grammarPatterns,
  irregularVerbs:    languagesTables.irregularVerbs,
  idioms:            languagesTables.idioms,
}

// ── Conexión para Server Actions (pooled via pgBouncer) ─────────
// Vercel Serverless: muchas conexiones cortas → pool es obligatorio
function createPooledClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no está definida. Asegúrate de configurar el .env.local ' +
      'con la URL de pgBouncer (puerto 6543) de Supabase.'
    )
  }
  return postgres(process.env.DATABASE_URL, {
    prepare: false, // pgBouncer no soporta prepared statements
  })
}

// ── Instancia principal (pooled — Server Actions) ───────────────
const pooledClient = createPooledClient()

export const db = drizzle(pooledClient, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

// ── Conexión directa para migraciones (unpooled) ────────────────
// Se usa SOLO en scripts de migración, no en la app.
export function createMigrationClient() {
  if (!process.env.DATABASE_URL_UNPOOLED) {
    throw new Error(
      'DATABASE_URL_UNPOOLED no está definida. Necesaria para migraciones. ' +
      'Usa la URL directa de Supabase (puerto 5432, NO pgBouncer).'
    )
  }
  const client = postgres(process.env.DATABASE_URL_UNPOOLED, { max: 1 })
  return drizzle(client, { schema })
}

// ── Types de utilidad ──────────────────────────────────────────
export type Database = typeof db
export type TransactionDB = Parameters<Parameters<typeof db.transaction>[0]>[0]

// ── Default export ─────────────────────────────────────────────
export default db
