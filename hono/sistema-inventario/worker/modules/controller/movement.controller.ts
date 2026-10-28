import { drizzle } from 'drizzle-orm/d1'
import { createFactory } from 'hono/factory'
import { MovementRepository } from '../repository/movement.repository'
import { MovementTypeRepository } from '../repository/movementType.repository'
import { ProductsRepository } from '../repository/products.repository'
import { LocationRepository } from '../repository/location.repository'
import { MovementService } from '../service/movement.service'
import { zValidator } from '@hono/zod-validator'
import {
  createMovementSchema,
  createTransferSchema,
  idParamSchema,
  locationIdParamSchema,
  locationProductParamSchema,
  paginationQuerySchema,
  productIdParamSchema,
} from '../validators'
import { validationHook } from './validation'

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): MovementService {
  const db = drizzle(d1)
  const repo = new MovementRepository(db)
  const movementTypeRepo = new MovementTypeRepository(db)
  const productsRepo = new ProductsRepository(db)
  const locationRepo = new LocationRepository(db)
  return new MovementService(repo, movementTypeRepo, productsRepo, locationRepo)
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
  zValidator('param', productIdParamSchema, validationHook),
  zValidator('query', paginationQuerySchema, validationHook),
  async (c) => {
    const { productId } = c.req.valid('param')
    const query = c.req.valid('query')
    return c.json(await makeService(c.env.DB).getByProductId(productId, query))
  },
)

export const getByLocationId = factory.createHandlers(
  zValidator('param', locationIdParamSchema, validationHook),
  zValidator('query', paginationQuerySchema, validationHook),
  async (c) => {
    const { locationId } = c.req.valid('param')
    const query = c.req.valid('query')
    return c.json(
      await makeService(c.env.DB).getByLocationId(locationId, query),
    )
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
    const body = c.req.valid('json')
    const movement = await makeService(c.env.DB).insert(body)
    c.header('Location', `/api/movements/${movement.id}`)
    return c.json(movement, 201)
  },
)

export const transfer = factory.createHandlers(
  zValidator('json', createTransferSchema, validationHook),
  async (c) => {
    const body = c.req.valid('json')
    const [outMovement, inMovement] = await makeService(c.env.DB).transfer(body)
    return c.json(
      {
        transferId: outMovement.transferId,
        movements: [outMovement, inMovement],
      },
      201,
    )
  },
)
