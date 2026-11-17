import { createFactory } from "hono/factory"
import { AppEnv } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { StockRepository } from "../repository/stock.repository"
import { zValidator } from "@hono/zod-validator"
import {
  locationIdSchemeParam,
  paginationSchema,
  productIdSchemeParam,
  productInLocationParam,
  skuParam,
} from "../schema/stockSchemeZod"
import { NotFoundError } from "../lib/errors"
import { LocationRepository } from "../repository/location.repository"
import { ProductRepository } from "../repository/product.repository"

const factory = createFactory<AppEnv>()

const makeServices = (d1: D1Database) => {
  const db = drizzle(d1)
  return {
    stockRepo: new StockRepository(db),
    locationRepo: new LocationRepository(db),
    productRepo: new ProductRepository(db),
  }
}

export const getAll = factory.createHandlers(
  zValidator("query", paginationSchema),
  async (c) => {
    const { page, pageSize } = c.req.valid("query")
    const { stockRepo } = await makeServices(c.env.DB)
    const result = await stockRepo.getAll({ page: page, pageSize: pageSize })
    return c.json(result)
  },
)

export const getTotal = factory.createHandlers(async (c) => {
  const total = await makeServices(c.env.DB).stockRepo.getTotal()
  return c.json({ total })
})

export const getTotalsByProduct = factory.createHandlers(
  zValidator("query", paginationSchema),
  async (c) => {
    console.log("entro")
    const { page, pageSize } = c.req.valid("query")
    const result = await makeServices(c.env.DB).stockRepo.getTotalsByProduct({
      page: page,
      pageSize: pageSize,
    })
    console.log("consulta")
    return c.json(result)
  },
)

export const getTotalsByLocation = factory.createHandlers(async (c) => {
  const result = await makeServices(c.env.DB).stockRepo.getTotalsByLocation()
  return c.json(result)
})

export const getByProduct = factory.createHandlers(
  zValidator("param", productIdSchemeParam),
  async (c) => {
    const { productId } = c.req.valid("param")
    const { stockRepo, productRepo } = await makeServices(c.env.DB)
    const productExist = await productRepo.getById(productId)
    if (!productExist) {
      throw new NotFoundError("Producto no existe")
    }
    const result = await stockRepo.getByProduct(productId)
    return c.json(result)
  },
)

export const getProductTotal = factory.createHandlers(
  zValidator("param", productIdSchemeParam),
  async (c) => {
    const { productId } = c.req.valid("param")
    const result = await makeServices(c.env.DB).stockRepo.getProductTotal(
      productId,
    )
    if (!result) {
      throw new NotFoundError("Producto no encontrado")
    }
    return c.json(result)
  },
)

export const getByLocation = factory.createHandlers(
  zValidator("param", locationIdSchemeParam),
  zValidator("query", paginationSchema),
  async (c) => {
    const { locationId } = c.req.valid("param")
    const { stockRepo, locationRepo } = await makeServices(c.env.DB)
    const locationExist = await locationRepo.getById(locationId)
    if (!locationExist) {
      throw new NotFoundError("Ubicacion no encontrada")
    }
    const opts = c.req.valid("query")
    const result = await stockRepo.getByLocation(locationId, opts)
    return c.json(result)
  },
)

export const getLocationTotal = factory.createHandlers(
  zValidator("param", locationIdSchemeParam),
  async (c) => {
    const { locationId } = c.req.valid("param")
    const result = await makeServices(c.env.DB).stockRepo.getLocationTotal(
      locationId,
    )
    if (!result) {
      throw new NotFoundError("Ubicacion no encontrada")
    }
    return c.json(result)
  },
)

export const getProductInLocation = factory.createHandlers(
  zValidator("param", productInLocationParam),
  async (c) => {
    const { locationId, productId } = c.req.valid("param")
    const result = await makeServices(c.env.DB).stockRepo.getProductInLocation(
      productId,
      locationId,
    )
    return c.json(result)
  },
)

export const getBySku = factory.createHandlers(
  zValidator("param", skuParam),
  async (c) => {
    const { sku } = c.req.valid("param")
    const result = await makeServices(c.env.DB).stockRepo.getBySku(sku)
    return c.json(result)
  },
)
