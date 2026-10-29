import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createFactory } from 'hono/factory'

import { UnauthorizedError } from '../../lib/errors'
import { BcryptPasswordHasher } from '../../security/bcrypt-password-hasher'
import type { AuthEnv } from '../../types'
import { RefreshTokenRepository } from '../repository/refreshTokens.repository'
import { UserRepository } from '../repository/user.repository'
import {
  ACCESS_TTL_SECONDS,
  AuthService,
  type Session,
} from '../service/auth.service'
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '../validators'
import { validationHook } from './validation'

const factory = createFactory<AuthEnv>()

const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'
const ACCESS_COOKIE_PATH = '/api'
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
    new BcryptPasswordHasher(10),
    { jwtSecret },
  )
}

function isSecure(c: Context<AuthEnv>): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

function setAuthCookies(c: Context<AuthEnv>, session: Session) {
  const secure = isSecure(c)

  setCookie(c, ACCESS_COOKIE, session.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: ACCESS_COOKIE_PATH,
    maxAge: ACCESS_TTL_SECONDS,
  })

  setCookie(c, REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: REFRESH_COOKIE_PATH,
    expires: session.refreshExpiresAt,
  })
}

function clearAuthCookies(c: Context<AuthEnv>) {
  const secure = isSecure(c)

  deleteCookie(c, ACCESS_COOKIE, {
    path: ACCESS_COOKIE_PATH,
    secure,
  })
  deleteCookie(c, REFRESH_COOKIE, {
    path: REFRESH_COOKIE_PATH,
    secure,
  })
}

export const register = factory.createHandlers(
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

    setAuthCookies(c, session)
    return c.json({ user })
  },
)

export const refresh = factory.createHandlers(async (c) => {
  const raw = getCookie(c, REFRESH_COOKIE)
  if (!raw) throw new UnauthorizedError('No hay sesión')

  try {
    const session = await makeService(c.env.DB, c.env.JWT_SECRET).refresh(raw)
    setAuthCookies(c, session)
    return c.json({ ok: true })
  } catch (err) {
    clearAuthCookies(c)
    throw err
  }
})

export const logout = factory.createHandlers(async (c) => {
  await makeService(c.env.DB, c.env.JWT_SECRET).logout(
    getCookie(c, REFRESH_COOKIE),
  )
  clearAuthCookies(c)
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

    clearAuthCookies(c)
    return c.body(null, 204)
  },
)

export const logoutAll = factory.createHandlers(async (c) => {
  const { sub } = c.get('user')
  await makeService(c.env.DB, c.env.JWT_SECRET).logoutAll(Number(sub))

  clearAuthCookies(c)
  return c.body(null, 204)
})
