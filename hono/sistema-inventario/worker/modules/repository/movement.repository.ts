import { DrizzleD1Database } from 'drizzle-orm/d1'
import { movement, stock } from '../../db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { MovementSign, NewMovement, SelectMovement } from '../../db/types'

export class MovementRepository {
  private db: DrizzleD1Database

  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  async findAll(): Promise<SelectMovement[]> {
    const rows = await this.db
      .select()
      .from(movement)
      .orderBy(movement.createdAt)
    return rows
  }

  async findById(id: number): Promise<SelectMovement> {
    const [row] = await this.db
      .select()
      .from(movement)
      .where(eq(movement.id, id))
      .orderBy(movement.createdAt)
    return row
  }

  async findByProductId(id: number): Promise<SelectMovement[]> {
    const rows = await this.db
      .select()
      .from(movement)
      .where(eq(movement.productId, id))
      .orderBy(movement.createdAt)
    return rows
  }

  async findByLocationId(id: number): Promise<SelectMovement[]> {
    const rows = await this.db
      .select()
      .from(movement)
      .where(eq(movement.locationId, id))
      .orderBy(movement.createdAt)
    return rows
  }

  async findByLocationIdAndProductId(
    locationId: number,
    productId: number,
  ): Promise<SelectMovement[]> {
    const rows = await this.db
      .select()
      .from(movement)
      .where(
        and(
          eq(movement.locationId, locationId),
          eq(movement.productId, productId),
        ),
      )
    return rows
  }

  async insert(data: NewMovement, sign: MovementSign): Promise<SelectMovement> {
    // insertar movimiento
    const insertMovement = this.db.insert(movement).values(data).returning()

    // confirmar que la fila en stock exista
    const ensureStock = this.db
      .insert(stock)
      .values({ productId: data.productId, locationId: data.locationId })
      .onConflictDoNothing()

    // actualizar stock
    const updateStock = this.db
      .update(stock)
      .set({
        quantity: sql`${stock.quantity} + (${data.quantity} * ${sign})`,
        updatedAt: sql`datetime('now')`,
      })
      .where(
        and(
          eq(stock.locationId, data.locationId),
          eq(stock.productId, data.productId),
        ),
      )

    const [rows] = await this.db.batch([
      insertMovement,
      ensureStock,
      updateStock,
    ])

    return rows[0]
  }
}
