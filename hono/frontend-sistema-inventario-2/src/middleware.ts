import { defineMiddleware } from "astro:middleware"
import { getUser } from "./lib/auth"

export const onRequest = defineMiddleware(async (context, next) => {
  // obtener el path
  const { pathname } = context.url
  // obtener el access token
  const accessToken = context.cookies.get("accessToken")?.value

  // obtener el usaurio con /me usando las cookies
  const user = accessToken ? await getUser(accessToken) : null

  context.locals.user = user
  context.locals.isLoggedIn = user !== null

  console.log(`[middleware] ${pathname} → ${user ? user.email : "sin sesión"}`)

  if (pathname.startsWith("/dashboard") && !user) {
    return context.redirect("/login")
  }

  return next()
})
