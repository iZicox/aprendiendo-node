import { Hono } from 'hono'
import { errorHandler } from './lib/errors'
import { movementTypeRoutes } from './modules/routes/movementType.routes'
import { productsRoutes } from './modules/routes/products.routes'
import { locationRoutes } from './modules/routes/location.routes'

const api = new Hono<{ Bindings: Env }>()
    .basePath('/api')
    .route('/movement-type', movementTypeRoutes)
    .route('/products', productsRoutes)
    .route('/locations', locationRoutes)
// .route('/stock-movements', stockMovementsRoutes)   ← futuros módulos

api.onError(errorHandler)
api.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))

export default api
export type AppType = typeof api