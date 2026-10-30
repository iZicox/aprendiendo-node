import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid = false, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-500',
        invalid
          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10',
        className,
      )}
      {...props}
    />
  )
}
