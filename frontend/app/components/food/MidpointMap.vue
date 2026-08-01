<script setup lang="ts">
/**
 * 多人中點地圖元件
 * 使用 Google Maps JavaScript API 顯示：
 * - 各人出發地標記（藍色，標示「第 N 人」）
 * - 選中的餐廳標記（紅色餐廳 icon）
 * - 自動 fitBounds 讓所有標記都在視窗內
 */

interface LatLng {
  lat: number
  lng: number
}

interface Origin {
  lat: number
  lng: number
  formattedAddress?: string
}

interface Props {
  origins: Origin[]
  restaurant?: { name: string; location: LatLng } | null
  centroid?: LatLng | null
}

const props = withDefaults(defineProps<Props>(), {
  restaurant: null,
  centroid: null,
})

const runtimeConfig = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
let map: google.maps.Map | null = null
let markers: google.maps.marker.AdvancedMarkerElement[] = []

// 載入 Google Maps JS SDK
const mapsLoaded = ref(false)
const mapsError = ref(false)

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve()
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Maps load failed')))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${runtimeConfig.public.googleMapsKey}&libraries=marker&language=zh-TW`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Maps load failed'))
    document.head.appendChild(script)
  })
}

async function initMap() {
  if (!mapContainer.value) return

  try {
    await loadGoogleMaps()
    mapsLoaded.value = true

    map = new google.maps.Map(mapContainer.value, {
      zoom: 13,
      center: props.centroid || { lat: 25.033, lng: 121.565 },
      mapId: 'midpoint-map',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    })

    updateMarkers()
  } catch {
    mapsError.value = true
  }
}

function clearMarkers() {
  markers.forEach((m) => (m.map = null))
  markers = []
}

function updateMarkers() {
  if (!map) return
  clearMarkers()

  const bounds = new google.maps.LatLngBounds()

  // 各人出發地標記
  props.origins.forEach((origin, idx) => {
    const pinEl = document.createElement('div')
    pinEl.className = 'midpoint-map-pin midpoint-map-pin--origin'
    pinEl.textContent = `${idx + 1}`
    pinEl.title = origin.formattedAddress || `第 ${idx + 1} 人`

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: origin.lat, lng: origin.lng },
      content: pinEl,
      title: origin.formattedAddress || `第 ${idx + 1} 人`,
    })

    markers.push(marker)
    bounds.extend({ lat: origin.lat, lng: origin.lng })
  })

  // 餐廳標記
  if (props.restaurant) {
    const pinEl = document.createElement('div')
    pinEl.className = 'midpoint-map-pin midpoint-map-pin--restaurant'
    pinEl.textContent = '🍽️'
    pinEl.title = props.restaurant.name

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: props.restaurant.location,
      content: pinEl,
      title: props.restaurant.name,
    })

    markers.push(marker)
    bounds.extend(props.restaurant.location)
  }

  // fitBounds
  if (markers.length > 1) {
    map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 })
  } else if (markers.length === 1) {
    map.setCenter(bounds.getCenter())
    map.setZoom(14)
  }
}

// 監聽 props 變化更新地圖
watch(() => [props.origins, props.restaurant], () => {
  if (map) {
    updateMarkers()
  }
}, { deep: true })

onMounted(() => {
  initMap()
})
</script>

<template>
  <div class="midpoint-map-wrapper">
    <!-- 地圖容器 -->
    <div ref="mapContainer" class="midpoint-map-container" />

    <!-- 載入中 -->
    <div v-if="!mapsLoaded && !mapsError" class="midpoint-map-loading">
      <div class="midpoint-map-spinner" />
      <span>載入地圖中...</span>
    </div>

    <!-- 錯誤 -->
    <div v-if="mapsError" class="midpoint-map-error">
      🗺️ 地圖暫時無法顯示
    </div>
  </div>
</template>

<style scoped>
.midpoint-map-wrapper {
  position: relative;
  width: 100%;
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
}

.midpoint-map-container {
  width: 100%;
  height: 100%;
}

.midpoint-map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f8fafc;
  font-size: 13px;
  color: #78716c;
}

.midpoint-map-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #f1f5f9;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.midpoint-map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef2f2;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
}
</style>

<style>
/* 全域樣式 — 自訂 pin 不能 scoped */
.midpoint-map-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.midpoint-map-pin--origin {
  background: #3b82f6;
  color: #fff;
  border: 2px solid #fff;
}

.midpoint-map-pin--restaurant {
  background: #fff;
  border: 2px solid #ff5252;
  font-size: 16px;
  width: 36px;
  height: 36px;
}
</style>
