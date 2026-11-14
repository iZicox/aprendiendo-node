import { createFactory } from "hono/factory";
import { AppEnv } from "../lib/types";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

const factory = createFactory<AppEnv>()

export const authMiddleware = factory.createMiddleware(async (c, next) => {
    const token = getCookie(c, "token")
    if (!token) {
        return c.json({ error: "no autenticado" }, 401)
    }
})