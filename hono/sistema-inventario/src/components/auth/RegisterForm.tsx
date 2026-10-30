import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { getErrorMessage } from '../../lib/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { ArrowRightIcon } from '../icons'

export function RegisterForm() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)

    try {
      await register(email.trim(), password)
      navigate('/inventario', { replace: true })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <Alert variant="info" title="Solo para desarrollo">
        Este formulario crea un usuario con rol <strong>user</strong>. Para
        probar funciones de administrador, promuévelo desde D1.
      </Alert>

      {error && (
        <Alert variant="error" title="No pudimos crear la cuenta">
          {error}
        </Alert>
      )}

      <FormField id="register-email" label="Correo electrónico" required>
        <Input
          id="register-email"
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="tu@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </FormField>

      <FormField
        id="register-password"
        label="Contraseña"
        hint="Mínimo 8 caracteres y máximo 72 bytes."
        required
      >
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </FormField>

      <FormField id="register-confirm" label="Confirmar contraseña" required>
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
        Crear cuenta y entrar
      </Button>

      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          to="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-500"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
