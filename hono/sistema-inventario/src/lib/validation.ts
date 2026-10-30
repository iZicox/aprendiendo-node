export const CODE_PATTERN = /^[A-Z0-9._-]+$/

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase()
}

export function validateCode(value: string, label: string): string | null {
  const normalized = normalizeCode(value)

  if (normalized.length === 0) return `${label} es obligatorio`
  if (normalized.length > 50) return `${label} no puede superar 50 caracteres`
  if (!CODE_PATTERN.test(normalized)) {
    return 'Solo se permiten letras, números, punto, guion y guion bajo'
  }

  return null
}

export function isPositiveInteger(value: string): boolean {
  if (!/^\d+$/.test(value)) return false
  return Number(value) > 0
}
