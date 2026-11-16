import { createFactory } from "hono/factory"
import { AppEnv } from "../lib/types"
import { getCookie } from "hono/cookie"
import { verify } from "hono/jwt"
import { set } from "zod"

const factory = createFactory<AppEnv>()
export const upadateRoleMiddleware = factory.createMiddleware(
  async (c, next) => {
    const token = getCookie(c, "accessToken")
    if (!token) {
      return c.json({ error: "no autenticado" }, 401)
    }
    try {
      const payload = await verify(token, c.env.JWT_SECRET, "HS256")
      if (payload.role !== "admin") {
        return c.json({ error: "no eres admin" }, 401)
      }
      c.set("jwtPayload", payload)
    } catch {
      return c.json({ error: "token invalido o expirado" })
    }
    await next()
  },
)
