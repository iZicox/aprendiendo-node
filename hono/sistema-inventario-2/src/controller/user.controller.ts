import { drizzle } from "drizzle-orm/d1"
import { createFactory } from "hono/factory"
import { UserRepository } from "../repository/user.repository"
import { AppEnv, CreateUserInput } from "../lib/types"
import { zValidator } from "@hono/zod-validator"
import {
  createUserSchemeBody,
  emailSchemaParam,
  idSchemaParam,
  passwordSchemeBody,
  roleSchemeBody,
} from "../schema/userSchemaZod"
import bcrypt from "bcryptjs"

const factory = createFactory<AppEnv>()

function makeService(d1: D1Database) {
  const db = drizzle(d1)
  const repo = new UserRepository(db)
  return repo
}

export const getUserById = factory.createHandlers(
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")
    if (!id) {
      return c.json({ error: "campo del id vacio" }, 400)
    }
    const user = await makeService(c.env.DB).findById(id)
    if (!user) {
      return c.json({ error: "Usuario no encontrado" }, 404)
    }
    return c.json(user)
  },
)

export const getUserByEmail = factory.createHandlers(
  zValidator("json", emailSchemaParam),
  async (c) => {
    const { email } = c.req.valid("json")
    if (!email) {
      return c.json({ error: "email vacio" })
    }
    const user = await makeService(c.env.DB).findByEmail(email)
    if (!user) {
      return c.json({ error: "usuario no existe" }, 404)
    }
    return c.json(user)
  },
)

export const createUser = factory.createHandlers(
  zValidator("json", createUserSchemeBody),
  async (c) => {
    const { email, password, role } = c.req.valid("json")
    if (!email || !password) {
      return c.json({ error: "email o contraseña vacio" })
    }
    const passwordHash = bcrypt.hashSync(password, 10)
    const newUser: CreateUserInput = {
      email: email,
      passwordHash: passwordHash,
      role: role ?? "user",
    }
    const user = await makeService(c.env.DB).createUser(newUser)
    return c.json(user)
  },
)

export const updatePassword = factory.createHandlers(
  zValidator("json", passwordSchemeBody),
  zValidator("param", idSchemaParam),
  async (c) => {
    const { id } = c.req.valid("param")
    const { oldPassword, newPassword } = c.req.valid("json")

    if (!id) {
      return c.json({ error: "el id no existe" }, 400)
    }

    if (!oldPassword || !newPassword) {
      return c.json({ error: "contraseña vacia" }, 400)
    }

    const user = await makeService(c.env.DB).findById(id)

    if (!user) {
      return c.json({ error: "usuario no existe" }, 404)
    }

    const samePassword = await bcrypt.compare(oldPassword, user.passwordHash)

    if (!samePassword) {
      return c.json({ error: "la contraseña antigua no coincide" }, 400)
    }

    const passwordUpdated = await makeService(c.env.DB).updatePassword(newPassword, id)

    if (!passwordUpdated) {
      return c.json({ error: "error al actualizar la contraseña" }, 400)
    }

    return c.json({ message: "contraseña actualizada" })

  }
)

export const updateRole = factory.createHandlers(
  zValidator("param", idSchemaParam),
  zValidator("json", roleSchemeBody),
  async (c) => {
    const { id } = c.req.valid("param")
    const { role } = c.req.valid("json")

    if (!id) {
      return c.json({ error: "el id esta vacio" }, 400)
    }

    if (!role) {
      return c.json({ error: "el role esta vacio" }, 400)
    }

    const user = await makeService(c.env.DB).findById(id)

    if (!user) {
      return c.json({ error: "usuario no encontrado" }, 404)
    }

    const roleUpdated = await makeService(c.env.DB).updateRole(role, id)

    if (!roleUpdated) {
      return c.json({ error: "error en actualizar el rol" })
    }

    return c.json({ messague: "rol actualizado" })
  }
)