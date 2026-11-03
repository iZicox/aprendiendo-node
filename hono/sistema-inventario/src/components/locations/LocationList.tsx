import { useState } from 'react'
import { apiRequest, getErrorMessage } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import type { Location } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { InboxIcon, MapPinIcon, TrashIcon } from '../icons'

interface LocationListProps {
  locations: Location[]
  loading: boolean
  error: string | null
  isAdmin: boolean
  onDeleted: () => void
}

export function LocationList({
  locations,
  loading,
  error,
  isAdmin,
  onDeleted,
}: LocationListProps) {
  const [pending, setPending] = useState<Location | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function closeDialog() {
    if (deleting) return
    setPending(null)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!pending) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await apiRequest<Location>(`/locations/${pending.id}`, {
        method: 'DELETE',
      })
      setPending(null)
      onDeleted()
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Ubicaciones existentes
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Solo se pueden eliminar ubicaciones sin stock ni movimientos
            </p>
          </div>
          <Badge variant="indigo">{locations.length}</Badge>
        </div>

        {error ? (
          <div className="p-4">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500">
            <Spinner className="h-4 w-4" />
            Cargando ubicaciones…
          </div>
        ) : locations.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="h-6 w-6" />}
            title="Todavía no hay ubicaciones"
            description="Crea la primera ubicación para empezar a registrar stock."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {locations.map((location) => (
              <li
                key={location.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <MapPinIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-slate-900">
                      {location.code}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(location.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    #{location.id}
                  </span>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteError(null)
                        setPending(location)
                      }}
                      icon={<TrashIcon className="h-4 w-4" />}
                      aria-label={`Eliminar ubicación ${location.code}`}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={pending !== null}
        onClose={closeDialog}
        title="Eliminar ubicación"
        description="Esta acción no se puede deshacer."
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Vas a eliminar la ubicación{' '}
            <span className="font-mono font-semibold text-slate-900">
              {pending?.code}
            </span>
            . Si tiene stock o movimientos asociados, el servidor la rechazará.
          </p>

          {deleteError && <Alert variant="error">{deleteError}</Alert>}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closeDialog}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              loading={deleting}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
