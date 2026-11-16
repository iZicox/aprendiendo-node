import { DrizzleD1Database } from "drizzle-orm/d1"
import { NewMovementType } from "../lib/types"
import { movementType } from "../db/schema"
import { eq } from "drizzle-orm"

export class MovementTypeRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  async create(newMovementType: NewMovementType) {
    const [row] = await this.db
      .insert(movementType)
      .values(newMovementType)
      .returning()
    return row
  }

  async getAll() {
    return await this.db.select().from(movementType)
  }

  async getByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(movementType)
      .where(eq(movementType.code, code))
    return row
  }

  async delete(code: string) {
    const [row] = await this.db
      .delete(movementType)
      .where(eq(movementType.code, code))
      .returning()
    return row
  }

  async update(description: string, code: string) {
    const [row] = await this.db
      .update(movementType)
      .set({ description: description })
      .where(eq(movementType.code, code))
      .returning()
    return row
  }
}
