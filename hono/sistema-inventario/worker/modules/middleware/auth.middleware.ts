import { drizzle } from 'drizzle-orm/d1'
import { createMiddleware } from 'hono/factory'

import type { UserRole } from '../../db/types'
import { ForbiddenError, UnauthorizedError } from '../../lib/errors'
import type { AuthEnv } from '../../types'
import { UserRepository } from '../repository/user.repository'
import {
  AuthService,
  type AccessTokenPayload,
} from '../service/auth.service'

const BEARER_PATTERN = /^Bearer\s+(.+)$/i

function isValidPayload(payload: unknown): payload is AccessTokenPayload {
  if (!payload || typeof payload !== 'object') return false

  const value = payload as Record<string, unknown>

  return (
    typeof value.sub === 'string' &&
    /^\d+$/.test(value.sub) &&
    (value.role === 'admin' || value.role === 'user') &&
    typeof value.tv === 'number' &&
    typeof value.exp === 'number'
  )
}

// El access token viaja solo en `Authorization: Bearer <jwt>`. No se acepta
// cookie: así la API no depende de cookies y no hay CSRF sobre sus rutas.
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const match = BEARER_PATTERN.exec(c.req.header('Authorization') ?? '')
  if (!match) throw new UnauthorizedError('No autenticado')

  const payload = await AuthService.verifyAccessToken(
    match[1],
    c.env.JWT_SECRET,
  )

  if (!isValidPayload(payload)) {
    throw new UnauthorizedError('Token inválido')
  }

  // Revalidación contra la BD en cada petición: si el usuario ya no existe,
  // cambió su contraseña o cerró sesión en todos los dispositivos (tv
  // distinto), el token deja de valer aunque no haya expirado. El rol que
  // se usa es el actual, no el que llevaba el token.
  const users = new UserRepository(drizzle(c.env.DB))
  const state = await users.findAuthState(Number(payload.sub))

  if (!state || state.tokenVersion !== payload.tv) {
    throw new UnauthorizedError('Token inválido o expirado')
  }

  c.set('user', { ...payload, role: state.role as UserRole })
  await next()
})

export const requireRole = (...roles: UserRole[]) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    const user = c.get('user')

    if (!user) throw new UnauthorizedError('No autenticado')
    if (!roles.includes(user.role)) {
      throw new ForbiddenError('No autorizado')
    }

    await next()
  })
