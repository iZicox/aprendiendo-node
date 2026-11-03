import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { LocationForm } from '../components/locations/LocationForm'
import { LocationList } from '../components/locations/LocationList'
import { PageHeader } from '../components/ui/PageHeader'
import { useLocations } from '../hooks/useLocations'

export function LocationsPage() {
  const { user } = useAuth()
  const { locations, loading, error, reload } = useLocations()

  // Gestionar ubicaciones es solo para administradores (el backend también lo exige).
  if (user && user.role !== 'admin') {
    return <Navigate to="/inventario" replace />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ubicaciones"
        title="Gestionar ubicaciones"
        description="Crea y elimina las sedes donde se guarda el stock."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <LocationList
          locations={locations}
          loading={loading}
          error={error}
          isAdmin
          onDeleted={() => void reload()}
        />
        <LocationForm onCreated={() => void reload()} />
      </div>
    </div>
  )
}
