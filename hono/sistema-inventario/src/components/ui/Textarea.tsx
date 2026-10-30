import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({
  className,
  invalid = false,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={cn(
        'block min-h-24 w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-500',
        invalid
          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10',
        className,
      )}
      {...props}
    />
  )
}
