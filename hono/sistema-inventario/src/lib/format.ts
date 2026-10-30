export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value)
}

function toDate(value: string): Date {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`

  return new Date(normalized)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'

  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function getInitials(email: string): string {
  const name = email.split('@')[0] ?? email
  return name.slice(0, 2).toUpperCase()
}

export function roleLabel(role: 'admin' | 'user'): string {
  return role === 'admin' ? 'Administrador' : 'Usuario'
}
