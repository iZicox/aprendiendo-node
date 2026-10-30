import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, getErrorMessage } from '../lib/api'
import type { Location } from '../types/api'

interface LocationsState {
  key: string
  data: Location[]
  error: string | null
}

const REQUEST_KEY = 'locations'

export function useLocations() {
  const requestId = useRef(0)

  const [state, setState] = useState<LocationsState>({
    key: '',
    data: [],
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const currentRequest = ++requestId.current

    try {
      const data = await apiRequest<Location[]>('/locations')

      if (currentRequest !== requestId.current) return

      setState({ key: REQUEST_KEY, data, error: null })
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
    locations: state.data,
    loading: refreshing || state.key !== REQUEST_KEY,
    error: state.key === REQUEST_KEY ? state.error : null,
    reload,
  }
}
