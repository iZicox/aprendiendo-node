// lib/db-errors.ts
function errorText(error: unknown): string {
  const cause = (error as { cause?: unknown })?.cause
  return `${String(error)} ${cause ? String(cause) : ''}`
}

export const isUniqueViolation = (e: unknown): boolean =>
  errorText(e).includes('UNIQUE constraint failed')

export const isForeignKeyViolation = (e: unknown): boolean =>
  errorText(e).includes('FOREIGN KEY constraint failed')
