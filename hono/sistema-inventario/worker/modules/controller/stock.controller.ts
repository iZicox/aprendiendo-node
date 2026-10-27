import { drizzle } from 'drizzle-orm/d1'
import { createFactory } from 'hono/factory'
import { LocationRepository } from '../repository/location.repository'
import { StockRepository } from '../repository/stock.repository'
import { StockService } from '../service/stock.service'
import { zValidator } from '@hono/zod-validator'
import {
  locationIdParamSchema,
  locationProductParamSchema,
  paginationQuerySchema,
  productIdParamSchema,
  skuParamSchema,
  stockPaginationQuerySchema,
} from '../validators'

const factory = createFactory<{ Bindings: Env }>()

function makeService(d1: D1Database): StockService {
  const db = drizzle(d1)
  const repo = new StockRepository(db)
  const locationRepo = new LocationRepository(db)
  return new StockService(repo, locationRepo)
}

export const getTotal = factory.createHandlers(async (c) => {
  return c.json(await makeService(c.env.DB).getTotal())
})

export const getProductTotal = factory.createHandlers(
  zValidator('param', productIdParamSchema),
  async (c) => {
    const { productId } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getProductTotal(productId))
  },
)

export const getLocationTotal = factory.createHandlers(
  zValidator('param', locationIdParamSchema),
  async (c) => {
    const { locationId } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getLocationTotal(locationId))
  },
)

export const getProductInLocation = factory.createHandlers(
  zValidator('param', locationProductParamSchema),
  async (c) => {
    const { locationId, productId } = c.req.valid('param')
    return c.json(
      await makeService(c.env.DB).getProductInLocation(productId, locationId),
    )
  },
)

export const getSummary = factory.createHandlers(
  zValidator('query', stockPaginationQuerySchema),
  async (c) => {
    return c.json(await makeService(c.env.DB).getSummary(c.req.valid('query')))
  },
)

export const getLocationSummary = factory.createHandlers(
  zValidator('param', locationIdParamSchema),
  zValidator('query', stockPaginationQuerySchema),
  async (c) => {
    const { locationId } = c.req.valid('param')
    return c.json(
      await makeService(c.env.DB).getLocationSummary(
        locationId,
        c.req.valid('query'),
      ),
    )
  },
)

export const getTotalsByProduct = factory.createHandlers(
  zValidator('query', paginationQuerySchema),
  async (c) => {
    return c.json(
      await makeService(c.env.DB).getTotalsByProduct(c.req.valid('query')),
    )
  },
)

export const getTotalsByLocation = factory.createHandlers(async (c) => {
  return c.json(await makeService(c.env.DB).getTotalsByLocation())
})

export const getOutOfStock = factory.createHandlers(
  zValidator('query', paginationQuerySchema),
  async (c) => {
    return c.json(
      await makeService(c.env.DB).getOutOfStock(c.req.valid('query')),
    )
  },
)

export const getBySku = factory.createHandlers(
  zValidator('param', skuParamSchema),
  async (c) => {
    const { sku } = c.req.valid('param')
    return c.json(await makeService(c.env.DB).getBySku(sku))
  },
)

export const getAudit = factory.createHandlers(async (c) => {
  return c.json(await makeService(c.env.DB).getAudit())
})
