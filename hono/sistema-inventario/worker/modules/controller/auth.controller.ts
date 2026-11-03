import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createFactory, createMiddleware } from 'hono/factory'

import { ForbiddenError, UnauthorizedError } from '../../lib/errors'
import { Pbkdf2PasswordHasher } from '../../security/pbkdf2-password-hasher'
import type { AuthEnv } from '../../types'
import { RefreshTokenRepository } from '../repository/refreshTokens.repository'
import { UserRepository } from '../repository/user.repository'
import { AuthService, type Session } from '../service/auth.service'
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '../validators'
import { validationHook } from './validation'

const factory = createFactory<AuthEnv>()

// Solo el refresh token va en cookie (httpOnly: el JS no lo puede leer). El
// access token se devuelve en el body y viaja como Bearer.
const REFRESH_COOKIE = 'refresh_token'
const REFRESH_COOKIE_PATH = '/api/auth'

function makeService(d1: D1Database, jwtSecret: string): AuthService {
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET no configurado o demasiado corto')
  }

  const db = drizzle(d1)
  const users = new UserRepository(db)
  const refreshTokens = new RefreshTokenRepository(db)

  return new AuthService(
    users,
    refreshTokens,
    new Pbkdf2PasswordHasher(),
    { jwtSecret },
  )
}

function isSecure(c: Context<AuthEnv>): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

function setRefreshCookie(c: Context<AuthEnv>, session: Session) {
  const secure = isSecure(c)

  setCookie(c, REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: REFRESH_COOKIE_PATH,
    expires: session.refreshExpiresAt,
  })
}

function clearRefreshCookie(c: Context<AuthEnv>) {
  const secure = isSecure(c)

  deleteCookie(c, REFRESH_COOKIE, {
    path: REFRESH_COOKIE_PATH,
    secure,
  })
}

// El registro está cerrado por defecto: solo se abre si la variable
// ALLOW_REGISTRATION='true' (en local, `.dev.vars`; en producción, una var
// temporal que se retira tras el alta del primer administrador).
const registrationEnabled = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.env.ALLOW_REGISTRATION !== 'true') {
    throw new ForbiddenError(
      'Registro deshabilitado. Contacta al administrador',
    )
  }
  await next()
})

export const register = factory.createHandlers(
  registrationEnabled,
  zValidator('json', registerSchema, validationHook),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const user = await makeService(c.env.DB, c.env.JWT_SECRET).register(
      email,
      password,
    )

    return c.json({ user }, 201)
  },
)

export const login = factory.createHandlers(
  zValidator('json', loginSchema, validationHook),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const { user, ...session } = await makeService(
      c.env.DB,
      c.env.JWT_SECRET,
    ).login(email, password)

    setRefreshCookie(c, session)
    return c.json({ user, accessToken: session.accessToken })
  },
)

export const refresh = factory.createHandlers(async (c) => {
  const raw = getCookie(c, REFRESH_COOKIE)
  if (!raw) throw new UnauthorizedError('No hay sesión')

  try {
    const session = await makeService(c.env.DB, c.env.JWT_SECRET).refresh(raw)
    setRefreshCookie(c, session)
    return c.json({ accessToken: session.accessToken })
  } catch (err) {
    clearRefreshCookie(c)
    throw err
  }
})

export const logout = factory.createHandlers(async (c) => {
  await makeService(c.env.DB, c.env.JWT_SECRET).logout(
    getCookie(c, REFRESH_COOKIE),
  )
  clearRefreshCookie(c)
  return c.body(null, 204)
})

export const me = factory.createHandlers(async (c) => {
  const { sub } = c.get('user')
  const user = await makeService(c.env.DB, c.env.JWT_SECRET).getProfile(
    Number(sub),
  )

  return c.json({ user })
})

export const changePassword = factory.createHandlers(
  zValidator('json', changePasswordSchema, validationHook),
  async (c) => {
    const { sub } = c.get('user')
    const { currentPassword, newPassword } = c.req.valid('json')

    await makeService(c.env.DB, c.env.JWT_SECRET).changePassword(
      Number(sub),
      currentPassword,
      newPassword,
    )

    clearRefreshCookie(c)
    return c.body(null, 204)
  },
)

export const logoutAll = factory.createHandlers(async (c) => {
  const { sub } = c.get('user')
  await makeService(c.env.DB, c.env.JWT_SECRET).logoutAll(Number(sub))

  clearRefreshCookie(c)
  return c.body(null, 204)
})
