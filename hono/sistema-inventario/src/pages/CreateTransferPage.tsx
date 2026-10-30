import { useLocations } from '../hooks/useLocations'
import { PageHeader } from '../components/ui/PageHeader'
import { TransferForm } from '../components/movements/TransferForm'

export function CreateTransferPage() {
  const locationsState = useLocations()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Registrar traslado"
        description="Mueve stock entre ubicaciones con una salida y una entrada atómicas."
      />

      <TransferForm
        locations={locationsState.locations}
        referenceLoading={locationsState.loading}
        referenceError={locationsState.error}
      />
    </div>
  )
}
