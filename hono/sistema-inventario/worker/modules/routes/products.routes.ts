import { Hono } from "hono";
import { create, getAll, getById, remove } from "../controller/products.controller";


export const productsRoutes = new Hono<{ Bindings: Env }>()
    .get('/', ...getAll)
    .get('/:id', ...getById)
    .post('/', ...create)
    .delete('/:id', ...remove)