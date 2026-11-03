import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import { RateLimitError } from '../../lib/errors'
import type { AuthEnv } from '../../types'

type KeyBuilder = (c: Context<AuthEnv>) => string | Promise<string>

// Cloudflare inyecta la IP real del cliente en este header (y lo pisa si el
// cliente intenta falsificarlo). En `wrangler dev` no existe: todos los
// requests locales comparten la clave "local".
export function clientIp(c: Context<AuthEnv>): string {
  return c.req.header('cf-connecting-ip') ?? 'local'
}

// Clave ruta + IP: cada endpoint tiene su propio contador, así una ráfaga en
// /login no consume el presupuesto de /refresh.
export const pathIpKey: KeyBuilder = (c) => `${c.req.path}|${clientIp(c)}`

// Clave por cuenta (email), para frenar la fuerza bruta aunque el atacante
// cambie de IP. Se lee el body aquí: Hono lo cachea, así que el `zValidator`
// del handler vuelve a leerlo sin problema.
export const accountKey: KeyBuilder = async (c) => {
  let email: unknown

  try {
    const body: unknown = await c.req.json()
    email = (body as { email?: unknown } | null)?.email
  } catch {
    // Body ilegible: que zValidator devuelva el 400; aun así lo contamos,
    // para que un bombardeo de bodies basura también tenga límite.
  }

  const account =
    typeof email === 'string'
      ? email.trim().toLowerCase().slice(0, 254) // 254 = cota práctica de un email
      : 'sin-email'

  return `cuenta|${account}`
}

// Clave por usuario autenticado (o IP si no lo hay). Va montado DESPUÉS de
// `authMiddleware`, por eso `user` está disponible.
export const userKey: KeyBuilder = (c) => {
  const user = c.get('user')
  return user ? `usuario|${user.sub}` : `ip|${clientIp(c)}`
}

/**
 * Middleware que descarta la petición con 429 cuando el binding supera su
 * límite. `retryAfterSeconds` es la ventana del binding (solo puede ser 10
 * o 60) y se usa para la cabecera `Retry-After`.
 */
export const rateLimit = (
  getLimiter: (c: Context<AuthEnv>) => RateLimit,
  makeKey: KeyBuilder,
  retryAfterSeconds: number,
) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const { success } = await getLimiter(c).limit({ key: await makeKey(c) })

    if (!success) throw new RateLimitError(retryAfterSeconds)

    await next()
  })
