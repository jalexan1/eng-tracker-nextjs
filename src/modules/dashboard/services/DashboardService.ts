/**
 * @file src/modules/dashboard/services/DashboardService.ts
 * @description Agrega estadísticas de ambos módulos para el dashboard.
 * Este es el ÚNICO lugar donde se consultan shared + english + spanish juntos.
 * No cruza datos entre english y spanish — cada uno se agrega por separado.
 */
import { eq, and, gte, sql, desc } from 'drizzle-orm'
import db, { shared, english, spanish } from '@lib/db'

export interface DailyProgressPoint {
  date:         string  // 'YYYY-MM-DD'
  englishCards: number
  spanishCards: number
  totalMinutes: number
}

export interface ModuleStats {
  totalDecks:    number
  totalCards:    number
  dueCards:      number
  masteredCards: number  // repetitions >= 3
  streakDays:    number
}

export interface DashboardData {
  english:      ModuleStats
  spanish:      ModuleStats
  weeklyChart:  DailyProgressPoint[]
  recentActivity: {
    type:    'english_review' | 'spanish_review' | 'bbc_episode'
    label:   string
    date:    Date
  }[]
}

export class DashboardService {
  async getStats(userId: string): Promise<DashboardData> {
    const [englishStats, spanishStats, weeklyData, recentActivity] = await Promise.all([
      this.getEnglishStats(userId),
      this.getSpanishStats(userId),
      this.getWeeklyChart(userId),
      this.getRecentActivity(userId),
    ])

    return {
      english:        englishStats,
      spanish:        spanishStats,
      weeklyChart:    weeklyData,
      recentActivity,
    }
  }

  // ─── English stats (accede SOLO a english.*) ──────────────────────────────

  private async getEnglishStats(userId: string): Promise<ModuleStats> {
    const now = new Date()

    const [deckCount, cardStats, streakData] = await Promise.all([
      // Total mazos activos
      db
        .select({ count: sql<number>`count(*)` })
        .from(english.flashcardDecks)
        .where(
          and(
            eq(english.flashcardDecks.userId, userId),
            eq(english.flashcardDecks.status, 'active'),
          ),
        ),
      // Total, vencidas y masterizadas
      db
        .select({
          total:    sql<number>`count(*)`,
          due:      sql<number>`count(*) filter (where ${english.flashcards.nextReviewAt} <= ${now})`,
          mastered: sql<number>`count(*) filter (where ${english.flashcards.repetitions} >= 3)`,
        })
        .from(english.flashcards)
        .where(eq(english.flashcards.userId, userId)),
      // Racha: días consecutivos con al menos 1 revisión
      this.calcEnglishStreak(userId),
    ])

    return {
      totalDecks:    deckCount[0]?.count    ?? 0,
      totalCards:    cardStats[0]?.total    ?? 0,
      dueCards:      cardStats[0]?.due      ?? 0,
      masteredCards: cardStats[0]?.mastered ?? 0,
      streakDays:    streakData,
    }
  }

  private async calcEnglishStreak(userId: string): Promise<number> {
    // Días distintos con revisiones, en orden descendente
    const rows = await db
      .select({
        reviewDate: sql<string>`date(${english.cardReviews.reviewedAt})::text`,
      })
      .from(english.cardReviews)
      .where(eq(english.cardReviews.userId, userId))
      .groupBy(sql`date(${english.cardReviews.reviewedAt})`)
      .orderBy(desc(sql`date(${english.cardReviews.reviewedAt})`))
      .limit(365)

    return this.countConsecutiveDays(rows.map(r => r.reviewDate))
  }

  // ─── Spanish stats (accede SOLO a spanish.*) ─────────────────────────────

  private async getSpanishStats(userId: string): Promise<ModuleStats> {
    const now = new Date()

    const [deckCount, cardStats, streakData] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(spanish.flashcardDecks)
        .where(
          and(
            eq(spanish.flashcardDecks.userId, userId),
            eq(spanish.flashcardDecks.status, 'active'),
          ),
        ),
      db
        .select({
          total:    sql<number>`count(*)`,
          due:      sql<number>`count(*) filter (where ${spanish.flashcards.nextReviewAt} <= ${now})`,
          mastered: sql<number>`count(*) filter (where ${spanish.flashcards.repetitions} >= 3)`,
        })
        .from(spanish.flashcards)
        .where(eq(spanish.flashcards.userId, userId)),
      this.calcSpanishStreak(userId),
    ])

    return {
      totalDecks:    deckCount[0]?.count    ?? 0,
      totalCards:    cardStats[0]?.total    ?? 0,
      dueCards:      cardStats[0]?.due      ?? 0,
      masteredCards: cardStats[0]?.mastered ?? 0,
      streakDays:    streakData,
    }
  }

  private async calcSpanishStreak(userId: string): Promise<number> {
    const rows = await db
      .select({
        reviewDate: sql<string>`date(${spanish.cardReviews.reviewedAt})::text`,
      })
      .from(spanish.cardReviews)
      .where(eq(spanish.cardReviews.userId, userId))
      .groupBy(sql`date(${spanish.cardReviews.reviewedAt})`)
      .orderBy(desc(sql`date(${spanish.cardReviews.reviewedAt})`))
      .limit(365)

    return this.countConsecutiveDays(rows.map(r => r.reviewDate))
  }

  // ─── Gráfica semanal (últimos 7 días) ────────────────────────────────────

  private async getWeeklyChart(userId: string): Promise<DailyProgressPoint[]> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const [englishReviews, spanishReviews] = await Promise.all([
      db
        .select({
          date:  sql<string>`date(${english.cardReviews.reviewedAt})::text`,
          count: sql<number>`count(*)`,
        })
        .from(english.cardReviews)
        .where(
          and(
            eq(english.cardReviews.userId, userId),
            gte(english.cardReviews.reviewedAt, sevenDaysAgo),
          ),
        )
        .groupBy(sql`date(${english.cardReviews.reviewedAt})`),
      db
        .select({
          date:  sql<string>`date(${spanish.cardReviews.reviewedAt})::text`,
          count: sql<number>`count(*)`,
        })
        .from(spanish.cardReviews)
        .where(
          and(
            eq(spanish.cardReviews.userId, userId),
            gte(spanish.cardReviews.reviewedAt, sevenDaysAgo),
          ),
        )
        .groupBy(sql`date(${spanish.cardReviews.reviewedAt})`),
    ])

    // Generar los 7 días aunque no haya datos
    const days: DailyProgressPoint[] = []
    const engMap  = new Map(englishReviews.map(r => [r.date, r.count]))
    const spanMap = new Map(spanishReviews.map(r => [r.date, r.count]))

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push({
        date:         key,
        englishCards: engMap.get(key)  ?? 0,
        spanishCards: spanMap.get(key) ?? 0,
        totalMinutes: 0,  // se implementa con daily_progress en v3
      })
    }

    return days
  }

  // ─── Actividad reciente ───────────────────────────────────────────────────

  private async getRecentActivity(userId: string) {
    const [engReviews, spanReviews, bbcProgress] = await Promise.all([
      db
        .select({
          reviewedAt: english.cardReviews.reviewedAt,
          difficulty: english.cardReviews.difficulty,
        })
        .from(english.cardReviews)
        .where(eq(english.cardReviews.userId, userId))
        .orderBy(desc(english.cardReviews.reviewedAt))
        .limit(5),
      db
        .select({
          reviewedAt: spanish.cardReviews.reviewedAt,
          difficulty: spanish.cardReviews.difficulty,
        })
        .from(spanish.cardReviews)
        .where(eq(spanish.cardReviews.userId, userId))
        .orderBy(desc(spanish.cardReviews.reviewedAt))
        .limit(5),
      db
        .select({
          lastAccessedAt: english.bbcUserProgress.lastAccessedAt,
          episodeId:      english.bbcUserProgress.episodeId,
        })
        .from(english.bbcUserProgress)
        .where(eq(english.bbcUserProgress.userId, userId))
        .orderBy(desc(english.bbcUserProgress.lastAccessedAt))
        .limit(5),
    ])

    const activity = [
      ...engReviews.map(r => ({
        type:  'english_review' as const,
        label: `Revisión inglés (${r.difficulty})`,
        date:  r.reviewedAt ?? new Date(),
      })),
      ...spanReviews.map(r => ({
        type:  'spanish_review' as const,
        label: `Revisión español (${r.difficulty})`,
        date:  r.reviewedAt ?? new Date(),
      })),
      ...bbcProgress.map(r => ({
        type:  'bbc_episode' as const,
        label: `Episodio BBC`,
        date:  r.lastAccessedAt ?? new Date(),
      })),
    ]

    return activity
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)
  }

  // ─── Utilidad: racha de días consecutivos ────────────────────────────────

  private countConsecutiveDays(sortedDatesDesc: string[]): number {
    if (!sortedDatesDesc.length) return 0

    let streak    = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    for (const dateStr of sortedDatesDesc) {
      const d = new Date(dateStr)
      d.setHours(0, 0, 0, 0)
      const diff = Math.round((checkDate.getTime() - d.getTime()) / 86_400_000)

      if (diff > 1) break  // hueco en la racha
      streak++
      checkDate = d
    }

    return streak
  }
}

export const dashboardService = new DashboardService()
