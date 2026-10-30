import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { getErrorMessage } from '../../lib/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { KeyIcon } from '../icons'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
}

export function ChangePasswordDialog({
  open,
  onClose,
}: ChangePasswordDialogProps) {
  const { changePassword } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (new TextEncoder().encode(newPassword).length > 72) {
      setError('La nueva contraseña no puede superar los 72 bytes.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }

    setSubmitting(true)

    try {
      await changePassword(currentPassword, newPassword)
      onClose()
      navigate('/login', { replace: true })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambiar contraseña"
      description="Al guardar se cerrarán todas tus sesiones activas."
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
      >
        {error && <Alert variant="error">{error}</Alert>}

        <FormField id="current-password" label="Contraseña actual" required>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </FormField>

        <FormField
          id="new-password"
          label="Nueva contraseña"
          hint="Mínimo 8 caracteres."
          required
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </FormField>

        <FormField
          id="confirm-password"
          label="Confirmar nueva contraseña"
          required
        >
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={submitting}
            icon={<KeyIcon className="h-4 w-4" />}
          >
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  )
}
