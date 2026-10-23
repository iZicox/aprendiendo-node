import { Hono } from 'hono'
import { errorHandler } from './lib/errors'
import { productsRoutes } from './modules/products/products.routes'

const api = new Hono<{ Bindings: Env }>()
    .basePath('/api')
    .route('/products', productsRoutes)
// .route('/stock-movements', stockMovementsRoutes)   ← futuros módulos

api.onError(errorHandler)
api.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404))

export default api
export type AppType = typeof api