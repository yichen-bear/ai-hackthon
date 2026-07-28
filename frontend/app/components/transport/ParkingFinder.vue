<script setup lang="ts">
/**
 * 停車助手元件
 * 查詢周邊即時車位、記錄/導航停車位置
 * 狀態機：no-record ↔ has-record
 */

export type ParkingStatus = 'open' | 'full' | 'closed'

export interface GeoLocation {
  lat: number
  lng: number
}

export interface ParkingLot {
  id: string
  name: string
  distance: number
  availableSpaces: number
  totalSpaces: number
  rate: number
  status: ParkingStatus
  location: GeoLocation
}

export interface ParkedRecord {
  lotName: string
  floor: string
  location: GeoLocation
  parkedAt: string
}

const props = defineProps<{
  location?: GeoLocation
}>()

const emit = defineEmits<{
  'park-recorded': [record: ParkedRecord]
  'park-cleared': []
}>()

// 停車狀態機
type ParkingState = 'no-record' | 'has-record'
const parkingState = ref<ParkingState>('no-record')
const parkedRecord = ref<ParkedRecord | null>(null)

// 已停放時間計時
const elapsedTime = ref('')
let timerInterval: ReturnType<typeof setInterval> | null = null

function startTimer(parkedAt: string) {
  updateElapsed(parkedAt)
  timerInterval = setInterval(() => updateElapsed(parkedAt), 60000) // 每分鐘更新
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function updateElapsed(parkedAt: string) {
  const diff = Date.now() - new Date(parkedAt).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  elapsedTime.value = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

// 記錄停車表單
const showRecordForm = ref(false)
const recordLotName = ref('')
const recordFloor = ref('')

// aria-live 通知
const liveMessage = ref('')

function handleStartRecord() {
  showRecordForm.value = true
}

function handleConfirmRecord() {
  if (!recordLotName.value) return

  const record: ParkedRecord = {
    lotName: recordLotName.value,
    floor: recordFloor.value || '未指定',
    location: props.location || { lat: 25.033, lng: 121.565 },
    parkedAt: new Date().toISOString(),
  }

  parkedRecord.value = record
  parkingState.value = 'has-record'
  showRecordForm.value = false
  recordLotName.value = ''
  recordFloor.value = ''

  startTimer(record.parkedAt)
  liveMessage.value = '已記錄您的停車位置'
  emit('park-recorded', record)

  // 清除通知
  setTimeout(() => { liveMessage.value = '' }, 3000)
}

function handleCancelRecord() {
  showRecordForm.value = false
  recordLotName.value = ''
  recordFloor.value = ''
}

function handleClearRecord() {
  stopTimer()
  parkedRecord.value = null
  parkingState.value = 'no-record'
  elapsedTime.value = ''
  emit('park-cleared')
}

function handleNavigate() {
  // 模擬導航（實際可開啟外部地圖 App）
  console.log('導航至停車位置', parkedRecord.value?.location)
}

// 車位使用率
function getUsagePercent(lot: ParkingLot): number {
  if (lot.totalSpaces === 0) return 0
  return Math.round(((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100)
}

function isNearlyFull(lot: ParkingLot): boolean {
  return lot.availableSpaces <= 5 && lot.availableSpaces > 0
}

// 營業狀態
const statusLabels: Record<ParkingStatus, string> = {
  open: '營業中',
  full: '已滿',
  closed: '休息中',
}

// 模擬停車場資料
const parkingLots = computed<ParkingLot[]>(() => [
  { id: 'lot-1', name: '台北101停車場', distance: 200, availableSpaces: 12, totalSpaces: 150, rate: 60, status: 'open', location: { lat: 25.0340, lng: 121.5645 } },
  { id: 'lot-2', name: '信義威秀停車場', distance: 350, availableSpaces: 3, totalSpaces: 80, rate: 50, status: 'open', location: { lat: 25.0355, lng: 121.5670 } },
  { id: 'lot-3', name: '市府轉運站停車場', distance: 500, availableSpaces: 45, totalSpaces: 200, rate: 40, status: 'open', location: { lat: 25.0380, lng: 121.5680 } },
  { id: 'lot-4', name: '新光三越A11停車場', distance: 280, availableSpaces: 0, totalSpaces: 120, rate: 60, status: 'full', location: { lat: 25.0360, lng: 121.5660 } },
  { id: 'lot-5', name: '統一時代停車場', distance: 420, availableSpaces: 2, totalSpaces: 100, rate: 50, status: 'open', location: { lat: 25.0370, lng: 121.5640 } },
])

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <section class="parking-finder" aria-label="停車助手">
    <div class="parking-card">
      <h3 class="parking-title">停車助手</h3>

      <!-- aria-live 通知 -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        {{ liveMessage }}
      </div>

      <!-- 已記錄停車位（has-record） -->
      <div v-if="parkingState === 'has-record' && parkedRecord" class="parked-record">
        <div class="record-header">
          <span class="record-icon" aria-hidden="true">🅿️</span>
          <span class="record-label">我的停車位</span>
        </div>
        <div class="record-info">
          <div class="record-row">
            <span class="record-key">停車場</span>
            <span class="record-value">{{ parkedRecord.lotName }}</span>
          </div>
          <div class="record-row">
            <span class="record-key">樓層/區域</span>
            <span class="record-value">{{ parkedRecord.floor }}</span>
          </div>
          <div class="record-row">
            <span class="record-key">已停放</span>
            <span class="record-value elapsed">{{ elapsedTime }}</span>
          </div>
        </div>
        <div class="record-actions">
          <button class="action-btn navigate-btn" aria-label="導航至車位" @click="handleNavigate">
            📍 導航至車位
          </button>
          <button class="action-btn clear-btn" aria-label="結束停車" @click="handleClearRecord">
            結束停車
          </button>
        </div>
      </div>

      <!-- 記錄停車表單 -->
      <div v-if="showRecordForm" class="record-form">
        <div class="form-field">
          <label class="field-label">停車場名稱</label>
          <input
            v-model="recordLotName"
            type="text"
            class="field-input"
            placeholder="輸入或選擇停車場"
            aria-label="停車場名稱"
          />
        </div>
        <div class="form-field">
          <label class="field-label">樓層/區域</label>
          <input
            v-model="recordFloor"
            type="text"
            class="field-input"
            placeholder="例如：B2、A區"
            aria-label="停放樓層或區域"
          />
        </div>
        <div class="form-actions">
          <button class="confirm-record-btn" :disabled="!recordLotName" @click="handleConfirmRecord">
            確認記錄
          </button>
          <button class="cancel-record-btn" @click="handleCancelRecord">取消</button>
        </div>
      </div>

      <!-- 記錄按鈕（no-record 且無表單時） -->
      <button
        v-if="parkingState === 'no-record' && !showRecordForm"
        class="start-record-btn"
        aria-label="記錄停車位置"
        @click="handleStartRecord"
      >
        📍 記錄停車位置
      </button>

      <!-- 停車場列表 -->
      <div class="lot-list">
        <h4 class="lot-list-title">周邊停車場</h4>
        <div
          v-for="lot in parkingLots"
          :key="lot.id"
          class="lot-item"
        >
          <div class="lot-header">
            <span class="lot-name">{{ lot.name }}</span>
            <span
              class="lot-status"
              :class="`lot-status-${lot.status}`"
            >
              {{ statusLabels[lot.status] }}
            </span>
          </div>
          <div class="lot-meta">
            <span class="lot-distance">{{ lot.distance }}m</span>
            <span class="lot-spaces">
              剩餘 {{ lot.availableSpaces }} 位
              <span v-if="isNearlyFull(lot)" class="nearly-full">即將額滿</span>
            </span>
            <span class="lot-rate">${{ lot.rate }}/hr</span>
          </div>
          <!-- 車位使用率 ProgressBar -->
          <div class="lot-progress">
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :class="{ 'over-limit': isNearlyFull(lot) || lot.status === 'full' }"
                :style="{ width: `${getUsagePercent(lot)}%` }"
                role="progressbar"
                :aria-valuenow="getUsagePercent(lot)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`車位使用率 ${getUsagePercent(lot)}%`"
              />
            </div>
            <span class="progress-label">{{ getUsagePercent(lot) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.parking-finder {
  width: 100%;
}

.parking-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.parking-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* 已記錄停車位 */
.parked-record {
  background: var(--color-primary-light, #fffbeb);
  border: 1px solid var(--color-primary, #f59e0b);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
}

.record-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-2, 8px);
}

.record-icon {
  font-size: var(--text-lg, 17px);
}

.record-label {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-primary, #f59e0b);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  margin-bottom: var(--space-3, 12px);
}

.record-row {
  display: flex;
  justify-content: space-between;
}

.record-key {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.record-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.record-value.elapsed {
  color: var(--color-primary, #f59e0b);
  font-weight: 600;
}

.record-actions {
  display: flex;
  gap: var(--space-2, 8px);
}

.action-btn {
  flex: 1;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.action-btn:active {
  opacity: 0.7;
}

.navigate-btn {
  background-color: var(--color-secondary, #0ea5e9);
  color: #ffffff;
}

.clear-btn {
  background-color: var(--color-progress-bg, #f1f5f9);
  color: var(--color-text-secondary, #78716c);
}

/* 記錄表單 */
.record-form {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
}

.form-field {
  margin-bottom: var(--space-2, 8px);
}

.field-label {
  display: block;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  margin-bottom: var(--space-1, 4px);
}

.field-input {
  width: 100%;
  min-height: 44px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  background: var(--color-bg-card, #ffffff);
  outline: none;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: var(--color-primary, #f59e0b);
}

.field-input::placeholder {
  color: var(--color-text-disabled, #cbd5e1);
}

.form-actions {
  display: flex;
  gap: var(--space-2, 8px);
}

.confirm-record-btn {
  flex: 1;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background-color: var(--color-primary, #f59e0b);
  color: #ffffff;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
}

.confirm-record-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-record-btn {
  min-height: 44px;
  padding: 0 var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
}

/* 記錄按鈕 */
.start-record-btn {
  width: 100%;
  min-height: 44px;
  margin-bottom: var(--space-3, 12px);
  border: 1px dashed var(--color-primary, #f59e0b);
  border-radius: var(--radius-md, 12px);
  background: var(--color-primary-light, #fffbeb);
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-primary, #f59e0b);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.start-record-btn:active {
  opacity: 0.7;
}

/* 停車場列表 */
.lot-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.lot-list-title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-2, 8px) 0;
}

.lot-item {
  padding: var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
}

.lot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1, 4px);
}

.lot-name {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.lot-status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
}

.lot-status-open {
  background-color: #dcfce7;
  color: #15803d;
}

.lot-status-full {
  background-color: #ffe4e6;
  color: #e11d48;
}

.lot-status-closed {
  background-color: var(--color-progress-bg, #f1f5f9);
  color: var(--color-text-disabled, #cbd5e1);
}

.lot-meta {
  display: flex;
  gap: var(--space-3, 12px);
  align-items: center;
  margin-bottom: var(--space-2, 8px);
}

.lot-distance,
.lot-rate {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.lot-spaces {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.nearly-full {
  color: #e11d48;
  font-weight: 600;
}

/* 進度條 */
.lot-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #f59e0b, #d97706);
  transition: width 0.3s ease;
}

.progress-bar-fill.over-limit {
  background: linear-gradient(90deg, #e11d48, #be123c);
}

.progress-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  min-width: 30px;
  text-align: right;
}
</style>
