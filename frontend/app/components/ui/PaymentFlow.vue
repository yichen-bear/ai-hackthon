<script setup lang="ts">
/**
 * PaymentFlow - 共用付款流程組件
 * 步驟：確認摘要 → 選擇付款方式 → 付款成功
 * 付款方式：OPEN錢包、OPEN POINT點數折抵、優惠券選擇、線上支付
 */

export interface PaymentOrderItem {
  label: string
  value: string
}

export interface PaymentResult {
  method: PaymentMethodKey
  methodLabel: string
  pointsUsed: number
  couponDiscount: number
  finalAmount: number
  transactionId: string
  paidAt: string
}

export type PaymentMethodKey = 'open-wallet' | 'open-point' | 'coupon' | 'online-pay'

interface PaymentMethod {
  key: PaymentMethodKey
  label: string
  icon: string
  description: string
}

const props = defineProps<{
  /** 是否顯示付款流程 */
  visible: boolean
  /** 訂單摘要項目（key-value 形式） */
  orderItems: PaymentOrderItem[]
  /** 總金額 */
  totalAmount: number
  /** 模組主色（用於按鈕等） */
  accentColor?: string
  /** 付款成功後要顯示的自訂內容 slot 名稱 */
  successTitle?: string
}>()

const emit = defineEmits<{
  'payment-complete': [result: PaymentResult]
  'close': []
}>()

type FlowStep = 'summary' | 'method' | 'processing' | 'success'

const currentStep = ref<FlowStep>('summary')
const selectedMethod = ref<PaymentMethodKey | null>(null)
const usePoints = ref(false)
const pointsToUse = ref(0)
const selectedCoupon = ref<string | null>(null)
const paymentResult = ref<PaymentResult | null>(null)

// 可用 OPEN POINT（模擬）
const availablePoints = 2450
const pointsRate = 1 // 1 點 = 1 元

// 模擬優惠券
const coupons = [
  { id: 'cpn-1', name: '滿 500 折 50', discount: 50, minAmount: 500 },
  { id: 'cpn-2', name: '滿 1000 折 120', discount: 120, minAmount: 1000 },
  { id: 'cpn-3', name: '9 折券', discount: 0, minAmount: 0, isPercent: true, percent: 10 },
]

const applicableCoupons = computed(() => {
  return coupons.filter(c => {
    if (c.minAmount > 0 && props.totalAmount < c.minAmount) return false
    return true
  })
})

const couponDiscount = computed(() => {
  if (!selectedCoupon.value) return 0
  const cpn = coupons.find(c => c.id === selectedCoupon.value)
  if (!cpn) return 0
  if ((cpn as any).isPercent) {
    return Math.round(props.totalAmount * (cpn as any).percent / 100)
  }
  return cpn.discount
})

const pointsDiscount = computed(() => {
  if (!usePoints.value) return 0
  return Math.min(pointsToUse.value * pointsRate, props.totalAmount - couponDiscount.value)
})

const finalAmount = computed(() => {
  return Math.max(0, props.totalAmount - couponDiscount.value - pointsDiscount.value)
})

const maxPointsUsable = computed(() => {
  const remaining = props.totalAmount - couponDiscount.value
  return Math.min(availablePoints, remaining)
})

const paymentMethods: PaymentMethod[] = [
  { key: 'open-wallet', label: 'OPEN 錢包', icon: '👛', description: '使用 OPEN 錢包餘額支付' },
  { key: 'online-pay', label: '線上支付', icon: '💳', description: '信用卡/金融卡線上付款' },
]

const accentStyle = computed(() => ({
  '--payment-accent': props.accentColor || 'var(--color-primary, #f59e0b)',
}))

// 重置狀態
function resetState() {
  currentStep.value = 'summary'
  selectedMethod.value = null
  usePoints.value = false
  pointsToUse.value = 0
  selectedCoupon.value = null
  paymentResult.value = null
}

// 步驟流轉
function goToMethod() {
  currentStep.value = 'method'
}

function goBack() {
  if (currentStep.value === 'method') {
    currentStep.value = 'summary'
  }
}

function confirmPayment() {
  if (!selectedMethod.value) return
  currentStep.value = 'processing'

  // 模擬付款處理
  setTimeout(() => {
    const result: PaymentResult = {
      method: selectedMethod.value!,
      methodLabel: paymentMethods.find(m => m.key === selectedMethod.value)?.label || '線上支付',
      pointsUsed: pointsDiscount.value,
      couponDiscount: couponDiscount.value,
      finalAmount: finalAmount.value,
      transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
      paidAt: new Date().toLocaleString('zh-TW'),
    }
    paymentResult.value = result
    currentStep.value = 'success'
    emit('payment-complete', result)
  }, 1500)
}

function handleClose() {
  resetState()
  emit('close')
}

const router = useRouter()
function goToTickets() {
  resetState()
  emit('close')
  router.push({ path: '/member', query: { tab: 'tickets' } })
}

// 外部可見時重置
watch(() => props.visible, (val) => {
  if (val) resetState()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="payment-overlay" :style="accentStyle" @click.self="handleClose">
      <div class="payment-panel" role="dialog" aria-modal="true" aria-label="付款流程">

        <!-- Step 1: 確認摘要 -->
        <div v-if="currentStep === 'summary'" class="payment-step">
          <div class="step-header">
            <h3 class="step-title">確認付款</h3>
            <button class="close-btn" aria-label="關閉" @click="handleClose">✕</button>
          </div>

          <div class="order-summary">
            <div
              v-for="item in orderItems"
              :key="item.label"
              class="summary-row"
            >
              <span class="summary-label">{{ item.label }}</span>
              <span class="summary-value">{{ item.value }}</span>
            </div>
            <div class="summary-row total">
              <span class="summary-label">應付金額</span>
              <span class="summary-value">${{ totalAmount.toLocaleString() }}</span>
            </div>
          </div>

          <button class="btn-primary" @click="goToMethod">選擇付款方式</button>
        </div>

        <!-- Step 2: 選擇付款方式 -->
        <div v-if="currentStep === 'method'" class="payment-step">
          <div class="step-header">
            <button class="back-btn" aria-label="返回" @click="goBack">‹ 返回</button>
            <h3 class="step-title">付款方式</h3>
            <button class="close-btn" aria-label="關閉" @click="handleClose">✕</button>
          </div>

          <!-- OPEN POINT 折抵 -->
          <div class="method-section">
            <div class="section-label">
              <span>🪙 OPEN POINT 點數折抵</span>
              <span class="points-balance">可用 {{ availablePoints.toLocaleString() }} 點</span>
            </div>
            <div class="points-toggle">
              <label class="toggle-row">
                <input v-model="usePoints" type="checkbox" class="toggle-checkbox" />
                <span class="toggle-text">使用點數折抵</span>
              </label>
              <div v-if="usePoints" class="points-input-row">
                <input
                  v-model.number="pointsToUse"
                  type="range"
                  :min="0"
                  :max="maxPointsUsable"
                  class="points-slider"
                />
                <span class="points-amount">折 ${{ pointsDiscount }}</span>
              </div>
            </div>
          </div>

          <!-- 優惠券選擇 -->
          <div class="method-section">
            <div class="section-label">🎟️ 優惠券</div>
            <div class="coupon-list">
              <button
                class="coupon-item"
                :class="{ active: !selectedCoupon }"
                @click="selectedCoupon = null"
              >
                不使用
              </button>
              <button
                v-for="cpn in applicableCoupons"
                :key="cpn.id"
                class="coupon-item"
                :class="{ active: selectedCoupon === cpn.id }"
                @click="selectedCoupon = cpn.id"
              >
                {{ cpn.name }}
              </button>
            </div>
          </div>

          <!-- 支付方式 -->
          <div class="method-section">
            <div class="section-label">💰 支付方式</div>
            <div class="method-list">
              <button
                v-for="method in paymentMethods"
                :key="method.key"
                class="method-card"
                :class="{ active: selectedMethod === method.key }"
                @click="selectedMethod = method.key"
              >
                <span class="method-icon">{{ method.icon }}</span>
                <div class="method-info">
                  <span class="method-name">{{ method.label }}</span>
                  <span class="method-desc">{{ method.description }}</span>
                </div>
                <span v-if="selectedMethod === method.key" class="method-check">✓</span>
              </button>
            </div>
          </div>

          <!-- 金額摘要 -->
          <div class="amount-breakdown">
            <div v-if="couponDiscount > 0" class="breakdown-row">
              <span>優惠券折抵</span>
              <span class="discount">-${{ couponDiscount }}</span>
            </div>
            <div v-if="pointsDiscount > 0" class="breakdown-row">
              <span>OPEN POINT 折抵</span>
              <span class="discount">-${{ pointsDiscount }}</span>
            </div>
            <div class="breakdown-row final">
              <span>實付金額</span>
              <strong>${{ finalAmount.toLocaleString() }}</strong>
            </div>
          </div>

          <button
            class="btn-primary"
            :disabled="!selectedMethod"
            @click="confirmPayment"
          >
            確認付款 ${{ finalAmount.toLocaleString() }}
          </button>
        </div>

        <!-- Step 3: 處理中 -->
        <div v-if="currentStep === 'processing'" class="payment-step processing-step">
          <div class="processing-spinner" aria-label="付款處理中"></div>
          <p class="processing-text">付款處理中...</p>
        </div>

        <!-- Step 4: 付款成功 -->
        <div v-if="currentStep === 'success'" class="payment-step success-step">
          <div class="success-icon" aria-hidden="true">✓</div>
          <h3 class="success-title">{{ successTitle || '付款成功' }}</h3>

          <div class="success-details">
            <div class="detail-row">
              <span>付款方式</span>
              <span>{{ paymentResult?.methodLabel }}</span>
            </div>
            <div v-if="paymentResult && paymentResult.pointsUsed > 0" class="detail-row">
              <span>點數折抵</span>
              <span>-${{ paymentResult.pointsUsed }}</span>
            </div>
            <div v-if="paymentResult && paymentResult.couponDiscount > 0" class="detail-row">
              <span>優惠券折抵</span>
              <span>-${{ paymentResult.couponDiscount }}</span>
            </div>
            <div class="detail-row total">
              <span>實付金額</span>
              <strong>${{ paymentResult?.finalAmount.toLocaleString() }}</strong>
            </div>
            <div class="detail-row">
              <span>交易編號</span>
              <span class="txn-id">{{ paymentResult?.transactionId }}</span>
            </div>
            <div class="detail-row">
              <span>付款時間</span>
              <span>{{ paymentResult?.paidAt }}</span>
            </div>
          </div>

          <!-- 自訂成功內容 slot -->
          <slot name="success-content" :result="paymentResult"></slot>

          <div class="success-actions">
            <button class="btn-secondary" @click="goToTickets">📋 查看票券</button>
            <button class="btn-primary" @click="handleClose">完成</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.payment-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(2px);
}

.payment-panel {
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 430px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 20px 16px;
  animation: slide-up 0.3s ease;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.payment-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
}

.step-title {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  flex: 1;
  text-align: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: var(--payment-accent);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

/* Order Summary */
.order-summary {
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-row.total {
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 4px;
}

.summary-label {
  font-size: 13px;
  color: #64748b;
}

.summary-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.summary-row.total .summary-value {
  font-size: 17px;
  font-weight: 700;
  color: var(--payment-accent);
}

/* Method Sections */
.method-section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-balance {
  font-size: 11px;
  color: #64748b;
  font-weight: 400;
}

/* Points Toggle */
.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--payment-accent);
}

.toggle-text {
  font-size: 13px;
  color: #334155;
}

.points-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.points-slider {
  flex: 1;
  accent-color: var(--payment-accent);
  height: 6px;
}

.points-amount {
  font-size: 13px;
  font-weight: 600;
  color: var(--payment-accent);
  min-width: 60px;
  text-align: right;
}

/* Coupon List */
.coupon-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.coupon-item {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  min-height: 36px;
  transition: all 0.15s ease;
}

.coupon-item.active {
  border-color: var(--payment-accent);
  background: color-mix(in srgb, var(--payment-accent) 8%, white);
  color: var(--payment-accent);
  font-weight: 600;
}

/* Method List */
.method-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: all 0.15s ease;
}

.method-card.active {
  border-color: var(--payment-accent);
  border-width: 2px;
  background: color-mix(in srgb, var(--payment-accent) 5%, white);
}

.method-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.method-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.method-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.method-desc {
  font-size: 11px;
  color: #94a3b8;
}

.method-check {
  font-size: 16px;
  font-weight: 700;
  color: var(--payment-accent);
}

/* Amount Breakdown */
.amount-breakdown {
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
}

.breakdown-row .discount {
  color: #10b981;
  font-weight: 500;
}

.breakdown-row.final {
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 4px;
  color: #1e293b;
}

.breakdown-row.final strong {
  font-size: 17px;
  color: var(--payment-accent);
}

/* Primary Button */
.btn-primary {
  width: 100%;
  padding: 14px;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--payment-accent);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-secondary {
  width: 100%;
  padding: 12px;
  min-height: 44px;
  border: 1.5px solid var(--payment-accent);
  border-radius: 12px;
  background: transparent;
  color: var(--payment-accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-secondary:hover { background: color-mix(in srgb, var(--payment-accent) 8%, white); }

.success-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-primary:hover { opacity: 0.9; }
.btn-primary:active { opacity: 0.8; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary:focus-visible { outline: 2px solid var(--payment-accent); outline-offset: 2px; }

/* Processing */
.processing-step {
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.processing-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: var(--payment-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-text {
  font-size: 15px;
  color: #64748b;
  margin: 16px 0 0;
}

/* Success */
.success-step {
  align-items: center;
  padding-top: 20px;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--payment-accent);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounce-in 0.4s ease;
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 12px 0 0;
}

.success-details {
  width: 100%;
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
}

.detail-row.total {
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 4px;
}

.detail-row.total strong {
  color: var(--payment-accent);
  font-size: 15px;
}

.txn-id {
  font-family: monospace;
  font-size: 12px;
  color: #94a3b8;
}
</style>
