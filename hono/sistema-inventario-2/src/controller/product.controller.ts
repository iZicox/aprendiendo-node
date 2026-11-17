import { createFactory } from "hono/factory"
import { AppEnv, NewProduct } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { ProductRepository } from "../repository/product.repository"
import { zValidator } from "@hono/zod-validator"
import { newProductSchemaBody } from "../schema/productSchemaZod"
import { product } from "../db/schema"

const factory = createFactory<AppEnv>()
const makeService = (d1: D1Database) => {
  const db = drizzle(d1)
  return {
    productRepo: new ProductRepository(db),
  }
}
export const create = factory.createHandlers(
  zValidator("json", newProductSchemaBody),
  async (c) => {
    const { sku } = c.req.valid("json")
    const newProduct = await makeService(c.env.DB).productRepo.create({ sku })
    return c.json(newProduct, 201)
  },
)
export const getAll = factory.createHandlers(async (c) => {
  //const result = await makeService(c.env.DB).productRepo.getAll()
})
