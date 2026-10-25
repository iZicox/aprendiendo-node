import { Hono } from "hono";
import { getAll, getByCode } from "../controller/movementType.controller";



export const movementTypeRoutes = new Hono<{ Bindings: Env }>()
    .get('/', ...getAll)
    .get('/:code', ...getByCode)