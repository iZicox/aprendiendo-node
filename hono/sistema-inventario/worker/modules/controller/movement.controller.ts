import { drizzle } from 'drizzle-orm/d1'
import { createFactory } from 'hono/factory'
import type { Context } from 'hono'
import { MovementRepository } from '../repository/movement.repository'
import { MovementTypeRepository } from '../repository/movementType.repository'
import { ProductsRepository } from '../repository/products.repository'
import { LocationRepository } from '../repository/location.repository'
import { MovementService } from '../service/movement.service'
import { zValidator } from '@hono/zod-validator'
import {
  createMovementSchema,
  createTransferSchema,
  idempotencyKeySchema,
  idParamSchema,
  locationIdParamSchema,
  locationProductParamSchema,
  paginationQuerySchema,
  productIdParamSchema,
} from '../validators'
import { validationHook } from './validation'
import { BadRequestError } from '../../lib/errors'
import type { IdempotencyContext } from '../../lib/idempotency'
import type { AuthEnv } from '../../types'

const factory = createFactory<AuthEnv>()

function makeService(d1: D1Database): MovementService {
  const db = drizzle(d1)
  const repo = new MovementRepository(db)
  const movementTypeRepo = new MovementTypeRepository(db)
  const productsRepo = new ProductsRepository(db)
  const locationRepo = new LocationRepository(db)
  return new MovementService(repo, movementTypeRepo, productsRepo, locationRepo)
}

// Toda creación exige Idempotency-Key: una llave por operación lógica
// (la misma en los reintentos, otra para un movimiento nuevo).
function readIdempotency(c: Context<AuthEnv>): IdempotencyContext {
  const raw = c.req.header('Idempotency-Key')
  if (!raw) {
    throw new BadRequestError('Falta la cabecera Idempotency-Key')
  }
  const parsed = idempotencyKeySchema.safeParse(raw)
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues[0].message)
  }
  return { userId: Number(c.get('user').sub), key: parsed.data }
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
    const { value: movement, replayed } = await makeService(c.env.DB).insert(
      body,
      readIdempotency(c),
    )
    c.header('Location', `/api/movements/${movement.id}`)
    if (replayed) c.header('Idempotent-Replayed', 'true')
    return c.json(movement, replayed ? 200 : 201)
  },
)

export const transfer = factory.createHandlers(
  zValidator('json', createTransferSchema, validationHook),
  async (c) => {
    const body = c.req.valid('json')
    const { value, replayed } = await makeService(c.env.DB).transfer(
      body,
      readIdempotency(c),
    )
    if (replayed) c.header('Idempotent-Replayed', 'true')
    return c.json(
      {
        transferId: value[0].transferId,
        movements: value,
      },
      replayed ? 200 : 201,
    )
  },
)
