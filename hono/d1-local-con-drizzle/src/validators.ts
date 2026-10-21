import z from "zod";

export const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

export const createCategory = z.object({
    name: z.string().trim().min(3)
})

export const updateCategory = z.object({
    name: z.string().trim().min(3).max(50)
})

export const createProductSchema = z.object({
    name: z.string().trim().min(3).max(50),
    details: z.string().trim().min(3).max(200).optional(),
    priceCents: z.coerce.number().int().positive(),
    stock: z.coerce.number().int().nonnegative(),
    categoryId: z.coerce.number().int().positive()
})

export const updateProductScheme = createProductSchema.partial()