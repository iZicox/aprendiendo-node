import { Hono } from "hono"
import { AppEnv } from "./lib/types"
import { userRoute } from "./route/user.route"

const app = new Hono<AppEnv>()
  .basePath("/api")
  .route("/users", userRoute)

export default app
