import type { StockRow } from '../../types/api'
import { formatNumber } from '../../lib/format'
import { Spinner } from '../ui/Spinner'
import { BoxIcon, MapPinIcon } from '../icons'

interface StockPreviewProps {
  stock: StockRow | null
  loading: boolean
  error: string | null
  emptyMessage?: string
}

export function StockPreview({
  stock,
  loading,
  error,
  emptyMessage = 'Selecciona producto y ubicación para ver el stock.',
}: StockPreviewProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Stock actual
        </p>
        {stock && (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            {stock.sku}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4" />
          Consultando existencias…
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      ) : stock ? (
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold tracking-tight text-slate-950">
              {formatNumber(stock.quantity)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <MapPinIcon className="h-3.5 w-3.5" />
              {stock.locationCode}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-inset ring-slate-200">
            <BoxIcon className="h-5 w-5" />
          </span>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 text-sm text-slate-500">
          <BoxIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
