import { JWTPayload } from "hono/utils/jwt/types"
import { location, movementType } from "../db/schema"

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

type Role = {}

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: { jwtPayload: JWTPayload }
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
