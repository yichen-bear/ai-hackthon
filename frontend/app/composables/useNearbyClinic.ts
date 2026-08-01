/**
 * 附近醫療資源 composable
 * 取得使用者定位 → 呼叫後端 API → 回傳分類排序後的診所/醫院列表
 *
 * 排序邏輯：
 *   1. 營業中 (isOpen === true) 排前面
 *   2. 未知狀態 (isOpen === null) 排中間
 *   3. 已關閉 (isOpen === false) 排後面
 *   4. 同狀態內按距離由近到遠排列
 */

export interface NearbyClinic {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  distance: number // 公尺
  distanceLabel: string
  department: string
  rating: number | null
  userRatingsTotal: number
  isOpen: boolean | null
  openingHours: { open_now?: boolean; weekday_text?: string[] } | null
  icon: string
  types: string[]
}

export interface ClinicDetail {
  placeId: string
  name: string
  address: string
  phone: string | null
  website: string | null
  googleMapsUrl: string | null
  rating: number | null
  userRatingsTotal: number
  lat: number
  lng: number
  openingHours: {
    isOpen: boolean | null
    weekdayText: string[]
    periods: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }>
  } | null
}

export function useNearbyClinic() {
  const clinics = ref<NearbyClinic[]>([])
  const loading = ref(false)
  const error = ref('')
  const userLat = ref<number | null>(null)
  const userLng = ref<number | null>(null)
  const locationReady = ref(false)

  // 可用科別列表（動態從結果中提取）
  const availableDepartments = computed(() => {
    const depts = new Set<string>()
    clinics.value.forEach((c) => {
      if (c.department) depts.add(c.department)
    })
    return ['全部', ...Array.from(depts).sort()]
  })

  /**
   * 取得使用者定位
   */
  async function getUserLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('瀏覽器不支援定位功能'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        (err) => {
          reject(new Error(`定位失敗：${err.message}`))
        },
        { timeout: 10000, enableHighAccuracy: true }
      )
    })
  }

  /**
   * 搜尋附近醫療資源
   * @param keyword 可選關鍵字（如科別名稱）
   * @param radius 搜尋半徑（公尺，預設 3000）
   */
  async function searchNearby(keyword = '', radius = 3000) {
    loading.value = true
    error.value = ''
    clinics.value = []

    try {
      // Step 1: 取得定位
      if (!userLat.value || !userLng.value) {
        const coords = await getUserLocation()
        userLat.value = coords.lat
        userLng.value = coords.lng
        locationReady.value = true
      }

      // Step 2: 呼叫後端 API
      const params = new URLSearchParams({
        lat: String(userLat.value),
        lng: String(userLng.value),
        radius: String(radius),
      })
      if (keyword) params.set('keyword', keyword)

      const response = await $fetch<{ results: NearbyClinic[] }>(
        `http://localhost:3001/api/nearby-clinic?${params.toString()}`
      )

      clinics.value = response.results || []
    } catch (e: any) {
      error.value = e?.data?.error || e?.message || '搜尋附近醫療資源失敗'
    } finally {
      loading.value = false
    }
  }

  /**
   * 取得地點詳細資訊（營業時間等）
   */
  async function getClinicDetail(placeId: string): Promise<ClinicDetail | null> {
    try {
      const detail = await $fetch<ClinicDetail>(
        `http://localhost:3001/api/nearby-clinic/${placeId}/details`
      )
      return detail
    } catch (e: any) {
      console.error('取得地點詳情失敗:', e)
      return null
    }
  }

  /**
   * 依科別篩選
   */
  function filterByDepartment(dept: string): NearbyClinic[] {
    if (dept === '全部') return clinics.value
    return clinics.value.filter((c) => c.department === dept)
  }

  /**
   * 取得營業狀態文字
   */
  function getStatusLabel(isOpen: boolean | null): string {
    if (isOpen === true) return '營業中'
    if (isOpen === false) return '已休息'
    return '營業狀態未知'
  }

  /**
   * 取得營業狀態 CSS class
   */
  function getStatusClass(isOpen: boolean | null): string {
    if (isOpen === true) return 'status--open'
    if (isOpen === false) return 'status--closed'
    return 'status--unknown'
  }

  return {
    clinics,
    loading,
    error,
    userLat,
    userLng,
    locationReady,
    availableDepartments,
    searchNearby,
    getClinicDetail,
    filterByDepartment,
    getStatusLabel,
    getStatusClass,
  }
}
