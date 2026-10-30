import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest, getErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/format'
import {
  isPositiveInteger,
  normalizeCode,
  validateCode,
} from '../../lib/validation'
import type { Location, Product, TransferResponse } from '../../types/api'
import { useProductLocationStock } from '../../hooks/useProductLocationStock'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { LocationSelect } from '../shared/LocationSelect'
import { ProductSearchSelect } from '../shared/ProductSearchSelect'
import { StockPreview } from '../shared/StockPreview'
import { ArrowsRightLeftIcon, BoxIcon } from '../icons'

interface TransferFormProps {
  locations: Location[]
  referenceLoading: boolean
  referenceError: string | null
}

interface FieldErrors {
  productId?: string
  fromLocationId?: string
  toLocationId?: string
  quantity?: string
  transferId?: string
}

export function TransferForm({
  locations,
  referenceLoading,
  referenceError,
}: TransferFormProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [transferId, setTransferId] = useState('')
  const [note, setNote] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<TransferResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Una transferencia es una sola operación lógica: la misma Idempotency-Key
  // cubre las dos piernas (OUT + IN) y sus reintentos.
  const operationKeyRef = useRef<string | null>(null)

  const numericProductId = product?.id ?? null
  const numericFromLocationId = fromLocationId ? Number(fromLocationId) : null
  const numericToLocationId = toLocationId ? Number(toLocationId) : null

  const {
    stock: sourceStock,
    loading: sourceLoading,
    error: sourceError,
    reload: reloadSource,
  } = useProductLocationStock(numericProductId, numericFromLocationId)

  const {
    stock: targetStock,
    loading: targetLoading,
    error: targetError,
    reload: reloadTarget,
  } = useProductLocationStock(numericProductId, numericToLocationId)

  const quantityNumber = Number(quantity)
  const hasQuantity = quantity !== '' && Number.isFinite(quantityNumber)
  const sourceAfter =
    sourceStock && hasQuantity ? sourceStock.quantity - quantityNumber : null
  const targetAfter =
    targetStock && hasQuantity ? targetStock.quantity + quantityNumber : null
  const insufficientStock =
    sourceStock !== null && hasQuantity && quantityNumber > sourceStock.quantity

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
    if (!fromLocationId) errors.fromLocationId = 'Selecciona el origen'
    if (!toLocationId) errors.toLocationId = 'Selecciona el destino'
    if (fromLocationId && fromLocationId === toLocationId) {
      errors.toLocationId = 'El destino debe ser distinto del origen'
    }
    if (!isPositiveInteger(quantity)) {
      errors.quantity = 'La cantidad debe ser un entero mayor que cero'
    }

    const normalizedTransferId = normalizeCode(transferId)
    if (normalizedTransferId) {
      const transferIdError = validateCode(
        normalizedTransferId,
        'El ID de traslado',
      )
      if (transferIdError) errors.transferId = transferIdError
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0 || !product) return

    if (insufficientStock && sourceStock) {
      setError(
        `Stock insuficiente en el origen: hay ${formatNumber(sourceStock.quantity)} unidades disponibles.`,
      )
      return
    }

    setSubmitting(true)

    const operationKey = operationKeyRef.current ?? crypto.randomUUID()
    operationKeyRef.current = operationKey

    try {
      const result = await apiRequest<TransferResponse>('/movements/transfer', {
        method: 'POST',
        headers: { 'Idempotency-Key': operationKey },
        body: JSON.stringify({
          productId: product.id,
          fromLocationId: Number(fromLocationId),
          toLocationId: Number(toLocationId),
          quantity: Number(quantity),
          transferId: normalizedTransferId || undefined,
          note: note.trim() || undefined,
        }),
      })

      operationKeyRef.current = null
      setSuccess(result)
      setQuantity('')
      setTransferId('')
      setNote('')
      await Promise.all([reloadSource(), reloadTarget()])
    } catch (submitError) {
      // 4xx: el servidor respondió, se descarta la llave. Red/5xx: estado
      // desconocido, el reintento reutiliza la misma llave (replay seguro).
      if (submitError instanceof ApiError && submitError.status < 500) {
        operationKeyRef.current = null
      }
      setError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ArrowsRightLeftIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Datos del traslado
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Se registrará una salida y una entrada en el mismo lote
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
            <Alert variant="success" title="Traslado registrado">
              Se creó el traslado{' '}
              <span className="font-mono font-semibold">
                {success.transferId}
              </span>{' '}
              con {success.movements.length} movimientos.
            </Alert>
          )}

          {!referenceLoading && locations.length < 2 && (
            <Alert variant="warning" title="Se necesitan dos ubicaciones">
              El seed local crea WAREHOUSE y WAREHOUSE_2 para probar traslados.
            </Alert>
          )}

          <FormField
            id="transfer-product"
            label="Producto"
            error={fieldErrors.productId}
            required
          >
            <ProductSearchSelect
              id="transfer-product"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="transfer-from"
              label="Ubicación de origen"
              error={fieldErrors.fromLocationId}
              required
            >
              <LocationSelect
                id="transfer-from"
                locations={locations}
                value={fromLocationId}
                onChange={(value) => {
                  setFromLocationId(value)
                  if (value === toLocationId) setToLocationId('')
                  setFieldErrors((current) => ({
                    ...current,
                    fromLocationId: undefined,
                    toLocationId: undefined,
                  }))
                  resetSuccess()
                }}
                loading={referenceLoading}
                invalid={Boolean(fieldErrors.fromLocationId)}
                placeholder="Selecciona el origen"
              />
            </FormField>

            <FormField
              id="transfer-to"
              label="Ubicación de destino"
              error={fieldErrors.toLocationId}
              required
            >
              <LocationSelect
                id="transfer-to"
                locations={locations.filter(
                  (location) => String(location.id) !== fromLocationId,
                )}
                value={toLocationId}
                onChange={(value) => {
                  setToLocationId(value)
                  setFieldErrors((current) => ({
                    ...current,
                    toLocationId: undefined,
                  }))
                  resetSuccess()
                }}
                loading={referenceLoading}
                invalid={Boolean(fieldErrors.toLocationId)}
                placeholder="Selecciona el destino"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <FormField
              id="transfer-quantity"
              label="Cantidad"
              error={fieldErrors.quantity}
              required
            >
              <Input
                id="transfer-quantity"
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
              id="transfer-id"
              label="ID de traslado"
              hint="Opcional. Si lo dejas vacío se genera automáticamente."
              error={fieldErrors.transferId}
            >
              <Input
                id="transfer-id"
                value={transferId}
                maxLength={50}
                onChange={(event) => {
                  setTransferId(normalizeCode(event.target.value))
                  setFieldErrors((current) => ({
                    ...current,
                    transferId: undefined,
                  }))
                  resetSuccess()
                }}
                placeholder="TRF-2026-001"
                className="font-mono uppercase"
                spellCheck={false}
                invalid={Boolean(fieldErrors.transferId)}
              />
            </FormField>
          </div>

          <FormField
            id="transfer-note"
            label="Nota"
            hint={`${note.length}/500 caracteres`}
          >
            <Input
              id="transfer-note"
              value={note}
              maxLength={500}
              onChange={(event) => {
                setNote(event.target.value)
                resetSuccess()
              }}
              placeholder="Motivo del traslado"
            />
          </FormField>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              loading={submitting}
              icon={<ArrowsRightLeftIcon className="h-4 w-4" />}
            >
              Registrar traslado
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-5">
        <StockPreview
          stock={sourceStock}
          loading={sourceLoading}
          error={sourceError}
          emptyMessage="Selecciona producto y origen para ver el stock disponible."
        />

        <StockPreview
          stock={targetStock}
          loading={targetLoading}
          error={targetError}
          emptyMessage="Selecciona producto y destino para ver el stock actual."
        />

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BoxIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">
              Resultado del traslado
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
              <dt className="text-slate-500">Cantidad</dt>
              <dd className="font-semibold text-slate-900">
                {hasQuantity ? formatNumber(quantityNumber) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Origen después</dt>
              <dd
                className={
                  sourceAfter !== null && sourceAfter < 0
                    ? 'font-bold text-rose-600'
                    : 'font-bold text-slate-900'
                }
              >
                {sourceAfter === null ? '—' : formatNumber(sourceAfter)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Destino después</dt>
              <dd className="font-bold text-slate-900">
                {targetAfter === null ? '—' : formatNumber(targetAfter)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Tipo</dt>
              <dd className="flex gap-1">
                <Badge variant="rose">TRANSFER_OUT</Badge>
                <Badge variant="emerald">TRANSFER_IN</Badge>
              </dd>
            </div>
          </dl>

          {insufficientStock && (
            <Alert variant="warning" className="mt-4">
              La cantidad supera el stock disponible en el origen.
            </Alert>
          )}
        </Card>
      </div>
    </div>
  )
}
