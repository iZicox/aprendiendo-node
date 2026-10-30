import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest, getErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/format'
import { isPositiveInteger } from '../../lib/validation'
import type { Location, Movement, MovementType, Product } from '../../types/api'
import { useProductLocationStock } from '../../hooks/useProductLocationStock'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { LocationSelect } from '../shared/LocationSelect'
import { MovementTypeSelect } from '../shared/MovementTypeSelect'
import { ProductSearchSelect } from '../shared/ProductSearchSelect'
import { StockPreview } from '../shared/StockPreview'
import { ArrowsUpDownIcon, BoxIcon } from '../icons'

interface MovementFormProps {
  locations: Location[]
  movementTypes: MovementType[]
  referenceLoading: boolean
  referenceError: string | null
}

interface FieldErrors {
  productId?: string
  locationId?: string
  movementTypeCode?: string
  quantity?: string
}

export function MovementForm({
  locations,
  movementTypes,
  referenceLoading,
  referenceError,
}: MovementFormProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [locationId, setLocationId] = useState('')
  const [movementTypeCode, setMovementTypeCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<Movement | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Idempotencia: una llave por operación lógica. Si el resultado del
  // request queda en la incógnita (red/5xx), el reintento reutiliza la llave;
  // cuando termina bien (o con un 4xx definitivo) se descarta.
  const operationKeyRef = useRef<string | null>(null)

  const selectedType = movementTypes.find(
    (movementType) => movementType.code === movementTypeCode,
  )

  const numericProductId = product?.id ?? null
  const numericLocationId = locationId ? Number(locationId) : null

  const {
    stock,
    loading: stockLoading,
    error: stockError,
    reload: reloadStock,
  } = useProductLocationStock(numericProductId, numericLocationId)

  const quantityNumber = Number(quantity)
  const hasQuantity = quantity !== '' && Number.isFinite(quantityNumber)
  const sign = selectedType?.sign ?? 0
  const stockAfter =
    stock && hasQuantity && selectedType
      ? stock.quantity + sign * quantityNumber
      : null
  const insufficientStock =
    stock !== null && hasQuantity && sign < 0 && quantityNumber > stock.quantity

  function resetSuccess() {
    setSuccess(null)
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const errors: FieldErrors = {}

    if (!product) errors.productId = 'Selecciona un producto'
    if (!locationId) errors.locationId = 'Selecciona una ubicación'
    if (!movementTypeCode) {
      errors.movementTypeCode = 'Selecciona un tipo de movimiento'
    }
    if (!isPositiveInteger(quantity)) {
      errors.quantity = 'La cantidad debe ser un entero mayor que cero'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0 || !product) return

    if (insufficientStock) {
      setError(
        `Stock insuficiente: solo hay ${formatNumber(stock.quantity)} unidades disponibles en esta ubicación.`,
      )
      return
    }

    setSubmitting(true)

    const operationKey = operationKeyRef.current ?? crypto.randomUUID()
    operationKeyRef.current = operationKey

    try {
      const movement = await apiRequest<Movement>('/movements', {
        method: 'POST',
        headers: { 'Idempotency-Key': operationKey },
        body: JSON.stringify({
          productId: product.id,
          locationId: Number(locationId),
          movementTypeCode,
          quantity: Number(quantity),
          note: note.trim() || undefined,
        }),
      })

      operationKeyRef.current = null
      setSuccess(movement)
      setQuantity('')
      setNote('')
      await reloadStock()
    } catch (submitError) {
      // El servidor respondió (4xx): no se creó nada o hubo conflicto, así
      // que la próxima operación usa otra llave. Si falló la red o hay 5xx
      // no sabemos si se aplicó: se conserva la llave para el reintento.
      if (submitError instanceof ApiError && submitError.status < 500) {
        operationKeyRef.current = null
      }
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ArrowsUpDownIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Datos del movimiento
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Selecciona producto, ubicación y tipo de operación
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-5 p-5"
          noValidate
        >
          {(referenceError || error) && (
            <Alert variant="error">{referenceError ?? error}</Alert>
          )}

          {success && (
            <Alert variant="success" title="Movimiento registrado">
              Se registró el movimiento{' '}
              <span className="font-semibold">#{success.id}</span> (
              {success.movementTypeCode}) por{' '}
              <span className="font-semibold">
                {formatNumber(success.quantity)}
              </span>{' '}
              unidades.
            </Alert>
          )}

          {!referenceLoading && locations.length === 0 && (
            <Alert variant="warning" title="No hay ubicaciones">
              Aplica el seed local para crear las ubicaciones WAREHOUSE y
              WAREHOUSE_2.
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="movement-product"
              label="Producto"
              error={fieldErrors.productId}
              required
            >
              <ProductSearchSelect
                id="movement-product"
                value={product}
                onChange={(nextProduct) => {
                  setProduct(nextProduct)
                  setFieldErrors((current) => ({
                    ...current,
                    productId: undefined,
                  }))
                  resetSuccess()
                }}
                invalid={Boolean(fieldErrors.productId)}
              />
            </FormField>

            <FormField
              id="movement-location"
              label="Ubicación"
              error={fieldErrors.locationId}
              required
            >
              <LocationSelect
                id="movement-location"
                locations={locations}
                value={locationId}
                onChange={(value) => {
                  setLocationId(value)
                  setFieldErrors((current) => ({
                    ...current,
                    locationId: undefined,
                  }))
                  resetSuccess()
                }}
                loading={referenceLoading}
                invalid={Boolean(fieldErrors.locationId)}
              />
            </FormField>
          </div>

          <FormField
            id="movement-type"
            label="Tipo de movimiento"
            error={fieldErrors.movementTypeCode}
            hint={
              selectedType
                ? `${selectedType.description}. Signo: ${
                    selectedType.sign > 0 ? '+' : ''
                  }${selectedType.sign}`
                : 'Las transferencias se registran desde su propia pantalla.'
            }
            required
          >
            <MovementTypeSelect
              id="movement-type"
              movementTypes={movementTypes}
              value={movementTypeCode}
              onChange={(value) => {
                setMovementTypeCode(value)
                setFieldErrors((current) => ({
                  ...current,
                  movementTypeCode: undefined,
                }))
                resetSuccess()
              }}
              loading={referenceLoading}
              invalid={Boolean(fieldErrors.movementTypeCode)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <FormField
              id="movement-quantity"
              label="Cantidad"
              error={fieldErrors.quantity}
              required
            >
              <Input
                id="movement-quantity"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    quantity: undefined,
                  }))
                  resetSuccess()
                }}
                placeholder="0"
                invalid={Boolean(fieldErrors.quantity)}
              />
            </FormField>

            <FormField
              id="movement-note"
              label="Nota"
              hint={`${note.length}/500 caracteres`}
            >
              <Input
                id="movement-note"
                value={note}
                maxLength={500}
                onChange={(event) => {
                  setNote(event.target.value)
                  resetSuccess()
                }}
                placeholder="Pedido, proveedor o motivo del movimiento"
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              loading={submitting}
              icon={<ArrowsUpDownIcon className="h-4 w-4" />}
            >
              Registrar movimiento
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-5">
        <StockPreview stock={stock} loading={stockLoading} error={stockError} />

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BoxIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">
              Resumen del movimiento
            </h2>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Producto</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {product?.sku ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Ubicación</dt>
              <dd className="font-semibold text-slate-900">
                {locations.find((location) => location.id === numericLocationId)
                  ?.code ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Tipo</dt>
              <dd>
                {selectedType ? (
                  <Badge variant={selectedType.sign > 0 ? 'emerald' : 'rose'}>
                    {selectedType.code}
                  </Badge>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Cantidad</dt>
              <dd className="font-semibold text-slate-900">
                {hasQuantity ? formatNumber(quantityNumber) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Stock resultante</dt>
              <dd
                className={
                  stockAfter !== null && stockAfter < 0
                    ? 'font-bold text-rose-600'
                    : 'font-bold text-slate-900'
                }
              >
                {stockAfter === null ? '—' : formatNumber(stockAfter)}
              </dd>
            </div>
          </dl>

          {insufficientStock && (
            <Alert variant="warning" className="mt-4">
              La cantidad supera el stock disponible.
            </Alert>
          )}
        </Card>
      </div>
    </div>
  )
}
