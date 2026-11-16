import { createFactory } from "hono/factory"
import { AppEnv } from "../lib/types"
import { getCookie } from "hono/cookie"
import { verify } from "hono/jwt"

const factory = createFactory<AppEnv>()

export const authMiddleware = factory.createMiddleware(async (c, next) => {
  // obtener token de la cookie
  const token = getCookie(c, "accessToken")
  if (!token) {
    // salir si no hay token
    return c.json({ error: "no autenticado (middleware)" }, 401)
  }

  try {
    // verificar token obteniendo el payload
    const payload = await verify(token, c.env.JWT_SECRET, "HS256")
    // guardar payload para el siguiente paso
    c.set("jwtPayload", payload)
  } catch {
    // salir si expiro
    return c.json({ error: "token invalido o expirado" }, 401)
  }
  await next()
})
