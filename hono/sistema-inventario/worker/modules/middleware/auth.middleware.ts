import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'

import type { UserRole } from '../../db/types'
import { ForbiddenError, UnauthorizedError } from '../../lib/errors'
import type { AuthEnv } from '../../types'
import {
  AuthService,
  type AccessTokenPayload,
} from '../service/auth.service'

const ACCESS_COOKIE = 'access_token'

function isValidPayload(payload: unknown): payload is AccessTokenPayload {
  if (!payload || typeof payload !== 'object') return false

  const value = payload as Record<string, unknown>

  return (
    typeof value.sub === 'string' &&
    /^\d+$/.test(value.sub) &&
    (value.role === 'admin' || value.role === 'user') &&
    typeof value.exp === 'number'
  )
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  const token = bearer ?? getCookie(c, ACCESS_COOKIE)

  if (!token) throw new UnauthorizedError('No autenticado')

  const payload = await AuthService.verifyAccessToken(
    token,
    c.env.JWT_SECRET,
  )

  if (!isValidPayload(payload)) {
    throw new UnauthorizedError('Token inválido')
  }

  c.set('user', payload)
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
