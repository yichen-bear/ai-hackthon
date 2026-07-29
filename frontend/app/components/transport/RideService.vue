<script setup lang="ts">
/**
 * 叫車服務元件（yoxi）
 * 支援即時/預約叫車、多車種選擇（含無障礙專車與寵物友善車）
 * 狀態機：idle → confirming → waiting → arrived → completed
 */

export type RideMode = 'instant' | 'scheduled'
export type CarType = 'sedan' | 'van' | 'accessible' | 'pet-friendly'
export type RideState = 'idle' | 'confirming' | 'waiting' | 'arrived' | 'completed'

export interface RideRequest {
  pickup: string
  destination: string
  carType: CarType
  mode: RideMode
  scheduledTime?: string
}

export interface DriverInfo {
  name: string
  plateNumber: string
  carModel: string
  rating: number
  eta: number
}

export interface RideEstimate {
  minCost: number
  maxCost: number
  waitTime: number
}

const props = defineProps<{
  destination?: string
  pickup?: string
}>()

const emit = defineEmits<{
  'confirm-ride': [data: RideRequest]
}>()

const { sharedDestination } = useTransportState()

// 狀態機
const rideState = ref<RideState>('idle')

// 表單狀態
const rideMode = ref<RideMode>('instant')
const pickupInput = ref(props.pickup || '目前位置')
const destinationInput = ref(props.destination || '')
const selectedCar = ref<CarType>('sedan')
const scheduledDate = ref('')
const scheduledTime = ref('')

// 監聽外部目的地帶入
watch(sharedDestination, (val) => {
  if (val) destinationInput.value = val
})

watch(() => props.destination, (val) => {
  if (val) destinationInput.value = val
})

// 車種定義
interface CarOption {
  key: CarType
  icon: string
  label: string
  ariaLabel: string
}

const carOptions: CarOption[] = [
  { key: 'sedan', icon: '🚗', label: '一般轎車', ariaLabel: '一般轎車' },
  { key: 'van', icon: '🚐', label: '多人座車', ariaLabel: '多人座車，6人以上' },
  { key: 'accessible', icon: '♿', label: '無障礙', ariaLabel: '無障礙專車' },
  { key: 'pet-friendly', icon: '🐾', label: '寵物友善', ariaLabel: '寵物友善車' },
]

// 預估費用（模擬）
const estimate = computed<RideEstimate>(() => {
  const base = selectedCar.value === 'van' ? 350 : selectedCar.value === 'accessible' ? 280 : 250
  return {
    minCost: base,
    maxCost: base + 70,
    waitTime: rideMode.value === 'instant' ? 5 : 0,
  }
})

// 模擬司機資訊
const driverInfo = ref<DriverInfo>({
  name: '王大明',
  plateNumber: 'ABC-1234',
  carModel: 'Toyota Camry',
  rating: 4.8,
  eta: 300,
})

// 等候倒數計時
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function startCountdown(seconds: number) {
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      rideState.value = 'arrived'
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// 格式化倒數時間
function formatCountdown(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// 狀態機操作
function handleConfirmRide() {
  if (!destinationInput.value) return
  rideState.value = 'confirming'
}

function handleDispatch() {
  const rideData: RideRequest = {
    pickup: pickupInput.value,
    destination: destinationInput.value,
    carType: selectedCar.value,
    mode: rideMode.value,
    scheduledTime: rideMode.value === 'scheduled' ? `${scheduledDate.value}T${scheduledTime.value}` : undefined,
  }
  emit('confirm-ride', rideData)
  rideState.value = 'waiting'
  startCountdown(driverInfo.value.eta)
}

function handleCancel() {
  stopCountdown()
  rideState.value = 'idle'
}

function handleComplete() {
  rideState.value = 'completed'
}

function handleReset() {
  rideState.value = 'idle'
  destinationInput.value = ''
}

onUnmounted(() => {
  stopCountdown()
})
</script>

<template>
  <section class="ride-service" aria-label="叫車服務">
    <div class="ride-card">
      <div class="ride-header">
        <span class="ride-brand">yoxi</span>
        <h3 class="ride-title">叫車服務</h3>
      </div>

      <!-- idle 狀態：叫車表單 -->
      <div v-if="rideState === 'idle'" class="ride-form">
        <!-- 模式切換 -->
        <div class="mode-switch" role="radiogroup" aria-label="叫車模式">
          <button
            class="mode-btn"
            :class="{ active: rideMode === 'instant' }"
            role="radio"
            :aria-checked="rideMode === 'instant'"
            @click="rideMode = 'instant'"
          >
            即時叫車
          </button>
          <button
            class="mode-btn"
            :class="{ active: rideMode === 'scheduled' }"
            role="radio"
            :aria-checked="rideMode === 'scheduled'"
            @click="rideMode = 'scheduled'"
          >
            預約叫車
          </button>
        </div>

        <!-- 上車地點 -->
        <div class="form-field">
          <label class="field-label">上車地點</label>
          <TransportLocationPicker
            v-model="pickupInput"
            placeholder="選擇上車地點"
            icon="🟢"
          />
        </div>

        <!-- 目的地 -->
        <div class="form-field">
          <label class="field-label">目的地</label>
          <TransportLocationPicker
            v-model="destinationInput"
            placeholder="選擇目的地"
            icon="🔴"
          />
        </div>

        <!-- 預約時間（僅預約模式） -->
        <div v-if="rideMode === 'scheduled'" class="schedule-fields">
          <div class="form-field half">
            <label class="field-label">日期</label>
            <input
              v-model="scheduledDate"
              type="date"
              class="field-input"
              aria-label="預約日期"
            />
          </div>
          <div class="form-field half">
            <label class="field-label">時間</label>
            <input
              v-model="scheduledTime"
              type="time"
              class="field-input"
              aria-label="預約時間"
            />
          </div>
        </div>

        <!-- 車種選擇 -->
        <div class="car-selection">
          <label class="field-label">車種</label>
          <div class="car-grid">
            <button
              v-for="car in carOptions"
              :key="car.key"
              class="car-btn"
              :class="{ active: selectedCar === car.key }"
              :aria-label="car.ariaLabel"
              :aria-pressed="selectedCar === car.key"
              @click="selectedCar = car.key"
            >
              <span class="car-icon" aria-hidden="true">{{ car.icon }}</span>
              <span class="car-label">{{ car.label }}</span>
            </button>
          </div>
        </div>

        <!-- 預估資訊 -->
        <div class="estimate-info">
          <span class="estimate-cost">預估 ${{ estimate.minCost }}~{{ estimate.maxCost }}</span>
          <span v-if="rideMode === 'instant'" class="estimate-wait">
            等候約 {{ estimate.waitTime }} 分鐘
          </span>
        </div>

        <!-- 確認按鈕 -->
        <button
          class="confirm-btn"
          :disabled="!destinationInput"
          aria-label="確認叫車"
          @click="handleConfirmRide"
        >
          確認叫車
        </button>
      </div>

      <!-- confirming 狀態：訂單摘要 -->
      <div v-else-if="rideState === 'confirming'" class="ride-confirming" aria-live="polite">
        <h4 class="state-title">訂單確認</h4>
        <div class="summary-list">
          <div class="summary-row">
            <span class="summary-label">上車地點</span>
            <span class="summary-value">{{ pickupInput }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">目的地</span>
            <span class="summary-value">{{ destinationInput }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">車種</span>
            <span class="summary-value">{{ carOptions.find(c => c.key === selectedCar)?.label }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">預估費用</span>
            <span class="summary-value">${{ estimate.minCost }}~{{ estimate.maxCost }}</span>
          </div>
        </div>
        <div class="confirming-actions">
          <button class="dispatch-btn" @click="handleDispatch">確認派車</button>
          <button class="back-btn" @click="rideState = 'idle'">返回修改</button>
        </div>
      </div>

      <!-- waiting 狀態：等候司機 -->
      <div v-else-if="rideState === 'waiting'" class="ride-waiting" aria-live="polite">
        <h4 class="state-title">司機正在前往中</h4>

        <!-- 叫車資訊卡片 -->
        <div class="ride-trip-info">
          <div class="trip-route">
            <div class="trip-point">
              <span class="trip-dot start"></span>
              <div class="trip-point-info">
                <span class="trip-point-label">上車地點</span>
                <span class="trip-point-value">{{ pickupInput }}</span>
              </div>
            </div>
            <div class="trip-line"></div>
            <div class="trip-point">
              <span class="trip-dot end"></span>
              <div class="trip-point-info">
                <span class="trip-point-label">目的地</span>
                <span class="trip-point-value">{{ destinationInput }}</span>
              </div>
            </div>
          </div>
          <div class="trip-meta">
            <span class="trip-meta-item">🚗 {{ carOptions.find(c => c.key === selectedCar)?.label }}</span>
            <span class="trip-meta-item">💰 ${{ estimate.minCost }}~{{ estimate.maxCost }}</span>
          </div>
        </div>

        <!-- 司機資訊 -->
        <div class="driver-card">
          <div class="driver-info">
            <span class="driver-name">{{ driverInfo.name }}</span>
            <span class="driver-rating">⭐ {{ driverInfo.rating }}</span>
          </div>
          <div class="driver-car">
            <span class="driver-plate">{{ driverInfo.plateNumber }}</span>
            <span class="driver-model">{{ driverInfo.carModel }}</span>
          </div>
        </div>
        <div class="countdown">
          <span class="countdown-label">預估到達</span>
          <span class="countdown-time">{{ formatCountdown(countdown) }}</span>
        </div>
        <button class="cancel-btn" @click="handleCancel">取消叫車</button>
      </div>

      <!-- arrived 狀態：司機已到達 -->
      <div v-else-if="rideState === 'arrived'" class="ride-arrived" aria-live="polite">
        <h4 class="state-title">🎉 司機已到達</h4>
        <div class="arrived-plate">{{ driverInfo.plateNumber }}</div>
        <p class="arrived-hint">請至上車地點搭乘</p>
        <button class="complete-btn" @click="handleComplete">確認上車</button>
      </div>

      <!-- completed 狀態：行程結束 -->
      <div v-else-if="rideState === 'completed'" class="ride-completed" aria-live="polite">
        <h4 class="state-title">行程完成</h4>
        <p class="completed-text">感謝搭乘 yoxi</p>
        <button class="reset-btn" @click="handleReset">重新叫車</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ride-service {
  width: 100%;
}

.ride-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.ride-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.ride-brand {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  color: var(--color-primary, #f59e0b);
  background-color: var(--color-primary-light, #fffbeb);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

.ride-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

/* 模式切換 */
.mode-switch {
  display: flex;
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-md, 12px);
  padding: 3px;
  margin-bottom: var(--space-3, 12px);
}

.mode-btn {
  flex: 1;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn.active {
  background: var(--color-bg-card, #ffffff);
  color: var(--color-primary, #f59e0b);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 表單欄位 */
.form-field {
  margin-bottom: var(--space-3, 12px);
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

.field-input::placeholder {
  color: var(--color-text-disabled, #cbd5e1);
}

.field-input:focus {
  border-color: var(--color-primary, #f59e0b);
}

.schedule-fields {
  display: flex;
  gap: var(--space-2, 8px);
}

.form-field.half {
  flex: 1;
}

/* 車種選擇 */
.car-selection {
  margin-bottom: var(--space-3, 12px);
}

.car-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
}

.car-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 56px;
  padding: var(--space-2, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
}

.car-btn.active {
  border-color: var(--color-primary, #f59e0b);
  border-width: 2px;
  background-color: var(--color-primary-light, #fffbeb);
}

.car-btn:active {
  opacity: 0.7;
}

.car-icon {
  font-size: var(--text-lg, 17px);
}

.car-label {
  font-size: 10px;
  color: var(--color-text-secondary, #78716c);
  white-space: nowrap;
}

/* 預估資訊 */
.estimate-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-sm, 6px);
  margin-bottom: var(--space-3, 12px);
}

.estimate-cost {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.estimate-wait {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

/* 確認按鈕 */
.confirm-btn {
  width: 100%;
  min-height: 48px;
  padding: var(--space-3, 12px);
  border: none;
  border-radius: var(--radius-md, 12px);
  background-color: var(--color-primary, #f59e0b);
  color: #ffffff;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.confirm-btn:active {
  opacity: 0.8;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* confirming 狀態 */
.state-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-4, 16px);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.summary-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.confirming-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.dispatch-btn {
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: var(--radius-md, 12px);
  background-color: var(--color-primary, #f59e0b);
  color: #ffffff;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  cursor: pointer;
}

.dispatch-btn:active {
  opacity: 0.8;
}

.back-btn,
.cancel-btn,
.reset-btn {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: transparent;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
}

.back-btn:active,
.cancel-btn:active,
.reset-btn:active {
  background-color: var(--color-progress-bg, #f1f5f9);
}

/* waiting 狀態 */
.ride-trip-info {
  background: var(--color-primary-light, #fffbeb);
  border: 1px solid var(--color-primary, #f59e0b);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
}

.trip-route {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.trip-point {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: 4px 0;
}

.trip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.trip-dot.start {
  background: #22c55e;
}

.trip-dot.end {
  background: #ef4444;
}

.trip-line {
  width: 2px;
  height: 16px;
  background: var(--color-border, #e2e8f0);
  margin-left: 4px;
}

.trip-point-info {
  display: flex;
  flex-direction: column;
}

.trip-point-label {
  font-size: 10px;
  color: var(--color-text-secondary, #78716c);
}

.trip-point-value {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.trip-meta {
  display: flex;
  gap: var(--space-3, 12px);
  margin-top: var(--space-2, 8px);
  padding-top: var(--space-2, 8px);
  border-top: 1px dashed var(--color-border, #e2e8f0);
}

.trip-meta-item {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.driver-card {
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
}

.driver-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1, 4px);
}

.driver-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.driver-rating {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.driver-car {
  display: flex;
  gap: var(--space-3, 12px);
}

.driver-plate {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-primary, #f59e0b);
}

.driver-model {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-4, 16px);
}

.countdown-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.countdown-time {
  font-size: var(--text-xl, 20px);
  font-weight: 700;
  color: var(--color-primary, #f59e0b);
}

/* arrived 狀態 */
.arrived-plate {
  font-size: var(--text-xl, 20px);
  font-weight: 700;
  color: var(--color-primary, #f59e0b);
  text-align: center;
  padding: var(--space-4, 16px);
  background: var(--color-primary-light, #fffbeb);
  border-radius: var(--radius-md, 12px);
  margin-bottom: var(--space-3, 12px);
}

.arrived-hint {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  margin: 0 0 var(--space-3, 12px) 0;
}

.complete-btn {
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: var(--radius-md, 12px);
  background-color: var(--color-secondary, #0ea5e9);
  color: #ffffff;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  cursor: pointer;
}

.complete-btn:active {
  opacity: 0.8;
}

/* completed 狀態 */
.completed-text {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  margin: 0 0 var(--space-4, 16px) 0;
}
</style>
