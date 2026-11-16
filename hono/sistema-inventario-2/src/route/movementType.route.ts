import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as movementTypeController from "../controller/movementType.controller"
import { authMiddleware } from "../middleware/auth.middleware"

export const movementTypeRoute = new Hono<AppEnv>()
  .use(authMiddleware)
  .post("/", ...movementTypeController.create)
  .get("/", ...movementTypeController.getAll)
  .get("/code/:code", ...movementTypeController.getByCode)
  .delete("/code/:code", ...movementTypeController.deleteByCode)
  .patch("/code/:code", ...movementTypeController.update)
