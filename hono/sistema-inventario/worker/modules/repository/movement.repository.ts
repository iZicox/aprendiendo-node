import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { movement, movementOperation, stock } from '../../db/schema'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { toOffset } from '../../lib/pagination'
import type {
  FindAllMovements,
  MovementSign,
  NewMovement,
  NewMovementOperation,
  PaginationQuery,
  SelectMovement,
  SelectMovementOperation,
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

  // ── Idempotencia ──────────────────────────────────────────

  // (user_id, idempotency_key) es único: dos requests con la misma llave
  // solo pueden dar de alta una operación.
  async findOperation(
    userId: number,
    idempotencyKey: string,
  ): Promise<SelectMovementOperation | undefined> {
    const [row] = await this.db
      .select()
      .from(movementOperation)
      .where(
        and(
          eq(movementOperation.userId, userId),
          eq(movementOperation.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1)
    return row
  }

  // Los movimientos de una operación: 1 en un movimiento simple,
  // 2 (OUT + IN) en una transferencia.
  async findMovementsByOperationId(
    operationId: string,
  ): Promise<SelectMovement[]> {
    return this.db
      .select()
      .from(movement)
      .where(eq(movement.operationId, operationId))
      .orderBy(movement.id)
  }

  // La operación y su movimiento se insertan en el mismo batch: si algo
  // falla (stock negativo, FK), la operación no queda registrada y la
  // llave sigue disponible para reintentar.
  async insert(
    operation: NewMovementOperation,
    data: NewMovement,
    sign: MovementSign,
  ): Promise<SelectMovement> {
    // insertar movimiento
    const insertMovement = this.db
      .insert(movement)
      .values({ ...data, operationId: operation.id })
      .returning()

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

    const [, rows] = await this.db.batch([
      this.db.insert(movementOperation).values(operation),
      insertMovement,
      ensureStock,
      updateStock,
    ])

    return rows[0]
  }

  // Las dos piernas de una transferencia se ejecutan en un único batch
  // atómico junto con la operación idempotente.
  async transfer(
    operation: NewMovementOperation,
    outMovement: NewMovement,
    inMovement: NewMovement,
  ): Promise<[SelectMovement, SelectMovement]> {
    const [, outRows, , , inRows] = await this.db.batch([
      this.db.insert(movementOperation).values(operation),
      this.db
        .insert(movement)
        .values({ ...outMovement, operationId: operation.id })
        .returning(),
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
      this.db
        .insert(movement)
        .values({ ...inMovement, operationId: operation.id })
        .returning(),
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
