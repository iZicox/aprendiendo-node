import { location, movementType, product } from "../db/schema"

export type CreateUserInput = {
  email: string
  passwordHash: string
  role?: "admin" | "user"
}

export type Session = {
  token: string
  userId: number
  expiresAt: Date
}

export type User = {
  id?: number
  email: string
  passwordHash?: string
  role: string
}

export type Payload = {
  id: number
  email: string
  role: "admin" | "user"
  exp: number
}

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: { jwtPayload: Payload }
}

/**
 * LOCATION TYPES
 */

export type NewLocation = typeof location.$inferInsert
export type Location = typeof location.$inferSelect

/**
 * MOVEMENT TYPE TYPES
 */
export type NewMovementType = typeof movementType.$inferInsert

/**
 *  PRODUCT TYPES
 */

export type NewProduct = typeof product.$inferInsert

/**
 * STOCK TYPES
 */

export type Pagination = { page: number; pageSize: number }
