/**
 * 多人中點餐廳推薦 composable
 * 呼叫後端 /api/midpoint/recommend API 並管理狀態
 */

interface TravelDetail {
  duration: number
  mode: string
  modeLabel: string
}

export interface RecommendedRestaurant {
  placeId: string
  name: string
  address: string
  rating: number
  userRatingsTotal: number
  priceLevel?: number
  location: { lat: number; lng: number }
  types: string[]
  openNow?: boolean
  score: number
  fairnessScore: number
  ratingScore: number
  travelDetails: TravelDetail[]
  maxTime: number
  minTime: number
  avgTime: number
}

interface MidpointOrigin {
  lat: number
  lng: number
  formattedAddress: string
}

interface MidpointResponse {
  success: boolean
  centroid?: { lat: number; lng: number }
  radius?: number
  origins?: MidpointOrigin[]
  fallbackUsed?: boolean
  cuisineType?: string | null
  recommendations: RecommendedRestaurant[]
  message?: string
  error?: string
}

export interface CarpoolPickup {
  passengerIndex: number
  passengerOrigin: { lat: number; lng: number }
  driverToPassenger: number
  passengerToDestination: number
  totalTime: number
  detourMinutes: number
}

export interface CarpoolGroup {
  driverIndex: number
  driverOrigin: { lat: number; lng: number }
  directDuration: number
  pickups: CarpoolPickup[]
}

interface CarpoolResponse {
  success: boolean
  carpoolGroups: CarpoolGroup[]
  destination?: { lat: number; lng: number }
  message?: string
  error?: string
}

export function useMidpoint() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const result = ref<MidpointResponse | null>(null)
  const carpoolLoading = ref(false)
  const carpoolError = ref<string | null>(null)
  const carpoolResult = ref<CarpoolResponse | null>(null)

  /**
   * 發送推薦請求
   * @param addresses 各人出發地址陣列
   * @param cuisineType 可選的料理類型偏好
   */
  async function fetchRecommendations(addresses: string[], cuisineType?: string) {
    loading.value = true
    error.value = null
    result.value = null
    carpoolResult.value = null
    carpoolError.value = null

    try {
      const body: { addresses: string[]; cuisineType?: string } = { addresses }
      if (cuisineType && cuisineType.trim()) {
        body.cuisineType = cuisineType.trim()
      }

      const data = await $fetch<MidpointResponse>('http://localhost:3001/api/midpoint/recommend', {
        method: 'POST',
        body,
      })

      if (!data.success) {
        error.value = data.error || '推薦失敗，請稍後再試'
        return
      }

      result.value = data
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err) {
        const fetchErr = err as { data?: { error?: string } }
        error.value = fetchErr.data?.error || '伺服器錯誤，請稍後再試'
      } else {
        error.value = '網路連線失敗，請確認後端服務是否啟動'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 發送共乘建議請求
   * @param restaurant 選定的餐廳
   */
  async function fetchCarpool(restaurant: RecommendedRestaurant) {
    if (!result.value?.origins) return

    carpoolLoading.value = true
    carpoolError.value = null
    carpoolResult.value = null

    try {
      const origins = result.value.origins.map((o) => ({ lat: o.lat, lng: o.lng }))
      const destination = restaurant.location
      const travelDetails = restaurant.travelDetails.map((t) => ({
        duration: t.duration,
        mode: t.mode,
      }))

      const data = await $fetch<CarpoolResponse>('http://localhost:3001/api/midpoint/carpool', {
        method: 'POST',
        body: { origins, destination, travelDetails },
      })

      if (!data.success) {
        carpoolError.value = data.error || data.message || '共乘建議失敗'
        return
      }

      carpoolResult.value = data
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err) {
        const fetchErr = err as { data?: { error?: string } }
        carpoolError.value = fetchErr.data?.error || '伺服器錯誤，請稍後再試'
      } else {
        carpoolError.value = '網路連線失敗，請確認後端服務是否啟動'
      }
    } finally {
      carpoolLoading.value = false
    }
  }

  /**
   * 產生共乘導航 Google Maps URL（含 waypoints）
   * @param driverOrigin 駕駛出發座標
   * @param passengerOrigins 要接的乘客出發座標
   * @param destination 餐廳座標
   */
  function buildCarpoolNavigationUrl(
    driverOrigin: { lat: number; lng: number },
    passengerOrigins: { lat: number; lng: number }[],
    destination: { lat: number; lng: number }
  ): string {
    const origin = `${driverOrigin.lat},${driverOrigin.lng}`
    const dest = `${destination.lat},${destination.lng}`
    const waypoints = passengerOrigins.map((p) => `${p.lat},${p.lng}`).join('|')
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`
  }

  /**
   * 清除結果
   */
  function reset() {
    loading.value = false
    error.value = null
    result.value = null
    carpoolLoading.value = false
    carpoolError.value = null
    carpoolResult.value = null
  }

  return {
    loading,
    error,
    result,
    carpoolLoading,
    carpoolError,
    carpoolResult,
    fetchRecommendations,
    fetchCarpool,
    buildCarpoolNavigationUrl,
    reset,
  }
}
