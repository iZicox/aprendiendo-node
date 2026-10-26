import { drizzle } from "drizzle-orm/d1";
import { createFactory } from "hono/factory";
import { MovementRepository } from "../repository/movement.repository";
import { MovementService } from "../service/movement.service";


const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database) {
    const db = drizzle(d1)
    const repo = new MovementRepository(db)
    return new MovementService(repo)
}

export const getAll = factory.createHandlers(async (c) => {
    return c.json(await makeService(c.env.DB).getAll())
})