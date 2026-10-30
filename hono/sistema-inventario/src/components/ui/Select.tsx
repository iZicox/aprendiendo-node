import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid = false, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'block w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-500',
        invalid
          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10',
        className,
      )}
      {...props}
    />
  )
}
