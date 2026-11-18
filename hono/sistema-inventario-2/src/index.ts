import { Hono } from "hono"
import { AppEnv } from "./lib/types"
import { authRoute } from "./route/auth.route"
import { errorHandler } from "./lib/errors"
import { locationRoute } from "./route/location.route"
import { movementTypeRoute } from "./route/movementType.route"
import { stockRoute } from "./route/stock.route"
import { productRoute } from "./route/product.route"

const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/auth", authRoute)
  .route("/locations", locationRoute)
  .route("/movement-type", movementTypeRoute)
  .route("/stock", stockRoute)
  .route("/products", productRoute)

  .onError(errorHandler)
  .notFound((c) => c.json({ error: "Ruta no encontrada" }, 404))

export default app
