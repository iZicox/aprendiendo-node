import { Hono } from 'hono'

import type { AuthEnv } from '../../types'
import {
  changePassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} from '../controller/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'

export const authRoutes = new Hono<AuthEnv>()
  .post('/register', ...register)
  .post('/login', ...login)
  .post('/refresh', ...refresh)
  .post('/logout', ...logout)
  .get('/me', authMiddleware, ...me)
  .post('/change-password', authMiddleware, ...changePassword)
  .post('/logout-all', authMiddleware, ...logoutAll)
