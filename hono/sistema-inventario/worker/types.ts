import type { AccessTokenPayload } from './modules/service/auth.service'

export type AuthEnv = {
  Bindings: Env
  Variables: {
    user: AccessTokenPayload
  }
}
