import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getPageMeta } from '../../lib/navigation'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const location = useLocation()
  const pageMeta = getPageMeta(location.pathname)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const closePasswordDialog = useCallback(() => {
    setPasswordOpen(false)
  }, [])

  useEffect(() => {
    document.title = `${pageMeta.title} · Inventario`
  }, [pageMeta.title])

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((current) => !current)}
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          onOpenMenu={() => setMobileOpen(true)}
          onChangePassword={() => setPasswordOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200/70 px-4 py-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          Panel de inventario · Datos en tiempo real desde D1
        </footer>
      </div>

      <ChangePasswordDialog open={passwordOpen} onClose={closePasswordDialog} />
    </div>
  )
}
