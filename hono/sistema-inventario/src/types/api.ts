export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  createdAt: string
}

export interface ApiErrorDetail {
  path: string
  message: string
}

export interface ApiErrorPayload {
  error?: string
  details?: ApiErrorDetail[]
}

export interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
}

export interface Page<T> {
  meta: PageMeta
  items: T[]
}

export interface Product {
  id: number
  sku: string
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: number
  code: string
  createdAt: string
}

export interface MovementType {
  code: string
  description: string
  sign: number
  createdAt: string
}

export interface Movement {
  id: number
  productId: number
  locationId: number
  movementTypeCode: string
  quantity: number
  transferId: string | null
  note: string | null
  createdAt: string
}

export interface StockRow {
  productId: number
  locationId: number
  sku: string
  locationCode: string
  quantity: number
}

export interface StockTotal {
  total: number
}

export interface StockLocationTotal {
  locationId: number
  locationCode: string
  total: number
}

export interface StockProductTotal {
  productId: number
  sku: string
  total: number
}

export interface TransferResponse {
  transferId: string
  movements: [Movement, Movement]
}
