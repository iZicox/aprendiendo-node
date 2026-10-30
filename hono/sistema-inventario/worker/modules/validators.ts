// worker/modules/validators.ts
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
const CODE_PATTERN = /^[A-Z0-9._-]+$/
const CODE_MESSAGE =
  'Solo se permiten letras, números, punto, guion y guion bajo'
const NOTE_MAX_LENGTH = 500

// universal string code schema upper case
export const codeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(50)
    .regex(CODE_PATTERN, CODE_MESSAGE),
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
// El SKU se normaliza: sin espacios en los extremos y en mayúsculas.
const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, 'El SKU es obligatorio')
  .max(50)
  .regex(CODE_PATTERN, CODE_MESSAGE)

// Crear
export const createProductSchema = z.object({
  sku: skuSchema,
})

// actualizar
export const updateProductSchema = createProductSchema

// sku product
export const skuParamSchema = z.object({
  sku: skuSchema,
})

// Listado de productos con búsqueda opcional por SKU (parcial, sin mayúsculas obligatorias).
export const productsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().toUpperCase().max(50).optional(),
})

/**
 * Validador de la cabecera Idempotency-Key
 * Lógica: una llave = una operación lógica. Debe ser única por reintento,
 * distinta para cada operación nueva (p. ej. crypto.randomUUID()).
 */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, 'La Idempotency-Key debe tener al menos 8 caracteres')
  .max(100, 'La Idempotency-Key no puede superar los 100 caracteres')
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    'La Idempotency-Key solo admite letras, números, punto, guion, guion bajo y dos puntos',
  )

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>

/**
 * Validadores para Location
 */

export const createLocationSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(50)
    .regex(CODE_PATTERN, CODE_MESSAGE),
})

/**
 * Validadores para Movement
 */

export const locationProductParamSchema = z.object({
  locationId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
})

// El signo ya no viaja en el body: se obtiene del catálogo movement_type.
export const createMovementSchema = z.object({
  productId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive(),
  movementTypeCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(50)
    .regex(CODE_PATTERN, CODE_MESSAGE),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).optional(),
})

// Las transferencias se crean siempre en pareja (OUT + IN) y de forma atómica.
export const createTransferSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    fromLocationId: z.coerce.number().int().positive(),
    toLocationId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    transferId: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(50)
      .regex(CODE_PATTERN, CODE_MESSAGE)
      .optional(),
    note: z.string().trim().min(1).max(NOTE_MAX_LENGTH).optional(),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: 'La ubicación de origen y destino deben ser diferentes',
    path: ['toLocationId'],
  })

export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type CreateTransferInput = z.infer<typeof createTransferSchema>

/**
 * Validadores para Stock
 */

export const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
})

export const locationIdParamSchema = z.object({
  locationId: z.coerce.number().int().positive(),
})

export const stockPaginationQuerySchema = paginationQuerySchema.extend({
  includeZero: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

/**
 * Validadores para la autenticacion
 */
// El límite de bcrypt es en bytes UTF-8, no en caracteres.
const registerPasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    'La contraseña no puede superar los 72 bytes en UTF-8',
  )

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email no válido'),
  password: registerPasswordSchema,
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: registerPasswordSchema,
})
