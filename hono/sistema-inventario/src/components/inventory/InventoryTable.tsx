import { formatNumber } from '../../lib/format'
import type { StockRow } from '../../types/api'
import { MapPinIcon } from '../icons'
import { StockStatusBadge } from './StockStatusBadge'

interface InventoryTableProps {
  items: StockRow[]
  loading?: boolean
}

export function InventoryTable({
  items,
  loading = false,
}: InventoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm" aria-busy={loading}>
        <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Producto
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Ubicación
            </th>
            <th scope="col" className="px-5 py-3 text-right font-semibold">
              Cantidad
            </th>
            <th scope="col" className="px-5 py-3 text-right font-semibold">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className={loading ? 'opacity-50 transition' : 'transition'}>
          {items.map((row) => (
            <tr
              key={`${row.productId}-${row.locationId}`}
              className="border-t border-slate-100 transition hover:bg-slate-50/60"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-mono text-[11px] font-bold text-indigo-600">
                    {row.sku.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono font-semibold text-slate-900">
                      {row.sku}
                    </p>
                    <p className="text-xs text-slate-500">
                      Producto #{row.productId}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <MapPinIcon className="h-4 w-4 text-slate-400" />
                  {row.locationCode}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                {formatNumber(row.quantity)}
              </td>
              <td className="px-5 py-3.5 text-right">
                <StockStatusBadge quantity={row.quantity} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
