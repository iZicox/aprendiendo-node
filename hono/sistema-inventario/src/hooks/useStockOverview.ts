import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type {
  Page,
  StockLocationTotal,
  StockProductTotal,
  StockTotal,
} from '../types/api'

interface StockOverview {
  total: number
  byLocation: StockLocationTotal[]
  productCount: number
  outOfStockCount: number
}

interface OverviewState {
  key: string
  data: StockOverview | null
  error: string | null
}

const REQUEST_KEY = 'stock-overview'

export function useStockOverview() {
  const requestId = useRef(0)

  const [state, setState] = useState<OverviewState>({
    key: '',
    data: null,
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const currentRequest = ++requestId.current

    try {
      const [total, byLocation, products, outOfStock] = await Promise.all([
        apiRequest<StockTotal>('/stock/total'),
        apiRequest<StockLocationTotal[]>('/stock/by-location'),
        apiRequest<Page<StockProductTotal>>(
          '/stock/by-product?page=1&pageSize=1',
        ),
        apiRequest<Page<StockProductTotal>>(
          '/stock/out-of-stock?page=1&pageSize=1',
        ),
      ])

      if (currentRequest !== requestId.current) return

      setState({
        key: REQUEST_KEY,
        data: {
          total: total.total,
          byLocation,
          productCount: products.meta.total,
          outOfStockCount: outOfStock.meta.total,
        },
        error: null,
      })
    } catch (loadError) {
      if (currentRequest !== requestId.current) return

      setState((current) => ({
        key: REQUEST_KEY,
        data: current.data,
        error: getErrorMessage(loadError),
      }))
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const reload = useCallback(async () => {
    setRefreshing(true)

    try {
      await fetchData()
    } finally {
      setRefreshing(false)
    }
  }, [fetchData])

  return {
    data: state.data,
    loading: refreshing || state.key !== REQUEST_KEY,
    error: state.key === REQUEST_KEY ? state.error : null,
    reload,
  }
}
