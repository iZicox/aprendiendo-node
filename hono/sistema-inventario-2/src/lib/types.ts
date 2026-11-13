export type CreateUserInput = {
  email: string
  passwordHash: string
  role: string
}

type Role = {}

export type AppEnv = { Bindings: Env }
