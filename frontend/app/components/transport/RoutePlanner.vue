<script setup lang="ts">
/**
 * 智慧路線規劃（v5 - 除錯版）
 * - 完全移除所有 mock/hardcoded 假資料
 * - 搭乘指引 100% 依賴 Google Directions API 回傳結果
 * - 使用者輸入的起終點動態帶入 API request
 * - Fallback：API 未回傳時顯示 loading，不顯示錯誤歷史資料
 */

import { calculateEmission } from '~/composables/useCarbonCalculator'
import type { TransportMode } from '~/composables/useCarbonCalculator'

const props = defineProps<{ origin?: string; destination?: string }>()
const emit = defineEmits<{ 'route-selected': [route: any] }>()

const runtimeConfig = useRuntimeConfig()
const GOOGLE_MAPS_KEY = runtimeConfig.public.googleMapsKey || ''

const { sharedDestination, sharedOrigin } = useTransportState()

// ─── 表單（動態，無 hardcode） ───
const originInput = ref(props.origin || '📍 我的位置')
const destinationInput = ref(props.destination || '')

watch(sharedDestination, (v) => { if (v) destinationInput.value = v })
watch(sharedOrigin, (v) => { if (v) originInput.value = v })
watch(() => props.origin, (v) => { if (v) originInput.value = v })
watch(() => props.destination, (v) => { if (v) destinationInput.value = v })

function swapInputs() { const t = originInput.value; originInput.value = destinationInput.value; destinationInput.value = t }

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

// ─── 路線結果狀態 ───
const isSearching = ref(false)
const showMap = ref(false)
const routeSummary = ref<{ duration: string; distance: string; carbonEmission: number } | null>(null)
const warningMessage = ref('')
const routeSteps = ref<ParsedStep[]>([])
const apiError = ref('')

interface ParsedStep {
  type: 'walk' | 'bus' | 'metro' | 'rail' | 'drive'
  icon: string
  instruction: string
  departureStop?: string
  arrivalStop?: string
  lineName?: string
  numStops?: number
  duration: string
  distance: string
  ttsText: string
}

// ─── 動態解析 API steps（無任何 hardcode） ───
function parseSteps(steps: any[]): ParsedStep[] {
  return steps.map((step) => {
    const duration = step.duration?.text || ''
    const distance = step.distance?.text || ''

    if (step.travel_mode === 'WALKING') {
      const text = step.html_instructions ? stripHtml(step.html_instructions) : `步行 ${duration}`
      return { type: 'walk' as const, icon: '🚶', instruction: `🚶 ${text}`, duration, distance, ttsText: `步行${duration}，${text}` }
    }

    if (step.travel_mode === 'TRANSIT') {
      const td = step.transit_details || step.transit || {}
      const line = td.line || {}
      const vehicle = line.vehicle || {}
      const vType = vehicle.type || ''
      const lineName = line.short_name || line.name || ''
      const depStop = td.departure_stop?.name || ''
      const arrStop = td.arrival_stop?.name || ''
      const nStops = td.num_stops || 0

      let icon = '🚌', type: ParsedStep['type'] = 'bus'
      if (['SUBWAY', 'METRO_RAIL'].includes(vType)) { icon = '🚇'; type = 'metro' }
      else if (['HEAVY_RAIL', 'HIGH_SPEED_TRAIN', 'COMMUTER_TRAIN'].includes(vType)) { icon = '�'; type = 'rail' }

      return { type, icon, instruction: `${icon} 搭乘 ${lineName}`, lineName, departureStop: depStop, arrivalStop: arrStop, numStops: nStops, duration, distance, ttsText: `搭乘${lineName}，從${depStop}到${arrStop}，${nStops}站，${duration}` }
    }

    if (step.travel_mode === 'DRIVING') {
      const text = step.html_instructions ? stripHtml(step.html_instructions) : `駕車 ${duration}`
      return { type: 'drive' as const, icon: '🚗', instruction: `🚗 ${text}`, duration, distance, ttsText: `駕車${duration}，${text}` }
    }

    return { type: 'walk' as const, icon: '📍', instruction: step.html_instructions ? stripHtml(step.html_instructions) : '前進', duration, distance, ttsText: `${duration}` }
  })
}

function stripHtml(html: string): string { return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() }

// ─── 透過後端 proxy 呼叫 Directions API 取得真實資料 ───
async function fetchDirections(origin: string, destination: string, mode: string) {
  // 嘗試透過 server route 取得真實 Directions JSON
  try {
    const data = await $fetch('/api/directions', {
      params: { origin, destination, mode },
    })
    return data
  } catch {
    // fallback：若無 server route，回傳 null（僅用地圖 embed 展示）
    return null
  }
}

// ─── Google Maps Embed URLs（使用者輸入動態帶入） ───
const resolvedOrigin = computed(() => originInput.value === '📍 我的位置' ? '我的位置' : originInput.value)

const directionsMapUrl = computed(() => {
  if (!showMap.value || !destinationInput.value) return ''
  const orig = originInput.value === '📍 我的位置' ? 'My+Location' : encodeURIComponent(originInput.value)
  return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${orig}&destination=${encodeURIComponent(destinationInput.value)}&mode=${currentGmapMode.value}`
})

const defaultMapUrl = computed(() => `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=25.033,121.565&zoom=14`)

const externalMapsUrl = computed(() => {
  const orig = originInput.value === '📍 我的位置' ? '' : encodeURIComponent(originInput.value)
  return `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${encodeURIComponent(destinationInput.value)}&travelmode=${currentGmapMode.value}`
})

// ─── 查詢路線（100% 動態，無 mock） ───
async function handleSearch() {
  if (!destinationInput.value) return

  // 清空舊資料
  isSearching.value = true
  routeSummary.value = null
  warningMessage.value = ''
  routeSteps.value = []
  apiError.value = ''

  const orig = originInput.value === '📍 我的位置' ? 'My Location' : originInput.value
  const dest = destinationInput.value

  // 嘗試取得真實 API 資料
  const apiResult = await fetchDirections(orig, dest, currentGmapMode.value)

  if (apiResult && apiResult.routes && apiResult.routes.length > 0) {
    // ─── 真實 API 回傳：動態解析 ───
    const leg = apiResult.routes[0].legs[0]
    routeSteps.value = parseSteps(leg.steps)

    const distKm = parseFloat(leg.distance?.text) || 1
    const emission = calculateEmission(selectedMode.value, distKm)

    routeSummary.value = {
      duration: leg.duration?.text || '',
      distance: leg.distance?.text || '',
      carbonEmission: emission,
    }

    // 高鐵/台鐵無法到達偵測
    if (['hsr', 'train'].includes(selectedMode.value)) {
      const hasRail = routeSteps.value.some(s => s.type === 'rail')
      if (!hasRail) {
        warningMessage.value = '⚠️ 此路段無高鐵/台鐵直接到達，已為您規劃最佳轉乘組合'
      }
    }
  } else {
    // ─── 無法取得 API JSON（使用 Embed 地圖 + 提示） ───
    // 地圖仍會正確顯示路線（Embed Directions 會自動算）
    // 但文字步驟無法取得，顯示提示
    routeSummary.value = { duration: '見地圖', distance: '見地圖', carbonEmission: 0 }
    apiError.value = '文字導航資料載入中... 請參考下方地圖路線'
  }

  showMap.value = true
  isSearching.value = false
  emit('route-selected', { mode: selectedMode.value, origin: orig, destination: dest })

  // DB 寫入
  try {
    await $fetch('/api/orders', {
      method: 'POST',
      body: { category: 'TRANSPORT', serviceType: '路線規劃', source: 'MANUAL', customerName: '使用者', customerPhone: '', storeId: dest, details: { origin: orig, destination: dest, mode: selectedMode.value, duration: routeSummary.value?.duration, distance: routeSummary.value?.distance, stepsCount: routeSteps.value.length, plannedAt: new Date().toISOString() } },
    })
  } catch (e) { /* silent */ }
}

function goToRide() { const { setRideDestination } = useTransportState(); setRideDestination(destinationInput.value) }

function getStepClass(type: ParsedStep['type']): string {
  return { walk: 'rp__step--walk', bus: 'rp__step--bus', metro: 'rp__step--metro', rail: 'rp__step--rail', drive: 'rp__step--drive' }[type]
}
</script>

<template>
  <section class="rp" aria-label="路線規劃">
    <div class="rp__card">
      <h3 class="rp__title">路線規劃</h3>

      <!-- 起迄點（動態帶入） -->
      <div class="rp__inputs">
        <div class="rp__input-row"><span class="rp__dot rp__dot--green">●</span><input v-model="originInput" type="text" class="rp__input" placeholder="📍 我的位置" /></div>
        <button class="rp__swap" @click="swapInputs" aria-label="交換">⇅</button>
        <div class="rp__input-row"><span class="rp__dot rp__dot--red">●</span><input v-model="destinationInput" type="text" class="rp__input" placeholder="輸入目的地" /></div>
      </div>

      <!-- 運具 -->
      <div class="rp__modes">
        <button v-for="tab in modeTabs" :key="tab.key" class="rp__mode" :class="{ 'rp__mode--active': selectedMode === tab.key }" @click="selectedMode = tab.key">
          <span>{{ tab.icon }}</span><span>{{ tab.label }}</span>
        </button>
      </div>

      <button class="rp__search-btn" :disabled="!destinationInput || isSearching" @click="handleSearch">{{ isSearching ? '查詢中...' : '查詢路線' }}</button>

      <!-- 警告 -->
      <div v-if="warningMessage" class="rp__warning">{{ warningMessage }}</div>

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
        </div>
      </div>

      <!-- Google Maps（使用者輸入動態帶入，無 hardcode） -->
      <div v-if="GOOGLE_MAPS_KEY" class="rp__map-container">
        <iframe class="rp__map" :src="showMap ? directionsMapUrl : defaultMapUrl" frameborder="0" allowfullscreen loading="lazy" title="路線地圖"></iframe>
      </div>

      <!-- 搭乘指引（100% 來自 API，無 mock） -->
      <div v-if="isSearching" class="rp__loading">載入搭乘指引中...</div>

      <div v-else-if="routeSteps.length > 0" class="rp__steps">
        <div class="rp__steps-header">
          <h4 class="rp__steps-title">搭乘指引</h4>
          <a class="rp__steps-link" :href="externalMapsUrl" target="_blank" rel="noopener">🗺️ Google 地圖開啟</a>
        </div>
        <div v-for="(step, idx) in routeSteps" :key="idx" class="rp__step" :class="getStepClass(step.type)">
          <div class="rp__step-main">
            <span class="rp__step-icon">{{ step.icon }}</span>
            <div class="rp__step-content">
              <p class="rp__step-instruction">{{ step.instruction }}</p>
              <p v-if="step.departureStop" class="rp__step-stops">📍 {{ step.departureStop }} → 🏁 {{ step.arrivalStop }}<span v-if="step.numStops">（{{ step.numStops }} 站）</span></p>
            </div>
          </div>
          <div class="rp__step-meta">
            <span class="rp__step-duration">{{ step.duration }}</span>
            <span class="rp__step-distance">{{ step.distance }}</span>
          </div>
        </div>
      </div>

      <!-- Fallback：API 無法取得步驟時 -->
      <div v-else-if="apiError && showMap" class="rp__fallback">
        <p>{{ apiError }}</p>
        <a class="rp__steps-link" :href="externalMapsUrl" target="_blank" rel="noopener">🗺️ 在 Google 地圖查看完整路線</a>
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

.rp__modes { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.rp__modes::-webkit-scrollbar { display: none; }
.rp__mode { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 10px; font-weight: 500; color: #78716c; cursor: pointer; min-width: 44px; flex-shrink: 0; transition: all .15s; }
.rp__mode--active { border-color: #f59e0b; background: #fffbeb; color: #f59e0b; font-weight: 700; }
.rp__mode span:first-child { font-size: 16px; }

.rp__search-btn { padding: 12px; border: none; border-radius: 12px; background: #f59e0b; color: #fff; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
.rp__search-btn:disabled { opacity: .5; cursor: not-allowed; }

.rp__warning { padding: 10px 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; font-size: 12px; color: #92400e; }

.rp__result { border: 2px solid #f59e0b; border-radius: 12px; padding: 12px; }
.rp__result-stats { display: flex; gap: 8px; margin-bottom: 10px; }
.rp__stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; background: #fffbeb; border-radius: 8px; }
.rp__stat-icon { font-size: 16px; }
.rp__stat-val { font-size: 14px; font-weight: 800; color: #1c1917; }
.rp__stat-label { font-size: 10px; color: #78716c; }
.rp__result-actions { display: flex; gap: 8px; }
.rp__action { flex: 1; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; border: none; font-family: inherit; display: flex; align-items: center; justify-content: center; }
.rp__action--ride { background: #0ea5e9; color: #fff; }
.rp__action--ticket { background: #fff; border: 1.5px solid #f59e0b; color: #f59e0b; }

.rp__map-container { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
.rp__map { width: 100%; height: 350px; display: block; }

.rp__loading { text-align: center; padding: 20px; font-size: 13px; color: #78716c; }

.rp__steps { display: flex; flex-direction: column; gap: 0; }
.rp__steps-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.rp__steps-title { font-size: 13px; font-weight: 700; margin: 0; }
.rp__steps-link { font-size: 11px; color: #0ea5e9; text-decoration: none; font-weight: 600; }

.rp__step { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 12px; border-left: 4px solid #e2e8f0; margin-left: 12px; }
.rp__step:last-child { border-left-color: transparent; }
.rp__step--walk { border-left-color: #94a3b8; }
.rp__step--bus { border-left-color: #16a34a; }
.rp__step--metro { border-left-color: #0ea5e9; }
.rp__step--rail { border-left-color: #7c3aed; }
.rp__step--drive { border-left-color: #f59e0b; }

.rp__step-main { display: flex; gap: 8px; flex: 1; }
.rp__step-icon { font-size: 18px; flex-shrink: 0; }
.rp__step-content { display: flex; flex-direction: column; gap: 2px; }
.rp__step-instruction { margin: 0; font-size: 13px; font-weight: 600; color: #1c1917; }
.rp__step-stops { margin: 0; font-size: 11px; color: #78716c; }

.rp__step-meta { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.rp__step-duration { font-size: 12px; font-weight: 700; color: #1c1917; }
.rp__step-distance { font-size: 10px; color: #9ca3af; }

.rp__fallback { text-align: center; padding: 16px; font-size: 13px; color: #78716c; display: flex; flex-direction: column; align-items: center; gap: 8px; }
</style>
