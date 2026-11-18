import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as productController from "../controller/product.controller"

export const productRoute = new Hono<AppEnv>()
  .post("/", ...productController.create)
  .get("/", ...productController.getAll)
  .get("/:id", ...productController.getById)
  .get("/sku/:sku", ...productController.getBySku)
  .delete("/:id", ...productController.deleteById)
