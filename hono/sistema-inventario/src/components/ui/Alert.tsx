import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseIcon,
  InfoIcon,
} from '../icons'

type AlertVariant = 'info' | 'success' | 'error' | 'warning'

interface AlertProps {
  children: ReactNode
  variant?: AlertVariant
  title?: string
  onDismiss?: () => void
  className?: string
}

const styles: Record<AlertVariant, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}

const iconStyles: Record<AlertVariant, string> = {
  info: 'text-sky-600',
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
}

export function Alert({
  children,
  variant = 'info',
  title,
  onDismiss,
  className,
}: AlertProps) {
  const Icon =
    variant === 'success'
      ? CheckCircleIcon
      : variant === 'error' || variant === 'warning'
        ? AlertTriangleIcon
        : InfoIcon

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        styles[variant],
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconStyles[variant])} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn('opacity-80', title && 'mt-0.5')}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-0.5 opacity-60 transition hover:opacity-100"
          aria-label="Cerrar aviso"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
