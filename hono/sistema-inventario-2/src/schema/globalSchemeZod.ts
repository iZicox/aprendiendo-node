import z from "zod"

/**
 * GLOBAL SCHEMES
 */
export const idSchema = z.coerce.number().int().positive()
export const idSchemaParam = z.object({ id: idSchema })
export const codeScheme = z.string().trim().min(1).toUpperCase()

/**
 * USER SCHEMES
 */
export const emailSchema = z.email()
export const emailSchemaParam = z.object({ email: emailSchema })

const passwordScheme = z.string().min(8)
const roleShceme = z.enum(["admin", "user"])

export const createUserSchemeBody = z.object({
  email: emailSchema,
  password: passwordScheme,
})

export const loginUserSchemeBody = createUserSchemeBody

export const passwordSchemeBody = z.object({
  oldPassword: passwordScheme,
  newPassword: passwordScheme,
})

export const roleSchemeBody = z.object({
  role: roleShceme,
})

export const updateRoleSchema = z.object({
  userId: idSchema,
  role: roleShceme,
})

/**
 * LOCATIONS SCHEMES
 */
export const codeSchemeParam = z.object({
  code: codeScheme,
})

export const createLocationBodyScheme = z.object({
  code: codeScheme,
})

/**
 * MOVEMENT TYPE SCHEMES
 */
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

/**
 * PRODUCT SCHEMES
 */

export const newProductSchemaBody = z.object({
  sku: z.string().trim().min(1).toUpperCase(),
})

/**
 * STOCK SCHEMES
 */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v)

export const paginationSchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).default(20),
  ),
})

export const locationIdSchemeParam = z.object({
  locationId: idSchema,
})
export const productIdSchemeParam = z.object({
  productId: idSchema,
})
export const productInLocationParam = locationIdSchemeParam.extend(
  productIdSchemeParam.shape,
)
export const skuParam = z.object({
  sku: z.string().trim().min(1).toUpperCase(),
})
