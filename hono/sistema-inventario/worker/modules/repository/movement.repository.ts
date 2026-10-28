import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { movement, stock } from '../../db/schema'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { toOffset } from '../../lib/pagination'
import type {
  FindAllMovements,
  MovementSign,
  NewMovement,
  PaginationQuery,
  SelectMovement,
} from '../../db/types'

export class MovementRepository {
  private db: DrizzleD1Database

  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  async findAll(query: PaginationQuery): Promise<FindAllMovements> {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select()
        .from(movement)
        .orderBy(desc(movement.createdAt), desc(movement.id))
        .limit(query.pageSize)
        .offset(toOffset(query)),
      this.db.select({ total: count() }).from(movement),
    ])
    return { items, total }
  }

  async findById(id: number): Promise<SelectMovement | undefined> {
    const [row] = await this.db
      .select()
      .from(movement)
      .where(eq(movement.id, id))
    return row
  }

  async findByProductId(
    id: number,
    query: PaginationQuery,
  ): Promise<FindAllMovements> {
    const where = eq(movement.productId, id)
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select()
        .from(movement)
        .where(where)
        .orderBy(desc(movement.createdAt), desc(movement.id))
        .limit(query.pageSize)
        .offset(toOffset(query)),
      this.db.select({ total: count() }).from(movement).where(where),
    ])
    return { items, total }
  }

  async findByLocationId(
    id: number,
    query: PaginationQuery,
  ): Promise<FindAllMovements> {
    const where = eq(movement.locationId, id)
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select()
        .from(movement)
        .where(where)
        .orderBy(desc(movement.createdAt), desc(movement.id))
        .limit(query.pageSize)
        .offset(toOffset(query)),
      this.db.select({ total: count() }).from(movement).where(where),
    ])
    return { items, total }
  }

  async findByLocationIdAndProductId(
    locationId: number,
    productId: number,
    query: PaginationQuery,
  ): Promise<FindAllMovements> {
    const where = and(
      eq(movement.locationId, locationId),
      eq(movement.productId, productId),
    )
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select()
        .from(movement)
        .where(where)
        .orderBy(desc(movement.createdAt), desc(movement.id))
        .limit(query.pageSize)
        .offset(toOffset(query)),
      this.db.select({ total: count() }).from(movement).where(where),
    ])
    return { items, total }
  }

  async existsTransferId(transferId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: movement.id })
      .from(movement)
      .where(eq(movement.transferId, transferId))
      .limit(1)
    return Boolean(row)
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

  // Las dos piernas de una transferencia se ejecutan en un único batch atómico.
  async transfer(
    outMovement: NewMovement,
    inMovement: NewMovement,
  ): Promise<[SelectMovement, SelectMovement]> {
    const [outRows, , , inRows] = await this.db.batch([
      this.db.insert(movement).values(outMovement).returning(),
      this.db
        .insert(stock)
        .values({
          productId: outMovement.productId,
          locationId: outMovement.locationId,
        })
        .onConflictDoNothing(),
      this.db
        .update(stock)
        .set({
          quantity: sql`${stock.quantity} - ${outMovement.quantity}`,
          updatedAt: sql`datetime('now')`,
        })
        .where(
          and(
            eq(stock.productId, outMovement.productId),
            eq(stock.locationId, outMovement.locationId),
          ),
        ),
      this.db.insert(movement).values(inMovement).returning(),
      this.db
        .insert(stock)
        .values({
          productId: inMovement.productId,
          locationId: inMovement.locationId,
        })
        .onConflictDoNothing(),
      this.db
        .update(stock)
        .set({
          quantity: sql`${stock.quantity} + ${inMovement.quantity}`,
          updatedAt: sql`datetime('now')`,
        })
        .where(
          and(
            eq(stock.productId, inMovement.productId),
            eq(stock.locationId, inMovement.locationId),
          ),
        ),
    ])

    return [outRows[0], inRows[0]]
  }
}
