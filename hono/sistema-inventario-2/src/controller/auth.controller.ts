import { Context } from "hono"
import { AppEnv, CreateUserInput, Payload, Session } from "../lib/types"
import { sign } from "hono/jwt"
import { RefreshTokensRepository } from "../repository/refreshTokes.repository"
import { createFactory } from "hono/factory"
import { drizzle } from "drizzle-orm/d1"
import { UserRepository } from "../repository/user.repository"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { zValidator } from "@hono/zod-validator"
import {
  createUserSchemeBody,
  loginUserSchemeBody,
  updateRoleSchema,
} from "../schema/userSchemaZod"
import { Hasher } from "../security/Hasher"
import { HasherBcryptImpl } from "../security/HasherBcryptImpl"
import { Pbkdf2PasswordHasher } from "../security/HasherPbkdf2Impl"
import { ConflictError, isUniqueConstraintError } from "../lib/errors"

const ACCESS_DURATION = 60 * 15
const REFRESH_DURATION = 60 * 60 * 24 * 7
const REFRESH_PATH = "/api/auth"

const cookieBase = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict" as const,
}

const now = () => Math.floor(Date.now() / 1000)

const factory = createFactory<AppEnv>()
const hasher: Hasher = new Pbkdf2PasswordHasher() //new HasherBcryptImpl(10)

function makeServices(d1: D1Database) {
  const db = drizzle(d1)
  return {
    userRepo: new UserRepository(db),
    refreshRepo: new RefreshTokensRepository(db),
  }
}

function limpiarCookies(c: Context<AppEnv>) {
  deleteCookie(c, "accessToken", { path: "/" })
  deleteCookie(c, "refreshToken", { path: REFRESH_PATH })
}

type TokenUser = { id: number; email: string; role: "user" | "admin" }

async function generarTokens(c: Context<AppEnv>, user: TokenUser) {
  const payload: Payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: now() + ACCESS_DURATION,
  }
  // crear el access token
  const accessToken = await sign(payload, c.env.JWT_SECRET, "HS256")
  // crear el refresh
  const refreshToken = crypto.randomUUID()
  // insertar el refresh a la base de datos
  const session: Session = {
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date((now() + REFRESH_DURATION) * 1000),
  }
  await makeServices(c.env.DB).refreshRepo.create(session)
  // insertar los tokens en las cookies
  setCookie(c, "accessToken", accessToken, {
    ...cookieBase,
    path: "/",
    maxAge: ACCESS_DURATION,
  })
  setCookie(c, "refreshToken", refreshToken, {
    ...cookieBase,
    path: REFRESH_PATH,
    maxAge: REFRESH_DURATION,
  })
}

// /registro
export const register = factory.createHandlers(
  zValidator("json", createUserSchemeBody),
  async (c) => {
    const { email, password } = c.req.valid("json")
    const { userRepo } = makeServices(c.env.DB)

    if (await userRepo.findByEmail(email)) {
      return c.json({ error: "El usuario ya existe" }, 409)
    }

    const passwordHash = await hasher.hash(password)
    const newUser: CreateUserInput = {
      email: email,
      passwordHash: passwordHash,
      role: "user",
    }

    let user
    try {
      user = await userRepo.createUser(newUser)
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError("El usuario ya existe")
      }
      throw err
    }

    if (!user) {
      return c.json({ error: "error al crear el usuario" }, 500)
    }
    return c.json(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      201,
    )
  },
)

// /login
export const login = factory.createHandlers(
  zValidator("json", loginUserSchemeBody),
  async (c) => {
    const { email, password } = c.req.valid("json")
    const user = await makeServices(c.env.DB).userRepo.findByEmail(email)
    if (!user) {
      return c.json({ error: "credenciales invalidas" }, 401)
    }
    const validPassword = await hasher.compare(password, user.passwordHash)
    if (!validPassword) {
      return c.json({ error: "credenciales invalidas" }, 401)
    }
    await generarTokens(c, user)
    return c.json({ message: "login exitoso" })
  },
)

// refresh
export const refresh = factory.createHandlers(async (c) => {
  // leer cookie refresh
  const refreshToken = getCookie(c, "refreshToken")
  if (!refreshToken) {
    return c.json({ error: "no hay refresh token" }, 401)
  }
  const { userRepo, refreshRepo } = makeServices(c.env.DB)
  // revisar si esta en la base de datos
  const session = await refreshRepo.findByToken(refreshToken)
  if (!session) {
    limpiarCookies(c)
    return c.json(
      { error: "no existe el refresh token en la base de datos" },
      401,
    )
  }
  // rotacion: el refresh usado se elimina siempre
  await refreshRepo.deleteByToken(refreshToken)
  // comprobar que sigue activo
  if (session.expiresAt.getTime() < Date.now()) {
    limpiarCookies(c)
    return c.json({ error: "No autorizado, refresh token caducado" }, 401)
  }

  const user = await userRepo.findById(session.userId)
  if (!user) {
    limpiarCookies(c)
    return c.json({ error: "usuario no encontrado" }, 404)
  }
  // generar tanto el access como el refresh
  // guardar el nuevo refresh en la base de datos
  await generarTokens(c, user)
  // devolver el resultado
  return c.json({ message: "tokens generados" })
})

export const logout = factory.createHandlers(async (c) => {
  const refreshToken = getCookie(c, "refreshToken")
  if (refreshToken) {
    await makeServices(c.env.DB).refreshRepo.deleteByToken(refreshToken)
  }
  limpiarCookies(c)
  return c.json({ message: "sesion cerrada" })
})

export const me = factory.createHandlers(async (c) => {
  const payload = c.get("jwtPayload")
  if (!payload) {
    return c.json({ error: "no autenticado" }, 401)
  }
  return c.json({ ...payload })
})

// cambio de rol
export const updateRole = factory.createHandlers(
  zValidator("json", updateRoleSchema),
  async (c) => {
    const { userId, role } = c.req.valid("json")
    const { userRepo } = makeServices(c.env.DB)
    const user = await userRepo.findById(userId)
    if (!user) {
      return c.json({ error: "usuario no existe" }, 404)
    }
    await userRepo.updateRole(userId, role)
    return c.json({ message: "rol cambiado" })
  },
)
