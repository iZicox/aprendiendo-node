import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { StockRow } from '../types/api'

interface StockState {
  key: string
  data: StockRow | null
  error: string | null
}

export function useProductLocationStock(
  productId: number | null,
  locationId: number | null,
) {
  const enabled = productId !== null && locationId !== null
  const requestKey = enabled
    ? `stock:${productId}:${locationId}`
    : 'stock:disabled'
  const requestId = useRef(0)

  const [state, setState] = useState<StockState>({
    key: '',
    data: null,
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    if (productId === null || locationId === null) return

    const currentRequest = ++requestId.current

    try {
      const stock = await apiRequest<StockRow>(
        `/stock/locations/${locationId}/products/${productId}`,
      )

      if (currentRequest !== requestId.current) return

      setState({ key: requestKey, data: stock, error: null })
    } catch (loadError) {
      if (currentRequest !== requestId.current) return

      setState((current) => ({
        key: requestKey,
        data: current.data,
        error: getErrorMessage(loadError),
      }))
    }
  }, [locationId, productId, requestKey])

  useEffect(() => {
    if (!enabled) return
    void fetchData()
  }, [enabled, fetchData])

  const reload = useCallback(async () => {
    if (!enabled) return
    setRefreshing(true)

    try {
      await fetchData()
    } finally {
      setRefreshing(false)
    }
  }, [enabled, fetchData])

  return {
    stock: enabled && state.key === requestKey ? state.data : null,
    loading: enabled && (refreshing || state.key !== requestKey),
    error: enabled && state.key === requestKey ? state.error : null,
    reload,
  }
}
