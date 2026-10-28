import { and, asc, count, eq, gt, sql } from 'drizzle-orm'
import {
  location,
  movement,
  movementType,
  product,
  stock,
} from '../../db/schema'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import type {
  Page,
  PageOpts,
  PaginationQuery,
  StockAuditRow,
  StockLocationTotal,
  StockProductTotal,
  StockRow,
} from '../../db/types'
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
  async getProductTotal(productId: number): Promise<StockProductTotal | null> {
    const [row] = await this.db
      .select({
        productId: product.id,
        sku: product.sku,
        total: sql<number>`coalesce(sum(${stock.quantity}), 0)`,
      })
      .from(product)
      .leftJoin(stock, eq(stock.productId, product.id))
      .where(eq(product.id, productId))
      .groupBy(product.id, product.sku)
    return row ?? null
  }

  // 3. GET /stock/locations/:locationId/total  (null -> 404)
  async getLocationTotal(
    locationId: number,
  ): Promise<StockLocationTotal | null> {
    const [row] = await this.db
      .select({
        locationId: location.id,
        locationCode: location.code,
        total: sql<number>`coalesce(sum(${stock.quantity}), 0)`,
      })
      .from(location)
      .leftJoin(stock, eq(stock.locationId, location.id))
      .where(eq(location.id, locationId))
      .groupBy(location.id, location.code)
    return row ?? null
  }

  // 4. GET /stock/locations/:locationId/products/:productId
  async getProductInLocation(
    productId: number,
    locationId: number,
  ): Promise<StockRow | null> {
    const [row] = await this.db
      .select({
        productId: sql<number>`${product.id}`.as('product_id'),
        locationId: sql<number>`${location.id}`.as('location_id'),
        sku: product.sku,
        locationCode: location.code,
        quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
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
            productId: sql<number>`${product.id}`.as('product_id'),
            locationId: sql<number>`${location.id}`.as('location_id'),
            sku: product.sku,
            locationCode: location.code,
            quantity: stock.quantity,
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
          productId: sql<number>`${product.id}`.as('product_id'),
          locationId: sql<number>`${location.id}`.as('location_id'),
          sku: product.sku,
          locationCode: location.code,
          quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
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
          productId: sql<number>`${product.id}`.as('product_id'),
          locationId: sql<number>`${location.id}`.as('location_id'),
          sku: product.sku,
          locationCode: location.code,
          quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
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
  async getTotalsByProduct(
    opts: PaginationQuery,
  ): Promise<Page<StockProductTotal>> {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          productId: product.id,
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
  async getTotalsByLocation(): Promise<StockLocationTotal[]> {
    return this.db
      .select({
        locationId: location.id,
        locationCode: location.code,
        total: sql<number>`coalesce(sum(${stock.quantity}), 0)`,
      })
      .from(location)
      .leftJoin(stock, eq(stock.locationId, location.id))
      .groupBy(location.id, location.code)
      .orderBy(asc(location.code))
  }

  // 9. GET /stock/out-of-stock?page&pageSize
  async getOutOfStock(opts: PaginationQuery): Promise<Page<StockProductTotal>> {
    const sumQty = sql<number>`coalesce(sum(${stock.quantity}), 0)`

    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({ productId: product.id, sku: product.sku, total: sumQty })
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
  async getBySku(sku: string): Promise<StockRow[]> {
    return this.db
      .select({
        productId: sql<number>`${product.id}`.as('product_id'),
        locationId: sql<number>`${location.id}`.as('location_id'),
        sku: product.sku,
        locationCode: location.code,
        quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
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

  // 11. GET /stock/products/:productId  ([] -> 404)
  async getByProductId(productId: number): Promise<StockRow[]> {
    return this.db
      .select({
        productId: sql<number>`${product.id}`.as('product_id'),
        locationId: sql<number>`${location.id}`.as('location_id'),
        sku: product.sku,
        locationCode: location.code,
        quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
      })
      .from(product)
      .crossJoin(location)
      .leftJoin(
        stock,
        and(eq(stock.productId, product.id), eq(stock.locationId, location.id)),
      )
      .where(eq(product.id, productId))
      .orderBy(asc(location.code))
  }

  // 12. GET /admin/stock/audit?page&pageSize
  async getAudit(opts: PaginationQuery): Promise<Page<StockAuditRow>> {
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

    const audit = this.db
      .select({
        productId: pairs.productId,
        locationId: pairs.locationId,
        stockActual: sql<number>`coalesce(${stock.quantity}, 0)`.as(
          'stock_actual',
        ),
        stockCalculado:
          sql<number>`coalesce(sum(${movement.quantity} * ${movementType.sign}), 0)`.as(
            'stock_calculado',
          ),
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
      .as('audit')

    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          productId: audit.productId,
          locationId: audit.locationId,
          stockActual: audit.stockActual,
          stockCalculado: audit.stockCalculado,
        })
        .from(audit)
        .orderBy(asc(audit.productId), asc(audit.locationId))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db.select({ total: count() }).from(audit),
    ])

    return toPage(items, total, opts)
  }
}
