import z from "zod"
import { idSchema } from "./globalSchemeZod"

export const emailSchema = z.email()
export const emailSchemaParam = z.object({ email: emailSchema })

const passwordScheme = z.string().min(8)
const roleShceme = z.enum(["admin", "user"])

export const createUserSchemeBody = z.object({
  email: emailSchema,
  password: passwordScheme,
})

export const loginUserSchemeBody = createUserSchemeBody

export const passwordSchemeBody = z.object({
  oldPassword: passwordScheme,
  newPassword: passwordScheme,
})

export const roleSchemeBody = z.object({
  role: roleShceme,
})

export const updateRoleSchema = z.object({
  userId: idSchema,
  role: roleShceme,
})
