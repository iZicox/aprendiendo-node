import { useState } from 'react'
import { useInventory } from '../hooks/useInventory'
import { useLocations } from '../hooks/useLocations'
import { useStockOverview } from '../hooks/useStockOverview'
import { formatNumber } from '../lib/format'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { InventoryTable } from '../components/inventory/InventoryTable'
import { LocationSummaryCard } from '../components/inventory/LocationSummaryCard'
import { InboxIcon, MapPinIcon, RefreshIcon } from '../components/icons'

const PAGE_SIZE = 20

export function LocationInventoryPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  )
  const [page, setPage] = useState(1)
  const [includeZero, setIncludeZero] = useState(false)

  const locationsState = useLocations()
  const overview = useStockOverview()

  const effectiveSelectedLocationId =
    selectedLocationId ?? locationsState.locations[0]?.id ?? null

  const inventory = useInventory({
    locationId: effectiveSelectedLocationId,
    page,
    pageSize: PAGE_SIZE,
    includeZero,
    enabled: effectiveSelectedLocationId !== null,
  })

  const selectedLocation = locationsState.locations.find(
    (location) => location.id === effectiveSelectedLocationId,
  )

  const totalByLocation = new Map(
    (overview.data?.byLocation ?? []).map((location) => [
      location.locationId,
      location.total,
    ]),
  )

  function handleSelectLocation(locationId: number) {
    setSelectedLocationId(locationId)
    setPage(1)
  }

  function handleIncludeZero(next: boolean) {
    setIncludeZero(next)
    setPage(1)
  }

  function handleRefresh() {
    void locationsState.reload()
    void overview.reload()
    void inventory.reload()
  }

  const inventoryEmpty =
    inventory.data !== null && inventory.data.items.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Inventario por ubicación"
        description="Selecciona un almacén para revisar sus existencias y comparar totales."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshIcon className="h-4 w-4" />}
            loading={
              locationsState.loading || overview.loading || inventory.loading
            }
            onClick={handleRefresh}
          >
            Actualizar
          </Button>
        }
      />

      {locationsState.error && (
        <Alert variant="error" title="No se pudieron cargar las ubicaciones">
          {locationsState.error}
        </Alert>
      )}

      {overview.error && (
        <Alert variant="error" title="No se pudieron cargar los totales">
          {overview.error}
        </Alert>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Ubicaciones</h2>
          <Badge variant="slate">{locationsState.locations.length}</Badge>
        </div>

        {locationsState.loading && locationsState.locations.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-10 text-sm text-slate-500">
            <Spinner className="h-4 w-4" />
            Cargando ubicaciones…
          </div>
        ) : locationsState.locations.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MapPinIcon className="h-6 w-6" />}
              title="No hay ubicaciones"
              description="Aplica el seed local para crear WAREHOUSE y WAREHOUSE_2."
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {locationsState.locations.map((location) => (
              <LocationSummaryCard
                key={location.id}
                location={location}
                total={totalByLocation.get(location.id) ?? 0}
                active={location.id === effectiveSelectedLocationId}
                onClick={() => handleSelectLocation(location.id)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedLocation && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedLocation.code}
                </h2>
                <Badge variant="indigo">
                  {formatNumber(totalByLocation.get(selectedLocation.id) ?? 0)}{' '}
                  unidades
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {inventory.data
                  ? `${formatNumber(inventory.data.meta.total)} productos en esta ubicación`
                  : 'Cargando detalle de la ubicación…'}
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
              title="No hay existencias en esta ubicación"
              description={
                includeZero
                  ? 'No hay productos registrados en el catálogo.'
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
      )}
    </div>
  )
}
