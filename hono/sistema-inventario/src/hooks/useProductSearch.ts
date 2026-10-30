import { useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { Page, Product } from '../types/api'

interface ProductSearchState {
  data: Product[]
  loading: boolean
  error: string | null
}

const DEBOUNCE_MS = 250

// Búsqueda de productos por SKU contra el servidor (GET /products?search=...).
// `enabled` permite pedir solo cuando el desplegable está abierto; cada
// cambio cancela la petición anterior para que no llegue fuera de orden.
export function useProductSearch(search: string, limit = 10, enabled = true) {
  const requestId = useRef(0)

  const [state, setState] = useState<ProductSearchState>({
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

      void apiRequest<Page<Product>>(`/products?${params.toString()}`, {
        signal: controller.signal,
      })
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
    products: state.data,
    loading: state.loading,
    error: state.error,
  }
}
