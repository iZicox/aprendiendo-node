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
} from '../validators'

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): MovementService {
  const db = drizzle(d1)
  const repo = new MovementRepository(db)
  const movementTypeRepo = new MovementTypeRepository(db)
  return new MovementService(repo, movementTypeRepo)
}

export const getAll = factory.createHandlers(async (c) => {
  return c.json(await makeService(c.env.DB).getAll())
})

export const getById = factory.createHandlers(
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getById(id))
  },
)

export const getByProductId = factory.createHandlers(
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getByProductId(id))
  },
)

export const getByLocationId = factory.createHandlers(
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getByLocationId(id))
  },
)

export const getByLocationIdAndProductId = factory.createHandlers(
  zValidator('param', locationProductParamSchema),
  async (c) => {
    const { locationId, productId } = c.req.valid('param')
    return c.json(
      await makeService(c.env.DB).getByLocationIdAndProductId(
        locationId,
        productId,
      ),
    )
  },
)

export const insert = factory.createHandlers(
  zValidator('json', createMovementSchema),
  async (c) => {
    const { sign, ...movement } = c.req.valid('json')
    return c.json(await makeService(c.env.DB).insert(movement, sign))
  },
)
