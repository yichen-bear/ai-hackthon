<script setup lang="ts">
/**
 * YouBike 2.0 即時站點資訊面板
 * 串接台北市開放資料 API，每 60 秒自動刷新
 * 點擊站點顯示 Google Maps 嵌入地圖位置
 */
import type { YouBikeStation } from '~/composables/useYouBike'

const runtimeConfig = useRuntimeConfig()
const GOOGLE_MAPS_KEY = runtimeConfig.public.googleMapsKey || ''

const { stations, loading, error, lastUpdated, areas, startAutoRefresh, searchStations, getNearbyStations } = useYouBike()

onMounted(() => { startAutoRefresh() })

const searchKeyword = ref('')
const selectedArea = ref('全部')
const showNearby = ref(true)
const selectedStation = ref<YouBikeStation | null>(null)

const userLat = 25.033
const userLng = 121.565

const displayStations = computed<YouBikeStation[]>(() => {
  if (showNearby.value && !searchKeyword.value && selectedArea.value === '全部') {
    return getNearbyStations(userLat, userLng, 10)
  }
  let result = searchKeyword.value ? searchStations(searchKeyword.value) : stations.value
  if (selectedArea.value !== '全部') {
    result = result.filter(s => s.sarea === selectedArea.value)
  }
  return result.slice(0, 20)
})

const mapEmbedUrl = computed(() => {
  if (!selectedStation.value) return ''
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${selectedStation.value.lat},${selectedStation.value.lng}&zoom=16`
})

function selectStation(station: YouBikeStation) {
  selectedStation.value = selectedStation.value?.sno === station.sno ? null : station
}

function closeMap() { selectedStation.value = null }

function getAvailabilityClass(sbi: number, tot: number): string {
  const ratio = sbi / tot
  if (ratio === 0) return 'yb__status--empty'
  if (ratio <= 0.2) return 'yb__status--low'
  return 'yb__status--ok'
}

function getReturnClass(bemp: number, tot: number): string {
  const ratio = bemp / tot
  if (ratio === 0) return 'yb__status--empty'
  if (ratio <= 0.2) return 'yb__status--low'
  return 'yb__status--ok'
}
</script>

<template>
  <section class="yb" aria-label="YouBike 即時車況">
    <div class="yb__header">
      <div class="yb__title-row">
        <h3 class="yb__title">🚲 YouBike 2.0</h3>
        <span class="yb__realtime">即時車況</span>
      </div>
      <div v-if="lastUpdated" class="yb__updated">🔄 {{ lastUpdated }} 更新<span class="yb__auto-hint">（每 60 秒自動刷新）</span></div>
    </div>

    <!-- 搜尋 & 篩選 -->
    <div class="yb__filters">
      <input v-model="searchKeyword" class="yb__search" type="text" placeholder="🔍 搜尋站名或地址..." aria-label="搜尋 YouBike 站點" @input="showNearby = false" />
      <div class="yb__filter-row">
        <select v-model="selectedArea" class="yb__area-select" aria-label="篩選行政區" @change="showNearby = false">
          <option value="全部">全部行政區</option>
          <option v-for="a in areas" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="yb__nearby-btn" :class="{ 'yb__nearby-btn--active': showNearby }" @click="showNearby = true; searchKeyword = ''; selectedArea = '全部'">📍 附近</button>
      </div>
    </div>

    <div v-if="loading && stations.length === 0" class="yb__loading"><span class="yb__spinner"></span> 載入中...</div>
    <div v-if="error" class="yb__error">⚠️ {{ error }}</div>

    <!-- Google Maps 地圖（選中站點時） -->
    <div v-if="selectedStation" class="yb__map-section">
      <div class="yb__map-header">
        <span class="yb__map-title">📍 {{ selectedStation.sna }}</span>
        <button class="yb__map-close" @click="closeMap">✕</button>
      </div>
      <iframe class="yb__map-iframe" :src="mapEmbedUrl" frameborder="0" allowfullscreen loading="lazy" :title="`${selectedStation.sna} 地圖`"></iframe>
      <div class="yb__map-info">
        <span>📍 {{ selectedStation.ar }}</span>
        <span>🚲 可借 {{ selectedStation.sbi }} · 可還 {{ selectedStation.bemp }}</span>
      </div>
    </div>

    <!-- 站點列表 -->
    <div class="yb__list">
      <div v-for="station in displayStations" :key="station.sno" class="yb__station" :class="{ 'yb__station--active': selectedStation?.sno === station.sno }" @click="selectStation(station)">
        <div class="yb__station-header">
          <span class="yb__station-name">{{ station.sna }}</span>
          <span class="yb__station-area">{{ station.sarea }}</span>
        </div>
        <div class="yb__station-stats">
          <div class="yb__stat" :class="getAvailabilityClass(station.sbi, station.tot)">
            <span class="yb__stat-num">{{ station.sbi }}</span>
            <span class="yb__stat-label">可借</span>
          </div>
          <div class="yb__stat" :class="getReturnClass(station.bemp, station.tot)">
            <span class="yb__stat-num">{{ station.bemp }}</span>
            <span class="yb__stat-label">可還</span>
          </div>
          <div class="yb__stat yb__stat--total">
            <span class="yb__stat-num">{{ station.tot }}</span>
            <span class="yb__stat-label">總格</span>
          </div>
        </div>
        <p class="yb__station-addr">📍 {{ station.ar }}</p>
      </div>
      <div v-if="!loading && displayStations.length === 0" class="yb__empty"><p>找不到符合條件的站點</p></div>
    </div>

    <p class="yb__source">資料來源：臺北市政府交通局</p>
  </section>
</template>

<style scoped>
.yb { background: var(--color-bg-card, #fff); border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 16px; }
.yb__header { margin-bottom: 12px; }
.yb__title-row { display: flex; align-items: center; gap: 8px; }
.yb__title { margin: 0; font-size: 15px; font-weight: 700; }
.yb__realtime { font-size: 10px; font-weight: 600; color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 9999px; }
.yb__updated { font-size: 11px; color: #78716c; margin-top: 4px; }
.yb__auto-hint { color: #9ca3af; }
.yb__filters { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.yb__search { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; }
.yb__search:focus { border-color: #f59e0b; }
.yb__filter-row { display: flex; gap: 8px; }
.yb__area-select { flex: 1; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; }
.yb__nearby-btn { padding: 8px 14px; border: 1.5px solid #f59e0b; border-radius: 8px; background: transparent; color: #f59e0b; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.yb__nearby-btn--active { background: #f59e0b; color: #fff; }
.yb__loading { text-align: center; padding: 24px; font-size: 13px; color: #78716c; }
.yb__spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #f59e0b; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.yb__error { padding: 12px; background: #ffe4e6; color: #e11d48; border-radius: 10px; font-size: 13px; text-align: center; margin-bottom: 12px; }
.yb__map-section { margin-bottom: 12px; border: 2px solid #f59e0b; border-radius: 12px; overflow: hidden; }
.yb__map-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fffbeb; }
.yb__map-title { font-size: 13px; font-weight: 600; color: #1c1917; }
.yb__map-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #78716c; }
.yb__map-iframe { width: 100%; height: 200px; display: block; }
.yb__map-info { padding: 8px 12px; background: #f8fafc; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #78716c; }
.yb__list { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; }
.yb__station { padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: border-color .15s; }
.yb__station:hover { border-color: #f59e0b; }
.yb__station--active { border-color: #f59e0b; background: #fffbeb; }
.yb__station-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.yb__station-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.yb__station-area { font-size: 10px; color: #78716c; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
.yb__station-stats { display: flex; gap: 8px; margin-bottom: 6px; }
.yb__stat { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 4px; border-radius: 8px; background: #f8fafc; }
.yb__stat-num { font-size: 17px; font-weight: 800; }
.yb__stat-label { font-size: 10px; color: #78716c; }
.yb__status--ok .yb__stat-num { color: #16a34a; }
.yb__status--low .yb__stat-num { color: #d97706; }
.yb__status--empty .yb__stat-num { color: #e11d48; }
.yb__stat--total .yb__stat-num { color: #78716c; }
.yb__station-addr { margin: 0; font-size: 11px; color: #78716c; }
.yb__empty { text-align: center; padding: 24px; color: #78716c; font-size: 13px; }
.yb__source { margin: 12px 0 0; font-size: 10px; color: #9ca3af; text-align: center; }
</style>
