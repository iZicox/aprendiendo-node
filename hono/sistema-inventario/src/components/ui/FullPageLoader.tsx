import { BoxesIcon } from '../icons'
import { Spinner } from './Spinner'

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
        <BoxesIcon className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Spinner className="h-4 w-4" />
        Preparando tu panel…
      </div>
    </div>
  )
}
