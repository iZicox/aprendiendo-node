import { ErrorHandler } from "hono"

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class InsufficientStockError extends ConflictError {
  constructor(available: number, requested: number) {
    super(
      `Stock insuficiente: disponible ${available}, solicitado ${requested}`,
    )
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
  if (err instanceof ConflictError) return c.json({ error: err.message }, 409)

  console.error(err)
  return c.json({ error: "Error interno del servidor" }, 500)
}

const dbErrorMessage = (err: unknown): string =>
  (err as any)?.cause?.message ?? (err as any)?.message ?? ""

export const isUniqueConstraintError = (err: unknown) =>
  dbErrorMessage(err).includes("UNIQUE constraint failed")

export const isForeignKeyError = (err: unknown) =>
  dbErrorMessage(err).includes("FOREIGN KEY constraint failed")

export const isCheckConstraintError = (err: unknown) =>
  dbErrorMessage(err).includes("CHECK constraint failed")
