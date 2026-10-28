import { Hono } from 'hono'
import {
  getAudit,
  getByProductId,
  getBySku,
  getLocationSummary,
  getLocationTotal,
  getOutOfStock,
  getProductInLocation,
  getProductTotal,
  getSummary,
  getTotal,
  getTotalsByLocation,
  getTotalsByProduct,
} from '../controller/stock.controller'

export const stockRoutes = new Hono<{ Bindings: Env }>()
  .get('/', ...getSummary)
  .get('/total', ...getTotal)
  .get('/products/:productId/total', ...getProductTotal)
  .get('/products/:productId', ...getByProductId)
  .get('/locations/:locationId/total', ...getLocationTotal)
  .get('/locations/:locationId/products/:productId', ...getProductInLocation)
  .get('/locations/:locationId', ...getLocationSummary)
  .get('/by-product', ...getTotalsByProduct)
  .get('/by-location', ...getTotalsByLocation)
  .get('/out-of-stock', ...getOutOfStock)
  .get('/sku/:sku', ...getBySku)

export const stockAdminRoutes = new Hono<{ Bindings: Env }>().get(
  '/audit',
  ...getAudit,
)
