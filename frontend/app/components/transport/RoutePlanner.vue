<script setup lang="ts">
/**
 * 智慧路線規劃（v6 精簡版）
 * - 無路線指引文字、無錯誤提示
 * - 起點預設：華南銀行國際會議中心
 * - 常用地點快捷：公司（微風南山大樓）、家（臺北文華東方酒店）
 */

import { calculateEmission } from '~/composables/useCarbonCalculator'
import type { TransportMode } from '~/composables/useCarbonCalculator'

const props = defineProps<{ origin?: string; destination?: string }>()
const emit = defineEmits<{ 'route-selected': [route: any] }>()

const runtimeConfig = useRuntimeConfig()
const GOOGLE_MAPS_KEY = runtimeConfig.public.googleMapsKey || ''

const { sharedDestination, sharedOrigin } = useTransportState()

// ─── 常用地點 ───
const PRESETS = {
  current: '華南銀行國際會議中心',
  company: '微風南山大樓',
  home: '臺北文華東方酒店',
}

// ─── 表單 ───
const originInput = ref(props.origin || '📍 我的位置')
const destinationInput = ref(props.destination || '')

watch(sharedDestination, (v) => { if (v) destinationInput.value = v })
watch(sharedOrigin, (v) => { if (v) originInput.value = v })
watch(() => props.origin, (v) => { if (v) originInput.value = v })
watch(() => props.destination, (v) => { if (v) destinationInput.value = v })

function swapInputs() { const t = originInput.value; originInput.value = destinationInput.value; destinationInput.value = t }
function setPreset(type: 'company' | 'home') { destinationInput.value = PRESETS[type] }

// ─── 運具 Tab ───
interface ModeTab { key: TransportMode; icon: string; label: string; gmapMode: string }
const modeTabs: ModeTab[] = [
  { key: 'bus', icon: '🚌', label: '公車', gmapMode: 'transit' },
  { key: 'metro', icon: '🚇', label: '捷運', gmapMode: 'transit' },
  { key: 'hsr', icon: '🚄', label: '高鐵', gmapMode: 'transit' },
  { key: 'train', icon: '🚃', label: '台鐵', gmapMode: 'transit' },
  { key: 'car', icon: '🚗', label: '汽車', gmapMode: 'driving' },
  { key: 'motorcycle', icon: '🏍️', label: '機車', gmapMode: 'driving' },
  { key: 'walk', icon: '🚶', label: '步行', gmapMode: 'walking' },
]
const selectedMode = ref<TransportMode>('metro')
const currentGmapMode = computed(() => modeTabs.find(t => t.key === selectedMode.value)?.gmapMode || 'transit')

// ─── 狀態 ───
const isSearching = ref(false)
const showMap = ref(false)
const routeSummary = ref<{ duration: string; distance: string; carbonEmission: number } | null>(null)

// ─── Google Maps Embed ───
const directionsMapUrl = computed(() => {
  if (!showMap.value || !destinationInput.value) return ''
  const orig = originInput.value === '📍 我的位置' ? PRESETS.current : originInput.value
  return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(destinationInput.value)}&mode=${currentGmapMode.value}`
})

const defaultMapUrl = computed(() => `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encodeURIComponent(PRESETS.current)}&zoom=15`)

const externalMapsUrl = computed(() => {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originInput.value)}&destination=${encodeURIComponent(destinationInput.value)}&travelmode=${currentGmapMode.value}`
})

// ─── 查詢路線 ───
async function handleSearch() {
  if (!destinationInput.value) return
  isSearching.value = true
  routeSummary.value = null

  // 嘗試從 API 取得距離和時間
  try {
    const data: any = await $fetch('/api/directions', {
      params: { origin: originInput.value, destination: destinationInput.value, mode: currentGmapMode.value },
    })
    if (data?.status === 'OK' && data.routes?.[0]?.legs?.[0]) {
      const leg = data.routes[0].legs[0]
      const distKm = parseFloat(leg.distance?.text) || 1
      routeSummary.value = {
        duration: leg.duration?.text || '',
        distance: leg.distance?.text || '',
        carbonEmission: calculateEmission(selectedMode.value, distKm),
      }
    }
  } catch {
    // API 不可用時不顯示摘要，只顯示地圖
  }

  showMap.value = true
  isSearching.value = false
  emit('route-selected', { mode: selectedMode.value, origin: originInput.value, destination: destinationInput.value })

  // DB
  try {
    await $fetch('/api/orders', {
      method: 'POST',
      body: { category: 'TRANSPORT', serviceType: '路線規劃', source: 'MANUAL', customerName: '使用者', customerPhone: '', storeId: destinationInput.value, details: { origin: originInput.value, destination: destinationInput.value, mode: selectedMode.value, duration: routeSummary.value?.duration, distance: routeSummary.value?.distance, plannedAt: new Date().toISOString() } },
    })
  } catch { /* silent */ }
}

function goToRide() { const { setRideDestination } = useTransportState(); setRideDestination(destinationInput.value) }
</script>

<template>
  <section class="rp" aria-label="路線規劃">
    <div class="rp__card">
      <h3 class="rp__title">路線規劃</h3>

      <!-- 起迄點 -->
      <div class="rp__inputs">
        <div class="rp__input-row"><span class="rp__dot rp__dot--green">●</span><input v-model="originInput" type="text" class="rp__input" placeholder="華南銀行國際會議中心" /></div>
        <button class="rp__swap" @click="swapInputs" aria-label="交換">⇅</button>
        <div class="rp__input-row"><span class="rp__dot rp__dot--red">●</span><input v-model="destinationInput" type="text" class="rp__input" placeholder="輸入目的地" /></div>
      </div>

      <!-- 起點快捷鍵 -->
      <div class="rp__presets">
        <button class="rp__preset" :class="{ 'rp__preset--active': originInput === '📍 我的位置' }" @click="originInput = '📍 我的位置'">📍 目前位置</button>
        <button class="rp__preset" :class="{ 'rp__preset--active': originInput === PRESETS.company }" @click="originInput = PRESETS.company">🏢 公司</button>
        <button class="rp__preset" :class="{ 'rp__preset--active': originInput === PRESETS.home }" @click="originInput = PRESETS.home">🏠 家</button>
      </div>

      <!-- 運具 -->
      <div class="rp__modes">
        <button v-for="tab in modeTabs" :key="tab.key" class="rp__mode" :class="{ 'rp__mode--active': selectedMode === tab.key }" @click="selectedMode = tab.key">
          <span>{{ tab.icon }}</span><span>{{ tab.label }}</span>
        </button>
      </div>

      <button class="rp__search-btn" :disabled="!destinationInput || isSearching" @click="handleSearch">{{ isSearching ? '查詢中...' : '查詢路線' }}</button>

      <!-- 路線摘要 -->
      <div v-if="routeSummary && !isSearching" class="rp__result">
        <div class="rp__result-stats">
          <div class="rp__stat"><span class="rp__stat-icon">📏</span><span class="rp__stat-val">{{ routeSummary.distance }}</span><span class="rp__stat-label">總距離</span></div>
          <div class="rp__stat"><span class="rp__stat-icon">⏱️</span><span class="rp__stat-val">{{ routeSummary.duration }}</span><span class="rp__stat-label">預估時間</span></div>
          <div v-if="routeSummary.carbonEmission" class="rp__stat"><span class="rp__stat-icon">🌱</span><span class="rp__stat-val">{{ routeSummary.carbonEmission }}g</span><span class="rp__stat-label">CO₂</span></div>
        </div>
        <div class="rp__result-actions">
          <button class="rp__action rp__action--ride" @click="goToRide">🚗 立即叫車</button>
          <NuxtLink class="rp__action rp__action--ticket" to="/transport?tab=ticket">🎫 購買車票</NuxtLink>
          <a class="rp__action rp__action--map" :href="externalMapsUrl" target="_blank" rel="noopener">🗺️ 開啟地圖</a>
        </div>
      </div>

      <!-- Google Maps -->
      <div v-if="GOOGLE_MAPS_KEY" class="rp__map-container">
        <iframe class="rp__map" :src="showMap ? directionsMapUrl : defaultMapUrl" frameborder="0" allowfullscreen loading="lazy" title="路線地圖"></iframe>
      </div>

    </div>
  </section>
</template>

<style scoped>
.rp { width: 100%; }
.rp__card { background: #fff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.rp__title { font-size: 15px; font-weight: 700; margin: 0; }

.rp__inputs { display: flex; flex-direction: column; gap: 0; position: relative; }
.rp__input-row { display: flex; align-items: center; gap: 8px; }
.rp__dot { font-size: 10px; width: 20px; text-align: center; }
.rp__dot--green { color: #16a34a; }
.rp__dot--red { color: #e11d48; }
.rp__input { flex: 1; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; }
.rp__input:focus { border-color: #f59e0b; }
.rp__swap { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border: 1px solid #e2e8f0; border-radius: 50%; background: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 1; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
.rp__swap:hover { border-color: #f59e0b; background: #fffbeb; }

.rp__presets { display: flex; gap: 8px; }
.rp__preset { padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 9999px; background: #fff; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .15s; }
.rp__preset:hover { border-color: #f59e0b; background: #fffbeb; }
.rp__preset--active { border-color: #f59e0b; background: #fffbeb; color: #f59e0b; font-weight: 600; }

.rp__modes { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.rp__modes::-webkit-scrollbar { display: none; }
.rp__mode { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 10px; font-weight: 500; color: #78716c; cursor: pointer; min-width: 44px; flex-shrink: 0; transition: all .15s; }
.rp__mode--active { border-color: #f59e0b; background: #fffbeb; color: #f59e0b; font-weight: 700; }
.rp__mode span:first-child { font-size: 16px; }

.rp__search-btn { padding: 12px; border: none; border-radius: 12px; background: #f59e0b; color: #fff; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
.rp__search-btn:disabled { opacity: .5; cursor: not-allowed; }

.rp__result { border: 2px solid #f59e0b; border-radius: 12px; padding: 12px; }
.rp__result-stats { display: flex; gap: 8px; margin-bottom: 10px; }
.rp__stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; background: #fffbeb; border-radius: 8px; }
.rp__stat-icon { font-size: 16px; }
.rp__stat-val { font-size: 14px; font-weight: 800; color: #1c1917; }
.rp__stat-label { font-size: 10px; color: #78716c; }
.rp__result-actions { display: flex; gap: 8px; }
.rp__action { flex: 1; padding: 10px; border-radius: 10px; font-size: 11px; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; border: none; font-family: inherit; display: flex; align-items: center; justify-content: center; }
.rp__action--ride { background: #0ea5e9; color: #fff; }
.rp__action--ticket { background: #fff; border: 1.5px solid #f59e0b; color: #f59e0b; }
.rp__action--map { background: #fff; border: 1.5px solid #0ea5e9; color: #0ea5e9; }

.rp__map-container { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
.rp__map { width: 100%; height: 350px; display: block; }
</style>
