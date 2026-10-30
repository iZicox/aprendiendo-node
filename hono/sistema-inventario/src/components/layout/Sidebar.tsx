import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { cn } from '../../lib/cn'
import { getInitials, roleLabel } from '../../lib/format'
import { NAV_GROUPS } from '../../lib/navigation'
import { BoxesIcon, ChevronLeftIcon, CloseIcon } from '../icons'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapse: () => void
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useAuth()

  return (
    <aside
      aria-label="Menú lateral"
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-slate-300 shadow-2xl transition-all duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'lg:w-20' : 'lg:w-72',
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3">
        <NavLink
          to="/inventario"
          onClick={onCloseMobile}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-1.5',
            collapsed && 'lg:justify-center',
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
            <BoxesIcon className="h-5 w-5" />
          </span>
          <span className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <span className="block text-sm font-bold tracking-tight text-white">
              Inventario
            </span>
            <span className="block text-[11px] text-slate-500">
              Panel de control
            </span>
          </span>
        </NavLink>

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white lg:flex',
            collapsed && 'rotate-180',
          )}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className={cn(
                'px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500',
                collapsed && 'lg:hidden',
              )}
            >
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                        isActive
                          ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-400/20'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        collapsed && 'lg:justify-center lg:px-2',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={cn('truncate', collapsed && 'lg:hidden')}>
                      {item.label}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/5 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5',
            collapsed && 'lg:justify-center lg:p-1.5',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
            {user ? getInitials(user.email) : 'US'}
          </span>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-xs font-semibold text-slate-200">
              {user?.email}
            </p>
            <p className="text-[11px] text-slate-500">
              {user ? roleLabel(user.role) : 'Usuario'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
