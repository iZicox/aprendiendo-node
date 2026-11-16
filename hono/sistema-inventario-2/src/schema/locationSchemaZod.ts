import z from "zod"
import { codeScheme } from "./globalSchemeZod"

export const codeSchemeParam = z.object({
  code: codeScheme,
})

export const createLocationBodyScheme = z.object({
  code: codeScheme,
})
