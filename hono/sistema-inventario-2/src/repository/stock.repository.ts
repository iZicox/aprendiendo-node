import { DrizzleD1Database } from "drizzle-orm/d1"
import { location, product, stock } from "../db/schema"
import { and, asc, count, eq, gt } from "drizzle-orm"
import { Pagination } from "../lib/types"
import { sumQty, toOffset, toPage } from "../lib/utils"

export class StockRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  // GET /stock?page=&pageSize=
  // inventario de cada producto y su ubicacion con paginacion sin agrupar
  // una fila por combinacion de producto y ubicacion, un producto puede tener varias filas si esta en varicas ubicaciones
  async getAll(opts: Pagination) {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          productId: stock.productId,
          locationId: stock.locationId,
          sku: product.sku,
          locationCode: location.code,
          quantity: stock.quantity,
        })
        .from(stock)
        .innerJoin(product, eq(product.id, stock.productId))
        .innerJoin(location, eq(location.id, stock.locationId))
        .where(gt(stock.quantity, 0))
        .orderBy(asc(location.code), asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db
        .select({ total: count() })
        .from(stock)
        .where(gt(stock.quantity, 0)),
    ])
    return toPage(items, total, opts)
  }

  // GET /stock/total
  // inventario total de todos los almacenes en un solo numero
  async getTotal() {
    const [row] = await this.db.select({ total: sumQty }).from(stock)
    return row.total
  }

  // GET /stock/by-product?page&pageSize
  // lista de todos los productos con stock con paginacion sin distingir ubicaciones y agrupados con codigo de producto
  // una fila por producto y suma el stock en todas sus ubicaciones
  async getTotalsByProduct(opts: Pagination) {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          productId: product.id,
          sku: product.sku,
          total: sumQty,
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

  // GET /stock/by-location
  // lista de ubicacion y la suma total de inventario de cada una agrupada por codigo de ubicacion
  async getTotalsByLocation() {
    return this.db
      .select({
        locationId: location.id,
        locationCode: location.code,
        total: sumQty,
      })
      .from(location)
      .leftJoin(stock, eq(stock.locationId, location.id))
      .groupBy(location.id, location.code)
      .orderBy(asc(location.code))
  }

  // GET /stock/products/:productId
  // total de inventario de un producto en todas sus ubicaciones
  async getByProduct(productId: number) {
    const row = await this.db
      .select({
        productId: stock.productId,
        locationId: stock.locationId,
        sku: product.sku,
        locationCode: location.code,
        quantity: stock.quantity,
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .innerJoin(location, eq(location.id, stock.locationId))
      .where(eq(stock.productId, productId))
      .orderBy(asc(location.code))
    return row
  }

  // GET /stock/products/:productId/total
  // el inventario total de un producto en todas sus ubicaciones
  async getProductTotal(productId: number) {
    const [row] = await this.db
      .select({
        productId: product.id,
        sku: product.sku,
        total: sumQty,
      })
      .from(product)
      .leftJoin(stock, eq(stock.productId, product.id))
      .where(eq(product.id, productId))
      .groupBy(product.id, product.sku)
    return row ?? null
  }

  // GET /stock/locations/:locationId?page&pageSize
  // lista de inventario en una ubicacion especifica
  async getByLocation(locationId: number, opts: Pagination) {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          productId: stock.productId,
          locationId: stock.locationId,
          sku: product.sku,
          locationCode: location.code,
          quantity: stock.quantity,
        })
        .from(stock)
        .innerJoin(product, eq(product.id, stock.productId))
        .innerJoin(location, eq(location.id, stock.locationId))
        .where(eq(stock.locationId, locationId))
        .orderBy(asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db
        .select({ total: count() })
        .from(stock)
        .where(eq(stock.locationId, locationId)),
    ])

    return toPage(items, total, opts)
  }

  // GET /stock/locations/:locationId/total
  // el inventario total de una ubicacion
  async getLocationTotal(locationId: number) {
    const [row] = await this.db
      .select({
        locationId: location.id,
        locationCode: location.code,
        total: sumQty,
      })
      .from(location)
      .leftJoin(stock, eq(stock.locationId, location.id))
      .where(eq(location.id, locationId))
      .groupBy(location.id, location.code)
    return row ?? null
  }

  // GET /stock/locations/:locationId/products/:productId
  // producto en una ubicacion
  async getProductInLocation(productId: number, locationId: number) {
    const [row] = await this.db
      .select({
        productId: stock.productId,
        locationId: stock.locationId,
        sku: product.sku,
        locationCode: location.code,
        quantity: stock.quantity,
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .innerJoin(location, eq(location.id, stock.locationId))
      .where(
        and(eq(stock.productId, productId), eq(stock.locationId, locationId)),
      )
      .limit(1)
    return row ?? null
  }
  // GET /stock/sku/:sku
  async getBySku(sku: string) {
    return this.db
      .select({
        productId: stock.productId,
        locationId: stock.locationId,
        sku: product.sku,
        locationCode: location.code,
        quantity: stock.quantity,
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .innerJoin(location, eq(location.id, stock.locationId))
      .where(eq(product.sku, sku))
      .orderBy(asc(location.code))
  }
}
