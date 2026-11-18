import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as movementController from "../controller/movement.controller"

export const movementRoute = new Hono<AppEnv>()
  .get("/", ...movementController.getAll)
  .get("/:id", ...movementController.getById)
  .get("/transfers/:transferId", ...movementController.getByTransferId)
  .get("/summary-type", ...movementController.summaryByType)
  .post("/", ...movementController.create)
  .post("/transfers", ...movementController.createTransfer)

