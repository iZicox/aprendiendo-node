import { DrizzleD1Database } from 'drizzle-orm/d1'
import { movementType } from '../../db/schema'
import { eq } from 'drizzle-orm'

// esto necesita select all, select code

export type MovementTypeSelect = typeof movementType.$inferSelect

export class MovementTypeRepository {
  private db: DrizzleD1Database

  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  findAll(): Promise<MovementTypeSelect[]> {
    return this.db.select().from(movementType).orderBy(movementType.code)
  }

  async findByCode(code: string): Promise<MovementTypeSelect | undefined> {
    const [row] = await this.db // usa await por la desconstruccion []
      .select()
      .from(movementType)
      .where(eq(movementType.code, code))

    return row
  }
}
