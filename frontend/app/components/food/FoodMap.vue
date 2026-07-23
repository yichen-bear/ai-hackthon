<script setup lang="ts">
interface FoodMapProps {
  latitude?: number
  longitude?: number
  zoom?: number
}

type MapState = 'loading' | 'loaded' | 'error'

const props = withDefaults(defineProps<FoodMapProps>(), {
  latitude: 25.033,
  longitude: 121.5654,
  zoom: 15,
})

const mapState = ref<MapState>('loading')
let timeoutId: ReturnType<typeof setTimeout> | null = null

const mapSrc = computed(
  () =>
    `https://www.google.com/maps?q=${props.latitude},${props.longitude}&z=${props.zoom}&output=embed`
)

function onIframeLoad() {
  mapState.value = 'loaded'
}

function onIframeError() {
  mapState.value = 'error'
}

onMounted(() => {
  timeoutId = setTimeout(() => {
    if (mapState.value !== 'loaded') {
      mapState.value = 'error'
    }
  }, 8000)
})

onUnmounted(() => {
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
})
</script>

<template>
  <div class="food-map-container">
    <!-- 骨架屏：loading 狀態 -->
    <div v-if="mapState === 'loading'" class="map-skeleton" aria-label="地圖載入中" />

    <!-- 地圖 iframe：loaded 狀態 -->
    <iframe
      v-else-if="mapState === 'loaded'"
      :src="mapSrc"
      class="map-iframe"
      title="餐廳位置地圖"
      allowfullscreen
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      @load="onIframeLoad"
      @error="onIframeError"
    />

    <!-- 錯誤訊息：error 狀態 -->
    <div v-else class="map-error" aria-label="地圖載入失敗">
      🗺️ 地圖暫時無法顯示
    </div>

    <!--
      隱藏的 iframe 預先觸發 load/error，用於 loading 狀態的偵測。
      在 loading 狀態時仍需要 iframe 在 DOM 中以接收事件。
    -->
    <iframe
      v-if="mapState === 'loading'"
      :src="mapSrc"
      class="map-iframe map-iframe--hidden"
      title="餐廳位置地圖（載入中）"
      aria-hidden="true"
      @load="onIframeLoad"
      @error="onIframeError"
    />
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}

.food-map-container {
  position: relative;
  height: 260px;
  width: 100%;
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.map-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite;
}

.map-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.map-iframe--hidden {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  pointer-events: none;
}

.map-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-progress-bg, #f1f5f9);
  color: var(--color-text-secondary, #78716c);
  font-size: var(--text-sm, 13px);
  text-align: center;
}
</style>
