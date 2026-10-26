// worker/modules/products/products.schema.ts
// Validación de entrada con Zod (no confundir con las tablas de Drizzle,
// que viven en worker/db/schema.ts).
import { z } from 'zod'

// universal int id schema
export const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})
// universal string code schema upper case
export const codeParamSchema = z.object({
    code: z.string().trim().min(1).toUpperCase()
})

// product validations
export const createProductSchema = z.object({
    // El SKU se normaliza: sin espacios en los extremos y en mayúsculas.
    sku: z.string().trim().min(1, 'El SKU es obligatorio').max(50).toUpperCase(),
})

// Por ahora el producto solo tiene SKU, así que actualizar = mismo esquema.
export const updateProductSchema = createProductSchema

// sku product
export const skuParamSchema = createProductSchema

// list products param
/*
export const listProductsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
})
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
*/

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>