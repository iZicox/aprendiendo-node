import z from 'zod'

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive(),
  stock: z.number().int().nonnegative()
})


export const updateProductSchema = createProductSchema.partial()

export const idSchema = z.object({
    id: z.coerce.number().int().positive()
})


