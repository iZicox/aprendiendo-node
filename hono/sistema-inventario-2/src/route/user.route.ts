import { Hono } from "hono";
import { AppEnv } from "../lib/types";
import * as usersController from "../controller/user.controller"

export const userRoute = new Hono<AppEnv>()
    .get("/:id", ...usersController.getUserById)
    .get("/:email", ...usersController.getUserByEmail)
    .post("/", ...usersController.createUser)
    .post("/newpassword/:id", ...usersController.updatePassword)
    .post("/role/:id", ...usersController.updateRole)