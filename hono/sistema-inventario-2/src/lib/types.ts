import { JWTPayload } from "hono/utils/jwt/types"

export type CreateUserInput = {
  email: string
  passwordHash: string
  role?: "admin" | "user"
}

type Role = {}

export type AppEnv = { Bindings: Env, Variables: JWTPayload }
