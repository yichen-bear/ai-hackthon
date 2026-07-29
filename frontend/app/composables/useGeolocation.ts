/**
 * 地理定位 composable
 * 使用 Browser Geolocation API 取得座標，再透過反向地理編碼轉換為台灣行政區名稱
 */

/**
 * 反向地理編碼：將座標轉換為「縣市+鄉鎮市區」格式
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`
  const data = await $fetch<{
    address?: {
      city?: string
      county?: string
      town?: string
      suburb?: string
      district?: string
      village?: string
    }
  }>(url)

  const address = data?.address
  if (!address) {
    throw new Error('無法解析地址')
  }

  // 縣市：優先取 city，其次 county
  const city = address.city || address.county || ''
  // 鄉鎮市區：優先取 town，其次 district、suburb、village
  const district = address.town || address.district || address.suburb || address.village || ''

  if (!city && !district) {
    throw new Error('無法解析行政區')
  }

  return `${city}${district}`
}

/**
 * 使用 Geolocation API 取得座標並轉換為行政區名稱
 *
 * @returns `{ location, refresh }`
 * - `location`: 響應式字串，值為 "定位中..." | "台北市信義區" | "未設定位置"
 * - `refresh()`: 重新取得定位
 */
export function useGeolocation() {
  const location = ref<string>('定位中...')

  async function fetchLocation() {
    location.value = '定位中...'

    // 檢查瀏覽器是否支援 Geolocation API
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      location.value = '未設定位置'
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
        })
      })

      const { latitude, longitude } = position.coords
      const address = await reverseGeocode(latitude, longitude)
      location.value = address
    } catch {
      location.value = '未設定位置'
    }
  }

  function refresh() {
    fetchLocation()
  }

  // 初始化時自動取得定位
  fetchLocation()

  return {
    location,
    refresh,
  }
}
