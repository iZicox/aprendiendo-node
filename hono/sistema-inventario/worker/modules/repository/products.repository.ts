import { count, eq, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { movement, product, stock } from '../../db/schema'
import { toOffset } from '../../lib/pagination'
import type {
  FindAllProducts,
  NewProduct,
  Product,
  ProductQuery,
  UpdateProduct,
} from '../../db/types'

export class ProductsRepository {
  private db: DrizzleD1Database

  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  // `search` hace coincidencia parcial por SKU (ya normalizado a mayúsculas
  // por el validador). instr() evita el problema de % y _ de LIKE.
  // Coincidencias exactas y por prefijo se ordenan antes que las internas.
  async findAll(query: ProductQuery): Promise<FindAllProducts> {
    const search = query.search?.trim() || undefined
    const where = search ? sql`instr(${product.sku}, ${search}) > 0` : undefined

    const itemsQuery = this.db.select().from(product).where(where)
    const orderedQuery = search
      ? itemsQuery.orderBy(
          sql`case
            when ${product.sku} = ${search} then 0
            when substr(${product.sku}, 1, ${search.length}) = ${search} then 1
            else 2
          end`,
          product.sku,
        )
      : itemsQuery.orderBy(product.id)

    const [items, [{ total }]] = await this.db.batch([
      orderedQuery.limit(query.pageSize).offset(toOffset(query)),
      this.db.select({ total: count() }).from(product).where(where),
    ])
    return { items, total }
  }

  async findById(id: number): Promise<Product | undefined> {
    const [row] = await this.db
      .select()
      .from(product)
      .where(eq(product.id, id))
      .limit(1)
    return row
  }

  async findBySku(sku: string): Promise<Product | undefined> {
    const [row] = await this.db
      .select()
      .from(product)
      .where(eq(product.sku, sku))
      .limit(1)
    return row
  }

  async create(data: NewProduct): Promise<Product> {
    const [row] = await this.db.insert(product).values(data).returning()
    return row
  }

  async update(id: number, data: UpdateProduct): Promise<Product> {
    const [row] = await this.db
      .update(product)
      .set({ ...data, updatedAt: sql`(datetime('now'))` })
      .where(eq(product.id, id))
      .returning()
    return row
  }

  async hasMovements(id: number): Promise<boolean> {
    const [row] = await this.db
      .select({ total: count() })
      .from(movement)
      .where(eq(movement.productId, id))
    return row.total > 0
  }

  // batch = ejecución atómica en D1 (no se usa BEGIN TRANSACTION).
  async delete(id: number): Promise<Product | undefined> {
    const [, [row]] = await this.db.batch([
      this.db.delete(stock).where(eq(stock.productId, id)),
      this.db.delete(product).where(eq(product.id, id)).returning(),
    ])
    return row
  }
}
