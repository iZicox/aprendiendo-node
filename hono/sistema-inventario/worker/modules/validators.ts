// worker/modules/products/products.schema.ts
// Validación de entrada con Zod (no confundir con las tablas de Drizzle,
// que viven en worker/db/schema.ts).
import { z } from 'zod'

/**
 * Esquemas de utilidad
 */

// id entero
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
// universal string code schema upper case
export const codeParamSchema = z.object({
  code: z.string().trim().min(1).toUpperCase(),
})

/**
 * Validadores para Paginacion en los parametros del Get
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Validadores para Productos
 */
// Crear
export const createProductSchema = z.object({
  // El SKU se normaliza: sin espacios en los extremos y en mayúsculas.
  sku: z.string().trim().min(1, 'El SKU es obligatorio').max(50).toUpperCase(),
})

// actualizar
export const updateProductSchema = createProductSchema

// sku product
export const skuParamSchema = createProductSchema

/**
 * Validadores para Location
 */

export const createLocationSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
})

/**
 * Validadores para Movement
 */

export const locationProductParamSchema = z.object({
  locationId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
})

export const createMovementSchema = z.object({
  productId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive(),
  movementTypeCode: z.string().trim().min(1).toUpperCase(),
  quantity: z.coerce.number().int().positive(),
  transferId: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).optional(),
  sign: z.union([z.literal(1), z.literal(-1)]),
})
