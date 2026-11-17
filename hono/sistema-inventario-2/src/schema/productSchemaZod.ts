import z from "zod"

export const newProductSchemaBody = z.object({
  sku: z.string().trim().min(1).toUpperCase(),
})
