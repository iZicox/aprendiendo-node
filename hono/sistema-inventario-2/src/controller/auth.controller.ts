import { Context } from "hono"
import { AppEnv, CreateUserInput, Session, User } from "../lib/types"
import { sign, verify } from "hono/jwt"
import { RefreshTokensRepository } from "../repository/refreshTokes.repository"
import { createFactory } from "hono/factory"
import { drizzle } from "drizzle-orm/d1"
import { UserRepository } from "../repository/user.repository"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { zValidator } from "@hono/zod-validator"
import { createUserSchemeBody, loginUserSchemeBody } from "../schema/userSchemaZod"
import { Hasher } from "../security/Hasher"
import { HasherBcryptImpl } from "../security/HasherBcryptImpl"

const ACCESS_DURATION = 60 * 15
const REFRESH_DURATION = 60 * 60 * 24 * 7
const REFRESH_PATH = "/api/auth"

const cookieBase = {
    httpOnly: true,
    secure: true,
    sameSite: "Strict" as const
}

const now = () => Math.floor(Date.now() / 1000)

const factory = createFactory<AppEnv>()
const hasher: Hasher = new HasherBcryptImpl(10)

function makeServices(d1: D1Database) {
    const db = drizzle(d1)
    return {
        userRepo: new UserRepository(db),
        refreshRepo: new RefreshTokensRepository(db),
    }
}

async function generarTokens(c: Context<AppEnv>, user: User) {
    // revisar que el usuario tenga id
    if (!user.id) return c.json({ error: "id vacio" })
    // crear el access token
    const accessToken = await sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
            exp: now() + ACCESS_DURATION
        },
        c.env.JWT_SECRET,
        "HS256"
    )
    // crear el refresh
    const refreshToken = crypto.randomUUID()
    // insertar el refresh a la base de datos
    const session: Session = {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date((now() + REFRESH_DURATION) * 1000)
    }
    await makeServices(c.env.DB).refreshRepo.create(session)
    // insertar los tokens en las cookies
    setCookie(c, "accessToken", accessToken, { ...cookieBase, path: "/", maxAge: ACCESS_DURATION })
    setCookie(c, "refreshToken", refreshToken, { ...cookieBase, path: REFRESH_PATH, maxAge: REFRESH_DURATION })
}

// /registro
export const register = factory.createHandlers(zValidator("json", createUserSchemeBody), async (c) => {
    const { email, password } = c.req.valid("json")
    if (await makeServices(c.env.DB).userRepo.findByEmail(email)) {
        return c.json({ error: "el usuario ya existe" }, 409)
    }


    const passwordHash = hasher.hash(password)
    const newUser: CreateUserInput = {
        email: email,
        passwordHash: passwordHash,
        role: "user"
    }
    const user = await makeServices(c.env.DB).userRepo.createUser(newUser)
    if (!user) {
        return c.json({ error: "error al crear el usuario" }, 500)
    }
    return c.json({
        id: user.id,
        email: user.email,
        role: user.role
    })

})

// /login
export const login = factory.createHandlers(zValidator("json", loginUserSchemeBody), async (c) => {
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
})

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
    deleteCookie(c, "accessToken", { path: "/" })
    deleteCookie(c, "refreshToken", { path: REFRESH_PATH })
    if (!session) {
        return c.json({ error: "no existe el refresh token en la base de datos" }, 401)
    }
    await refreshRepo.deleteByToken(refreshToken)
    // comprobar que sigue activo 
    if (session.expiresAt.getTime() < Date.now()) {
        return c.json({ error: "No autorizado, refresh token caducado" }, 401)
    }
    // de seguir activo hacer la rotacion de tokens

    const user = await userRepo.findById(session.userId)
    if (!user) {
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
    if (!refreshToken) {
        return c.json({ error: "cookies vacias" }, 400)
    }
    const session = await makeServices(c.env.DB).refreshRepo.findByToken(refreshToken)
    if (session) {
        await makeServices(c.env.DB).refreshRepo.deleteByToken(refreshToken)
    }
    deleteCookie(c, "refreshToken", { path: REFRESH_PATH })
    deleteCookie(c, "accessToken", { path: "/" })
    return c.json({ message: "sesion cerrada" })
})
