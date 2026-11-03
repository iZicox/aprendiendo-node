import { Hono } from 'hono'
import {
  create,
  getAll,
  getById,
  getBySku,
  remove,
  update,
} from '../controller/products.controller'
import { requireRole } from '../middleware/auth.middleware'
import type { AuthEnv } from '../../types'

// Lecturas para cualquier usuario autenticado (las necesita para movimientos);
// crear, editar y borrar productos es trabajo de administrador.
export const productsRoutes = new Hono<AuthEnv>()
  .get('/', ...getAll)
  .get('/:id', ...getById)
  .get('/sku/:sku', ...getBySku)
  .post('/', requireRole('admin'), ...create)
  .put('/:id', requireRole('admin'), ...update)
  .delete('/:id', requireRole('admin'), ...remove)
