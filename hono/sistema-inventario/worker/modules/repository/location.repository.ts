import { DrizzleD1Database } from 'drizzle-orm/d1'
import { location } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { InsertLocation, SelectLocation } from '../../db/types'

export class LocationRepository {
  private db: DrizzleD1Database

  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  findAll(): Promise<SelectLocation[]> {
    return this.db.select().from(location)
  }

  async findById(id: number): Promise<SelectLocation> {
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
