import { drizzle } from "drizzle-orm/d1";
import { createFactory } from "hono/factory";
import { MovementTypeRepository } from "../repository/movementType.repository";
import { MovementTypeService } from "../service/movementType.service";
import { zValidator } from "@hono/zod-validator";
import { codeParamSchema } from "../validators";



const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database) {
    const db = drizzle(d1)
    const repo = new MovementTypeRepository(db)
    return new MovementTypeService(repo)
}

export const getAll = factory.createHandlers(async (c) => {
    return c.json(await makeService(c.env.DB).getAll())
})

export const getByCode = factory.createHandlers(
    zValidator('param', codeParamSchema),
    async (c) => {
        const { code } = c.req.valid('param')
        return c.json(await makeService(c.env.DB).getById(code))
    }
)