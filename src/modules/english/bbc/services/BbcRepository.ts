/**
 * @file src/modules/english/bbc/services/BbcRepository.ts
 * @description Repositorio para BBC Learning English.
 * SOLO accede a: english.bbcEpisodes, english.bbcUserProgress, english.bbcVocabulary
 * NUNCA importa de spanish.* ni de otros módulos.
 */
import { eq, and, desc } from 'drizzle-orm'
import db, { english } from '@lib/db'
import type {
  BbcEpisode,
  BbcUserProgress,
  BbcVocabulary,
  NewBbcUserProgress,
  NewBbcVocabulary,
} from '@lib/db/schemas/english.schema'

// ─── Episodes ───────────────────────────────────────────────────────────────

export class BbcEpisodesRepository {
  async findAll(filters?: { series?: string; cefrLevel?: string }): Promise<BbcEpisode[]> {
    const conditions: ReturnType<typeof eq>[] = []

    if (filters?.series)
      conditions.push(eq(english.bbcEpisodes.series, filters.series))
    if (filters?.cefrLevel)
      conditions.push(eq(english.bbcEpisodes.cefrLevel, filters.cefrLevel as never))

    const query = db.select().from(english.bbcEpisodes)

    return conditions.length
      ? query.where(and(...conditions)).orderBy(desc(english.bbcEpisodes.publishedAt))
      : query.orderBy(desc(english.bbcEpisodes.publishedAt))
  }

  async findById(id: string): Promise<BbcEpisode | null> {
    const rows = await db
      .select()
      .from(english.bbcEpisodes)
      .where(eq(english.bbcEpisodes.id, id))
      .limit(1)
    return rows[0] ?? null
  }
}

// ─── User Progress ───────────────────────────────────────────────────────────

export class BbcProgressRepository {
  async findByUser(userId: string): Promise<BbcUserProgress[]> {
    return db
      .select()
      .from(english.bbcUserProgress)
      .where(eq(english.bbcUserProgress.userId, userId))
      .orderBy(desc(english.bbcUserProgress.lastAccessedAt))
  }

  async findOne(userId: string, episodeId: string): Promise<BbcUserProgress | null> {
    const rows = await db
      .select()
      .from(english.bbcUserProgress)
      .where(
        and(
          eq(english.bbcUserProgress.userId, userId),
          eq(english.bbcUserProgress.episodeId, episodeId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  }

  async upsert(data: NewBbcUserProgress): Promise<BbcUserProgress> {
    const now = new Date()
    const rows = await db
      .insert(english.bbcUserProgress)
      .values({ ...data, lastAccessedAt: now })
      .onConflictDoUpdate({
        target: [english.bbcUserProgress.userId, english.bbcUserProgress.episodeId],
        set: {
          status:          data.status,
          comprehension:   data.comprehension,
          notes:           data.notes,
          lastAccessedAt:  now,
          updatedAt:       now,
          completedAt:     data.status === 'completed' ? now : undefined,
        },
      })
      .returning()
    return rows[0]!
  }
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export class BbcVocabularyRepository {
  async findByUser(userId: string, episodeId?: string): Promise<BbcVocabulary[]> {
    const conditions = episodeId
      ? and(
          eq(english.bbcVocabulary.userId, userId),
          eq(english.bbcVocabulary.episodeId, episodeId),
        )
      : eq(english.bbcVocabulary.userId, userId)

    return db
      .select()
      .from(english.bbcVocabulary)
      .where(conditions)
  }

  async save(data: NewBbcVocabulary): Promise<BbcVocabulary> {
    const rows = await db
      .insert(english.bbcVocabulary)
      .values(data)
      .returning()
    return rows[0]!
  }
}

// ─── Singleton exports ────────────────────────────────────────────────────────
export const bbcEpisodesRepository  = new BbcEpisodesRepository()
export const bbcProgressRepository  = new BbcProgressRepository()
export const bbcVocabularyRepository = new BbcVocabularyRepository()
