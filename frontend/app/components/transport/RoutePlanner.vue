<script setup lang="ts">
/**
 * 智慧路線規劃元件
 * 多交通方式路線規劃，含即時路況與碳排標示
 */

import { calculateEmission } from '~/composables/useCarbonCalculator'
import type { TransportMode } from '~/composables/useCarbonCalculator'

export interface RouteOption {
  id: string
  mode: TransportMode
  duration: number
  cost?: number
  summary: string
  trafficStatus: 'smooth' | 'moderate' | 'congested'
  carbonEmission: number
  isRecommended: boolean
}

const props = defineProps<{
  origin?: string
  destination?: string
}>()

const emit = defineEmits<{
  'route-selected': [route: RouteOption]
}>()

const { sharedDestination, sharedOrigin } = useTransportState()

// 表單狀態
const originInput = ref(props.origin || '')
const destinationInput = ref(props.destination || '')

// 監聽 sharedDestination 變更自動填入
watch(sharedDestination, (val) => {
  if (val) destinationInput.value = val
})

watch(sharedOrigin, (val) => {
  if (val) originInput.value = val
})

// 監聽 props 變更
watch(() => props.origin, (val) => {
  if (val) originInput.value = val
})

watch(() => props.destination, (val) => {
  if (val) destinationInput.value = val
})

// 交通方式定義
interface ModeTab {
  key: TransportMode
  icon: string
  label: string
}

const modeTabs: ModeTab[] = [
  { key: 'bus', icon: '🚌', label: '公車' },
  { key: 'metro', icon: '🚇', label: '捷運' },
  { key: 'hsr', icon: '🚄', label: '高鐵' },
  { key: 'train', icon: '🚃', label: '台鐵' },
  { key: 'car', icon: '🚗', label: '汽車' },
  { key: 'motorcycle', icon: '🏍️', label: '機車' },
  { key: 'walk', icon: '🚶', label: '步行' },
]

const selectedMode = ref<TransportMode>('metro')

// 路況狀態映射
const trafficLabels: Record<string, string> = {
  smooth: '順暢',
  moderate: '略擁擠',
  congested: '擁擠',
}

const trafficBadgeType: Record<string, string> = {
  smooth: 'available',
  moderate: 'limited',
  congested: 'popular',
}

// 模擬路線結果
const routes = ref<RouteOption[]>([])
const isSearching = ref(false)

function handleSearch() {
  if (!originInput.value || !destinationInput.value) return

  isSearching.value = true

  // 模擬 API 延遲
  setTimeout(() => {
    routes.value = generateMockRoutes(selectedMode.value)
    isSearching.value = false
  }, 600)
}

function generateMockRoutes(mode: TransportMode): RouteOption[] {
  const baseDistance = 12 // 模擬 12km
  const emission = calculateEmission(mode, baseDistance)

  const mockRoutes: RouteOption[] = [
    {
      id: '1',
      mode,
      duration: mode === 'walk' ? 90 : mode === 'hsr' ? 15 : 25,
      cost: mode === 'walk' ? undefined : mode === 'hsr' ? 590 : 35,
      summary: getMockSummary(mode, 1),
      trafficStatus: 'smooth',
      carbonEmission: emission,
      isRecommended: true,
    },
    {
      id: '2',
      mode,
      duration: mode === 'walk' ? 95 : mode === 'hsr' ? 20 : 35,
      cost: mode === 'walk' ? undefined : mode === 'hsr' ? 590 : 28,
      summary: getMockSummary(mode, 2),
      trafficStatus: 'moderate',
      carbonEmission: Math.round(emission * 1.1),
      isRecommended: false,
    },
    {
      id: '3',
      mode,
      duration: mode === 'walk' ? 110 : mode === 'hsr' ? 25 : 45,
      cost: mode === 'walk' ? undefined : mode === 'hsr' ? 590 : 42,
      summary: getMockSummary(mode, 3),
      trafficStatus: 'congested',
      carbonEmission: Math.round(emission * 1.3),
      isRecommended: false,
    },
  ]

  return mockRoutes
}

function getMockSummary(mode: TransportMode, variant: number): string {
  const summaries: Record<TransportMode, string[]> = {
    bus: ['307路 → 步行 3min', '藍28路 → 轉乘 → 步行 5min', '299路 → 步行 8min'],
    metro: ['捷運藍線 → 步行 5min', '捷運紅線 → 轉藍線 → 步行 3min', '捷運綠線 → 步行 10min'],
    hsr: ['高鐵 1309 車次', '高鐵 1311 車次', '高鐵 1313 車次'],
    train: ['自強號 → 步行 5min', '莒光號 → 步行 8min', '區間車 → 步行 3min'],
    car: ['建國高架 → 信義路', '市民大道 → 忠孝東路', '環東快速道路 → 基隆路'],
    motorcycle: ['建國南路 → 信義路', '復興南路 → 忠孝東路', '敦化南路 → 仁愛路'],
    walk: ['沿信義路步行', '經過大安森林公園', '沿忠孝東路步行'],
  }
  return summaries[mode]?.[variant - 1] || '路線規劃中...'
}

function handleUseCurrentLocation() {
  originInput.value = '目前位置'
}
</script>

<template>
  <section class="route-planner" aria-label="智慧路線規劃">
    <div class="planner-card">
      <h3 class="planner-title">路線規劃</h3>

      <!-- 起迄點輸入 -->
      <div class="input-group">
        <div class="input-row">
          <span class="input-icon" aria-hidden="true">🟢</span>
          <input
            v-model="originInput"
            type="text"
            class="route-input"
            placeholder="輸入起點"
            aria-label="起點"
          />
          <button
            class="location-btn"
            aria-label="使用目前位置"
            @click="handleUseCurrentLocation"
          >
            📍
          </button>
        </div>
        <div class="input-row">
          <span class="input-icon" aria-hidden="true">🔴</span>
          <input
            v-model="destinationInput"
            type="text"
            class="route-input"
            placeholder="輸入終點"
            aria-label="終點"
          />
        </div>
      </div>

      <!-- 交通方式 Tab -->
      <div class="mode-tabs" role="tablist" aria-label="交通方式選擇">
        <button
          v-for="tab in modeTabs"
          :key="tab.key"
          class="mode-tab"
          :class="{ active: selectedMode === tab.key }"
          role="tab"
          :aria-selected="selectedMode === tab.key"
          :aria-label="tab.label"
          @click="selectedMode = tab.key"
        >
          <span class="mode-tab-icon" aria-hidden="true">{{ tab.icon }}</span>
          <span class="mode-tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- 查詢按鈕 -->
      <button
        class="search-btn"
        :disabled="!originInput || !destinationInput"
        aria-label="查詢路線"
        @click="handleSearch"
      >
        {{ isSearching ? '查詢中...' : '查詢路線' }}
      </button>

      <!-- 路線結果 -->
      <div v-if="routes.length > 0" class="route-results" aria-live="polite">
        <div
          v-for="route in routes"
          :key="route.id"
          class="route-result-card"
          :class="{ recommended: route.isRecommended }"
        >
          <button
            class="route-result-btn"
            :aria-label="`${route.isRecommended ? '推薦路線：' : ''}${route.summary}，預估${route.duration}分鐘`"
            @click="emit('route-selected', route)"
          >
            <!-- 推薦標記 -->
            <div v-if="route.isRecommended" class="recommended-badge">推薦</div>

            <div class="route-result-main">
              <span class="result-summary">{{ route.summary }}</span>
              <div class="result-meta">
                <span class="result-duration">⏱ {{ route.duration }}min</span>
                <span v-if="route.cost" class="result-cost">💰 ${{ route.cost }}</span>
                <span
                  class="result-traffic"
                  :class="`traffic-${route.trafficStatus}`"
                >
                  {{ trafficLabels[route.trafficStatus] }}
                </span>
              </div>
              <div class="result-footer">
                <span class="result-carbon">🌱 {{ route.carbonEmission }}g CO₂</span>
                <span
                  v-if="route.trafficStatus === 'congested'"
                  class="congestion-warn"
                >
                  建議避開
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.route-planner {
  width: 100%;
}

.planner-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.planner-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

/* 輸入區 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-sm, 6px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
}

.input-icon {
  font-size: var(--text-xs, 11px);
  flex-shrink: 0;
}

.route-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  outline: none;
  min-height: 28px;
}

.route-input::placeholder {
  color: var(--color-text-disabled, #cbd5e1);
}

.location-btn {
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: var(--text-lg, 17px);
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
  transition: background-color 0.15s ease;
}

.location-btn:active {
  background-color: var(--color-primary-light, #fffbeb);
}

/* 交通方式 Tab */
.mode-tabs {
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: var(--space-3, 12px);
  padding: var(--space-1, 4px) 0;
  -webkit-overflow-scrolling: touch;
}

.mode-tabs::-webkit-scrollbar {
  display: none;
}

.mode-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 44px;
  min-height: 44px;
  padding: var(--space-2, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.mode-tab.active {
  background-color: var(--color-secondary, #0ea5e9);
  border-color: var(--color-secondary, #0ea5e9);
  color: #ffffff;
}

.mode-tab:not(.active):active {
  background-color: var(--color-secondary-light, #e0f2fe);
}

.mode-tab-icon {
  font-size: var(--text-base, 15px);
}

.mode-tab-label {
  font-size: 10px;
  color: var(--color-text-secondary, #78716c);
}

.mode-tab.active .mode-tab-label {
  color: #ffffff;
}

/* 查詢按鈕 */
.search-btn {
  width: 100%;
  min-height: 44px;
  padding: var(--space-3, 12px);
  border: none;
  border-radius: var(--radius-md, 12px);
  background-color: var(--color-primary, #f59e0b);
  color: #ffffff;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.search-btn:active {
  opacity: 0.8;
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 路線結果 */
.route-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  margin-top: var(--space-4, 16px);
}

.route-result-card {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  position: relative;
}

.route-result-card.recommended {
  border-color: var(--color-secondary, #0ea5e9);
  border-width: 2px;
}

.route-result-btn {
  width: 100%;
  padding: var(--space-3, 12px);
  border: none;
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: background-color 0.15s ease;
}

.route-result-btn:active {
  background-color: var(--color-secondary-light, #e0f2fe);
}

.recommended-badge {
  display: inline-block;
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-secondary, #0ea5e9);
  background-color: var(--color-secondary-light, #e0f2fe);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  margin-bottom: var(--space-2, 8px);
}

.route-result-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
}

.result-summary {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.result-meta {
  display: flex;
  gap: var(--space-3, 12px);
  align-items: center;
}

.result-duration,
.result-cost {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.result-traffic {
  font-size: var(--text-xs, 11px);
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
}

.traffic-smooth {
  background-color: #dcfce7;
  color: #15803d;
}

.traffic-moderate {
  background-color: var(--color-primary-light, #fffbeb);
  color: var(--color-primary, #f59e0b);
}

.traffic-congested {
  background-color: #ffe4e6;
  color: #e11d48;
}

.result-footer {
  display: flex;
  gap: var(--space-3, 12px);
  align-items: center;
  margin-top: var(--space-1, 4px);
}

.result-carbon {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.congestion-warn {
  font-size: var(--text-xs, 11px);
  color: #e11d48;
  font-weight: 500;
}
</style>
