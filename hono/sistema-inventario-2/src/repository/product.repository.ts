import { DrizzleD1Database } from "drizzle-orm/d1"
import { NewProduct, Pagination } from "../lib/types"
import { product, stock } from "../db/schema"
import { asc, count, eq } from "drizzle-orm"
import { sumQty, toOffset, toPage } from "../lib/utils"

export class ProductRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  // POST /products
  async create(newProduct: NewProduct) {
    const [row] = await this.db.insert(product).values(newProduct).returning()
    return row
  }
  // GET /products
  async getAll(opts: Pagination) {
    const [items, [{ total }]] = await this.db.batch([
      this.db
        .select({
          id: product.id,
          sku: product.sku,
          stock: sumQty,
        })
        .from(product)
        .leftJoin(stock, eq(product.id, stock.productId))
        .groupBy(product.sku, product.id)
        .orderBy(asc(product.sku))
        .limit(opts.pageSize)
        .offset(toOffset(opts)),
      this.db.select({ total: count() }).from(product),
    ])
    return toPage(items, total, opts)
  }
  // GET /products/:id
  async getById(id: number) {
    const [row] = await this.db
      .select({
        id: product.id,
        sku: product.sku,
        stock: sumQty,
      })
      .from(product)
      .leftJoin(stock, eq(product.id, stock.productId))
      .where(eq(product.id, id))
      .groupBy(product.sku, product.id)
    return row
  }
  // GET /products/:sku
  async getBySku(sku: string) {
    const [row] = await this.db
      .select({
        id: product.id,
        sku: product.sku,
        stock: sumQty,
      })
      .from(product)
      .leftJoin(stock, eq(product.id, stock.productId))
      .where(eq(product.sku, sku))
      .groupBy(product.sku, product.id)
    return row
  }
  // DELETE /products/:id
  async deleteById(id: number) {
    return this.db.delete(product).where(eq(product.id, id)).returning()
  }
  // DELETE /products/:sku
  async deleteBySku(sku: string) {
    return this.db.delete(product).where(eq(product.sku, sku)).returning()
  }
}
