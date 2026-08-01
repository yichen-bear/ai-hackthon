/**
 * useYouBike - YouBike 2.0 即時車況資料
 * 資料源：臺北市政府交通局開放資料
 * 每 60 秒自動重新抓取最新車況
 */

export interface YouBikeStation {
  sno: string
  sna: string
  snaen: string
  tot: number
  sbi: number
  bemp: number
  lat: number
  lng: number
  ar: string
  aren: string
  act: string
  updateTime: string
  srcUpdateTime: string
  infoTime: string
  infoDate: string
  sareaen: string
  sarea: string
  // 實際 API 欄位名
  Quantity: number
  available_rent_bikes: number
  available_return_bikes: number
  latitude: number
  longitude: number
}

const YOUBIKE_API = 'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json'
const REFRESH_INTERVAL = 60_000

export function useYouBike() {
  const stations = useState<YouBikeStation[]>('youbike-stations', () => [])
  const loading = useState<boolean>('youbike-loading', () => false)
  const error = useState<string | null>('youbike-error', () => null)
  const lastUpdated = useState<string | null>('youbike-last-updated', () => null)

  let intervalId: ReturnType<typeof setInterval> | null = null

  async function fetchStations() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(YOUBIKE_API)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: any[] = await res.json()
      // 映射 API 欄位為統一格式
      stations.value = data
        .filter(s => s.act === '1')
        .map(s => ({
          ...s,
          // 統一欄位（API 使用不同命名）
          tot: s.Quantity || s.tot || 0,
          sbi: s.available_rent_bikes ?? s.sbi ?? 0,
          bemp: s.available_return_bikes ?? s.bemp ?? 0,
          lat: s.latitude || s.lat || 0,
          lng: s.longitude || s.lng || 0,
        }))
      lastUpdated.value = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    } catch (e: any) {
      error.value = e.message || '無法取得 YouBike 資料'
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh() {
    if (intervalId) return
    fetchStations()
    intervalId = setInterval(fetchStations, REFRESH_INTERVAL)
  }

  function stopAutoRefresh() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function getStationsByArea(area: string): YouBikeStation[] {
    return stations.value.filter(s => s.sarea === area)
  }

  function searchStations(keyword: string): YouBikeStation[] {
    if (!keyword.trim()) return stations.value
    const kw = keyword.trim().toLowerCase()
    return stations.value.filter(s =>
      s.sna.toLowerCase().includes(kw) ||
      s.ar.toLowerCase().includes(kw) ||
      s.sarea.includes(kw)
    )
  }

  function getNearbyStations(lat: number, lng: number, limit = 5): YouBikeStation[] {
    return [...stations.value]
      .map(s => ({ ...s, _dist: Math.sqrt((s.lat - lat) ** 2 + (s.lng - lng) ** 2) }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, limit)
  }

  const areas = computed(() => {
    const set = new Set(stations.value.map(s => s.sarea))
    return [...set].sort()
  })

  onUnmounted(() => { stopAutoRefresh() })

  return {
    stations, loading, error, lastUpdated, areas,
    fetchStations, startAutoRefresh, stopAutoRefresh,
    getStationsByArea, searchStations, getNearbyStations,
  }
}
