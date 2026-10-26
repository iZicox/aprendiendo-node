import { Hono } from 'hono'
import * as location from '../controller/location.controller'

export const locationRoutes = new Hono<{ Bindings: Env }>()
  .get('/', ...location.getAll)
  .get('/:id', ...location.getById)
  .post('/', ...location.create)
  .delete('/:id', ...location.deleteById)
