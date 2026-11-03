import { useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { Location, Page } from '../types/api'

interface LocationSearchState {
  data: Location[]
  loading: boolean
  error: string | null
}

const DEBOUNCE_MS = 250

// Búsqueda de ubicaciones por código contra el servidor
// (GET /locations/search?search=...). Mismo patrón que useProductSearch:
// debounce, y cada cambio cancela la petición anterior.
export function useLocationSearch(search: string, limit = 10, enabled = true) {
  const requestId = useRef(0)

  const [state, setState] = useState<LocationSearchState>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!enabled) return

    const currentRequest = ++requestId.current
    const controller = new AbortController()

    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, loading: true, error: null }))

      const params = new URLSearchParams({
        page: '1',
        pageSize: String(limit),
      })
      if (search) params.set('search', search)

      void apiRequest<Page<Location>>(
        `/locations/search?${params.toString()}`,
        {
          signal: controller.signal,
        },
      )
        .then((data) => {
          if (currentRequest !== requestId.current) return
          setState({ data: data.items, loading: false, error: null })
        })
        .catch((loadError) => {
          if (currentRequest !== requestId.current) return
          if (
            loadError instanceof DOMException &&
            loadError.name === 'AbortError'
          ) {
            return
          }
          setState((current) => ({
            ...current,
            loading: false,
            error: getErrorMessage(loadError),
          }))
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [search, limit, enabled])

  return {
    locations: state.data,
    loading: state.loading,
    error: state.error,
  }
}
