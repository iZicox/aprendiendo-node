declare global {
  namespace App {
    interface Locals {
      user: {
        id: number // ID del usuario
        email: string // Email con el que inició sesión
        role: string // Rol: "user", "admin"...
        exp: number // Caducidad del token en timestamp Unix (segundos)
      } | null
    }
  }
}
