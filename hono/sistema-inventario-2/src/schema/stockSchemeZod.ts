import z from "zod"
import { idSchema } from "./globalSchemeZod"

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
