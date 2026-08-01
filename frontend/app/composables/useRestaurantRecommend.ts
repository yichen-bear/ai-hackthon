/**
 * 附近餐廳推薦 composable
 * 呼叫後端 /api/food/recommend API，取得基於距離+評分演算法的推薦餐廳
 */

export interface Restaurant {
  id: string
  name: string
  tag: string
  priceMin: number
  priceMax: number
  priceAvg: number
  rating: number
  distance: string
  distanceMeters: number
  image: string
  address: string
  openNow?: boolean
  userRatingsTotal: number
  score: number
  badge?: 'popular' | 'delivery' | 'available'
  badgeLabel?: string
  timeSlots: { time: string; available: boolean }[]
  location: { lat: number; lng: number }
}

interface RecommendResponse {
  success: boolean
  userLocation?: { lat: number; lng: number }
  radius?: number
  keyword?: string | null
  fallbackUsed?: boolean
  recommendations: Restaurant[]
  message?: string
  error?: string
}

export function useRestaurantRecommend() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const restaurants = ref<Restaurant[]>([])
  const userLocation = ref<{ lat: number; lng: number } | null>(null)
  const locationError = ref<string | null>(null)

  /**
   * 取得使用者目前位置（透過瀏覽器 Geolocation API）
   */
  function getUserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('您的瀏覽器不支援定位功能'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          userLocation.value = coords
          resolve(coords)
        },
        (err) => {
          let msg = '無法取得您的位置'
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = '請允許位置存取權限以取得附近餐廳推薦'
              break
            case err.POSITION_UNAVAILABLE:
              msg = '無法取得定位資訊'
              break
            case err.TIMEOUT:
              msg = '定位逾時，請重試'
              break
          }
          reject(new Error(msg))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 快取 1 分鐘內的位置
        }
      )
    })
  }

  /**
   * 呼叫後端取得推薦餐廳
   * @param options.keyword 料理類型關鍵字（可選）
   * @param options.mode 用餐模式: dine_in / takeout / delivery
   * @param options.radius 搜索半徑（公尺，預設 1500）
   * @param options.lat 手動指定緯度（略過 Geolocation）
   * @param options.lng 手動指定經度（略過 Geolocation）
   */
  async function fetchRecommendations(options: {
    keyword?: string
    mode?: 'dine_in' | 'takeout' | 'delivery'
    radius?: number
    lat?: number
    lng?: number
  } = {}) {
    loading.value = true
    error.value = null
    locationError.value = null

    try {
      // 決定位置來源
      let lat: number
      let lng: number

      if (options.lat !== undefined && options.lng !== undefined) {
        lat = options.lat
        lng = options.lng
        userLocation.value = { lat, lng }
      } else if (userLocation.value) {
        lat = userLocation.value.lat
        lng = userLocation.value.lng
      } else {
        try {
          const coords = await getUserLocation()
          lat = coords.lat
          lng = coords.lng
        } catch (locErr: unknown) {
          const locError = locErr instanceof Error ? locErr.message : '定位失敗'
          locationError.value = locError
          // 預設位置：台北市信義區（fallback）
          lat = 25.0330
          lng = 121.5654
          userLocation.value = { lat, lng }
        }
      }

      // 組裝 query string
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
      })

      if (options.radius) {
        params.set('radius', options.radius.toString())
      }
      if (options.keyword) {
        params.set('keyword', options.keyword)
      }
      if (options.mode) {
        params.set('mode', options.mode)
      }

      const data = await $fetch<RecommendResponse>(
        `http://localhost:3001/api/food/recommend?${params.toString()}`
      )

      if (!data.success) {
        error.value = data.error || '推薦失敗，請稍後再試'
        return
      }

      restaurants.value = data.recommendations
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
   * 重置狀態
   */
  function reset() {
    loading.value = false
    error.value = null
    restaurants.value = []
    locationError.value = null
  }

  return {
    loading,
    error,
    restaurants,
    userLocation,
    locationError,
    fetchRecommendations,
    getUserLocation,
    reset,
  }
}
