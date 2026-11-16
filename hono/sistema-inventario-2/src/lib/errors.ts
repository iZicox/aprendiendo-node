import { ErrorHandler } from "hono"

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
  if (err instanceof ConflictError) return c.json({ error: err.message }, 409)

  console.error(err)
  return c.json({ error: "Error interno del servidor" }, 500)
}

export const isUniqueConstraintError = (err: unknown): boolean => {
  const msg = (err as any)?.cause?.message ?? (err as any)?.message ?? ""
  return msg.includes("UNIQUE constraint failed")
}

export const isForeignKeyError = (err: unknown) => {
  const msg = (err as any)?.cause?.message ?? (err as any)?.message ?? ""
  return msg.includes("FOREIGN KEY constraint failed")
}
