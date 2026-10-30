import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { Page, StockRow } from '../types/api'

interface UseInventoryParams {
  locationId: number | null
  page: number
  pageSize: number
  includeZero: boolean
  enabled?: boolean
}

interface InventoryState {
  key: string
  data: Page<StockRow> | null
  error: string | null
}

export function useInventory({
  locationId,
  page,
  pageSize,
  includeZero,
  enabled = true,
}: UseInventoryParams) {
  const requestKey = enabled
    ? `inventory:${locationId ?? 'all'}:${page}:${pageSize}:${includeZero}`
    : 'inventory:disabled'
  const requestId = useRef(0)

  const [state, setState] = useState<InventoryState>({
    key: '',
    data: null,
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const currentRequest = ++requestId.current
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      includeZero: String(includeZero),
    })

    const path =
      locationId === null
        ? `/stock?${query.toString()}`
        : `/stock/locations/${locationId}?${query.toString()}`

    try {
      const data = await apiRequest<Page<StockRow>>(path)

      if (currentRequest !== requestId.current) return

      setState({ key: requestKey, data, error: null })
    } catch (loadError) {
      if (currentRequest !== requestId.current) return

      setState((current) => ({
        key: requestKey,
        data: current.data,
        error: getErrorMessage(loadError),
      }))
    }
  }, [includeZero, locationId, page, pageSize, requestKey])

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
    data: enabled ? state.data : null,
    loading: enabled && (refreshing || state.key !== requestKey),
    error: enabled && state.key === requestKey ? state.error : null,
    reload,
  }
}
