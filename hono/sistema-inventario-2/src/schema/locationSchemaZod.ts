import z from "zod"

const codeScheme = z.string().trim().min(1).toUpperCase()

export const codeSchemeParam = z.object({
  code: codeScheme,
})

export const createLocationBodyScheme = z.object({
  code: codeScheme,
})
