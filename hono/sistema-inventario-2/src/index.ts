import { Hono } from "hono"
import { AppEnv } from "./lib/types"
import { authRoute } from "./route/auth.route"
import { errorHandler } from "./lib/errors"
import { locationRoute } from "./route/location.route"

const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/auth", authRoute)
  .route("/locations", locationRoute)

  .onError(errorHandler)
  .notFound((c) => c.json({ error: "Ruta no encontrada" }, 404))

export default app
