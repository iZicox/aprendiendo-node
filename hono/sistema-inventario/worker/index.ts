import { Hono } from 'hono'
import { errorHandler } from './lib/errors'
import { movementRoutes } from './modules/routes/movement.routes'
import { movementTypeRoutes } from './modules/routes/movementType.routes'
import { productsRoutes } from './modules/routes/products.routes'
import { locationRoutes } from './modules/routes/location.routes'
import { stockAdminRoutes, stockRoutes } from './modules/routes/stock.routes'

const api = new Hono<{ Bindings: Env }>()
  .basePath('/api')
  .route('/movements', movementRoutes)
  .route('/movement-type', movementTypeRoutes)
  .route('/products', productsRoutes)
  .route('/locations', locationRoutes)
  .route('/stock', stockRoutes)
  .route('/admin/stock', stockAdminRoutes)

api.onError(errorHandler)
api.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))

export default api
export type AppType = typeof api
