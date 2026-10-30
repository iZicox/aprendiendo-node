import type { ApiErrorPayload } from '../types/api'

const API_BASE = '/api'

export const AUTH_EXPIRED_EVENT = 'inventory:auth-expired'

export class ApiError extends Error {
  readonly status: number
  readonly details: ApiErrorPayload['details']

  constructor(
    status: number,
    message: string,
    details: ApiErrorPayload['details'] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado'
}

type RequestOptions = RequestInit & {
  skipAuthRefresh?: boolean
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function rawRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  const body = await readBody(response)

  if (!response.ok) {
    const payload = (body ?? {}) as ApiErrorPayload
    const message =
      typeof payload.error === 'string'
        ? payload.error
        : `La solicitud falló con estado ${response.status}`

    throw new ApiError(response.status, message, payload.details)
  }

  return body as T
}

let refreshPromise: Promise<boolean> | null = null

async function refreshWithLock(): Promise<boolean> {
  const task = async () => {
    try {
      await rawRequest<{ ok: boolean }>('/auth/refresh', { method: 'POST' })
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      }
      return false
    }
  }

  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('inventory-auth-refresh', () => task())
  }

  return task()
}

export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshWithLock().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, ...init } = options

  try {
    return await rawRequest<T>(path, init)
  } catch (error) {
    if (
      skipAuthRefresh ||
      !(error instanceof ApiError) ||
      error.status !== 401
    ) {
      throw error
    }

    const refreshed = await refreshSession()
    if (!refreshed) throw error

    try {
      return await rawRequest<T>(path, init)
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      }
      throw retryError
    }
  }
}
