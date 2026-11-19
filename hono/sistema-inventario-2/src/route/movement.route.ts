import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as movementController from "../controller/movement.controller"

export const movementRoute = new Hono<AppEnv>()
  .get("/", ...movementController.getAll)
  .get("/summary-type", ...movementController.summaryByType)
  .get("/transfers/:transferId", ...movementController.getByTransferId)
  .get("/:id", ...movementController.getById)
  .post("/", ...movementController.create)
  .post("/transfers", ...movementController.createTransfer)
