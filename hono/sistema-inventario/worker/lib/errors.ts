import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Errores de negocio: los lanzan los servicios, sin saber nada de HTTP.
export class BadRequestError extends Error {}
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class IllegalMovement extends Error {}

// Traduce cada error a una respuesta HTTP con formato JSON uniforme.
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof BadRequestError) return c.json({ error: err.message }, 400)
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404)
  if (err instanceof ConflictError) return c.json({ error: err.message }, 409)
  if (err instanceof IllegalMovement) return c.json({ error: err.message }, 409)

  // Errores lanzados por Hono o sus middlewares (401, 403...)
  if (err instanceof HTTPException) return err.getResponse()

  // Cualquier otra cosa es un fallo inesperado: se registra y no se expone el detalle.
  console.error(err)
  return c.json({ error: 'Error interno del servidor' }, 500)
}
