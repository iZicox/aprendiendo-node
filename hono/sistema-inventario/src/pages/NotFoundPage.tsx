import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InboxIcon } from '../components/icons'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card className="mx-auto max-w-xl p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <InboxIcon className="h-7 w-7" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
        Error 404
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        Esta página no existe
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        La ruta que buscas no está disponible en el panel.
      </p>
      <div className="mt-6">
        <Button onClick={() => navigate('/inventario')}>
          Volver al inventario
        </Button>
      </div>
    </Card>
  )
}
