import type { ComponentType } from 'react'
import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  BoxesIcon,
  BoxIcon,
  MapPinIcon,
} from '../components/icons'

export interface NavItem {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inventario',
    items: [
      {
        label: 'Inventario general',
        to: '/inventario',
        icon: BoxesIcon,
        end: true,
      },
      {
        label: 'Por ubicación',
        to: '/inventario/ubicaciones',
        icon: MapPinIcon,
      },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      {
        label: 'Crear producto',
        to: '/productos/nuevo',
        icon: BoxIcon,
      },
      {
        label: 'Crear movimiento',
        to: '/movimientos/nuevo',
        icon: ArrowsUpDownIcon,
      },
      {
        label: 'Crear traslado',
        to: '/traslados/nuevo',
        icon: ArrowsRightLeftIcon,
      },
    ],
  },
]

interface PageMeta {
  title: string
  subtitle: string
}

const PAGE_META: Record<string, PageMeta> = {
  '/inventario': {
    title: 'Inventario general',
    subtitle: 'Existencias consolidadas por producto y ubicación',
  },
  '/inventario/ubicaciones': {
    title: 'Inventario por ubicación',
    subtitle: 'Consulta y compara el stock de cada almacén',
  },
  '/productos/nuevo': {
    title: 'Nuevo producto',
    subtitle: 'Registra un SKU en el catálogo',
  },
  '/movimientos/nuevo': {
    title: 'Registrar movimiento',
    subtitle: 'Entradas, salidas, devoluciones y ajustes',
  },
  '/traslados/nuevo': {
    title: 'Registrar traslado',
    subtitle: 'Mueve stock entre ubicaciones de forma atómica',
  },
}

export function getPageMeta(pathname: string): PageMeta {
  return (
    PAGE_META[pathname] ?? {
      title: 'Panel de inventario',
      subtitle: 'Administra productos, movimientos y existencias',
    }
  )
}
