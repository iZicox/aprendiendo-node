import z from "zod"
import { codeScheme } from "./globalSchemeZod"
import { sign } from "hono/jwt"

export const createMovementTypeBodyScheme = z.object({
  code: codeScheme,
  description: z.string().trim().min(1),
  sign: z.coerce.number().refine((v) => v === 1 || v === -1, {
    message: "sign debe ser 1 o -1",
  }),
})

export const updateMovementTypeBodyScheme = z.object({
  description: z.string().trim().min(1),
})
