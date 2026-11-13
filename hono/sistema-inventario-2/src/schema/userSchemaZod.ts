import z from "zod"

export const idSchema = z.coerce.number().int().positive()
export const idSchemaParam = z.object({ id: idSchema })

export const emailSchema = z.email()
export const emailSchemaParam = z.object({ email: emailSchema })

const passwordScheme = z.string().min(8)
const roleShceme = z.enum(["admin", "user"])

export const createUserSchemeBody = z.object({
  email: emailSchema,
  password: passwordScheme,
  role: roleShceme,
})

export const passwordSchemeBody = z.object({
  password: passwordScheme,
})

export const roleSchemeBody = z.object({
  role: roleShceme,
})
