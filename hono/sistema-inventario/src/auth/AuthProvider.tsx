import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiRequest, AUTH_EXPIRED_EVENT, refreshSession } from '../lib/api'
import type { AuthUser } from '../types/api'
import { AuthContext } from './auth-context'
import type { AuthStatus } from './auth-context'

interface AuthResponse {
  user: AuthUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [notice, setNotice] = useState<string | null>(null)

  const clearSession = useCallback(() => {
    setUser(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const data = await apiRequest<AuthResponse>('/auth/me', {
          skipAuthRefresh: true,
        })

        if (!cancelled) {
          setUser(data.user)
          setStatus('authenticated')
        }
      } catch {
        const refreshed = await refreshSession()

        if (!refreshed) {
          if (!cancelled) clearSession()
          return
        }

        try {
          const data = await apiRequest<AuthResponse>('/auth/me', {
            skipAuthRefresh: true,
          })

          if (!cancelled) {
            setUser(data.user)
            setStatus('authenticated')
          }
        } catch {
          if (!cancelled) clearSession()
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [clearSession])

  useEffect(() => {
    const handleExpired = () => clearSession()
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    }
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    setNotice(null)

    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuthRefresh: true,
    })

    setUser(data.user)
    setStatus('authenticated')
  }, [])

  const register = useCallback(
    async (email: string, password: string) => {
      await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRefresh: true,
      })

      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await apiRequest<null>('/auth/logout', {
        method: 'POST',
        skipAuthRefresh: true,
      })
    } catch {
      // La sesión local debe cerrarse incluso si el servidor no responde.
    } finally {
      setNotice('Has cerrado sesión correctamente.')
      clearSession()
    }
  }, [clearSession])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await apiRequest<null>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      setNotice('Contraseña actualizada. Inicia sesión con tu nueva clave.')
      clearSession()
    },
    [clearSession],
  )

  const value = useMemo(
    () => ({
      user,
      status,
      notice,
      login,
      register,
      logout,
      changePassword,
    }),
    [changePassword, login, logout, notice, register, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
