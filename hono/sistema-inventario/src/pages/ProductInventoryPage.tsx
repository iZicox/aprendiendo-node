import { useState } from 'react'
import { useProductStock } from '../hooks/useProductStock'
import { cn } from '../lib/cn'
import { formatNumber } from '../lib/format'
import type { Product } from '../types/api'
import { ProductSearchSelect } from '../components/shared/ProductSearchSelect'
import { StockStatusBadge } from '../components/inventory/StockStatusBadge'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { FormField } from '../components/ui/FormField'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { StatCard } from '../components/ui/StatCard'
import {
  AlertTriangleIcon,
  BoxIcon,
  BoxesIcon,
  MapPinIcon,
  RefreshIcon,
} from '../components/icons'

export function ProductInventoryPage() {
  const [product, setProduct] = useState<Product | null>(null)
  const [includeZero, setIncludeZero] = useState(false)

  const stock = useProductStock(product?.id ?? null)

  const rows = stock.rows ?? []
  const total = rows.reduce((sum, row) => sum + row.quantity, 0)
  const withStock = rows.filter((row) => row.quantity > 0)
  const withoutStock = rows.filter((row) => row.quantity <= 0)

  // De mayor a menor existencia (los empates, por código de ubicación).
  const visible = rows
    .filter((row) => includeZero || row.quantity > 0)
    .sort(
      (a, b) =>
        b.quantity - a.quantity || a.locationCode.localeCompare(b.locationCode),
    )

  const mainLocation = withStock.reduce<{
    locationCode: string
    quantity: number
  } | null>(
    (best, row) =>
      best === null || row.quantity > best.quantity
        ? { locationCode: row.locationCode, quantity: row.quantity }
        : best,
    null,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Inventario por producto"
        description="Elige un producto para ver su existencia total y en qué ubicaciones está guardado."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshIcon className="h-4 w-4" />}
            loading={stock.loading}
            disabled={!product}
            onClick={() => void stock.reload()}
          >
            Actualizar
          </Button>
        }
      />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <BoxIcon className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Producto
          </h2>
        </div>

        <div className="max-w-md">
          <FormField
            id="inventory-product"
            label="Buscar por SKU"
            hint="Escribe el código del producto o elige uno de la lista"
          >
            <ProductSearchSelect
              id="inventory-product"
              value={product}
              onChange={setProduct}
            />
          </FormField>
        </div>
      </section>

      {!product ? (
        <Card>
          <EmptyState
            icon={<BoxIcon className="h-6 w-6" />}
            title="Selecciona un producto"
            description="Busca un SKU para ver su total y las ubicaciones donde hay existencias."
          />
        </Card>
      ) : (
        <>
          {stock.rows !== null && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Total del producto"
                value={formatNumber(total)}
                helper="Suma de todas las ubicaciones"
                icon={<BoxesIcon className="h-6 w-6" />}
                tone="indigo"
              />
              <StatCard
                label="Ubicaciones con stock"
                value={formatNumber(withStock.length)}
                helper="Dónde hay existencias"
                icon={<MapPinIcon className="h-6 w-6" />}
                tone="emerald"
              />
              <StatCard
                label="Ubicaciones sin stock"
                value={formatNumber(withoutStock.length)}
                helper="Registradas en cero"
                icon={<AlertTriangleIcon className="h-6 w-6" />}
                tone="amber"
              />
            </section>
          )}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BoxIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">
                    {product.sku}
                  </p>
                  <p className="text-xs text-slate-500">
                    {stock.rows === null
                      ? 'Cargando existencias...'
                      : mainLocation
                        ? `Principal: ${mainLocation.locationCode} (${formatNumber(mainLocation.quantity)} und.)`
                        : 'Sin existencias registradas'}
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={includeZero}
                  onChange={(event) => setIncludeZero(event.target.checked)}
                />
                Incluir ubicaciones sin stock
              </label>
            </div>

            {stock.error ? (
              <div className="p-5">
                <Alert variant="error" title="No se pudo cargar el inventario">
                  {stock.error}
                </Alert>
              </div>
            ) : stock.rows === null ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
                <Spinner className="h-5 w-5" />
                Cargando existencias...
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<MapPinIcon className="h-6 w-6" />}
                title="Sin existencias en ubicaciones"
                description="Este producto no tiene unidades disponibles en ninguna ubicación."
                action={
                  includeZero ? undefined : (
                    <Button
                      variant="secondary"
                      onClick={() => setIncludeZero(true)}
                    >
                      Mostrar ubicaciones sin stock
                    </Button>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="min-w-full text-left text-sm"
                  aria-busy={stock.loading}
                >
                  <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Ubicación
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3 text-right font-semibold"
                      >
                        Cantidad
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Participación
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((row) => {
                      const percent =
                        total > 0 ? (row.quantity / total) * 100 : 0

                      return (
                        <tr
                          key={row.locationId}
                          className="transition hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <MapPinIcon className="h-4 w-4" />
                              </span>
                              <span className="font-mono text-sm font-semibold text-slate-900">
                                {row.locationCode}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                            {formatNumber(row.quantity)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"
                                role="progressbar"
                                aria-label={`Participación de ${row.locationCode}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(percent)}
                              >
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-500">
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <StockStatusBadge quantity={row.quantity} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      className={cn(
                        'border-t border-slate-200 bg-slate-50/60 text-slate-900',
                        stock.loading && 'opacity-60',
                      )}
                    >
                      <td className="px-5 py-3.5 font-semibold">Total</td>
                      <td className="px-5 py-3.5 text-right font-semibold">
                        {formatNumber(total)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {visible.length}{' '}
                        {visible.length === 1 ? 'ubicación' : 'ubicaciones'}
                      </td>
                      <td className="px-5 py-3.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
