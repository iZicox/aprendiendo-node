import { DrizzleD1Database } from "drizzle-orm/d1";
import { movement, stock } from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";

export type newMovement = typeof movement.$inferInsert

export class MovementRepository {

    private db: DrizzleD1Database

    constructor(db: DrizzleD1Database) {
        this.db = db
    }

    findAll() {
        return this.db
            .select()
            .from(movement)
            .orderBy(movement.createdAt)
    }

    findById(id: number) {
        return this.db
            .select()
            .from(movement)
            .where(eq(movement.id, id))
            .orderBy(movement.createdAt)
    }

    findByProductId(id: number) {
        return this.db
            .select()
            .from(movement)
            .where(eq(movement.productId, id))
            .orderBy(movement.createdAt)
    }

    findByLocationId(id: number) {
        return this.db
            .select()
            .from(movement)
            .where(eq(movement.locationId, id))
            .orderBy(movement.createdAt)
    }

    findByLocationIdAndProductId(locationId: number, productId: number) {
        return this.db
            .select()
            .from(movement)
            .where(
                and(
                    eq(movement.locationId, locationId),
                    eq(movement.productId, productId)
                )
            )
    }

    async insert(data: newMovement, sign: number) {
        // insertar movimiento
        const insertMovement = this.db
            .insert(movement)
            .values(data)
            .returning()

        // confirmar que la fila en stock exista
        const ensureStock = this.db
            .insert(stock)
            .values({ productId: data.productId, locationId: data.locationId })
            .onConflictDoNothing()

        // actualizar stock
        const updateStock = this.db
            .update(stock)
            .set({ quantity: sql`${stock.quantity} + (${data.quantity} * ${sign})`, updatedAt: sql`datetime('now')` })
            .where(
                and(
                    eq(stock.locationId, data.locationId),
                    eq(stock.productId, data.productId)
                )
            )

        const [rows] = await this.db.batch([insertMovement, ensureStock, updateStock])

        return rows[0]
    }
}