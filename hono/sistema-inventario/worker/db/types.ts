import {
  createMovementSchema,
  createProductSchema,
  paginationQuerySchema,
  updateProductSchema,
} from '../modules/validators'
import { location, movement, product } from './schema'
import { z } from 'zod'

// LOCATION
export type InsertLocation = typeof location.$inferInsert
export type SelectLocation = typeof location.$inferSelect

// PRODUCT
// tipos de tabla
export type Product = typeof product.$inferSelect
export type NewProduct = typeof product.$inferInsert
export type UpdateProduct = Partial<Omit<NewProduct, 'id'>>

// para el body de post y put
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>

// tipos de resultado
export type FindAllProducts = {
  items: Product[]
  total: number
}

// PAGINATION
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type Page<T> = {
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
  }
  items: T[]
}

// MOVEMENT
export type NewMovement = typeof movement.$inferInsert
export type SelectMovement = typeof movement.$inferSelect
export type MovementSign = 1 | -1

// para el body de post
export type CreateMovementInput = z.infer<typeof createMovementSchema>

// Stock
export type StockRow = {
  sku: string
  ubicacionCode: string
  total: number
}

export type StockProductTotal = {
  sku: string
  total: number
}

export type StockProductTotalWithId = StockProductTotal & {
  id: number
}

export type StockLocationTotal = {
  id: number
  ubicacionCode: string
  total: number
}

export type StockAuditRow = {
  productId: number
  locationId: number
  stockActual: number
  stockCalculado: number
}

export type PageOpts = PaginationQuery & { includeZero?: boolean }
