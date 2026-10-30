import { MenuIcon } from '../icons'
import { UserMenu } from './UserMenu'

interface TopbarProps {
  title: string
  subtitle: string
  onOpenMenu: () => void
  onChangePassword: () => void
}

export function Topbar({
  title,
  subtitle,
  onOpenMenu,
  onChangePassword,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Abrir menú"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      <UserMenu onChangePassword={onChangePassword} />
    </header>
  )
}
