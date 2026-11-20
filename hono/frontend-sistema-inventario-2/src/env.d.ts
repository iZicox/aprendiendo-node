import type { User } from "./lib/auth"
declare global {
  namespace App {
    interface Locals {
      isLoggedIn: boolean
      user: User | null
    }
  }
}
export {}
