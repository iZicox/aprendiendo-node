import { location, movement, movementOperation, product, users } from './schema'

// LOCATION
export type InsertLocation = typeof location.$inferInsert
export type SelectLocation = typeof location.$inferSelect

// PRODUCT
// tipos de tabla
export type Product = typeof product.$inferSelect
export type NewProduct = typeof product.$inferInsert
export type UpdateProduct = Partial<Omit<NewProduct, 'id'>>

// tipos de resultado
export type FindAllProducts = {
  items: Product[]
  total: number
}

// PAGINATION
export type PaginationQuery = {
  page: number
  pageSize: number
}
// Paginación de productos + búsqueda parcial por SKU.
export type ProductQuery = PaginationQuery & {
  search?: string | undefined
}
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

// MOVEMENT OPERATION (idempotencia)
export type NewMovementOperation = typeof movementOperation.$inferInsert
export type SelectMovementOperation = typeof movementOperation.$inferSelect
export type OperationKind = NonNullable<NewMovementOperation['kind']>

export type FindAllMovements = {
  items: SelectMovement[]
  total: number
}

// Stock
export type StockRow = {
  productId: number
  locationId: number
  sku: string
  locationCode: string
  quantity: number
}

export type StockTotal = {
  total: number
}

export type StockProductTotal = {
  productId: number
  sku: string
  total: number
}

export type StockLocationTotal = {
  locationId: number
  locationCode: string
  total: number
}

export type StockAuditRow = {
  productId: number
  locationId: number
  stockActual: number
  stockCalculado: number
}

export type PageOpts = PaginationQuery & { includeZero?: boolean }

// USER
export type UserRole = (typeof users.$inferSelect)['role']

export type CreateUserInput = {
  email: string
  passwordHash: string
  role?: UserRole
}

export type LoginUser = {
  id: number
  email: string
  passwordHash: string
  role: string
  tokenVersion: string
}

export type RegisterInput = {
  email: string
  password: string
  role?: UserRole
}
