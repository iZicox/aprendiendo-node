import { createFactory } from 'hono/factory'
import { LocationService } from '../service/location.service'
import { drizzle } from 'drizzle-orm/d1'
import { LocationRepository } from '../repository/location.repository'
import { zValidator } from '@hono/zod-validator'
import { createLocationSchema, idParamSchema } from '../validators'
import { validationHook } from './validation'

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): LocationService {
  const db = drizzle(d1)
  const repo = new LocationRepository(db)
  return new LocationService(repo)
}

export const getAll = factory.createHandlers(async (c) => {
  return c.json(await makeService(c.env.DB).getAll())
})

export const getById = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getById(id))
  },
)

export const create = factory.createHandlers(
  zValidator('json', createLocationSchema, validationHook),
  async (c) => {
    const body = c.req.valid('json')
    const location = await makeService(c.env.DB).create(body)
    c.header('Location', `/api/locations/${location.id}`)
    return c.json(location, 201)
  },
)

export const deleteById = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    await makeService(c.env.DB).delete(id)
    return c.body(null, 204)
  },
)
