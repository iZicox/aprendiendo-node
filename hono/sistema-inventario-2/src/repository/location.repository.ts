import { DrizzleD1Database } from "drizzle-orm/d1"
import { NewLocation } from "../lib/types"
import { location } from "../db/schema"
import { eq } from "drizzle-orm"

export class LocationRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  // POST /locattions
  async create(newLocation: NewLocation) {
    const [row] = await this.db.insert(location).values(newLocation).returning()
    return row
  }

  // GET /locations
  async getAll() {
    return await this.db.select().from(location)
  }

  // GET /locations/:id
  async getById(id: number) {
    const [row] = await this.db
      .select()
      .from(location)
      .where(eq(location.id, id))
    return row
  }

  // GET /locations/:code
  async getByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(location)
      .where(eq(location.code, code))
    return row
  }

  // DELETE /locations/:id
  async delete(id: number) {
    await this.db.delete(location).where(eq(location.id, id))
  }
}
