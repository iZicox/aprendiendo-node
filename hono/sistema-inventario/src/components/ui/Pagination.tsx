import type { PageMeta } from '../../types/api'
import { formatNumber } from '../../lib/format'
import { Button } from './Button'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'

interface PaginationProps {
  meta: PageMeta
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  meta,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1
  const to = Math.min(meta.page * meta.pageSize, meta.total)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Mostrando <span className="font-semibold text-slate-700">{from}</span>–
        <span className="font-semibold text-slate-700">{to}</span> de{' '}
        <span className="font-semibold text-slate-700">
          {formatNumber(meta.total)}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !meta.hasPrev}
          onClick={() => onPageChange(meta.page - 1)}
          icon={<ChevronLeftIcon className="h-4 w-4" />}
        >
          Anterior
        </Button>
        <span className="min-w-24 text-center text-sm font-medium text-slate-600">
          Página {meta.page} de {Math.max(meta.totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Siguiente
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
