import { cn } from '../../lib/cn'
import { formatNumber } from '../../lib/format'
import type { Location } from '../../types/api'
import { ArrowRightIcon, MapPinIcon } from '../icons'

interface LocationSummaryCardProps {
  location: Location
  total: number
  active: boolean
  onClick: () => void
}

export function LocationSummaryCard({
  location,
  total,
  active,
  onClick,
}: LocationSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex w-full items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-0.5 hover:shadow-md',
        active
          ? 'border-indigo-300 ring-2 ring-indigo-500/15'
          : 'border-slate-200/80 hover:border-slate-300',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            active
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600',
          )}
        >
          <MapPinIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {location.code}
          </p>
          <p className="text-xs text-slate-500">
            {formatNumber(total)} unidades
          </p>
        </div>
      </div>
      <ArrowRightIcon
        className={cn(
          'h-4 w-4 shrink-0 transition',
          active
            ? 'text-indigo-500'
            : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500',
        )}
      />
    </button>
  )
}
