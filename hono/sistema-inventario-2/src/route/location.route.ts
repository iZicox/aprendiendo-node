import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as locationController from "../controller/location.controller"
import { authMiddleware } from "../middleware/auth.middleware"

export const locationRoute = new Hono<AppEnv>()
  .use(authMiddleware)
  .post("/", ...locationController.create)
  .get("/", ...locationController.getAll)
  .get("/:id", ...locationController.getById)
  .get("/code/:code", ...locationController.getByCode)
  .delete("/:id", ...locationController.deleteById)
