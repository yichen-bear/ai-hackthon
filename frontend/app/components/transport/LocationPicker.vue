<script setup lang="ts">
/**
 * LocationPicker - 地點選擇組件
 * 支援：搜尋地址、地圖標記選點、回傳地點名稱與座標
 * 用於路線規劃、叫車服務等需要選擇地點的場景
 */

export interface LocationResult {
  name: string
  address: string
  lat: number
  lng: number
}

const props = defineProps<{
  /** 目前已選地點名稱（用來顯示） */
  modelValue: string
  /** placeholder 文字 */
  placeholder?: string
  /** 輸入框前綴圖示 */
  icon?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [location: LocationResult]
}>()

const showPicker = ref(false)
const searchQuery = ref('')
const searchResults = ref<LocationResult[]>([])
const isSearching = ref(false)
const showMap = ref(false)
const mapSelectedLocation = ref<LocationResult | null>(null)

// 模擬搜尋建議（實際專案可串接 Google Places API）
const mockLocations: LocationResult[] = [
  { name: '台北車站', address: '台北市中正區北平西路3號', lat: 25.0478, lng: 121.5170 },
  { name: '台北101', address: '台北市信義區信義路五段7號', lat: 25.0340, lng: 121.5645 },
  { name: '西門町', address: '台北市萬華區漢中街', lat: 25.0421, lng: 121.5081 },
  { name: '鼎泰豐信義店', address: '台北市信義區松高路11號', lat: 25.0359, lng: 121.5671 },
  { name: '台南亞太國際棒球訓練中心', address: '台南市安南區安中路六段505號', lat: 23.0475, lng: 120.1972 },
  { name: '國家兩廳院', address: '台北市中正區中山南路21-1號', lat: 25.0356, lng: 121.5189 },
  { name: '台北小巨蛋', address: '台北市松山區南京東路四段2號', lat: 25.0513, lng: 121.5499 },
  { name: '國立臺灣科學教育館', address: '台北市士林區士商路189號', lat: 25.0963, lng: 121.5168 },
  { name: '7-11 信義門市', address: '台北市信義區信義路五段7號', lat: 25.0330, lng: 121.5654 },
  { name: '象山步道入口', address: '台北市信義區信義路五段150巷', lat: 25.0275, lng: 121.5725 },
  { name: '大稻埕迪化街', address: '台北市大同區迪化街一段', lat: 25.0567, lng: 121.5098 },
  { name: '信義區仁愛里活動中心', address: '台北市信義區仁愛路四段', lat: 25.0380, lng: 121.5530 },
]

function openPicker() {
  searchQuery.value = props.modelValue || ''
  searchResults.value = []
  showMap.value = false
  mapSelectedLocation.value = null
  showPicker.value = true
}

function closePicker() {
  showPicker.value = false
}

// 搜尋邏輯
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  isSearching.value = true

  searchTimeout = setTimeout(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) {
      searchResults.value = []
    } else {
      searchResults.value = mockLocations.filter(
        loc => loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q)
      )
    }
    isSearching.value = false
  }, 300)
}

function selectResult(location: LocationResult) {
  emit('update:modelValue', location.name)
  emit('select', location)
  closePicker()
}

// 地圖選點
function toggleMap() {
  showMap.value = !showMap.value
}

function handleMapClick(e: MouseEvent) {
  // 模擬地圖上點選位置（根據點擊位置計算模擬座標）
  const mapEl = e.currentTarget as HTMLElement
  const rect = mapEl.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height

  // 模擬台北範圍 lat: 24.95~25.10, lng: 121.45~121.60
  const lat = 25.10 - y * 0.15
  const lng = 121.45 + x * 0.15

  mapSelectedLocation.value = {
    name: `地圖選點 (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `約 ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
    lat,
    lng,
  }
}

function confirmMapSelection() {
  if (mapSelectedLocation.value) {
    selectResult(mapSelectedLocation.value)
  }
}
</script>

<template>
  <!-- 顯示輸入欄位（點擊開啟選擇器） -->
  <button class="location-input" @click="openPicker" type="button">
    <span class="location-icon">{{ icon || '📍' }}</span>
    <span class="location-text" :class="{ placeholder: !modelValue }">
      {{ modelValue || placeholder || '選擇地點' }}
    </span>
    <span class="location-arrow">›</span>
  </button>

  <!-- 地點選擇器 Overlay -->
  <Teleport to="body">
    <div v-if="showPicker" class="picker-overlay" @click.self="closePicker">
      <div class="picker-panel" role="dialog" aria-modal="true" aria-label="選擇地點">
        <!-- 搜尋欄 -->
        <div class="picker-header">
          <button class="picker-back" aria-label="返回" @click="closePicker">‹</button>
          <div class="picker-search">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="搜尋地點或地址..."
              autofocus
              @input="handleSearchInput"
            />
            <span v-if="isSearching" class="search-spinner"></span>
          </div>
        </div>

        <!-- 切換地圖模式 -->
        <button class="map-toggle-btn" @click="toggleMap">
          {{ showMap ? '📋 切換為搜尋' : '🗺️ 在地圖上選擇' }}
        </button>

        <!-- 搜尋結果列表 -->
        <div v-if="!showMap" class="search-results">
          <button
            v-for="loc in searchResults"
            :key="loc.name + loc.lat"
            class="result-item"
            @click="selectResult(loc)"
          >
            <span class="result-icon">📍</span>
            <div class="result-info">
              <span class="result-name">{{ loc.name }}</span>
              <span class="result-address">{{ loc.address }}</span>
            </div>
          </button>

          <div v-if="searchQuery && !isSearching && searchResults.length === 0" class="no-results">
            找不到符合的地點
          </div>

          <!-- 快速選擇 -->
          <div v-if="!searchQuery" class="quick-picks">
            <p class="quick-title">常用地點</p>
            <button class="result-item" @click="selectResult({ name: '我的位置', address: '目前 GPS 位置', lat: 25.033, lng: 121.565 })">
              <span class="result-icon">📌</span>
              <div class="result-info">
                <span class="result-name">我的位置</span>
                <span class="result-address">使用目前 GPS 定位</span>
              </div>
            </button>
            <button
              v-for="loc in mockLocations.slice(0, 5)"
              :key="loc.name"
              class="result-item"
              @click="selectResult(loc)"
            >
              <span class="result-icon">📍</span>
              <div class="result-info">
                <span class="result-name">{{ loc.name }}</span>
                <span class="result-address">{{ loc.address }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 地圖選點 -->
        <div v-if="showMap" class="map-container">
          <div class="map-area" @click="handleMapClick" role="img" aria-label="地圖區域，點擊選擇地點">
            <!-- 模擬地圖（實際專案用 Mapbox / Google Maps） -->
            <div class="map-placeholder">
              <div class="map-grid"></div>
              <div class="map-center-label">台北市</div>
              <!-- 標記點 -->
              <div
                v-if="mapSelectedLocation"
                class="map-marker"
                :style="{
                  top: `${((25.10 - mapSelectedLocation.lat) / 0.15) * 100}%`,
                  left: `${((mapSelectedLocation.lng - 121.45) / 0.15) * 100}%`
                }"
              >
                📍
              </div>
            </div>
          </div>

          <div v-if="mapSelectedLocation" class="map-selection">
            <p class="map-selection-name">{{ mapSelectedLocation.name }}</p>
            <p class="map-selection-address">{{ mapSelectedLocation.address }}</p>
            <button class="confirm-map-btn" @click="confirmMapSelection">確認選擇此地點</button>
          </div>
          <p v-else class="map-hint">點擊地圖選擇目的地</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.location-input {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  min-height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease;
}

.location-input:hover {
  border-color: var(--color-primary, #f59e0b);
}

.location-input:focus-visible {
  outline: 2px solid var(--color-primary, #f59e0b);
  outline-offset: 2px;
}

.location-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.location-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-text.placeholder {
  color: var(--color-text-disabled, #cbd5e1);
  font-weight: 400;
}

.location-arrow {
  font-size: 16px;
  color: var(--color-text-disabled, #cbd5e1);
}

/* Overlay */
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.picker-panel {
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 430px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 16px;
  animation: slide-up 0.3s ease;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Header */
.picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.picker-back {
  background: none;
  border: none;
  font-size: 22px;
  font-weight: 600;
  color: var(--color-primary, #f59e0b);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-search {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  min-height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  font-size: 14px;
  color: var(--color-text-primary, #1c1917);
  background: #f8fafc;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--color-primary, #f59e0b);
  background: #fff;
}

.search-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: var(--color-primary, #f59e0b);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

/* Map toggle */
.map-toggle-btn {
  width: 100%;
  padding: 8px;
  min-height: 36px;
  border: 1px dashed var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  margin-bottom: 12px;
  transition: all 0.15s ease;
}

.map-toggle-btn:hover {
  border-color: var(--color-primary, #f59e0b);
  color: var(--color-primary, #f59e0b);
}

/* Search Results */
.search-results {
  display: flex;
  flex-direction: column;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  min-height: 44px;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s ease;
  width: 100%;
}

.result-item:hover {
  background: #fffbeb;
}

.result-item:focus-visible {
  outline: 2px solid var(--color-primary, #f59e0b);
  outline-offset: -2px;
}

.result-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.result-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.result-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.result-address {
  font-size: 11px;
  color: var(--color-text-secondary, #78716c);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary, #78716c);
  font-size: 13px;
}

.quick-picks {
  margin-top: 8px;
}

.quick-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary, #78716c);
  margin: 0 0 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Map */
.map-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-area {
  width: 100%;
  height: 240px;
  border-radius: 12px;
  overflow: hidden;
  cursor: crosshair;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e0f2fe, #dbeafe, #e0e7ff);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px);
  background-size: 30px 30px;
}

.map-center-label {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  z-index: 1;
}

.map-marker {
  position: absolute;
  font-size: 24px;
  transform: translate(-50%, -100%);
  z-index: 2;
  animation: drop-in 0.3s ease;
}

@keyframes drop-in {
  from { transform: translate(-50%, -150%); opacity: 0; }
  to { transform: translate(-50%, -100%); opacity: 1; }
}

.map-selection {
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.map-selection-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 2px;
}

.map-selection-address {
  font-size: 11px;
  color: var(--color-text-secondary, #78716c);
  margin: 0 0 10px;
}

.confirm-map-btn {
  width: 100%;
  padding: 10px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary, #f59e0b);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.confirm-map-btn:hover { opacity: 0.9; }
.confirm-map-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.map-hint {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}
</style>
