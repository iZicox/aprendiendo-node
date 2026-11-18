import { DrizzleD1Database } from "drizzle-orm/d1"
import { MovementFilters, Pagination } from "../lib/types"
import {
  and,
  asc,
  count,
  createTableRelationsHelpers,
  desc,
  eq,
  gte,
  lt,
  sql,
} from "drizzle-orm"
import { location, movement, movementType, product, stock } from "../db/schema"
import { formatMadrid, toOffset, toPage } from "../lib/utils"
import { sign } from "hono/jwt"

export class MovementRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  movementSelect = () => {
    const result = {
      id: movement.id,
      createdAt: movement.createdAt,
      quantity: movement.quantity,
      note: movement.note,
      transferId: movement.transferId,
      operationId: movement.operationId,
      type: {
        code: sql<string>`${movementType.code}`.as("type_code"),
        name: sql<string>`${movementType.description}`.as("type_name"),
        sign: movementType.sign,
      },
      product: {
        id: sql<number>`${product.id}`.as("product_id_"),
        sku: product.sku,
      },
      location: {
        id: sql<number>`${location.id}`.as("location_id_"),
        name: sql<string>`${location.code}`.as("location_code"),
      },
    }
    return result
  }
  // GET /movements
  async getAll(opts: Pagination, f: MovementFilters = {}) {
    const where = and(
      f.productId ? eq(movement.productId, f.productId) : undefined,
      f.locationId ? eq(movement.locationId, f.locationId) : undefined,
      f.typeCode ? eq(movement.movementTypeCode, f.typeCode) : undefined,
      f.from ? gte(movement.createdAt, f.from) : undefined,
      f.to ? lt(movement.createdAt, f.to) : undefined,
    )
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select(this.movementSelect())
        .from(movement)
        .innerJoin(product, eq(product.id, movement.productId))
        .innerJoin(location, eq(location.id, movement.locationId))
        .innerJoin(
          movementType,
          eq(movementType.code, movement.movementTypeCode),
        )
        .where(where)
        .orderBy(desc(movement.createdAt), desc(movement.id))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db.select({ total: count() }).from(movement).where(where),
    ])
    return toPage(
      items.map((i) => ({ ...i, createdAt: formatMadrid(i.createdAt) })),
      total,
      opts,
    )
  }
  // GET /movements/:id
  async getById(id: number) {
    const [row] = await this.db
      .select(this.movementSelect())
      .from(movement)
      .innerJoin(product, eq(product.id, movement.productId))
      .innerJoin(location, eq(location.id, movement.locationId))
      .innerJoin(movementType, eq(movementType.code, movement.movementTypeCode))
      .where(eq(movement.id, id))
    if (!row) return undefined
    return { ...row, createdAt: formatMadrid(row.createdAt) }
  }

  // GET /transfers/:transferId
  async getByTransferId(transferId: string) {
    const rows = await this.db
      .select({
        id: movement.id,
        createdAt: movement.createdAt,
        quantity: movement.quantity,
        type: { id: movement.id, code: movement.movementTypeCode },
        location: { id: location.id, code: location.code },
        sku: product.sku,
      })
      .from(movement)
      .innerJoin(product, eq(product.id, movement.productId))
      .innerJoin(location, eq(location.id, movement.locationId))
      .where(eq(movement.transferId, transferId))
      .orderBy(asc(movement.id))
    return rows.map((r) => ({ ...r, createdAt: formatMadrid(r.createdAt) }))
  }

  // GET /movements/summary?from=&to=
  async summaryByType(from: Date, to: Date) {
    return await this.db
      .select({
        code: movementType.code,
        description: movementType.description,
        count: count(),
        units: sql<number>`coalesce(sum(${movement.quantity}), 0)`,
      })
      .from(movement)
      .innerJoin(movementType, eq(movementType.code, movement.movementTypeCode))
      .where(and(gte(movement.createdAt, from), lt(movement.createdAt, to)))
      .groupBy(movementType.code, movementType.description)
      .orderBy(asc(movementType.code))
  }

  // POST /movements
  async create(data: {
    productId: number
    locationId: number
    typeCode: string
    quantity: number
    note?: string
  }) {
    const delta = sql<number>`${data.quantity} * (select sign from movement_type where code = ${data.typeCode})`

    const [inserted] = await this.db.batch([
      this.db
        .insert(movement)
        .values({
          productId: data.productId,
          locationId: data.locationId,
          movementTypeCode: data.typeCode,
          quantity: data.quantity,
          note: data.note,
        })
        .returning({ id: movement.id }),
      this.db
        .insert(stock)
        .values({
          productId: data.productId,
          locationId: data.locationId,
          quantity: delta,
        })
        .onConflictDoUpdate({
          target: [stock.productId, stock.locationId],
          set: {
            quantity: sql`${stock.quantity} + excluded.quantity`,
            updatedAt: new Date(),
          },
        }),
    ])
    return inserted[0]
  }

  // POST /transfers
  async createTransfer(data: {
    productId: number
    fromLocationId: number
    toLocationId: number
    quantity: number
    note?: string
  }) {
    const transferId = crypto.randomUUID()

    const [out, inn] = await this.db.batch([
      this.db
        .insert(movement)
        .values({
          productId: data.productId,
          locationId: data.fromLocationId,
          movementTypeCode: "TRANSFER_OUT",
          quantity: data.quantity,
          transferId,
          note: data.note,
        })
        .returning({ id: movement.id }),
      this.db
        .insert(movement)
        .values({
          productId: data.productId,
          locationId: data.toLocationId,
          movementTypeCode: "TRANSFER_IN",
          quantity: data.quantity,
          transferId,
          note: data.note,
        })
        .returning({ id: movement.id }),
      this.db
        .insert(stock)
        .values({
          productId: data.productId,
          locationId: data.fromLocationId,
          quantity: -data.quantity,
        })
        .onConflictDoUpdate({
          target: [stock.productId, stock.locationId],
          set: {
            quantity: sql`${stock.quantity} + excluded.quantity`,
            updatedAt: new Date(),
          },
        }),
      this.db
        .insert(stock)
        .values({
          productId: data.productId,
          locationId: data.toLocationId,
          quantity: data.quantity,
        })
        .onConflictDoUpdate({
          target: [stock.productId, stock.locationId],
          set: {
            quantity: sql`${stock.quantity} + excluded.quantity`,
            updatedAt: new Date(),
          },
        }),
    ])
    return { transferId, outId: out[0].id, inId: inn[0].id }
  }
}
