import { Hono } from 'hono'
import {
  getAll,
  getById,
  getByLocationId,
  getByLocationIdAndProductId,
  getByProductId,
  insert,
} from '../controller/movement.controller'

export const movementRoutes = new Hono<{ Bindings: Env }>()
  .get('/', ...getAll)
  .get('/:id', ...getById)
  .get('/product/:id', ...getByProductId)
  .get('/location/:id', ...getByLocationId)
  .get(
    '/location/:locationId/product/:productId',
    ...getByLocationIdAndProductId,
  )
  .post('/', ...insert)
