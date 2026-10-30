import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { cn } from '../../lib/cn'
import { getInitials, roleLabel } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import {
  ChevronDownIcon,
  KeyIcon,
  LogoutIcon,
  ShieldIcon,
  UserIcon,
} from '../icons'

interface UserMenuProps {
  onChangePassword: () => void
}

export function UserMenu({ onChangePassword }: UserMenuProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!user) return null

  async function handleLogout() {
    setLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 pr-2 transition hover:border-slate-200 hover:bg-slate-50"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm shadow-indigo-600/20">
          {getInitials(user.email)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-40 truncate text-xs font-semibold text-slate-800">
            {user.email}
          </span>
          <span className="block text-[11px] text-slate-500">
            {roleLabel(user.role)}
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-slate-400 transition',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                {user.role === 'admin' ? (
                  <ShieldIcon className="h-5 w-5" />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.email}
                </p>
                <div className="mt-1">
                  <Badge variant={user.role === 'admin' ? 'indigo' : 'slate'}>
                    {roleLabel(user.role)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onChangePassword()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <KeyIcon className="h-4 w-4 text-slate-400" />
              Cambiar contraseña
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
            >
              {loggingOut ? (
                <Spinner className="h-4 w-4" label="Cerrando sesión" />
              ) : (
                <LogoutIcon className="h-4 w-4" />
              )}
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
