import { Hono } from 'hono'
import {
  getAll,
  getById,
  getByLocationId,
  getByLocationIdAndProductId,
  getByProductId,
  insert,
  transfer,
} from '../controller/movement.controller'

export const movementRoutes = new Hono<{ Bindings: Env }>()
  .get('/', ...getAll)
  .get('/:id', ...getById)
  .get('/products/:productId', ...getByProductId)
  .get('/locations/:locationId', ...getByLocationId)
  .get(
    '/locations/:locationId/products/:productId',
    ...getByLocationIdAndProductId,
  )
  .post('/transfer', ...transfer)
  .post('/', ...insert)
