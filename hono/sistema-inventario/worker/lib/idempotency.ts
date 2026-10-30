// lib/idempotency.ts
// Utilidades de idempotencia: contexto del request y hash estable del payload.

export type IdempotencyContext = {
  userId: number
  key: string
}

// Ordena las claves para que JSON.stringify no dependa del orden literal
// en que el servicio construya el objeto.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    )
  }
  return value
}

// SHA-256 en hex del payload canónico. Sirve para detectar que una misma
// Idempotency-Key se reenvíe con datos distintos (409) y no para guardar
// el payload en claro.
export async function hashRequest(
  kind: 'movement' | 'transfer',
  payload: Record<string, unknown>,
): Promise<string> {
  const canonical = JSON.stringify(sortKeys({ kind, ...payload }))
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
