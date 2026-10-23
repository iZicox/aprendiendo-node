// worker/modules/products/products.schema.ts
// Validación de entrada con Zod (no confundir con las tablas de Drizzle,
// que viven en worker/db/schema.ts).
import { z } from 'zod'

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export const createProductSchema = z.object({
    // El SKU se normaliza: sin espacios en los extremos y en mayúsculas.
    sku: z.string().trim().min(1, 'El SKU es obligatorio').max(50).toUpperCase(),
})

// Por ahora el producto solo tiene SKU, así que actualizar = mismo esquema.
export const updateProductSchema = createProductSchema

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>