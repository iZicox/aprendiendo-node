import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest, getErrorMessage } from '../../lib/api'
import { normalizeCode, validateCode } from '../../lib/validation'
import type { Product } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { BoxIcon, PlusIcon } from '../icons'

interface ProductFormProps {
  onCreated: () => void
}

export function ProductForm({ onCreated }: ProductFormProps) {
  const [sku, setSku] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCreated(null)

    const normalized = normalizeCode(sku)
    const validationError = validateCode(normalized, 'El SKU')

    if (validationError) {
      setFieldError(validationError)
      return
    }

    setFieldError(null)
    setSubmitting(true)

    try {
      const product = await apiRequest<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({ sku: normalized }),
      })

      setCreated(product)
      setSku('')
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
          <BoxIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Datos del producto
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            El SKU identifica el producto en todo el sistema
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5 p-5"
      >
        {created && (
          <Alert variant="success" title="Producto creado">
            <span className="font-mono font-semibold">{created.sku}</span> ya
            está disponible para registrar movimientos.
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <FormField
          id="sku"
          label="SKU"
          hint="Letras, números, punto, guion y guion bajo. Se guarda en mayúsculas."
          error={fieldError}
          required
        >
          <Input
            id="sku"
            name="sku"
            value={sku}
            onChange={(event) => {
              setSku(normalizeCode(event.target.value))
              setFieldError(null)
              setCreated(null)
            }}
            placeholder="LAP-ACER-15"
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
          Crear producto
        </Button>
      </form>
    </Card>
  )
}
