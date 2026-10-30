import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { getErrorMessage } from '../../lib/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { ArrowRightIcon } from '../icons'

interface LoginLocationState {
  from?: string
}

export function LoginForm() {
  const { login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginLocationState | null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo =
    state?.from && state.from !== '/login' ? state.from : '/inventario'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      {notice && <Alert variant="success">{notice}</Alert>}

      {error && (
        <Alert variant="error" title="No pudimos iniciar sesión">
          {error}
        </Alert>
      )}

      <FormField id="email" label="Correo electrónico" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="tu@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </FormField>

      <FormField id="password" label="Contraseña" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </FormField>

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={submitting}
        icon={<ArrowRightIcon className="h-4 w-4" />}
      >
        Entrar al panel
      </Button>

      {import.meta.env.DEV && (
        <p className="text-center text-sm text-slate-500">
          ¿Primera vez en local?{' '}
          <Link
            to="/registro"
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Crear usuario de prueba
          </Link>
        </p>
      )}
    </form>
  )
}
