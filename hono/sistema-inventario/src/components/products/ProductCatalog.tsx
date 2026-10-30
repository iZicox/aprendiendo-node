import { formatDateTime } from '../../lib/format'
import type { Product } from '../../types/api'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Spinner } from '../ui/Spinner'
import { BoxIcon, InboxIcon } from '../icons'

interface ProductCatalogProps {
  products: Product[]
  loading: boolean
  error: string | null
}

export function ProductCatalog({
  products,
  loading,
  error,
}: ProductCatalogProps) {
  const recentProducts = [...products].slice(-8).reverse()

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Catálogo actual</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Productos disponibles para movimientos y traslados
          </p>
        </div>
        <Badge variant="indigo">{products.length}</Badge>
      </div>

      {error ? (
        <div className="p-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500">
          <Spinner className="h-4 w-4" />
          Cargando catálogo…
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="h-6 w-6" />}
          title="Todavía no hay productos"
          description="Crea el primer SKU para empezar a registrar stock."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {recentProducts.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <BoxIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-slate-900">
                    {product.sku}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(product.createdAt)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">#{product.id}</span>
            </li>
          ))}
        </ul>
      )}

      {products.length > 8 && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Mostrando los 8 más recientes de {products.length} productos.
        </p>
      )}
    </Card>
  )
}
