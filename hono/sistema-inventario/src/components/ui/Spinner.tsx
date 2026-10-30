import { cn } from '../../lib/cn'
import { LoaderCircleIcon } from '../icons'

interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label = 'Cargando' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <LoaderCircleIcon className={cn('h-5 w-5 animate-spin', className)} />
    </span>
  )
}
