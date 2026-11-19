import { createFactory } from "hono/factory"
import { AppEnv, Pagination } from "../lib/types"
import { drizzle } from "drizzle-orm/d1"
import { MovementRepository } from "../repository/movement.repository"
import { zValidator } from "@hono/zod-validator"
import {
  idSchemaParam,
  movementSummaryQuerySchema,
  newMovementSchemeBody,
  newTransferSchemeBody,
  paginationSchema,
  transferIdSchemeParam,
  TransferMovement,
} from "../schema/globalSchemeZod"
import {
  InsufficientStockError,
  isCheckConstraintError,
  isForeignKeyError,
  NotFoundError,
} from "../lib/errors"
import { StockRepository } from "../repository/stock.repository"
import { MovementTypeRepository } from "../repository/movementType.repository"

const factory = createFactory<AppEnv>()
const makeService = (d1: D1Database) => {
  const db = drizzle(d1)
  return {
    movementRepo: new MovementRepository(db),
    stockRepo: new StockRepository(db),
    movementTypeRepo: new MovementTypeRepository(db),
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
    const body = c.req.valid("json") // guarda el body
    // crear los repositorios
    const { movementRepo, movementTypeRepo, stockRepo } = makeService(c.env.DB)
    // obtener le tipo y el stock
    const [type, stock] = await Promise.all([
      movementTypeRepo.getByCode(body.typeCode),
      stockRepo.getProductInLocation(body.productId, body.locationId),
    ])
    // lanzar error si no encontro el tipo de movimiento
    if (!type) throw new NotFoundError("Tipo de movimiento no encontrado")
    // sacar el disponible
    const available = stock?.quantity ?? 0
    // revisar que al hacer la resta no sea negativo
    if (type.sign < 0 && available < body.quantity) {
      // lanzar el error
      throw new InsufficientStockError(available, body.quantity)
    }
    try {
      // crear el movimiento
      const result = await movementRepo.create(body, type.sign)
      return c.json(result)
    } catch (err) {
      // controlar el error si hay un error
      if (isCheckConstraintError(err)) {
        throw new InsufficientStockError(available, body.quantity)
      }
      if (isForeignKeyError(err)) {
        throw new NotFoundError("Producto o ubicacion no existe")
      }
      throw err
    }
  },
)

export const createTransfer = factory.createHandlers(
  zValidator("json", newTransferSchemeBody),
  async (c) => {
    const body: TransferMovement = c.req.valid("json") // guardar body
    const { movementRepo, stockRepo } = makeService(c.env.DB) // crear repositorios

    if (
      !(await stockRepo.getProductInLocation(
        body.productId,
        body.fromLocationId,
      ))
    ) {
      throw new NotFoundError("El producto o ubicacion no existe")
    }
    // sacar stock disponible
    const stock = await stockRepo.getProductInLocation(
      body.productId,
      body.fromLocationId,
    )
    const available = stock?.quantity ?? 0
    // verificar que el stock no termine en negativo
    if (available < body.quantity) {
      throw new InsufficientStockError(available, body.quantity)
    }

    try {
      const result = await movementRepo.createTransfer(body)
      return c.json(result, 201)
    } catch (err) {
      if (isCheckConstraintError(err))
        throw new InsufficientStockError(available, body.quantity)
      if (isForeignKeyError(err))
        throw new NotFoundError("Producto o ubicacion no existe")
      throw err
    }
  },
)
