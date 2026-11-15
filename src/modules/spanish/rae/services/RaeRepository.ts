/**
 * @file src/modules/spanish/rae/services/RaeRepository.ts
 * @description Repositorio para búsquedas RAE (Real Academia Española).
 * Solo accede a: spanish.raeLookups
 *
 * Fase actual: scaffold. La integración con la API RAE se implementará en v3.
 */
import { eq, desc } from 'drizzle-orm'
import db, { spanish } from '@lib/db'
import type { RaeLookup, NewRaeLookup } from '@lib/db/schemas/spanish.schema'

export class RaeRepository {
  async findByUser(userId: string, limit = 20): Promise<RaeLookup[]> {
    return db
      .select()
      .from(spanish.raeLookups)
      .where(eq(spanish.raeLookups.userId, userId))
      .orderBy(desc(spanish.raeLookups.lookedUpAt))
      .limit(limit)
  }

  async save(data: NewRaeLookup): Promise<RaeLookup> {
    const rows = await db
      .insert(spanish.raeLookups)
      .values(data)
      .returning()
    return rows[0]
  }
}

export const raeRepository = new RaeRepository()
