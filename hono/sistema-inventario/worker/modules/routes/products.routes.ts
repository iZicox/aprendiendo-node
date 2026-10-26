import { Hono } from "hono";
import { create, getAll, getById, getBySku, remove } from "../controller/products.controller";


export const productsRoutes = new Hono<{ Bindings: Env }>()
    .get('/', ...getAll)
    .get('/:id', ...getById)
    .get('/sku/:sku', ...getBySku)
    .post('/', ...create)
    .delete('/:id', ...remove)