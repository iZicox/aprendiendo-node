import { drizzle } from "drizzle-orm/d1";
import { createFactory } from "hono/factory";
import { ProductsRepository } from "../repository/products.repository";
import { ProductsService } from "../service/products.service";
import { createProductSchema, idParamSchema, paginationQuerySchema, skuParamSchema, updateProductSchema } from "../validators";
import { zValidator } from "@hono/zod-validator";

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): ProductsService {
    const db = drizzle(d1)
    const repo = new ProductsRepository(db)
    return new ProductsService(repo)
}

export const getAll = factory.createHandlers(zValidator('query', paginationQuerySchema), async (c) => {
    return c.json(await makeService(c.env.DB).getAll(c.req.valid('query')))
})

export const getById = factory.createHandlers(zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getById(id))
})

export const getBySku = factory.createHandlers(zValidator('param', skuParamSchema), async (c) => {
    const { sku } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getBySku(sku))
})

export const create = factory.createHandlers(zValidator('json', createProductSchema), async (c) => {
    const body = c.req.valid('json')
    return c.json(await makeService(c.env.DB).create(body))
})

export const remove = factory.createHandlers(zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param')
    await makeService(c.env.DB).remove(id)
    return c.body(null, 204)
})

export const update = factory.createHandlers(zValidator('param', idParamSchema), zValidator('json', updateProductSchema),
    async (c) => {
        const { id } = c.req.valid('param')
        const body = c.req.valid('json')
        return c.json(await makeService(c.env.DB).update(id, body))
    }
)