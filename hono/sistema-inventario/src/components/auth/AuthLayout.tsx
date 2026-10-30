import type { ReactNode } from 'react'
import { BoxesIcon, CheckCircleIcon } from '../icons'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

const features = [
  'Stock consolidado en tiempo real',
  'Movimientos con trazabilidad completa',
  'Traslados atómicos entre ubicaciones',
]

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)]"
          style={{ backgroundSize: '44px 44px' }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
            <BoxesIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">Inventario</p>
            <p className="text-xs text-slate-400">Panel de control</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-400">
            Control de existencias
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Cada movimiento,
            <br />
            bajo control.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Consulta el inventario, registra entradas y salidas y mueve stock
            entre almacenes desde un solo lugar.
          </p>

          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-400" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-slate-500">
          <span>Stock · trazabilidad · transferencias</span>
          <span>v1.0</span>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <BoxesIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-950">Inventario</p>
              <p className="text-xs text-slate-500">Panel de control</p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>

          <div className="mt-8">{children}</div>

          <div className="mt-6">{footer}</div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Tus credenciales viajan en cookies HttpOnly.
          </p>
        </div>
      </main>
    </div>
  )
}
