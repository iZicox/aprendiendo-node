import type { AccessTokenPayload } from './modules/service/auth.service'

export type AuthEnv = {
  Bindings: Omit<Env, 'ALLOW_REGISTRATION'> & {
    // `wrangler types` tipa esta var como el literal "false" del config, pero
    // en local `.dev.vars` la sobrescribe a "true": en runtime es un string.
    ALLOW_REGISTRATION?: string
  }
  Variables: {
    user: AccessTokenPayload
  }
}
