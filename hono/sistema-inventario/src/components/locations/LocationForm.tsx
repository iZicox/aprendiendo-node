import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest, getErrorMessage } from '../../lib/api'
import { normalizeCode, validateCode } from '../../lib/validation'
import type { Location } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { MapPinIcon, PlusIcon } from '../icons'

interface LocationFormProps {
  onCreated: () => void
}

export function LocationForm({ onCreated }: LocationFormProps) {
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Location | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCreated(null)

    const normalized = normalizeCode(code)
    const validationError = validateCode(normalized, 'El código')

    if (validationError) {
      setFieldError(validationError)
      return
    }

    setFieldError(null)
    setSubmitting(true)

    try {
      const location = await apiRequest<Location>('/locations', {
        method: 'POST',
        body: JSON.stringify({ code: normalized }),
      })

      setCreated(location)
      setCode('')
      onCreated()
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <MapPinIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Nueva ubicación</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            El código identifica la sede en todo el sistema
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5 p-5"
      >
        {created && (
          <Alert variant="success" title="Ubicación creada">
            <span className="font-mono font-semibold">{created.code}</span> ya
            está disponible para registrar stock.
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <FormField
          id="location-code"
          label="Código"
          hint="Letras, números, punto, guion y guion bajo. Se guarda en mayúsculas."
          error={fieldError}
          required
        >
          <Input
            id="location-code"
            name="code"
            value={code}
            onChange={(event) => {
              setCode(normalizeCode(event.target.value))
              setFieldError(null)
              setCreated(null)
            }}
            placeholder="ALMACEN-NORTE"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={50}
            invalid={Boolean(fieldError)}
            className="font-mono uppercase"
            required
          />
        </FormField>

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          icon={<PlusIcon className="h-4 w-4" />}
        >
          Crear ubicación
        </Button>
      </form>
    </Card>
  )
}
