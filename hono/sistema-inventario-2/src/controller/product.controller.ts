import { createFactory } from "hono/factory"
import { AppEnv } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { ProductRepository } from "../repository/product.repository"
import { zValidator } from "@hono/zod-validator"
import {
  newProductSchemaBody,
  paginationSchema,
  skuParam,
} from "../schema/globalSchemeZod"
import { idSchemaParam } from "../schema/globalSchemeZod"
import { ConflictError, isForeignKeyError, NotFoundError } from "../lib/errors"

const factory = createFactory<AppEnv>()
const makeService = (d1: D1Database) => {
  const db = drizzle(d1)
  return {
    productRepo: new ProductRepository(db),
  }
}
// POST /products
export const create = factory.createHandlers(
  zValidator("json", newProductSchemaBody),
  async (c) => {
    const { sku } = c.req.valid("json")
    const newProduct = await makeService(c.env.DB).productRepo.create({ sku })
    return c.json(newProduct, 201)
  },
)
// GET /products
export const getAll = factory.createHandlers(
  zValidator("query", paginationSchema),
  async (c) => {
    const { page, pageSize } = c.req.valid("query")
    const result = await makeService(c.env.DB).productRepo.getAll({
      page,
      pageSize,
    })
    return c.json(result)
  },
)
// GET /product/:id
export const getById = factory.createHandlers(
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")
    const result = await makeService(c.env.DB).productRepo.getById(id)
    if (!result) {
      throw new NotFoundError("Producto no encontrado")
    }
    return c.json(result)
  },
)
// GET /products/:sku
export const getBySku = factory.createHandlers(
  zValidator("param", skuParam),
  async (c) => {
    const { sku } = c.req.valid("param")
    const result = await makeService(c.env.DB).productRepo.getBySku(sku)
    if (!result) {
      throw new NotFoundError("Producto no encontrado")
    }
    return c.json(result)
  },
)
export const deleteById = factory.createHandlers(
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")
    const { productRepo } = makeService(c.env.DB)

    const existing = await productRepo.getById(id)
    if (!existing) {
      throw new NotFoundError("Producto no existe")
    }

    try {
      await productRepo.deleteById(id)
    } catch (err) {
      if (isForeignKeyError(err)) {
        throw new ConflictError("El producto tiene movimientos")
      }
      throw err
    }

    return c.body(null, 204)
  },
)
