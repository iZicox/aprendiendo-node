import { and, asc, count, eq, gt, sql } from 'drizzle-orm'
import {
  location,
  movement,
  movementType,
  product,
  stock,
} from '../../db/schema'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import type { Page, PageOpts, PaginationQuery, StockRow } from '../../db/types'
import { toOffset, toPage } from '../../lib/pagination'

export class StockRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  // 1. GET /stock/total
  async getTotal(): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${stock.quantity}), 0)` })
      .from(stock)
    return row.total
  }

  // 2. GET /stock/products/:productId/total  (null -> 404)
  async getProductTotal(productId: number) {
    const [row] = await this.db
      .select({
        sku: product.sku,
        total: sql<number>`coalesce(sum(${stock.quantity}), 0)`,
      })
      .from(product)
      .leftJoin(stock, eq(stock.productId, product.id))
      .where(eq(product.id, productId))
      .groupBy(product.id, product.sku)
    return row ?? null
  }

  // 3. GET /stock/locations/:locationId/total
  async getLocationTotal(locationId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${stock.quantity}), 0)` })
      .from(stock)
      .where(eq(stock.locationId, locationId))
    return row.total
  }

  // 4. GET /stock/locations/:locationId/products/:productId
  async getProductInLocation(
    productId: number,
    locationId: number,
  ): Promise<StockRow | null> {
    const [row] = await this.db
      .select({
        sku: product.sku,
        ubicacionCode: location.code,
        total: sql<number>`coalesce(${stock.quantity}, 0)`,
      })
      .from(product)
      .innerJoin(location, eq(location.id, locationId))
      .leftJoin(
        stock,
        and(eq(stock.productId, product.id), eq(stock.locationId, location.id)),
      )
      .where(eq(product.id, productId))
      .limit(1)
    return row ?? null
  }

  // 5. GET /stock?page&pageSize&includeZero
  async getSummary(opts: PageOpts): Promise<Page<StockRow>> {
    if (!opts.includeZero) {
      const where = gt(stock.quantity, 0)

      const [items, [{ total }]] = await this.db.batch([
        this.db
          .select({
            sku: product.sku,
            ubicacionCode: location.code,
            total: stock.quantity,
          })
          .from(stock)
          .innerJoin(product, eq(product.id, stock.productId))
          .innerJoin(location, eq(location.id, stock.locationId))
          .where(where)
          .orderBy(asc(location.code), asc(product.sku))
          .limit(opts.pageSize)
          .offset(toOffset(opts)),
        this.db.select({ total: count() }).from(stock).where(where),
      ])

      return toPage(items, total, opts)
    }

    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          sku: product.sku,
          ubicacionCode: location.code,
          total: sql<number>`coalesce(${stock.quantity}, 0)`,
        })
        .from(product)
        .crossJoin(location)
        .leftJoin(
          stock,
          and(
            eq(stock.productId, product.id),
            eq(stock.locationId, location.id),
          ),
        )
        .orderBy(asc(location.code), asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db.select({ total: count() }).from(product).crossJoin(location),
    ])

    return toPage(items, total, opts)
  }

  // 6. GET /stock/locations/:locationId?page&pageSize&includeZero
  async getLocationSummary(
    locationId: number,
    opts: PageOpts,
  ): Promise<Page<StockRow>> {
    const where = opts.includeZero ? undefined : gt(stock.quantity, 0)
    const stockJoin = and(
      eq(stock.productId, product.id),
      eq(stock.locationId, locationId),
    )

    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          sku: product.sku,
          ubicacionCode: location.code,
          total: sql<number>`coalesce(${stock.quantity}, 0)`,
        })
        .from(product)
        .innerJoin(location, eq(location.id, locationId))
        .leftJoin(stock, stockJoin)
        .where(where)
        .orderBy(asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db
        .select({ total: count() })
        .from(product)
        .innerJoin(location, eq(location.id, locationId))
        .leftJoin(stock, stockJoin)
        .where(where),
    ])

    return toPage(items, total, opts)
  }

  // 7. GET /stock/by-product?page&pageSize
  async getTotalsByProduct(opts: PaginationQuery) {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          id: product.id,
          sku: product.sku,
          total: sql<number>`coalesce(sum(${stock.quantity}), 0)`,
        })
        .from(product)
        .leftJoin(stock, eq(stock.productId, product.id))
        .groupBy(product.id, product.sku)
        .orderBy(asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db.select({ total: count() }).from(product),
    ])

    return toPage(items, total, opts)
  }

  // 8. GET /stock/by-location
  async getTotalsByLocation() {
    return this.db
      .select({
        id: location.id,
        ubicacionCode: location.code,
        total: sql<number>`coalesce(sum(${stock.quantity}), 0)`,
      })
      .from(location)
      .leftJoin(stock, eq(stock.locationId, location.id))
      .groupBy(location.id, location.code)
      .orderBy(asc(location.code))
  }

  // 9. GET /stock/out-of-stock?page&pageSize
  async getOutOfStock(opts: PaginationQuery) {
    const sumQty = sql<number>`coalesce(sum(${stock.quantity}), 0)`

    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({ id: product.id, sku: product.sku, total: sumQty })
        .from(product)
        .leftJoin(stock, eq(stock.productId, product.id))
        .groupBy(product.id, product.sku)
        .having(sql`${sumQty} = 0`)
        .orderBy(asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db
        .select({ total: count() })
        .from(product)
        .where(
          sql`coalesce((select sum(${stock.quantity}) from ${stock} where ${stock.productId} = ${product.id}), 0) = 0`,
        ),
    ])

    return toPage(items, total, opts)
  }

  // 10. GET /stock/sku/:sku  ([] -> 404)
  async getBySku(sku: string) {
    return this.db
      .select({
        sku: product.sku,
        ubicacionCode: location.code,
        total: sql<number>`coalesce(${stock.quantity}, 0)`,
      })
      .from(product)
      .crossJoin(location)
      .leftJoin(
        stock,
        and(eq(stock.productId, product.id), eq(stock.locationId, location.id)),
      )
      .where(eq(product.sku, sku))
      .orderBy(asc(location.code))
  }

  // 11. GET /admin/stock/audit
  async getAudit() {
    const pairs = this.db
      .select({
        productId: stock.productId,
        locationId: stock.locationId,
      })
      .from(stock)
      .union(
        this.db
          .select({
            productId: movement.productId,
            locationId: movement.locationId,
          })
          .from(movement),
      )
      .as('pairs')

    const calculated = sql<number>`coalesce(sum(${movement.quantity} * ${movementType.sign}), 0)`
    const actual = sql<number>`coalesce(${stock.quantity}, 0)`

    return this.db
      .select({
        productId: pairs.productId,
        locationId: pairs.locationId,
        stockActual: actual,
        stockCalculado: calculated,
      })
      .from(pairs)
      .leftJoin(
        stock,
        and(
          eq(stock.productId, pairs.productId),
          eq(stock.locationId, pairs.locationId),
        ),
      )
      .leftJoin(
        movement,
        and(
          eq(movement.productId, pairs.productId),
          eq(movement.locationId, pairs.locationId),
        ),
      )
      .leftJoin(movementType, eq(movementType.code, movement.movementTypeCode))
      .groupBy(pairs.productId, pairs.locationId, stock.quantity)
      .having(sql`${actual} <> ${calculated}`)
      .orderBy(asc(pairs.productId), asc(pairs.locationId))
  }
}
