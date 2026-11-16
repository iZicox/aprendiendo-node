import { createFactory } from "hono/factory"
import { AppEnv, NewLocation } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { LocationRepository } from "../repository/location.repository"
import { zValidator } from "@hono/zod-validator"
import {
  codeSchemeParam,
  createLocationBodyScheme,
} from "../schema/locationSchemaZod"
import {
  ConflictError,
  isForeignKeyError,
  isUniqueConstraintError,
  NotFoundError,
} from "../lib/errors"
import { idSchemaParam } from "../schema/globalSchemeZod"

const factory = createFactory<AppEnv>()

const makeServices = (d1: D1Database) => {
  const db = drizzle(d1)
  return { locationRepo: new LocationRepository(db) }
}

export const create = factory.createHandlers(
  zValidator("json", createLocationBodyScheme),
  async (c) => {
    const { code } = c.req.valid("json")
    const newLocation: NewLocation = { code: code }
    try {
      const row = await makeServices(c.env.DB).locationRepo.create(newLocation)
      return c.json(row, 201)
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError(`Ya existe una ubicacion con el codigo ${code}`)
      }
      throw err
    }
  },
)

export const getAll = factory.createHandlers(async (c) => {
  const rows = await makeServices(c.env.DB).locationRepo.getAll()
  return c.json(rows)
})

export const getById = factory.createHandlers(
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")
    const row = await makeServices(c.env.DB).locationRepo.getById(id)
    if (!row) {
      throw new NotFoundError("No existe la ubicacion")
    }
    return c.json(row)
  },
)

export const getByCode = factory.createHandlers(
  zValidator("param", codeSchemeParam),
  async (c) => {
    const { code } = c.req.valid("param")
    const row = await makeServices(c.env.DB).locationRepo.getByCode(code)
    if (!row) {
      throw new NotFoundError("No existe la ubicacion")
    }
    return c.json(row)
  },
)

export const deleteById = factory.createHandlers(
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")
    const { locationRepo } = await makeServices(c.env.DB)
    const row = await locationRepo.getById(id)
    if (!row) {
      throw new NotFoundError("Ubicacion no existe")
    }
    try {
      await locationRepo.delete(id)
      return c.json({ message: "Ubicacion eliminada" })
    } catch (err) {
      if (isForeignKeyError(err)) {
        throw new ConflictError(
          "No se puede eliminar: la ubicación tiene movimientos o stock",
        )
      }
      throw err
    }
  },
)
