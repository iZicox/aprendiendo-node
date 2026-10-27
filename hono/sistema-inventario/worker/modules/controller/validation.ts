import type { Hook } from '@hono/zod-validator'
import type { Env as HonoEnv } from 'hono'

export const validationHook: Hook<unknown, HonoEnv, string> = (result, c) => {
  if (!result.success) {
    return c.json(
      {
        error: 'Datos de entrada inválidos',
        details: result.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      },
      400,
    )
  }
}
