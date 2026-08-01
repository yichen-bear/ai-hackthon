<script setup lang="ts">
/**
 * 智慧路線規劃（v3）
 * - 多運具轉乘組合（TRANSIT 含公車+捷運+步行混合）
 * - 高鐵/台鐵無法到達提示 + 自動降級
 * - 路線文字步驟卡片（步行/公車路線號/捷運路線/上下車站）
 * - Google Maps Directions Embed
 * - DB 寫入
 */

import { calculateEmission } from '~/composables/useCarbonCalculator'
import type { TransportMode } from '~/composables/useCarbonCalculator'

const props = defineProps<{ origin?: string; destination?: string }>()
const emit = defineEmits<{ 'route-selected': [route: any] }>()

const runtimeConfig = useRuntimeConfig()
const GOOGLE_MAPS_KEY = runtimeConfig.public.googleMapsKey || ''

const { sharedDestination, sharedOrigin } = useTransportState()

// ─── 表單 ───
const originInput = ref(props.origin || '📍 我的位置')
const destinationInput = ref(props.destination || '')

watch(sharedDestination, (v) => { if (v) destinationInput.value = v })
watch(sharedOrigin, (v) => { if (v) originInput.value = v })
watch(() => props.origin, (v) => { if (v) originInput.value = v })
watch(() => props.destination, (v) => { if (v) destinationInput.value = v })

function swapInputs() { const t = originInput.value; originInput.value = destinationInput.value; destinationInput.value = t }

// ─── 運具 Tab ───
interface ModeTab { key: TransportMode; icon: string; label: string; gmapMode: string; transitType?: string }
const modeTabs: ModeTab[] = [
  { key: 'bus', icon: '🚌', label: '公車', gmapMode: 'transit', transitType: 'bus' },
  { key: 'metro', icon: '🚇', label: '捷運', gmapMode: 'transit', transitType: 'subway' },
  { key: 'hsr', icon: '🚄', label: '高鐵', gmapMode: 'transit', transitType: 'rail' },
  { key: 'train', icon: '🚃', label: '台鐵', gmapMode: 'transit', transitType: 'rail' },
  { key: 'car', icon: '🚗', label: '汽車', gmapMode: 'driving' },
  { key: 'motorcycle', icon: '🏍️', label: '機車', gmapMode: 'driving' },
  { key: 'walk', icon: '🚶', label: '步行', gmapMode: 'walking' },
]
const selectedMode = ref<TransportMode>('metro')
const currentGmapMode = computed(() => modeTabs.find(t => t.key === selectedMode.value)?.gmapMode || 'transit')

// ─── 路線結果 ───
const isSearching = ref(false)
const showMap = ref(false)
const routeSummary = ref<{ duration: string; distance: string; carbonEmission: number } | null>(null)
const warningMessage = ref('')
const routeSteps = ref<RouteStep[]>([])

interface RouteStep {
  type: 'walk' | 'bus' | 'metro' | 'train' | 'hsr'
  instruction: string
  detail?: string
  duration: string
}

// ─── Mock 多運具路線步驟生成 ───
function generateTransitSteps(mode: TransportMode): RouteStep[] {
  if (mode === 'walk') {
    return [{ type: 'walk', instruction: `🚶 步行前往目的地`, duration: '45 分鐘' }]
  }
  if (mode === 'car' || mode === 'motorcycle') {
    return [{ type: 'walk', instruction: `🚗 駕車前往目的地`, detail: '走信義路 → 基隆路', duration: '12 分鐘' }]
  }

  // Transit modes（公車/捷運/高鐵/台鐵 → 多運具混合）
  const steps: RouteStep[] = []

  if (mode === 'hsr' || mode === 'train') {
    // 高鐵/台鐵：判斷是否可直達
    const canReachByRail = Math.random() > 0.6 // 40% 機率無法到達
    if (!canReachByRail) {
      warningMessage.value = '⚠️ 此路段無高鐵/台鐵直接到達，已為您規劃捷運與公車的最佳轉乘組合'
      // 降級為捷運+公車組合
      steps.push(
        { type: 'walk', instruction: '🚶 步行 3 分鐘至捷運市政府站', duration: '3 分鐘' },
        { type: 'metro', instruction: '🚇 搭乘 板南線（往頂埔方向）', detail: '市政府站 → 台北車站（5 站）', duration: '12 分鐘' },
        { type: 'walk', instruction: '🚶 站內轉乘 步行 2 分鐘', duration: '2 分鐘' },
        { type: 'bus', instruction: '🚌 搭乘 307 公車', detail: '台北車站 → 目的地站（8 站）', duration: '18 分鐘' },
        { type: 'walk', instruction: '🚶 步行 4 分鐘至目的地', duration: '4 分鐘' },
      )
      return steps
    }
    // 可到達
    steps.push(
      { type: 'walk', instruction: '🚶 步行 5 分鐘至台北車站', duration: '5 分鐘' },
      { type: mode === 'hsr' ? 'hsr' : 'train', instruction: mode === 'hsr' ? '🚄 搭乘 高鐵 1309 車次' : '🚃 搭乘 自強號 172 車次', detail: '台北站 → 桃園站', duration: mode === 'hsr' ? '19 分鐘' : '35 分鐘' },
      { type: 'walk', instruction: '🚶 步行 8 分鐘至目的地', duration: '8 分鐘' },
    )
    return steps
  }

  if (mode === 'metro') {
    steps.push(
      { type: 'walk', instruction: '🚶 步行 4 分鐘至捷運市政府站', duration: '4 分鐘' },
      { type: 'metro', instruction: '🚇 搭乘 板南線（往南港展覽館方向）', detail: '市政府站 → 忠孝復興站（3 站）', duration: '7 分鐘' },
      { type: 'walk', instruction: '🚶 站內轉乘 步行 3 分鐘', duration: '3 分鐘' },
      { type: 'metro', instruction: '🚇 搭乘 文湖線（往動物園方向）', detail: '忠孝復興站 → 科技大樓站（2 站）', duration: '5 分鐘' },
      { type: 'walk', instruction: '🚶 步行 5 分鐘至目的地', duration: '5 分鐘' },
    )
  } else if (mode === 'bus') {
    steps.push(
      { type: 'walk', instruction: '🚶 步行 2 分鐘至信義路公車站', duration: '2 分鐘' },
      { type: 'bus', instruction: '🚌 搭乘 20 路公車', detail: '市府路口站 → 大安森林公園站（6 站）', duration: '15 分鐘' },
      { type: 'walk', instruction: '🚶 步行 3 分鐘至目的地', duration: '3 分鐘' },
    )
  }

  return steps
}

// ─── Google Maps Embed URL ───
const directionsMapUrl = computed(() => {
  if (!showMap.value) return ''
  const orig = originInput.value === '📍 我的位置' ? '台北101' : originInput.value
  return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(destinationInput.value)}&mode=${currentGmapMode.value}`
})

const defaultMapUrl = computed(() => `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=25.033,121.565&zoom=14`)

// ─── 查詢路線 ───
async function handleSearch() {
  if (!destinationInput.value) return
  isSearching.value = true
  routeSummary.value = null
  warningMessage.value = ''
  routeSteps.value = []

  await new Promise(r => setTimeout(r, 800))

  const baseDistance = Math.floor(Math.random() * 15) + 3
  const baseDuration = selectedMode.value === 'walk' ? baseDistance * 12 : ['hsr'].includes(selectedMode.value) ? Math.round(baseDistance * 1.2) : baseDistance * 3
  const emission = calculateEmission(selectedMode.value, baseDistance)

  // 生成步驟
  routeSteps.value = generateTransitSteps(selectedMode.value)

  // 計算總時間（從步驟累計）
  const totalDuration = routeSteps.value.reduce((sum, s) => sum + parseInt(s.duration), 0)

  routeSummary.value = {
    duration: `${totalDuration || baseDuration} 分鐘`,
    distance: `${baseDistance} km`,
    carbonEmission: emission,
  }

  showMap.value = true
  isSearching.value = false

  emit('route-selected', { mode: selectedMode.value, duration: totalDuration, distance: baseDistance })

  // DB 寫入
  try {
    await $fetch('/api/orders', {
      method: 'POST',
      body: {
        category: 'TRANSPORT', serviceType: '路線規劃', source: 'MANUAL',
        customerName: '使用者', customerPhone: '',
        storeId: destinationInput.value,
        details: { origin: originInput.value, destination: destinationInput.value, mode: selectedMode.value, duration: totalDuration, distance: `${baseDistance} km`, carbonEmission: emission, steps: routeSteps.value.length, plannedAt: new Date().toISOString() },
      },
    })
  } catch (e) { console.warn('路線規劃 DB 寫入失敗', e) }
}

function goToRide() {
  const { setRideDestination } = useTransportState()
  setRideDestination(destinationInput.value)
}

function getStepTypeClass(type: RouteStep['type']): string {
  return { walk: 'step--walk', bus: 'step--bus', metro: 'step--metro', train: 'step--train', hsr: 'step--hsr' }[type]
}
</script>

<template>
  <section class="rp" aria-label="智慧路線規劃">
    <div class="rp__card">
      <h3 class="rp__title">路線規劃</h3>

      <!-- 起迄點 -->
      <div class="rp__inputs">
        <div class="rp__input-row"><span class="rp__dot rp__dot--green">●</span><input v-model="originInput" type="text" class="rp__input" placeholder="📍 我的位置" /></div>
        <button class="rp__swap" @click="swapInputs" aria-label="交換起終點">⇅</button>
        <div class="rp__input-row"><span class="rp__dot rp__dot--red">●</span><input v-model="destinationInput" type="text" class="rp__input" placeholder="選擇終點" /></div>
      </div>

      <!-- 運具 Tab -->
      <div class="rp__modes">
        <button v-for="tab in modeTabs" :key="tab.key" class="rp__mode" :class="{ 'rp__mode--active': selectedMode === tab.key }" @click="selectedMode = tab.key">
          <span>{{ tab.icon }}</span><span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- 查詢按鈕 -->
      <button class="rp__search-btn" :disabled="!destinationInput || isSearching" @click="handleSearch">
        {{ isSearching ? '查詢中...' : '查詢路線' }}
      </button>

      <!-- 無法到達提示 -->
      <div v-if="warningMessage" class="rp__warning">{{ warningMessage }}</div>

      <!-- 路線摘要 -->
      <div v-if="routeSummary" class="rp__result">
        <div class="rp__result-stats">
          <div class="rp__stat"><span class="rp__stat-icon">📏</span><span class="rp__stat-val">{{ routeSummary.distance }}</span><span class="rp__stat-label">總距離</span></div>
          <div class="rp__stat"><span class="rp__stat-icon">⏱️</span><span class="rp__stat-val">{{ routeSummary.duration }}</span><span class="rp__stat-label">預估時間</span></div>
          <div class="rp__stat"><span class="rp__stat-icon">🌱</span><span class="rp__stat-val">{{ routeSummary.carbonEmission }}g</span><span class="rp__stat-label">CO₂</span></div>
        </div>
        <div class="rp__result-actions">
          <button class="rp__action rp__action--ride" @click="goToRide">🚗 立即叫車 (yoxi)</button>
          <NuxtLink class="rp__action rp__action--ticket" to="/transport?tab=ticket">🎫 購買車票</NuxtLink>
        </div>
      </div>

      <!-- Google Maps -->
      <div v-if="GOOGLE_MAPS_KEY" class="rp__map-container">
        <iframe class="rp__map" :src="showMap ? directionsMapUrl : defaultMapUrl" frameborder="0" allowfullscreen loading="lazy" title="路線地圖"></iframe>
      </div>
      <div v-else class="rp__map-placeholder">地圖金鑰未設定</div>

      <!-- 路線步驟卡片 -->
      <div v-if="routeSteps.length > 0" class="rp__steps">
        <h4 class="rp__steps-title">搭乘指引</h4>
        <div v-for="(step, idx) in routeSteps" :key="idx" class="rp__step" :class="getStepTypeClass(step.type)">
          <div class="rp__step-header">
            <span class="rp__step-instruction">{{ step.instruction }}</span>
            <span class="rp__step-duration">{{ step.duration }}</span>
          </div>
          <p v-if="step.detail" class="rp__step-detail">{{ step.detail }}</p>
        </div>
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

.rp__warning { padding: 10px 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; font-size: 12px; color: #92400e; line-height: 1.5; }

.rp__result { border: 2px solid #f59e0b; border-radius: 12px; padding: 12px; }
.rp__result-stats { display: flex; gap: 8px; margin-bottom: 10px; }
.rp__stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; background: #fffbeb; border-radius: 8px; }
.rp__stat-icon { font-size: 16px; }
.rp__stat-val { font-size: 14px; font-weight: 800; color: #1c1917; }
.rp__stat-label { font-size: 10px; color: #78716c; }
.rp__result-actions { display: flex; gap: 8px; }
.rp__action { flex: 1; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; border: none; font-family: inherit; }
.rp__action--ride { background: #0ea5e9; color: #fff; }
.rp__action--ticket { background: #fff; border: 1.5px solid #f59e0b; color: #f59e0b; display: flex; align-items: center; justify-content: center; }

.rp__map-container { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
.rp__map { width: 100%; height: 350px; display: block; }
.rp__map-placeholder { height: 80px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 12px; font-size: 12px; color: #9ca3af; }

/* Steps */
.rp__steps { display: flex; flex-direction: column; gap: 0; }
.rp__steps-title { font-size: 13px; font-weight: 700; margin: 0 0 10px; }
.rp__step { padding: 10px 12px; border-left: 3px solid #e2e8f0; margin-left: 8px; }
.rp__step:last-child { border-left-color: transparent; }
.rp__step-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rp__step-instruction { font-size: 13px; font-weight: 600; color: #1c1917; }
.rp__step-duration { font-size: 11px; color: #78716c; white-space: nowrap; }
.rp__step-detail { margin: 4px 0 0; font-size: 11px; color: #78716c; }

.step--walk { border-left-color: #78716c; }
.step--bus { border-left-color: #16a34a; }
.step--metro { border-left-color: #0ea5e9; }
.step--train { border-left-color: #7c3aed; }
.step--hsr { border-left-color: #f59e0b; }
</style>
