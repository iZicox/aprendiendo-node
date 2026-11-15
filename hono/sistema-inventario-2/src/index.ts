import { Hono } from "hono"
import { AppEnv } from "./lib/types"
import { authRoute } from "./route/auth.route"

const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/auth", authRoute)

export default app
