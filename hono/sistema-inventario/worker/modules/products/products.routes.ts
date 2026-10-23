// worker/modules/products/products.routes.ts
// Controlador: valida la entrada, llama al servicio y responde en HTTP.
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { ProductsRepository } from './products.repository'
import { ProductsService } from './products.service'
import {
    createProductSchema,
    idParamSchema,
    updateProductSchema,
} from './products.schema'

// En Workers el binding solo existe dentro de la petición,
// así que se construye el servicio por petición.
const makeService = (d1: D1Database) =>
    new ProductsService(new ProductsRepository(drizzle(d1)))

// Rutas encadenadas para que AppType conserve los tipos en el cliente.
export const productsRoutes = new Hono<{ Bindings: Env }>()
    .get('/', async (c) => {
        return c.json(await makeService(c.env.DB).getAll())
    })
    .get('/:id', zValidator('param', idParamSchema), async (c) => {
        const { id } = c.req.valid('param')
        return c.json(await makeService(c.env.DB).getById(id))
    })
    .post('/', zValidator('json', createProductSchema), async (c) => {
        const created = await makeService(c.env.DB).create(c.req.valid('json'))
        return c.json(created, 201)
    })
    .put(
        '/:id',
        zValidator('param', idParamSchema),
        zValidator('json', updateProductSchema),
        async (c) => {
            const { id } = c.req.valid('param')
            const updated = await makeService(c.env.DB).update(id, c.req.valid('json'))
            return c.json(updated)
        },
    )
    .delete('/:id', zValidator('param', idParamSchema), async (c) => {
        const { id } = c.req.valid('param')
        await makeService(c.env.DB).remove(id)
        return c.body(null, 204)
    })