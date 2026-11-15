import { JWTPayload } from "hono/utils/jwt/types"

export type CreateUserInput = {
  email: string
  passwordHash: string
  role?: "admin" | "user"
}

export type Session = {
  token: string,
  userId: number,
  expiresAt: Date
}

export type User = {
  id?: number,
  email: string,
  passwordHash?: string,
  role: string
}

export type Payload = {
  id: number,
  email: string,
  role: "admin" | "user"
}

type Role = {}

export type AppEnv = {
  Bindings: Env,
  Variables: { jwtPayload: JWTPayload }
}
