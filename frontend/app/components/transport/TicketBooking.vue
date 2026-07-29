<script setup lang="ts">
/**
 * 模擬購票元件
 * 步驟式狀態機：form → select-train → confirm → payment → success
 * 支援高鐵/台鐵切換
 */

import type { PaymentOrderItem, PaymentResult } from '~/components/ui/PaymentFlow.vue'

export type TicketType = 'hsr' | 'train'
export type TicketCategory = 'adult' | 'child' | 'senior' | 'disabled'
export type BookingStep = 'form' | 'select-train' | 'confirm' | 'success'
export type SeatStatus = 'available' | 'standing' | 'full'

export interface Station {
  id: string
  name: string
}

export interface TrainSchedule {
  id: string
  trainNo: string
  departureTime: string
  arrivalTime: string
  duration: number
  price: number
  seatStatus: SeatStatus
}

export interface PurchasedTicket {
  id: string
  type: TicketType
  trainNo: string
  origin: string
  destination: string
  date: string
  time: string
  category: TicketCategory
  price: number
}

const emit = defineEmits<{
  'ticket-purchased': [ticket: PurchasedTicket]
}>()

// 步驟狀態機
const currentStep = ref<BookingStep>('form')

// 票種切換
const ticketType = ref<TicketType>('hsr')

// 站點資料
const hsrStations: Station[] = [
  { id: 'nangang', name: '南港' },
  { id: 'taipei', name: '台北' },
  { id: 'banqiao', name: '板橋' },
  { id: 'taoyuan', name: '桃園' },
  { id: 'hsinchu', name: '新竹' },
  { id: 'miaoli', name: '苗栗' },
  { id: 'taichung', name: '台中' },
  { id: 'changhua', name: '彰化' },
  { id: 'yunlin', name: '雲林' },
  { id: 'chiayi', name: '嘉義' },
  { id: 'tainan', name: '台南' },
  { id: 'zuoying', name: '左營' },
]

const trainStations: Station[] = [
  { id: 'keelung', name: '基隆' },
  { id: 'taipei-tr', name: '台北' },
  { id: 'banqiao-tr', name: '板橋' },
  { id: 'taoyuan-tr', name: '桃園' },
  { id: 'hsinchu-tr', name: '新竹' },
  { id: 'taichung-tr', name: '台中' },
  { id: 'chiayi-tr', name: '嘉義' },
  { id: 'tainan-tr', name: '台南' },
  { id: 'kaohsiung', name: '高雄' },
  { id: 'pingtung', name: '屏東' },
]

const stations = computed(() => ticketType.value === 'hsr' ? hsrStations : trainStations)

// 表單資料
const originId = ref('')
const destinationId = ref('')
const departureDate = ref('')
const departureTime = ref('')
const category = ref<TicketCategory>('adult')
const quantity = ref(1)

// 表單驗證
const formError = ref('')

const categoryOptions = [
  { key: 'adult' as TicketCategory, label: '全票' },
  { key: 'child' as TicketCategory, label: '孩童票' },
  { key: 'senior' as TicketCategory, label: '敬老票' },
  { key: 'disabled' as TicketCategory, label: '愛心票' },
]

// 班次結果
const schedules = ref<TrainSchedule[]>([])
const selectedScheduleId = ref<string | null>(null)

const selectedSchedule = computed(() =>
  schedules.value.find(s => s.id === selectedScheduleId.value) || null
)

// 今日日期（最小值）
const today = computed(() => {
  const d = new Date()
  return d.toISOString().split('T')[0]
})

// 數量控制（clamp 1~10）
function adjustQuantity(delta: number) {
  const next = quantity.value + delta
  quantity.value = Math.min(10, Math.max(1, next))
}

// 可選到達站（排除出發站）
const availableDestinations = computed(() =>
  stations.value.filter(s => s.id !== originId.value)
)

// Step 1 → Step 2
function handleSearch() {
  formError.value = ''

  if (!originId.value || !destinationId.value) {
    formError.value = '請選擇出發站與到達站'
    return
  }
  if (originId.value === destinationId.value) {
    formError.value = '出發站與到達站不可相同'
    return
  }
  if (!departureDate.value) {
    formError.value = '請選擇出發日期'
    return
  }

  // 生成模擬班次
  schedules.value = generateMockSchedules()
  selectedScheduleId.value = null
  currentStep.value = 'select-train'
}

// Step 2 → Step 3
function handleSelectConfirm() {
  if (!selectedScheduleId.value) return
  currentStep.value = 'confirm'
}

// Step 3 → 購票完成
function handlePurchase() {
  if (!selectedSchedule.value) return
  showPaymentFlow.value = true
}

// 付款流程狀態
const showPaymentFlow = ref(false)
const lastPaymentResult = ref<PaymentResult | null>(null)
const purchasedTicketInfo = ref<PurchasedTicket | null>(null)

// 付款摘要項目
const paymentOrderItems = computed<PaymentOrderItem[]>(() => {
  if (!selectedSchedule.value) return []
  const originName = stations.value.find(s => s.id === originId.value)?.name || ''
  const destName = stations.value.find(s => s.id === destinationId.value)?.name || ''
  return [
    { label: '路線', value: `${originName} → ${destName}` },
    { label: '日期', value: departureDate.value },
    { label: '車次', value: selectedSchedule.value.trainNo },
    { label: '時間', value: `${selectedSchedule.value.departureTime} → ${selectedSchedule.value.arrivalTime}` },
    { label: '票種', value: categoryOptions.find(o => o.key === category.value)?.label || '' },
    { label: '張數', value: `${quantity.value} 張` },
  ]
})

const paymentTotalAmount = computed(() => {
  return (selectedSchedule.value?.price || 0) * quantity.value
})

// 付款完成回調
function handlePaymentComplete(result: PaymentResult) {
  lastPaymentResult.value = result

  const originName = stations.value.find(s => s.id === originId.value)?.name || ''
  const destName = stations.value.find(s => s.id === destinationId.value)?.name || ''

  const ticket: PurchasedTicket = {
    id: `ticket-${Date.now()}`,
    type: ticketType.value,
    trainNo: selectedSchedule.value!.trainNo,
    origin: originName,
    destination: destName,
    date: departureDate.value,
    time: selectedSchedule.value!.departureTime,
    category: category.value,
    price: result.finalAmount,
  }

  purchasedTicketInfo.value = ticket
  emit('ticket-purchased', ticket)
  showPaymentFlow.value = false
  currentStep.value = 'success'
}

function handlePaymentClose() {
  showPaymentFlow.value = false
}

// 重置表單
function handleReset() {
  currentStep.value = 'form'
  originId.value = ''
  destinationId.value = ''
  departureDate.value = ''
  departureTime.value = ''
  category.value = 'adult'
  quantity.value = 1
  schedules.value = []
  selectedScheduleId.value = null
  formError.value = ''
  showPaymentFlow.value = false
  lastPaymentResult.value = null
  purchasedTicketInfo.value = null
}

// 切換票種時重置
watch(ticketType, () => {
  originId.value = ''
  destinationId.value = ''
  schedules.value = []
  selectedScheduleId.value = null
  if (currentStep.value !== 'form') currentStep.value = 'form'
})

// 模擬班次生成
function generateMockSchedules(): TrainSchedule[] {
  const basePrice = ticketType.value === 'hsr' ? 590 : 175
  const times = ['08:30', '09:15', '10:00', '11:30', '13:00']
  const durations = ticketType.value === 'hsr' ? [96, 102, 96, 108, 96] : [180, 210, 195, 240, 180]
  const statuses: SeatStatus[] = ['available', 'available', 'standing', 'available', 'full']

  return times.map((time, i) => {
    const depMin = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])
    const arrMin = depMin + durations[i]
    const arrH = Math.floor(arrMin / 60).toString().padStart(2, '0')
    const arrM = (arrMin % 60).toString().padStart(2, '0')

    return {
      id: `schedule-${i}`,
      trainNo: ticketType.value === 'hsr' ? `${1300 + i * 2 + 1}` : `${100 + i * 2 + 1}`,
      departureTime: time,
      arrivalTime: `${arrH}:${arrM}`,
      duration: durations[i],
      price: basePrice + (i % 2 === 0 ? 0 : 50),
      seatStatus: statuses[i],
    }
  })
}
</script>

<template>
  <section class="ticket-booking" aria-label="模擬購票">
    <div class="booking-card">
      <!-- 標題與票種切換 -->
      <div class="booking-header">
        <h3 class="booking-title">
          {{ ticketType === 'hsr' ? '高鐵購票' : '台鐵購票' }}
        </h3>
        <div class="type-switch">
          <button
            class="type-btn"
            :class="{ active: ticketType === 'hsr' }"
            aria-label="高鐵購票"
            @click="ticketType = 'hsr'"
          >
            高鐵
          </button>
          <button
            class="type-btn"
            :class="{ active: ticketType === 'train' }"
            aria-label="台鐵購票"
            @click="ticketType = 'train'"
          >
            台鐵
          </button>
        </div>
      </div>

      <!-- 步驟指示器 -->
      <div class="step-indicator" aria-label="目前步驟">
        <span class="step" :class="{ active: currentStep === 'form' }">1 填寫</span>
        <span class="step-divider" aria-hidden="true">›</span>
        <span class="step" :class="{ active: currentStep === 'select-train' }">2 選擇</span>
        <span class="step-divider" aria-hidden="true">›</span>
        <span class="step" :class="{ active: currentStep === 'confirm' }">3 確認</span>
        <span class="step-divider" aria-hidden="true">›</span>
        <span class="step" :class="{ active: currentStep === 'success' }">4 完成</span>
      </div>

      <!-- Step 1: 填寫資訊 -->
      <div v-if="currentStep === 'form'" class="step-form">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label">出發站</label>
            <select v-model="originId" class="field-select" aria-label="出發站">
              <option value="" disabled>選擇出發站</option>
              <option v-for="s in stations" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="field-label">到達站</label>
            <select v-model="destinationId" class="field-select" aria-label="到達站">
              <option value="" disabled>選擇到達站</option>
              <option v-for="s in availableDestinations" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label class="field-label">出發日期</label>
            <input
              v-model="departureDate"
              type="date"
              class="field-input"
              :min="today"
              aria-label="出發日期"
            />
          </div>
          <div class="form-field">
            <label class="field-label">出發時間</label>
            <input
              v-model="departureTime"
              type="time"
              class="field-input"
              aria-label="出發時間"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label class="field-label">票種</label>
            <select v-model="category" class="field-select" aria-label="票種">
              <option v-for="opt in categoryOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label class="field-label">張數</label>
            <div class="quantity-control">
              <button
                class="qty-btn"
                :disabled="quantity <= 1"
                aria-label="減少張數"
                @click="adjustQuantity(-1)"
              >
                −
              </button>
              <span class="qty-value">{{ quantity }}</span>
              <button
                class="qty-btn"
                :disabled="quantity >= 10"
                aria-label="增加張數"
                @click="adjustQuantity(1)"
              >
                ＋
              </button>
            </div>
          </div>
        </div>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <button class="primary-btn" @click="handleSearch" aria-label="查詢班次">
          查詢班次
        </button>
      </div>

      <!-- Step 2: 選擇班次 -->
      <div v-else-if="currentStep === 'select-train'" class="step-select" aria-live="polite">
        <div class="schedule-list">
          <button
            v-for="schedule in schedules"
            :key="schedule.id"
            class="schedule-card"
            :class="{
              selected: selectedScheduleId === schedule.id,
              disabled: schedule.seatStatus === 'full'
            }"
            :disabled="schedule.seatStatus === 'full'"
            :aria-label="`車次${schedule.trainNo} ${schedule.departureTime}出發 ${schedule.arrivalTime}到達 票價${schedule.price}元`"
            @click="schedule.seatStatus !== 'full' && (selectedScheduleId = schedule.id)"
          >
            <div class="schedule-main">
              <span class="schedule-no">{{ schedule.trainNo }}</span>
              <span class="schedule-time">
                {{ schedule.departureTime }} → {{ schedule.arrivalTime }}
              </span>
              <span class="schedule-duration">{{ schedule.duration }}min</span>
            </div>
            <div class="schedule-footer">
              <span class="schedule-price">${{ schedule.price }}</span>
              <span
                class="schedule-seat"
                :class="`seat-${schedule.seatStatus}`"
              >
                {{ schedule.seatStatus === 'available' ? '有座位' : schedule.seatStatus === 'standing' ? '僅站票' : '已滿' }}
              </span>
            </div>
          </button>
        </div>

        <div class="step-actions">
          <button
            class="primary-btn"
            :disabled="!selectedScheduleId"
            @click="handleSelectConfirm"
          >
            確認購票
          </button>
          <button class="text-btn" @click="currentStep = 'form'">返回修改</button>
        </div>
      </div>

      <!-- Step 3: 確認付款 -->
      <div v-else-if="currentStep === 'confirm'" class="step-confirm" aria-live="polite">
        <h4 class="confirm-title">訂單摘要</h4>
        <div class="confirm-summary">
          <div class="confirm-row">
            <span class="confirm-label">路線</span>
            <span class="confirm-value">
              {{ stations.find(s => s.id === originId)?.name }} →
              {{ stations.find(s => s.id === destinationId)?.name }}
            </span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">日期</span>
            <span class="confirm-value">{{ departureDate }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">車次</span>
            <span class="confirm-value">{{ selectedSchedule?.trainNo }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">時間</span>
            <span class="confirm-value">
              {{ selectedSchedule?.departureTime }} → {{ selectedSchedule?.arrivalTime }}
            </span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">票種 × 張數</span>
            <span class="confirm-value">
              {{ categoryOptions.find(o => o.key === category)?.label }} × {{ quantity }}
            </span>
          </div>
          <div class="confirm-row total">
            <span class="confirm-label">總金額</span>
            <span class="confirm-value">${{ (selectedSchedule?.price || 0) * quantity }}</span>
          </div>
        </div>

        <div class="step-actions">
          <button class="primary-btn" @click="handlePurchase">前往付款</button>
          <button class="text-btn" @click="handleReset">重新購票</button>
        </div>
      </div>

      <!-- Step 4: 購票成功 -->
      <div v-else-if="currentStep === 'success'" class="step-success" aria-live="polite">
        <div class="success-header">
          <span class="success-icon-inline">🎉</span>
          <h4 class="success-title-inline">購票成功</h4>
        </div>

        <div class="ticket-result-card">
          <div class="ticket-qr">
            <div class="qr-placeholder" aria-label="車票 QR Code">
              <span class="qr-icon">📱</span>
              <span class="qr-label">QR Code</span>
              <span class="qr-id">{{ purchasedTicketInfo?.id }}</span>
            </div>
          </div>
          <div class="ticket-info-list">
            <div class="ticket-info-row">
              <span class="ticket-info-label">{{ purchasedTicketInfo?.type === 'hsr' ? '高鐵' : '台鐵' }}</span>
              <span class="ticket-info-value">車次 {{ purchasedTicketInfo?.trainNo }}</span>
            </div>
            <div class="ticket-info-row">
              <span class="ticket-info-label">路線</span>
              <span class="ticket-info-value">{{ purchasedTicketInfo?.origin }} → {{ purchasedTicketInfo?.destination }}</span>
            </div>
            <div class="ticket-info-row">
              <span class="ticket-info-label">日期</span>
              <span class="ticket-info-value">{{ purchasedTicketInfo?.date }}</span>
            </div>
            <div class="ticket-info-row">
              <span class="ticket-info-label">時間</span>
              <span class="ticket-info-value">{{ purchasedTicketInfo?.time }}</span>
            </div>
            <div class="ticket-info-row">
              <span class="ticket-info-label">實付金額</span>
              <span class="ticket-info-value highlight">${{ lastPaymentResult?.finalAmount.toLocaleString() }}</span>
            </div>
            <div class="ticket-info-row">
              <span class="ticket-info-label">交易編號</span>
              <span class="ticket-info-value txn">{{ lastPaymentResult?.transactionId }}</span>
            </div>
          </div>
        </div>

        <p class="success-hint">請於搭乘時出示 QR Code 進站</p>

        <button class="primary-btn" @click="handleReset">完成</button>
      </div>
    </div>

    <!-- 付款流程 Overlay -->
    <UiPaymentFlow
      :visible="showPaymentFlow"
      :order-items="paymentOrderItems"
      :total-amount="paymentTotalAmount"
      accent-color="#f59e0b"
      success-title="購票成功"
      @payment-complete="handlePaymentComplete"
      @close="handlePaymentClose"
    />
  </section>
</template>

<style scoped>
.ticket-booking {
  width: 100%;
}

.booking-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.booking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3, 12px);
}

.booking-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.type-switch {
  display: flex;
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-sm, 6px);
  padding: 2px;
}

.type-btn {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.type-btn.active {
  background: var(--color-bg-card, #ffffff);
  color: var(--color-primary, #f59e0b);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* 步驟指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-4, 16px);
  padding: var(--space-2, 8px) 0;
}

.step {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
  font-weight: 500;
}

.step.active {
  color: var(--color-primary, #f59e0b);
  font-weight: 600;
}

.step-divider {
  color: var(--color-text-disabled, #cbd5e1);
  font-size: var(--text-sm, 13px);
}

/* 表單 */
.form-row {
  display: flex;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.form-field {
  flex: 1;
}

.field-label {
  display: block;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  margin-bottom: var(--space-1, 4px);
}

.field-select,
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
  appearance: none;
  -webkit-appearance: none;
}

.field-select:focus,
.field-input:focus {
  border-color: var(--color-primary, #f59e0b);
}

/* 數量控制 */
.quantity-control {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  overflow: hidden;
  min-height: 44px;
}

.qty-btn {
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: var(--color-progress-bg, #f1f5f9);
  font-size: var(--text-lg, 17px);
  color: var(--color-text-primary, #1c1917);
  cursor: pointer;
  transition: background-color 0.15s;
}

.qty-btn:disabled {
  color: var(--color-text-disabled, #cbd5e1);
  cursor: not-allowed;
}

.qty-btn:not(:disabled):active {
  background-color: var(--color-primary-light, #fffbeb);
}

.qty-value {
  flex: 1;
  text-align: center;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.form-error {
  font-size: var(--text-xs, 11px);
  color: #e11d48;
  margin: 0 0 var(--space-2, 8px) 0;
}

/* 班次列表 */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-4, 16px);
}

.schedule-card {
  width: 100%;
  padding: var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.schedule-card.selected {
  border-color: var(--color-primary, #f59e0b);
  border-width: 2px;
  background-color: var(--color-primary-light, #fffbeb);
}

.schedule-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.schedule-card:not(.disabled):active {
  background-color: var(--color-primary-light, #fffbeb);
}

.schedule-main {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-1, 4px);
}

.schedule-no {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  min-width: 40px;
}

.schedule-time {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  flex: 1;
}

.schedule-duration {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.schedule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-price {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-primary, #f59e0b);
}

.schedule-seat {
  font-size: var(--text-xs, 11px);
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
}

.seat-available {
  background-color: #dcfce7;
  color: #15803d;
}

.seat-standing {
  background-color: var(--color-primary-light, #fffbeb);
  color: var(--color-primary, #f59e0b);
}

.seat-full {
  background-color: #ffe4e6;
  color: #e11d48;
}

/* 確認摘要 */
.confirm-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

.confirm-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-4, 16px);
  padding: var(--space-3, 12px);
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-md, 12px);
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confirm-row.total {
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: var(--space-2, 8px);
  margin-top: var(--space-1, 4px);
}

.confirm-label {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.confirm-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.confirm-row.total .confirm-value {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  color: var(--color-primary, #f59e0b);
}

/* 按鈕 */
.step-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.primary-btn {
  width: 100%;
  min-height: 48px;
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

.primary-btn:active {
  opacity: 0.8;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-btn {
  width: 100%;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
}

.text-btn:active {
  opacity: 0.6;
}

/* 購票成功 */
.step-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3, 12px);
}

.success-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-2, 8px);
}

.success-icon-inline {
  font-size: 24px;
}

.success-title-inline {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.ticket-result-card {
  width: 100%;
  background: var(--color-primary-light, #fffbeb);
  border: 1px solid var(--color-primary, #f59e0b);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-4, 16px);
}

.ticket-qr {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-3, 12px);
}

.qr-placeholder {
  width: 120px;
  height: 120px;
  background: #ffffff;
  border: 2px dashed var(--color-primary, #f59e0b);
  border-radius: var(--radius-md, 12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.qr-icon {
  font-size: 32px;
}

.qr-label {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-primary, #f59e0b);
}

.qr-id {
  font-size: 9px;
  color: var(--color-text-disabled, #cbd5e1);
  font-family: monospace;
}

.ticket-info-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ticket-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-info-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.ticket-info-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.ticket-info-value.highlight {
  color: var(--color-primary, #f59e0b);
  font-weight: 700;
}

.ticket-info-value.txn {
  font-family: monospace;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.success-hint {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}
</style>
