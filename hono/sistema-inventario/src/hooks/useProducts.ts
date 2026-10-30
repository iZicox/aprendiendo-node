import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { Page, Product } from '../types/api'

interface ProductsState {
  key: string
  data: Product[]
  error: string | null
}

export function useProducts(pageSize = 100) {
  const requestKey = `products:${pageSize}`
  const requestId = useRef(0)

  const [state, setState] = useState<ProductsState>({
    key: '',
    data: [],
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const currentRequest = ++requestId.current

    try {
      const data = await apiRequest<Page<Product>>(
        `/products?page=1&pageSize=${pageSize}`,
      )

      if (currentRequest !== requestId.current) return

      setState({ key: requestKey, data: data.items, error: null })
    } catch (loadError) {
      if (currentRequest !== requestId.current) return

      setState((current) => ({
        key: requestKey,
        data: current.data,
        error: getErrorMessage(loadError),
      }))
    }
  }, [pageSize, requestKey])

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
    products: state.data,
    loading: refreshing || state.key !== requestKey,
    error: state.key === requestKey ? state.error : null,
    reload,
  }
}
