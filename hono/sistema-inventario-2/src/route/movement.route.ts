import { Hono } from "hono"
import { AppEnv } from "../lib/types"
import * as movementController from "../controller/movement.controller"

export const movementRoute = new Hono<AppEnv>().get(
  "/",
  ...movementController.getAll,
)
