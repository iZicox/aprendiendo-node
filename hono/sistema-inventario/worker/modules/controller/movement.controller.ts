import { drizzle } from 'drizzle-orm/d1'
import { createFactory } from 'hono/factory'
import { MovementRepository } from '../repository/movement.repository'
import { MovementTypeRepository } from '../repository/movementType.repository'
import { MovementService } from '../service/movement.service'
import { zValidator } from '@hono/zod-validator'
import {
  createMovementSchema,
  idParamSchema,
  locationProductParamSchema,
  paginationQuerySchema,
} from '../validators'
import { validationHook } from './validation'

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): MovementService {
  const db = drizzle(d1)
  const repo = new MovementRepository(db)
  const movementTypeRepo = new MovementTypeRepository(db)
  return new MovementService(repo, movementTypeRepo)
}

export const getAll = factory.createHandlers(
  zValidator('query', paginationQuerySchema, validationHook),
  async (c) => {
    const query = c.req.valid('query')
    return c.json(await makeService(c.env.DB).getAll(query))
  },
)

export const getById = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getById(id))
  },
)

export const getByProductId = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  zValidator('query', paginationQuerySchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    const query = c.req.valid('query')
    return c.json(await makeService(c.env.DB).getByProductId(id, query))
  },
)

export const getByLocationId = factory.createHandlers(
  zValidator('param', idParamSchema, validationHook),
  zValidator('query', paginationQuerySchema, validationHook),
  async (c) => {
    const { id } = c.req.valid('param')
    const query = c.req.valid('query')
    return c.json(await makeService(c.env.DB).getByLocationId(id, query))
  },
)

export const getByLocationIdAndProductId = factory.createHandlers(
  zValidator('param', locationProductParamSchema, validationHook),
  zValidator('query', paginationQuerySchema, validationHook),
  async (c) => {
    const { locationId, productId } = c.req.valid('param')
    const query = c.req.valid('query')
    return c.json(
      await makeService(c.env.DB).getByLocationIdAndProductId(
        locationId,
        productId,
        query,
      ),
    )
  },
)

export const insert = factory.createHandlers(
  zValidator('json', createMovementSchema, validationHook),
  async (c) => {
    const { sign, ...movement } = c.req.valid('json')
    return c.json(await makeService(c.env.DB).insert(movement, sign))
  },
)
