const API_URL = "http://localhost:8788"

// crear el tipo de la respuesta del /me
export interface User {
  id: number
  email: string
  role: string
  exp: number
}

export async function getUser(accessToken: string): Promise<User | null> {
  let res: Response

  try {
    // peticion
    res = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: { Cookie: `accessToken=${accessToken}` },
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    // captura de error en el fetch
    console.error("[auth] API no disponible o timeout:", err)
    return null
  }

  // captura de error si la respuesta no es un 2xx
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    console.warn(`[auth] /me respondio ${res.status}:`, body)
    return null
  }

  // captura de error si el json no es de tipo User
  try {
    return (await res.json()) as User
  } catch (err) {
    console.error("[auth] respuesta no es JSON valido:", err)
    return null
  }
}
