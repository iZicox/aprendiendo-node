import { Hono } from "hono";
import { AppEnv } from "../lib/types";
import * as authController from "../controller/auth.controller"
import { authMiddleware } from "../middleware/auth.middleware";

export const authRoute = new Hono<AppEnv>()
    .post("/register", ...authController.register)
    .post("/login", ...authController.login)
    .post("/refresh", ...authController.refresh)
    .post("/logout", ...authController.logout)
    .get("/me", authMiddleware, ...authController.me)
