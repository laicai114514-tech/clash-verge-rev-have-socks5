import { fetchCacheData, setCacheData, useQuery } from '@/services/query-client'
import { checkUpdateSafe } from '@/services/update'

const LAST_CHECK_KEY = 'last_check_update'

export const readLastCheckTime = (): number | null => {
  const stored = localStorage.getItem(LAST_CHECK_KEY)
  if (!stored) return null
  const ts = parseInt(stored, 10)
  return isNaN(ts) ? null : ts
}

export const updateLastCheckTime = (timestamp?: number): number => {
  const now = timestamp ?? Date.now()
  localStorage.setItem(LAST_CHECK_KEY, now.toString())
  setCacheData([LAST_CHECK_KEY], now)
  return now
}

export const useUpdate = (_enabled: boolean = true) => {
  // Automatic checking is switched off in this build; updates are only looked up on demand.
  const shouldCheck = false

  const fetchUpdate = async () => {
    const result = await checkUpdateSafe()
    updateLastCheckTime()
    return result
  }

  const { data: updateInfo, isFetching: isValidating } = useQuery({
    queryKey: ['checkUpdate'],
    queryFn: fetchUpdate,
    enabled: shouldCheck,
    retry: 2,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 24 * 60 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  })

  const checkUpdate = async () => {
    const data = await fetchCacheData(['checkUpdate'], fetchUpdate)
    return { data }
  }

  const { data: lastCheckUpdate } = useQuery({
    queryKey: [LAST_CHECK_KEY],
    queryFn: readLastCheckTime,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return {
    updateInfo,
    checkUpdate,
    loading: isValidating,
    lastCheckUpdate: lastCheckUpdate ?? null,
  }
}
