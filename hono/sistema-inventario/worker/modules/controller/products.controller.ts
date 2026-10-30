import { drizzle } from 'drizzle-orm/d1'
import { createFactory } from 'hono/factory'
import { ProductsRepository } from '../repository/products.repository'
import { ProductsService } from '../service/products.service'
import { zValidator } from '@hono/zod-validator'
import {
  createProductSchema,
  idParamSchema,
  productsQuerySchema,
  skuParamSchema,
  updateProductSchema,
} from '../validators'
import { validationHook } from './validation'

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): ProductsService {
  const db = drizzle(d1)
  const repo = new ProductsRepository(db)
  return new ProductsService(repo)
}

export const getAll = factory.createHandlers(
  zValidator('query', productsQuerySchema, validationHook),
  async (c) => {
    return c.json(await makeService(c.env.DB).getAll(c.req.valid('query')))
  },
)

export const getById = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getById(id))
  },
)

export const getBySku = factory.createHandlers(
  zValidator('param', skuParamSchema, validationHook),
  async (c) => {
    const { sku } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getBySku(sku))
  },
)

export const create = factory.createHandlers(
  zValidator('json', createProductSchema, validationHook),
  async (c) => {
    const body = c.req.valid('json')
    const product = await makeService(c.env.DB).create(body)
    c.header('Location', `/api/products/${product.id}`)
    return c.json(product, 201)
  },
)

export const remove = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    await makeService(c.env.DB).remove(id)
    return c.body(null, 204)
  },
)

export const update = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', updateProductSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    return c.json(await makeService(c.env.DB).update(id, body))
  },
)
