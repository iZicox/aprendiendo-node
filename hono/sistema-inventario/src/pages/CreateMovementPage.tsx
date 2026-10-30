import { useLocations } from '../hooks/useLocations'
import { useMovementTypes } from '../hooks/useMovementTypes'
import { PageHeader } from '../components/ui/PageHeader'
import { MovementForm } from '../components/movements/MovementForm'

export function CreateMovementPage() {
  const locationsState = useLocations()
  const movementTypesState = useMovementTypes()

  const loading = locationsState.loading || movementTypesState.loading
  const error = locationsState.error ?? movementTypesState.error

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Registrar movimiento"
        description="Aumenta o reduce existencias con entradas, salidas, devoluciones o ajustes."
      />

      <MovementForm
        locations={locationsState.locations}
        movementTypes={movementTypesState.movementTypes}
        referenceLoading={loading}
        referenceError={error}
      />
    </div>
  )
}
