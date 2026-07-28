<script setup lang="ts">
/**
 * 共享運具與租賃元件
 * 地圖 + 列表雙視圖，支援腳踏車/機車/汽車篩選
 */

export type VehicleType = 'bike' | 'scooter' | 'car'
export type ViewMode = 'list' | 'map'
export type AvailabilityStatus = 'available' | 'limited' | 'empty'

export interface GeoLocation {
  lat: number
  lng: number
}

export interface VehicleStation {
  id: string
  name: string
  distance: number
  availableCount: number
  totalCount: number
  status: AvailabilityStatus
  location: GeoLocation
  provider: string
}

export interface VehicleItem {
  id: string
  code: string
  batteryLevel?: number
}

const props = defineProps<{
  vehicleType?: VehicleType
  userLocation?: GeoLocation
}>()

const emit = defineEmits<{
  'rent-vehicle': [stationId: string, vehicleId: string]
}>()

// 運具類型
interface VehicleTab {
  key: VehicleType
  icon: string
  label: string
}

const vehicleTabs: VehicleTab[] = [
  { key: 'bike', icon: '🚲', label: '腳踏車' },
  { key: 'scooter', icon: '🛵', label: '機車' },
  { key: 'car', icon: '🚗', label: '汽車' },
]

const selectedType = ref<VehicleType>(props.vehicleType || 'bike')
const viewMode = ref<ViewMode>('list')
const expandedStationId = ref<string | null>(null)

// 模擬站點資料
const stations = computed<VehicleStation[]>(() => {
  return generateMockStations(selectedType.value)
})

// 地圖狀態
type MapState = 'loading' | 'loaded' | 'error'
const mapState = ref<MapState>('loading')

function toggleStation(stationId: string) {
  expandedStationId.value = expandedStationId.value === stationId ? null : stationId
}

function handleRent(stationId: string, vehicleId: string) {
  emit('rent-vehicle', stationId, vehicleId)
}

function handleRefresh() {
  // 模擬重新載入
  expandedStationId.value = null
}

// 格式化距離
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`
  return `${meters}m`
}

// 可用狀態映射
function getStatus(count: number): AvailabilityStatus {
  if (count > 3) return 'available'
  if (count >= 1) return 'limited'
  return 'empty'
}

const statusLabels: Record<AvailabilityStatus, string> = {
  available: '充足',
  limited: '有限',
  empty: '無車',
}

// 模擬站點生成
function generateMockStations(type: VehicleType): VehicleStation[] {
  const providers: Record<VehicleType, string[]> = {
    bike: ['YouBike'],
    scooter: ['GoShare', 'iRent'],
    car: ['iRent', 'Zipcar'],
  }

  const names = [
    '信義區公所站', '台北101站', '市政府站', '國父紀念館站', '永春站',
  ]

  return names.map((name, i) => {
    const available = [8, 3, 1, 5, 0][i]
    const provider = providers[type][i % providers[type].length]
    return {
      id: `station-${type}-${i}`,
      name: `${provider} ${name}`,
      distance: (i + 1) * 120,
      availableCount: available,
      totalCount: 12,
      status: getStatus(available),
      location: { lat: 25.033 + i * 0.002, lng: 121.565 + i * 0.001 },
      provider,
    }
  })
}

// 模擬車輛列表
function getMockVehicles(stationId: string): VehicleItem[] {
  const station = stations.value.find(s => s.id === stationId)
  if (!station || station.availableCount === 0) return []

  return Array.from({ length: Math.min(station.availableCount, 5) }, (_, i) => ({
    id: `vehicle-${stationId}-${i}`,
    code: `${selectedType.value === 'bike' ? 'YB' : selectedType.value === 'scooter' ? 'GS' : 'IR'}-${1000 + i}`,
    batteryLevel: selectedType.value !== 'bike' ? 60 + Math.floor(Math.random() * 40) : undefined,
  }))
}

// 地圖 iframe 載入
function handleMapLoad() {
  mapState.value = 'loaded'
}

function handleMapError() {
  mapState.value = 'error'
}

onMounted(() => {
  // 地圖載入逾時
  setTimeout(() => {
    if (mapState.value === 'loading') mapState.value = 'error'
  }, 8000)
})
</script>

<template>
  <section class="sharing-vehicle" aria-label="共享運具租賃">
    <div class="sharing-card">
      <div class="sharing-header">
        <h3 class="sharing-title">共享運具</h3>
        <button class="refresh-btn" aria-label="重新整理站點" @click="handleRefresh">
          🔄
        </button>
      </div>

      <!-- 運具類型 Tab -->
      <div class="vehicle-tabs" role="tablist" aria-label="運具類型">
        <button
          v-for="tab in vehicleTabs"
          :key="tab.key"
          class="vehicle-tab"
          :class="{ active: selectedType === tab.key }"
          role="tab"
          :aria-selected="selectedType === tab.key"
          :aria-label="tab.label"
          @click="selectedType = tab.key"
        >
          <span aria-hidden="true">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- 視圖切換 -->
      <div class="view-switch">
        <button
          class="view-btn"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          列表模式
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'map' }"
          @click="viewMode = 'map'"
        >
          地圖模式
        </button>
      </div>

      <!-- 列表模式 -->
      <div v-if="viewMode === 'list'" class="station-list">
        <div v-if="stations.length === 0" class="list-empty">
          <p>附近暫無站點</p>
        </div>

        <div
          v-for="station in stations"
          :key="station.id"
          class="station-item"
        >
          <button
            class="station-summary"
            :aria-expanded="expandedStationId === station.id"
            :aria-label="`${station.name} 距離${formatDistance(station.distance)} 可用${station.availableCount}台`"
            @click="toggleStation(station.id)"
          >
            <div class="station-main">
              <span class="station-name">{{ station.name }}</span>
              <span class="station-distance">{{ formatDistance(station.distance) }}</span>
            </div>
            <div class="station-meta">
              <span class="station-count">可用 {{ station.availableCount }} 台</span>
              <span
                class="station-status"
                :class="`status-${station.status}`"
              >
                {{ statusLabels[station.status] }}
              </span>
            </div>
          </button>

          <!-- 展開詳情 -->
          <div v-show="expandedStationId === station.id" class="station-detail">
            <div v-if="station.availableCount === 0" class="detail-empty">
              目前無可用車輛
            </div>
            <div v-else class="vehicle-list">
              <div
                v-for="vehicle in getMockVehicles(station.id)"
                :key="vehicle.id"
                class="vehicle-item"
              >
                <span class="vehicle-code">{{ vehicle.code }}</span>
                <span v-if="vehicle.batteryLevel !== undefined" class="vehicle-battery">
                  🔋 {{ vehicle.batteryLevel }}%
                </span>
                <button
                  class="rent-btn"
                  aria-label="租借此車輛"
                  @click="handleRent(station.id, vehicle.id)"
                >
                  租借
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 地圖模式 -->
      <div v-else class="map-container">
        <div v-if="mapState === 'loading'" class="map-skeleton" aria-label="地圖載入中">
          <span class="skeleton-text">地圖載入中...</span>
        </div>
        <div v-else-if="mapState === 'error'" class="map-error">
          <span class="error-text">地圖暫時無法顯示</span>
        </div>
        <iframe
          v-show="mapState === 'loaded'"
          class="map-iframe"
          :src="`https://www.google.com/maps?q=${props.userLocation?.lat || 25.033},${props.userLocation?.lng || 121.565}&z=15&output=embed`"
          frameborder="0"
          allowfullscreen
          loading="lazy"
          title="共享運具站點地圖"
          @load="handleMapLoad"
          @error="handleMapError"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.sharing-vehicle {
  width: 100%;
}

.sharing-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.sharing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3, 12px);
}

.sharing-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.refresh-btn {
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: var(--text-lg, 17px);
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
}

.refresh-btn:active {
  background-color: var(--color-primary-light, #fffbeb);
}

/* 運具 Tab */
.vehicle-tabs {
  display: flex;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.vehicle-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1, 4px);
  min-height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.vehicle-tab.active {
  border-color: var(--color-secondary, #0ea5e9);
  background-color: var(--color-secondary-light, #e0f2fe);
  color: var(--color-secondary, #0ea5e9);
  font-weight: 600;
}

/* 視圖切換 */
.view-switch {
  display: flex;
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-sm, 6px);
  padding: 2px;
  margin-bottom: var(--space-3, 12px);
}

.view-btn {
  flex: 1;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-btn.active {
  background: var(--color-bg-card, #ffffff);
  color: var(--color-text-primary, #1c1917);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* 站點列表 */
.station-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.list-empty {
  text-align: center;
  padding: var(--space-6, 24px);
  color: var(--color-text-disabled, #cbd5e1);
  font-size: var(--text-sm, 13px);
}

.station-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
}

.station-summary {
  width: 100%;
  padding: var(--space-3, 12px);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: background-color 0.15s ease;
}

.station-summary:active {
  background-color: var(--color-secondary-light, #e0f2fe);
}

.station-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1, 4px);
}

.station-name {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.station-distance {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.station-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.station-count {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.station-status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
}

.status-available {
  background-color: #dcfce7;
  color: #15803d;
}

.status-limited {
  background-color: var(--color-primary-light, #fffbeb);
  color: var(--color-primary, #f59e0b);
}

.status-empty {
  background-color: var(--color-progress-bg, #f1f5f9);
  color: var(--color-text-disabled, #cbd5e1);
}

/* 展開詳情 */
.station-detail {
  padding: 0 var(--space-3, 12px) var(--space-3, 12px);
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.detail-empty {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
  padding: var(--space-2, 8px) 0;
  text-align: center;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  padding-top: var(--space-2, 8px);
}

.vehicle-item {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px);
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-sm, 6px);
}

.vehicle-code {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
  flex: 1;
}

.vehicle-battery {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.rent-btn {
  min-height: 44px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: none;
  border-radius: var(--radius-sm, 6px);
  background-color: var(--color-secondary, #0ea5e9);
  color: #ffffff;
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  cursor: pointer;
}

.rent-btn:active {
  opacity: 0.8;
}

/* 地圖模式 */
.map-container {
  width: 100%;
  height: 260px;
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  position: relative;
}

.map-skeleton {
  width: 100%;
  height: 100%;
  background: var(--color-progress-bg, #f1f5f9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-text {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-disabled, #cbd5e1);
}

.map-error {
  width: 100%;
  height: 100%;
  background: var(--color-progress-bg, #f1f5f9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.map-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
