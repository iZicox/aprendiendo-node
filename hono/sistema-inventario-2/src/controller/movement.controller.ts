import { createFactory } from "hono/factory"
import { AppEnv, Pagination } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { MovementRepository } from "../repository/movement.repository"
import { zValidator } from "@hono/zod-validator"
import { paginationSchema } from "../schema/globalSchemeZod"

const factory = createFactory<AppEnv>()
const makeService = (d1: D1Database) => {
  const db = drizzle(d1)
  return {
    movementRepo: new MovementRepository(db),
  }
}

export const getAll = factory.createHandlers(
  zValidator("query", paginationSchema),
  async (c) => {
    const opts: Pagination = c.req.valid("query")
    const { movementRepo } = makeService(c.env.DB)
    const result = await movementRepo.getAll(opts)
    return c.json(result)
  },
)
