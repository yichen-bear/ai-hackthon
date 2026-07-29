<script setup lang="ts">
/**
 * ibon 票務中心
 * 整合統一獅球賽門票、展演門票與門市體驗活動購票
 * 購票流程：選擇票種/數量 → 付款方式 → 付款成功 → 顯示票券 QR Code
 */
import type { EventItem, StoreExperience, EventType } from '~/types/entertainment'
import type { PaymentOrderItem, PaymentResult } from '~/components/ui/PaymentFlow.vue'

const props = defineProps<{
  events: EventItem[]
  experiences: StoreExperience[]
}>()

const emit = defineEmits<{
  'ticket-purchased': [payload: {
    eventId: string
    eventType: EventType | 'experience'
    ticketType: string
    quantity: number
    totalAmount: number
    venue: string
    venueAddress: string
    date: string
    time: string
  }]
}>()

// 分類 Tab
const tabs = [
  { key: 'baseball', label: '統一獅⚾' },
  { key: 'show', label: '展覽演出🎭' },
  { key: 'experience', label: '門市體驗☕' },
] as const

type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('baseball')

// 篩選活動
const baseballEvents = computed(() => props.events.filter(e => e.type === 'baseball'))
const showEvents = computed(() => props.events.filter(e => e.type !== 'baseball'))

// 購票 overlay 狀態
const showOverlay = ref(false)
const selectedEvent = ref<EventItem | null>(null)
const selectedExperience = ref<StoreExperience | null>(null)
const selectedTicketType = ref('')
const selectedQuantity = ref(1)

const selectedPrice = computed(() => {
  if (!selectedEvent.value) return 0
  const price = selectedEvent.value.prices.find(p => p.id === selectedTicketType.value)
  return price?.price ?? 0
})

const totalAmount = computed(() => selectedPrice.value * selectedQuantity.value)

function openPurchase(event: EventItem) {
  selectedEvent.value = event
  selectedExperience.value = null
  selectedTicketType.value = event.prices[0]?.id ?? ''
  selectedQuantity.value = 1
  showOverlay.value = true
}

function openExperiencePurchase(exp: StoreExperience) {
  selectedExperience.value = exp
  selectedEvent.value = null
  selectedQuantity.value = 1
  showOverlay.value = true
}

function confirmPurchase() {
  // 關閉購票 overlay，開啟付款流程
  showOverlay.value = false
  showPaymentFlow.value = true
}

// ─── 付款流程 ───
const showPaymentFlow = ref(false)
const ticketSuccess = ref(false)
const lastPaymentResult = ref<PaymentResult | null>(null)

const paymentOrderItems = computed<PaymentOrderItem[]>(() => {
  if (selectedEvent.value) {
    const price = selectedEvent.value.prices.find(p => p.id === selectedTicketType.value)
    return [
      { label: '活動', value: selectedEvent.value.title },
      { label: '日期', value: `${selectedEvent.value.date} ${selectedEvent.value.time}` },
      { label: '地點', value: selectedEvent.value.venue },
      { label: '票種', value: price?.name ?? '' },
      { label: '數量', value: `${selectedQuantity.value} 張` },
    ]
  } else if (selectedExperience.value) {
    return [
      { label: '體驗活動', value: selectedExperience.value.name },
      { label: '時間', value: selectedExperience.value.timeSlot },
      { label: '地點', value: selectedExperience.value.storeName },
      { label: '人數', value: `${selectedQuantity.value} 人` },
    ]
  }
  return []
})

const paymentTotalAmount = computed(() => {
  if (selectedEvent.value) {
    return totalAmount.value
  } else if (selectedExperience.value) {
    return selectedExperience.value.fee * selectedQuantity.value
  }
  return 0
})

function handlePaymentComplete(result: PaymentResult) {
  lastPaymentResult.value = result
  showPaymentFlow.value = false
  ticketSuccess.value = true

  // 通知父組件
  if (selectedEvent.value) {
    const price = selectedEvent.value.prices.find(p => p.id === selectedTicketType.value)
    emit('ticket-purchased', {
      eventId: selectedEvent.value.id,
      eventType: selectedEvent.value.type,
      ticketType: price?.name ?? '',
      quantity: selectedQuantity.value,
      totalAmount: result.finalAmount,
      venue: selectedEvent.value.venue,
      venueAddress: selectedEvent.value.venueAddress,
      date: selectedEvent.value.date,
      time: selectedEvent.value.time,
    })
  } else if (selectedExperience.value) {
    emit('ticket-purchased', {
      eventId: selectedExperience.value.id,
      eventType: 'experience',
      ticketType: '體驗票',
      quantity: selectedQuantity.value,
      totalAmount: result.finalAmount,
      venue: selectedExperience.value.storeName,
      venueAddress: selectedExperience.value.storeAddress,
      date: selectedExperience.value.timeSlot.split(' ')[0] ?? '',
      time: selectedExperience.value.timeSlot.split(' ')[1] ?? '',
    })
  }
}

function handlePaymentClose() {
  showPaymentFlow.value = false
}

function closeTicketSuccess() {
  ticketSuccess.value = false
  lastPaymentResult.value = null
  selectedEvent.value = null
  selectedExperience.value = null
}

function closeOverlay() {
  showOverlay.value = false
}
</script>

<template>
  <section class="ticket-center" aria-labelledby="ticket-center-title">
    <div class="card-header">
      <h2 id="ticket-center-title" class="card-title">ibon 票務</h2>
      <span class="card-badge">🎫 展演與賽事</span>
    </div>

    <!-- 分類 Tab -->
    <nav class="tab-nav" aria-label="票務分類">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        :aria-current="activeTab === tab.key ? 'true' : undefined"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- 統一獅⚾ -->
    <div v-if="activeTab === 'baseball'" class="event-list">
      <article
        v-for="event in baseballEvents"
        :key="event.id"
        class="event-card"
        :class="{ 'sold-out': event.remainingTickets === 0 }"
      >
        <div class="event-cover" :style="{ background: event.coverImage }">
          <span class="event-type-badge">⚾</span>
        </div>
        <div class="event-info">
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="event-meta">{{ event.date }} {{ event.time }}</p>
          <p class="event-venue">📍 {{ event.venue }}</p>
          <div class="event-footer">
            <span class="event-price">{{ event.priceRange }}</span>
            <span
              class="event-remaining"
              :class="{ warning: event.remainingTickets < 50 && event.remainingTickets > 0 }"
            >
              {{ event.remainingTickets > 0 ? `剩餘 ${event.remainingTickets} 張` : '已售完' }}
            </span>
          </div>
          <button
            v-if="event.remainingTickets > 0"
            class="btn-primary"
            aria-label="選位購票"
            @click="openPurchase(event)"
          >
            選位購票
          </button>
          <span v-else class="sold-out-label">已售完</span>
        </div>
      </article>
    </div>

    <!-- 展覽演出🎭 -->
    <div v-if="activeTab === 'show'" class="event-list">
      <article
        v-for="event in showEvents"
        :key="event.id"
        class="event-card"
        :class="{ 'sold-out': event.remainingTickets === 0 }"
      >
        <div class="event-cover tall" :style="{ background: event.coverImage }">
          <div class="event-tags" v-if="event.tags">
            <span v-for="tag in event.tags" :key="tag" class="tag-badge">{{ tag }}</span>
          </div>
        </div>
        <div class="event-info">
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="event-meta">{{ event.date }} {{ event.time }}</p>
          <p class="event-venue">📍 {{ event.venue }}</p>
          <div class="event-footer">
            <span class="event-price">{{ event.priceRange }}</span>
            <span
              class="event-remaining"
              :class="{ warning: event.remainingTickets < 50 && event.remainingTickets > 0 }"
            >
              {{ event.remainingTickets > 0 ? `剩餘 ${event.remainingTickets} 張` : '已售完' }}
            </span>
          </div>
          <button
            v-if="event.remainingTickets > 0"
            class="btn-primary"
            aria-label="立即購票"
            @click="openPurchase(event)"
          >
            立即購票
          </button>
          <span v-else class="sold-out-label">已售完</span>
        </div>
      </article>
    </div>

    <!-- 門市體驗☕ -->
    <div v-if="activeTab === 'experience'" class="event-list">
      <article
        v-for="exp in experiences"
        :key="exp.id"
        class="event-card"
        :class="{ 'sold-out': exp.currentParticipants >= exp.maxParticipants }"
      >
        <div class="event-info">
          <h3 class="event-title">{{ exp.name }}</h3>
          <p class="event-meta">{{ exp.timeSlot }}</p>
          <p class="event-venue">📍 {{ exp.storeName }}</p>
          <p class="event-desc" v-if="exp.description">{{ exp.description }}</p>
          <div class="event-footer">
            <span class="event-price">${{ exp.fee }}</span>
            <span
              class="event-remaining"
              :class="{ warning: exp.maxParticipants - exp.currentParticipants <= 3 }"
            >
              限額 {{ exp.maxParticipants }} 人，剩 {{ exp.maxParticipants - exp.currentParticipants }} 位
            </span>
          </div>
          <button
            v-if="exp.currentParticipants < exp.maxParticipants"
            class="btn-primary"
            aria-label="報名參加"
            @click="openExperiencePurchase(exp)"
          >
            報名參加
          </button>
          <span v-else class="sold-out-label">已額滿</span>
        </div>
      </article>
    </div>

    <!-- 購票 Overlay -->
    <Teleport to="body">
      <div v-if="showOverlay" class="overlay-backdrop" @click.self="closeOverlay">
        <div class="overlay-panel" role="dialog" aria-modal="true" aria-label="購票確認">
          <!-- 購票表單 - 活動 -->
          <template v-if="selectedEvent">
            <h3 class="overlay-title">{{ selectedEvent.title }}</h3>
            <p class="overlay-meta">{{ selectedEvent.date }} {{ selectedEvent.time }} · {{ selectedEvent.venue }}</p>

            <label class="form-label">票種</label>
            <select v-model="selectedTicketType" class="form-select">
              <option
                v-for="price in selectedEvent.prices"
                :key="price.id"
                :value="price.id"
                :disabled="price.remaining === 0"
              >
                {{ price.name }} - ${{ price.price }}{{ price.remaining === 0 ? '（售完）' : ` (剩 ${price.remaining})` }}
              </option>
            </select>

            <label class="form-label">數量</label>
            <div class="quantity-selector">
              <button class="qty-btn" :disabled="selectedQuantity <= 1" @click="selectedQuantity--">−</button>
              <span class="qty-value">{{ selectedQuantity }}</span>
              <button class="qty-btn" :disabled="selectedQuantity >= 4" @click="selectedQuantity++">+</button>
            </div>

            <div class="total-amount">
              <span>總金額</span>
              <strong>${{ totalAmount.toLocaleString() }}</strong>
            </div>

            <button class="btn-primary btn-confirm" @click="confirmPurchase">前往付款</button>
            <button class="btn-cancel" @click="closeOverlay">取消</button>
          </template>

          <!-- 購票表單 - 體驗 -->
          <template v-else-if="selectedExperience">
            <h3 class="overlay-title">{{ selectedExperience.name }}</h3>
            <p class="overlay-meta">{{ selectedExperience.timeSlot }} · {{ selectedExperience.storeName }}</p>

            <label class="form-label">人數</label>
            <div class="quantity-selector">
              <button class="qty-btn" :disabled="selectedQuantity <= 1" @click="selectedQuantity--">−</button>
              <span class="qty-value">{{ selectedQuantity }}</span>
              <button class="qty-btn" :disabled="selectedQuantity >= 4" @click="selectedQuantity++">+</button>
            </div>

            <div class="total-amount">
              <span>總金額</span>
              <strong>${{ (selectedExperience.fee * selectedQuantity).toLocaleString() }}</strong>
            </div>

            <button class="btn-primary btn-confirm" @click="confirmPurchase">前往付款</button>
            <button class="btn-cancel" @click="closeOverlay">取消</button>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- 付款成功 - 票券 QR Code -->
    <Teleport to="body">
      <div v-if="ticketSuccess" class="overlay-backdrop" @click.self="closeTicketSuccess">
        <div class="overlay-panel ticket-success-panel" role="dialog" aria-modal="true" aria-label="購票成功">
          <div class="ticket-success-header">
            <span class="ticket-success-icon">✓</span>
            <h3 class="ticket-success-title">購票成功</h3>
          </div>

          <div class="ticket-qr-section">
            <div class="ticket-qr-box" aria-label="票券 QR Code">
              <span class="ticket-qr-emoji">🎫</span>
              <span class="ticket-qr-label">入場 QR Code</span>
              <span class="ticket-qr-id">TKT-{{ Date.now().toString(36).toUpperCase() }}</span>
            </div>
          </div>

          <div class="ticket-success-details">
            <div class="ticket-detail-row" v-if="selectedEvent">
              <span class="ticket-detail-label">活動</span>
              <span class="ticket-detail-value">{{ selectedEvent.title }}</span>
            </div>
            <div class="ticket-detail-row" v-if="selectedExperience">
              <span class="ticket-detail-label">體驗</span>
              <span class="ticket-detail-value">{{ selectedExperience.name }}</span>
            </div>
            <div class="ticket-detail-row">
              <span class="ticket-detail-label">日期</span>
              <span class="ticket-detail-value">{{ selectedEvent?.date || selectedExperience?.timeSlot.split(' ')[0] }}</span>
            </div>
            <div class="ticket-detail-row">
              <span class="ticket-detail-label">時間</span>
              <span class="ticket-detail-value">{{ selectedEvent?.time || selectedExperience?.timeSlot.split(' ')[1] }}</span>
            </div>
            <div class="ticket-detail-row">
              <span class="ticket-detail-label">地點</span>
              <span class="ticket-detail-value">{{ selectedEvent?.venue || selectedExperience?.storeName }}</span>
            </div>
            <div class="ticket-detail-row">
              <span class="ticket-detail-label">數量</span>
              <span class="ticket-detail-value">{{ selectedQuantity }} {{ selectedEvent ? '張' : '人' }}</span>
            </div>
            <div class="ticket-detail-row">
              <span class="ticket-detail-label">付款方式</span>
              <span class="ticket-detail-value">{{ lastPaymentResult?.methodLabel }}</span>
            </div>
            <div class="ticket-detail-row total">
              <span class="ticket-detail-label">實付金額</span>
              <span class="ticket-detail-value highlight">${{ lastPaymentResult?.finalAmount.toLocaleString() }}</span>
            </div>
            <div class="ticket-detail-row">
              <span class="ticket-detail-label">交易編號</span>
              <span class="ticket-detail-value txn">{{ lastPaymentResult?.transactionId }}</span>
            </div>
          </div>

          <p class="ticket-success-hint">請於入場時出示 QR Code</p>
          <button class="btn-primary" @click="closeTicketSuccess">完成</button>
        </div>
      </div>
    </Teleport>

    <!-- 付款流程 -->
    <UiPaymentFlow
      :visible="showPaymentFlow"
      :order-items="paymentOrderItems"
      :total-amount="paymentTotalAmount"
      accent-color="#ec4899"
      success-title="付款成功"
      @payment-complete="handlePaymentComplete"
      @close="handlePaymentClose"
    />
  </section>
</template>

<style scoped>
.ticket-center {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3, 12px);
}

.card-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin: 0;
}

.card-badge {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  background: var(--color-primary-light, #fdf2f8);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

/* Tab */
.tab-nav {
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  white-space: nowrap;
  margin-bottom: var(--space-3, 12px);
  scrollbar-width: none;
}
.tab-nav::-webkit-scrollbar { display: none; }

.tab-btn {
  flex-shrink: 0;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  background: transparent;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-disabled, #cbd5e1);
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn.active {
  color: #ffffff;
  background-color: var(--color-primary, #ec4899);
  font-weight: 600;
}
.tab-btn:not(.active):hover { color: var(--color-text-secondary, #64748b); }
.tab-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* Event List */
.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.event-card {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  transition: opacity 0.15s ease;
}
.event-card.sold-out { opacity: 0.5; filter: grayscale(0.6); }

.event-cover {
  height: 100px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: var(--space-2, 8px);
  position: relative;
}
.event-cover.tall { height: 140px; }

.event-type-badge {
  font-size: 20px;
  background: rgba(255,255,255,0.9);
  border-radius: var(--radius-full, 9999px);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-tags {
  position: absolute;
  bottom: var(--space-2, 8px);
  left: var(--space-2, 8px);
  display: flex;
  gap: 4px;
}
.tag-badge {
  font-size: var(--text-xs, 11px);
  background: rgba(255,255,255,0.9);
  color: var(--color-text-primary, #1e293b);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

.event-info {
  padding: var(--space-3, 12px);
}

.event-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-meta {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 2px;
}

.event-venue {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 8px;
}

.event-desc {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 8px;
}

.event-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-price {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-primary, #ec4899);
}

.event-remaining {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
}
.event-remaining.warning { color: #ef4444; font-weight: 600; }

.btn-primary {
  width: 100%;
  padding: var(--space-3, 12px);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: var(--color-primary, #ec4899);
  color: #ffffff;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.sold-out-label {
  display: block;
  text-align: center;
  padding: var(--space-3, 12px);
  color: var(--color-text-disabled, #cbd5e1);
  font-size: var(--text-sm, 13px);
  font-weight: 500;
}

/* Overlay */
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.overlay-panel {
  background: #ffffff;
  border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
  padding: var(--space-5, 20px);
  width: 100%;
  max-width: 430px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slide-up 0.3s ease;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.overlay-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  margin: 0 0 4px;
}

.overlay-meta {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 16px;
}

.form-label {
  display: block;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  margin-bottom: 6px;
}

.form-select {
  width: 100%;
  padding: var(--space-3, 12px);
  min-height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  font-size: var(--text-sm, 13px);
  margin-bottom: 12px;
  appearance: none;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 12px center;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  margin-bottom: 16px;
}

.qty-btn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  background: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.qty-btn:focus-visible { outline: 2px solid var(--color-primary); }

.qty-value {
  font-size: var(--text-lg, 17px);
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.total-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3, 12px) 0;
  border-top: 1px solid var(--color-border, #e2e8f0);
  margin-bottom: 16px;
  font-size: var(--text-base, 15px);
}
.total-amount strong {
  font-size: var(--text-lg, 17px);
  color: var(--color-primary, #ec4899);
}

.btn-confirm { margin-bottom: 8px; }

.btn-cancel {
  width: 100%;
  padding: var(--space-3, 12px);
  min-height: 44px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--color-text-secondary, #64748b);
  font-size: var(--text-sm, 13px);
  cursor: pointer;
}
.btn-cancel:hover { opacity: 0.85; }

/* 購票成功 */
.purchase-success {
  text-align: center;
  padding: 40px 0;
}
.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary, #ec4899);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  animation: bounce-in 0.4s ease;
}
@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.purchase-success p {
  font-size: var(--text-lg, 17px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
}

/* ─── 票券成功面板 ─── */
.ticket-success-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.ticket-success-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ticket-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary, #ec4899);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounce-in 0.4s ease;
}

.ticket-success-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.ticket-qr-section {
  display: flex;
  justify-content: center;
  width: 100%;
}

.ticket-qr-box {
  width: 140px;
  height: 140px;
  background: #ffffff;
  border: 2px dashed var(--color-primary, #ec4899);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ticket-qr-emoji {
  font-size: 36px;
}

.ticket-qr-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary, #ec4899);
}

.ticket-qr-id {
  font-size: 9px;
  color: #94a3b8;
  font-family: monospace;
}

.ticket-success-details {
  width: 100%;
  background: var(--color-primary-light, #fdf2f8);
  border: 1px solid var(--color-primary, #ec4899);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ticket-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-detail-row.total {
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
  margin-top: 4px;
}

.ticket-detail-label {
  font-size: 12px;
  color: #64748b;
}

.ticket-detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  max-width: 60%;
  text-align: right;
}

.ticket-detail-value.highlight {
  color: var(--color-primary, #ec4899);
  font-weight: 700;
  font-size: 15px;
}

.ticket-detail-value.txn {
  font-family: monospace;
  font-size: 11px;
  color: #94a3b8;
}

.ticket-success-hint {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}
</style>
