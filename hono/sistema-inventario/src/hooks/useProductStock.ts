import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { StockRow } from '../types/api'

interface ProductStockState {
  key: string
  data: StockRow[] | null
  error: string | null
}

// Existencias de un producto en todas las ubicaciones (GET /stock/products/:id).
// `productId = null` desactiva la petición: aún no hay producto elegido.
export function useProductStock(productId: number | null) {
  const enabled = productId !== null
  const requestKey = enabled
    ? `product-stock:${productId}`
    : 'product-stock:disabled'
  const requestId = useRef(0)

  const [state, setState] = useState<ProductStockState>({
    key: '',
    data: null,
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    if (productId === null) return

    const currentRequest = ++requestId.current

    try {
      const rows = await apiRequest<StockRow[]>(`/stock/products/${productId}`)
      if (currentRequest !== requestId.current) return

      setState({ key: requestKey, data: rows, error: null })
    } catch (loadError) {
      if (currentRequest !== requestId.current) return

      setState((current) => ({
        key: requestKey,
        data: current.data,
        error: getErrorMessage(loadError),
      }))
    }
  }, [productId, requestKey])

  useEffect(() => {
    if (!enabled) return
    void fetchData()
  }, [enabled, fetchData])

  const reload = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchData()
    } finally {
      setRefreshing(false)
    }
  }, [fetchData])

  const current = state.key === requestKey ? state.data : null

  return {
    rows: current,
    loading: enabled && (current === null || refreshing),
    error: enabled ? state.error : null,
    reload,
  }
}
