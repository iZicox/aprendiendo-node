import { DrizzleD1Database } from "drizzle-orm/d1"
import { NewProduct } from "../lib/types"
import { deleteById } from "../controller/location.controller"
import { product, stock } from "../db/schema"
import { asc, eq, sum } from "drizzle-orm"

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
  async getAll(pageSize: number, offset: number) {
    return await this.db
      .select({
        sku: product.sku,
        stock: sum(stock.quantity),
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .groupBy(product.sku)
      .orderBy(asc(product.sku))
      .limit(pageSize)
      .offset(offset)
  }
  // GET /products/:id
  async getById(id: number) {
    const [row] = await this.db
      .select({
        sku: product.sku,
        stock: sum(stock.quantity),
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .where(eq(product.id, id))
      .groupBy(product.sku)
    return row
  }
  // GET /products/:sku
  async getBySku(sku: string) {
    const [row] = await this.db
      .select({
        sku: product.sku,
        stock: sum(stock.quantity),
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .where(eq(product.sku, sku))
      .groupBy(product.sku)
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
