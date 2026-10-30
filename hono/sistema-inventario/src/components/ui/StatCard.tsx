import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type StatTone = 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose'

interface StatCardProps {
  label: string
  value: ReactNode
  helper?: string
  icon: ReactNode
  tone?: StatTone
}

const tones: Record<StatTone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = 'indigo',
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            tones[tone],
          )}
        >
          {icon}
        </div>
      </div>
      {helper && <p className="mt-3 text-xs text-slate-500">{helper}</p>}
    </div>
  )
}
