import { createFactory } from "hono/factory"
import { AppEnv } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { MovementTypeRepository } from "../repository/movementType.repository"
import { zValidator } from "@hono/zod-validator"
import {
  createMovementTypeBodyScheme,
  updateMovementTypeBodyScheme,
} from "../schema/movementTypeSchemeZod"
import {
  ConflictError,
  isForeignKeyError,
  isUniqueConstraintError,
  NotFoundError,
} from "../lib/errors"
import { codeSchemeParam } from "../schema/locationSchemaZod"
import { idSchemaParam } from "../schema/globalSchemeZod"

const factory = createFactory<AppEnv>()

const makeServices = (d1: D1Database) => {
  const db = drizzle(d1)
  return { movementTypeRepo: new MovementTypeRepository(db) }
}

export const create = factory.createHandlers(
  zValidator("json", createMovementTypeBodyScheme),
  async (c) => {
    const { code, description, sign } = c.req.valid("json")

    try {
      const row = await makeServices(c.env.DB).movementTypeRepo.create({
        code: code,
        description: description,
        sign: sign,
      })
      return c.json(row, 201)
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError(
          `Ya existe un tipo de movimiento con el código ${code}`,
        )
      }
      throw err
    }
  },
)

export const getAll = factory.createHandlers(async (c) => {
  const rows = await makeServices(c.env.DB).movementTypeRepo.getAll()
  return c.json(rows)
})

export const getByCode = factory.createHandlers(
  zValidator("param", codeSchemeParam),
  async (c) => {
    const { code } = c.req.valid("param")
    const row = await makeServices(c.env.DB).movementTypeRepo.getByCode(code)
    if (!row) {
      throw new NotFoundError("Tipo de movimiento no encontrado")
    }
    return c.json(row)
  },
)

export const deleteByCode = factory.createHandlers(
  zValidator("param", codeSchemeParam),
  async (c) => {
    const { code } = c.req.valid("param")
    try {
      const row = await makeServices(c.env.DB).movementTypeRepo.delete(code)
      if (!row) {
        throw new NotFoundError("Movimiento no encontrado")
      }
      return c.json({ messaje: "Eliminado correctamente" })
    } catch (err) {
      if (isForeignKeyError(err)) {
        throw new ConflictError(
          `No se puede eliminar: hay movimientos con el tipo ${code}`,
        )
      }
      throw err
    }
  },
)

export const update = factory.createHandlers(
  zValidator("param", codeSchemeParam),
  zValidator("json", updateMovementTypeBodyScheme),
  async (c) => {
    const { code } = c.req.valid("param")
    const { description } = c.req.valid("json")
    const row = await makeServices(c.env.DB).movementTypeRepo.update(
      description,
      code,
    )
    if (!row) {
      throw new NotFoundError("Movimiento no encontrado")
    }
    return c.json({ message: "Movimiento actualizado" })
  },
)
