import { DrizzleD1Database } from 'drizzle-orm/d1'
import { count, eq, asc, sql } from 'drizzle-orm'
import { location } from '../../db/schema'
import type { InsertLocation, SelectLocation } from '../../db/types'
import { toOffset } from '../../lib/pagination'

export class LocationRepository {
  private db: DrizzleD1Database

  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  findAll(): Promise<SelectLocation[]> {
    return this.db.select().from(location).orderBy(location.id)
  }

  // Página de ubicaciones filtradas por código. `instr` busca el texto tal
  // cual: así un `_` o `%` del término no actúa como comodín de LIKE.
  async search(
    term: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: SelectLocation[]; total: number }> {
    const where = term ? sql`instr(${location.code}, ${term}) > 0` : undefined

    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select()
        .from(location)
        .where(where)
        .orderBy(asc(location.code))
        .limit(pageSize)
        .offset(toOffset({ page, pageSize })),
      this.db.select({ total: count() }).from(location).where(where),
    ])

    return { items, total }
  }

  async findById(id: number): Promise<SelectLocation | undefined> {
    const [row] = await this.db
      .select()
      .from(location)
      .where(eq(location.id, id))
    return row
  }

  async create(data: InsertLocation): Promise<SelectLocation> {
    const [row] = await this.db.insert(location).values(data).returning()
    return row
  }

  async delete(id: number): Promise<SelectLocation | undefined> {
    const [row] = await this.db
      .delete(location)
      .where(eq(location.id, id))
      .returning()
    return row
  }
}
