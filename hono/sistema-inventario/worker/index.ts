import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { errorHandler } from './lib/errors'
import {
  authMiddleware,
  requireRole,
} from './modules/middleware/auth.middleware'
import {
  accountKey,
  pathIpKey,
  rateLimit,
  userKey,
} from './modules/middleware/rate-limit.middleware'
import { authRoutes } from './modules/routes/auth.routes'
import { movementRoutes } from './modules/routes/movement.routes'
import { movementTypeRoutes } from './modules/routes/movementType.routes'
import { productsRoutes } from './modules/routes/products.routes'
import { locationRoutes } from './modules/routes/location.routes'
import { stockAdminRoutes, stockRoutes } from './modules/routes/stock.routes'
import type { AuthEnv } from './types'

// Los límites salen de `wrangler.jsonc` → "ratelimits" (el binding solo
// admite ventanas de 10 o 60 segundos, de ahí los segundos de Retry-After).
const authBurstLimit = rateLimit((c) => c.env.RL_AUTH, pathIpKey, 10)
const accountLimit = rateLimit((c) => c.env.RL_ACCOUNT, accountKey, 60)
const apiLimit = rateLimit((c) => c.env.RL_API, userKey, 60)

const api = new Hono<AuthEnv>()
  .basePath('/api')
  // Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff...). Va lo primero:
  // en Hono un `.use()` registrado después de un `.route()` no se ejecuta.
  .use('*', secureHeaders())
  // Públicas: login, refresh y logout usan su propia cookie.
  // El rate limit va ANTES de montar las rutas: en Hono un `.use()`
  // registrado después de un `.route()` no se ejecuta para esa ruta.
  // Solo los endpoints que cuestan CPU (hash) o abren la puerta al brute
  // force: /me, /logout y /logout-all son operaciones baratas.
  .use('/auth/register', authBurstLimit)
  .use('/auth/login', authBurstLimit, accountLimit)
  .use('/auth/refresh', authBurstLimit)
  .use('/auth/change-password', authBurstLimit)
  .route('/auth', authRoutes)
  // A partir de aquí, todo exige un access token válido.
  .use('*', authMiddleware)
  // Uso general de la API, contado por usuario (el `user` ya está fijado).
  .use('*', apiLimit)
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
