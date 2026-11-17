import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as stockController from "../controller/stock.controller"

export const stockRoute = new Hono<AppEnv>()

  .get("/", ...stockController.getAll)
  .get("/total", ...stockController.getTotal)
  .get("/by-product", ...stockController.getTotalsByProduct)
  .get("/by-location", ...stockController.getTotalsByLocation)
  .get("/products/:productId", ...stockController.getByProduct)
  .get("/products/:productId/total", ...stockController.getProductTotal)
  .get("/locations/:locationId", ...stockController.getByLocation)
  .get("/locations/:locationId/total", ...stockController.getLocationTotal)
  .get(
    "/locations/:locationId/products/:productId",
    ...stockController.getProductInLocation,
  )
  .get("/sku/:sku", ...stockController.getBySku)
