import { Hono } from 'hono'
import * as location from '../controller/location.controller'
import { requireRole } from '../middleware/auth.middleware'
import type { AuthEnv } from '../../types'

// Sedes: lectura para todos, alta y baja solo para administrador.
export const locationRoutes = new Hono<AuthEnv>()
  .get('/', ...location.getAll)
  .get('/:id', ...location.getById)
  .post('/', requireRole('admin'), ...location.create)
  .delete('/:id', requireRole('admin'), ...location.deleteById)
