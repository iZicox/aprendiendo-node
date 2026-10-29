import { Hono } from 'hono'
import { errorHandler } from './lib/errors'
import {
  authMiddleware,
  requireRole,
} from './modules/middleware/auth.middleware'
import { authRoutes } from './modules/routes/auth.routes'
import { movementRoutes } from './modules/routes/movement.routes'
import { movementTypeRoutes } from './modules/routes/movementType.routes'
import { productsRoutes } from './modules/routes/products.routes'
import { locationRoutes } from './modules/routes/location.routes'
import { stockAdminRoutes, stockRoutes } from './modules/routes/stock.routes'
import type { AuthEnv } from './types'

const api = new Hono<AuthEnv>()
  .basePath('/api')
  // Públicas: login, refresh y logout usan su propia cookie.
  .route('/auth', authRoutes)
  // A partir de aquí, todo exige un access token válido.
  .use('*', authMiddleware)
  // Solo administradores.
  .use('/admin/*', requireRole('admin'))
  .route('/movements', movementRoutes)
  .route('/movement-types', movementTypeRoutes)
  .route('/products', productsRoutes)
  .route('/locations', locationRoutes)
  .route('/stock', stockRoutes)
  .route('/admin/stock', stockAdminRoutes)

api.onError(errorHandler)
api.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))

export default api
export type AppType = typeof api
