import { createFactory } from "hono/factory"
import { AppEnv, Pagination } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { MovementRepository } from "../repository/movement.repository"
import { zValidator } from "@hono/zod-validator"
import {
  idSchemaParam,
  movementSummaryQuerySchema,
  newMovementSchemeBody,
  paginationSchema,
  transferIdSchemeParam,
} from "../schema/globalSchemeZod"
import { NotFoundError } from "../lib/errors"

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

export const getById = factory.createHandlers(
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")

    const result = await makeService(c.env.DB).movementRepo.getById(id)
    if (!result) {
      throw new NotFoundError("Movimiento no encontradoubun")
    }
    return c.json(result)
  },
)

export const getByTransferId = factory.createHandlers(
  zValidator("param", transferIdSchemeParam),
  async (c) => {
    const { transferId } = c.req.valid("param")
    const result = await makeService(c.env.DB).movementRepo.getByTransferId(
      transferId,
    )
    if (!result) {
      throw new NotFoundError("Movimiento no encontrado")
    }
    return c.json(result)
  },
)

export const summaryByType = factory.createHandlers(
  zValidator("query", movementSummaryQuerySchema),
  async (c) => {
    const { from, to } = c.req.valid("query")
    const result = await makeService(c.env.DB).movementRepo.summaryByType(
      from,
      to,
    )
    if (!result) {
      throw new NotFoundError("Movimiento no encontrado")
    }
    return c.json(result)
  },
)

export const create = factory.createHandlers(
  zValidator("json", newMovementSchemeBody),
  async (c) => {
    const body = c.req.valid("json")
  },
)
