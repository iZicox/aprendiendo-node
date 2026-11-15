import { Hono } from "hono"
import { AppEnv } from "./lib/types"
import { userRoute } from "./route/user.route"
import { authMiddleware } from "./middleware/auth.middleware"

const app = new Hono<AppEnv>()
  .basePath("/api")
  .use("/users/*", authMiddleware)
  .route("/users", userRoute)

export default app
