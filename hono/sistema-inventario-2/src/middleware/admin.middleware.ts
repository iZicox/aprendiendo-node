import { createFactory } from "hono/factory"
import { AppEnv } from "../lib/types"

const factory = createFactory<AppEnv>()
export const adminMiddleware = factory.createMiddleware(
  async (c, next) => {
    // el payload ya se verifico en el middleware anterior
    // aqui solo se verifica su rol
    const payload = c.get("jwtPayload")

    if (payload.role !== "admin") {
      return c.json({ error: "No tienes permisos" }, 403)
    }

    await next()
  },
)
