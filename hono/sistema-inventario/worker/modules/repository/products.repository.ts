import { count, eq, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { movement, product, stock } from '../../db/schema'
import { PaginationQuery, toOffset } from '../../lib/pagination'

export type Product = typeof product.$inferSelect
export type NewProduct = typeof product.$inferInsert
export type ProductWithStock = Product & { totalStock: number }

const productSelect = {
    id: product.id,
    sku: product.sku,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
}

export class ProductsRepository {
    private db: DrizzleD1Database

    constructor(db: DrizzleD1Database) {
        this.db = db
    }

    async findAll(query: PaginationQuery) {
        const [ items, [ { total } ] ] = await this.db.batch([
            this.db
                .select(productSelect)
                .from(product)
                .orderBy(product.id)
                .limit(query.pageSize)
                .offset(toOffset(query)),
            this.db
                .select({ total: count() }).from(product)
        ])
        return { items, total}
    }

    async findById(id: number) {
        const [row] = await this.db
            .select(productSelect)
            .from(product)
            .where(eq(product.id, id))
            .limit(1)
        return row
    }

    async findBySku(sku: string) {
        const [row] = await this.db
            .select()
            .from(product)
            .where(eq(product.sku, sku))
            .limit(1)
        return row
    }

    async create(data: NewProduct) {
        const [row] = await this.db.insert(product).values(data).returning()
        return row
    }

    async update(id: number, data: NewProduct) {
        const [row] = await this.db
            .update(product)
            .set({ ...data, updatedAt: sql`(datetime('now'))` })
            .where(eq(product.id, id))
            .returning()
        return row
    }

    async hasMovements(id: number) {
        const [row] = await this.db
            .select({ total: count() })
            .from(movement)
            .where(eq(movement.productId, id))
        return row.total > 0
    }

    // batch = ejecución atómica en D1 (no se usa BEGIN TRANSACTION).
    async delete(id: number) {
        await this.db.batch([
            this.db.delete(stock).where(eq(stock.productId, id)),
            this.db.delete(product).where(eq(product.id, id)),
        ])
    }
}