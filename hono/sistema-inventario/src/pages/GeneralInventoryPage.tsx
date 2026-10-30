import { useState } from 'react'
import { useInventory } from '../hooks/useInventory'
import { useStockOverview } from '../hooks/useStockOverview'
import { formatNumber } from '../lib/format'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { StatCard } from '../components/ui/StatCard'
import { InventoryTable } from '../components/inventory/InventoryTable'
import {
  AlertTriangleIcon,
  BoxIcon,
  BoxesIcon,
  InboxIcon,
  MapPinIcon,
  RefreshIcon,
} from '../components/icons'

const PAGE_SIZE = 20

export function GeneralInventoryPage() {
  const [page, setPage] = useState(1)
  const [includeZero, setIncludeZero] = useState(false)

  const overview = useStockOverview()
  const inventory = useInventory({
    locationId: null,
    page,
    pageSize: PAGE_SIZE,
    includeZero,
  })

  function handleIncludeZero(next: boolean) {
    setIncludeZero(next)
    setPage(1)
  }

  function handleRefresh() {
    void overview.reload()
    void inventory.reload()
  }

  const inventoryEmpty =
    inventory.data !== null && inventory.data.items.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Inventario general"
        description="Consulta las existencias consolidadas por producto y ubicación."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshIcon className="h-4 w-4" />}
            loading={overview.loading || inventory.loading}
            onClick={handleRefresh}
          >
            Actualizar
          </Button>
        }
      />

      {overview.error && (
        <Alert variant="error" title="No se pudo cargar el resumen">
          {overview.error}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unidades totales"
          value={overview.data ? formatNumber(overview.data.total) : '—'}
          helper="Suma de todas las ubicaciones"
          tone="indigo"
          icon={<BoxesIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Productos"
          value={overview.data ? formatNumber(overview.data.productCount) : '—'}
          helper="SKUs registrados en el catálogo"
          tone="sky"
          icon={<BoxIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Ubicaciones"
          value={overview.data ? overview.data.byLocation.length : '—'}
          helper="Almacenes con stock consultable"
          tone="emerald"
          icon={<MapPinIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Sin stock"
          value={
            overview.data ? formatNumber(overview.data.outOfStockCount) : '—'
          }
          helper="Productos sin unidades disponibles"
          tone="amber"
          icon={<AlertTriangleIcon className="h-5 w-5" />}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Existencias por producto y ubicación
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Página actual del inventario consolidado
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={includeZero}
              onChange={(event) => handleIncludeZero(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Incluir sin stock
          </label>
        </div>

        {inventory.error && (
          <div className="p-4">
            <Alert variant="error">{inventory.error}</Alert>
          </div>
        )}

        {inventory.loading && !inventory.data ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-slate-500">
            <Spinner className="h-4 w-4" />
            Cargando existencias…
          </div>
        ) : inventoryEmpty ? (
          <EmptyState
            icon={<InboxIcon className="h-6 w-6" />}
            title="No hay existencias para mostrar"
            description={
              includeZero
                ? 'No hay productos ni ubicaciones registradas todavía.'
                : 'Activa “Incluir sin stock” para ver también los productos en cero.'
            }
          />
        ) : inventory.data ? (
          <>
            <InventoryTable
              items={inventory.data.items}
              loading={inventory.loading}
            />
            <Pagination
              meta={inventory.data.meta}
              onPageChange={setPage}
              disabled={inventory.loading}
            />
          </>
        ) : null}
      </Card>
    </div>
  )
}
