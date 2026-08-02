<script setup lang="ts">
/**
 * 在地社區活動與社大課程
 * 報名 → 付款確認（走 PaymentFlow）→ QR Code 報到憑證
 * 免費活動直接報名成功
 */
import type { CommunityEvent, CommunityCourse } from '~/types/entertainment'
import type { PaymentOrderItem, PaymentResult } from '~/components/ui/PaymentFlow.vue'

const props = defineProps<{
  communityEvents: CommunityEvent[]
  courses: CommunityCourse[]
}>()

const emit = defineEmits<{
  'register': [payload: { eventId: string; type: 'community' | 'course' }]
}>()

// Tab
const tabs = [
  { key: 'community', label: '社區活動🏘️' },
  { key: 'course', label: '社大課程📚' },
] as const
type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('community')
const { apiFetch } = useApi()
// 報名狀態
const registeredIds = ref<Set<string>>(new Set())
const paymentTarget = ref<{ id: string; name: string; fee: number; type: 'community' | 'course'; details?: string } | null>(null)

// 初始化已報名狀態（從 API 回傳的 isRegistered）
onMounted(() => {
  props.communityEvents.forEach(e => { if ((e as any).isRegistered) registeredIds.value.add(e.id) })
})
watch(() => props.communityEvents, (events) => {
  events.forEach(e => { if ((e as any).isRegistered) registeredIds.value.add(e.id) })
})

// PaymentFlow 狀態
const showPaymentFlow = ref(false)
const showRegisterSuccess = ref(false)
const lastPaymentResult = ref<PaymentResult | null>(null)

const paymentOrderItems = computed<PaymentOrderItem[]>(() => {
  if (!paymentTarget.value) return []
  const items: PaymentOrderItem[] = [
    { label: '活動名稱', value: paymentTarget.value.name },
  ]
  if (paymentTarget.value.details) {
    items.push({ label: '詳情', value: paymentTarget.value.details })
  }
  items.push({ label: '費用', value: `$${paymentTarget.value.fee}` })
  return items
})

const paymentTotalAmount = computed(() => paymentTarget.value?.fee || 0)

function openPayment(id: string, name: string, fee: number, type: 'community' | 'course', details?: string) {
  paymentTarget.value = { id, name, fee, type, details }
  if (fee === 0) {
    // 免費活動直接報名
    registeredIds.value.add(id)
    emit('register', { eventId: id, type })
    showRegisterSuccess.value = true
  } else {
    // 付費活動走 PaymentFlow
    showPaymentFlow.value = true
  }
}

function handlePaymentComplete(result: PaymentResult) {
  lastPaymentResult.value = result
  showPaymentFlow.value = false
  if (paymentTarget.value) {
    registeredIds.value.add(paymentTarget.value.id)
    emit('register', { eventId: paymentTarget.value.id, type: paymentTarget.value.type })
  }
  showRegisterSuccess.value = true
}

function handlePaymentClose() {
  showPaymentFlow.value = false
}

function closeRegisterSuccess() {
  showRegisterSuccess.value = false
  lastPaymentResult.value = null
  paymentTarget.value = null
}

// QR 報到 overlay
const showQr = ref(false)
const qrTarget = ref<{ name: string; id: string } | null>(null)

function openQrCheckin(id: string, name: string) {
  qrTarget.value = { id, name }
  showQr.value = true
}

function closeQr() {
  showQr.value = false
  qrTarget.value = null
}

function isRegistered(id: string) {
  return registeredIds.value.has(id)
}

// ─── 向里長提問 ───
const askingEventId = ref<string | null>(null)
const questionText = ref('')
const questionSentSuccess = ref(false)
const { currentUser: questionUser } = useCurrentUser()

function openAskQuestion(eventId: string) {
  askingEventId.value = eventId
  questionText.value = ''
  questionSentSuccess.value = false
}

async function submitQuestion() {
  if (!questionText.value.trim()) return
  try {
    await apiFetch('/api/activities/questions', {
      method: 'POST',
      body: {
        askerId: questionUser.value.id,
        askerName: questionUser.value.name,
        content: questionText.value.trim(),
        category: 'general',
      },
    })
  } catch { /* silent */ }
  questionSentSuccess.value = true
  setTimeout(() => { askingEventId.value = null; questionSentSuccess.value = false }, 2500)
}

function getStatusClass(status: string) {
  switch (status) {
    case 'open': return 'status-open'
    case 'almost-full': return 'status-almost'
    case 'full': return 'status-full'
    default: return ''
  }
}
function getStatusLabel(status: string) {
  switch (status) {
    case 'open': return '招生中'
    case 'almost-full': return '即將額滿'
    case 'full': return '已額滿'
    default: return ''
  }
}
</script>

<template>
  <section class="community-events" aria-labelledby="community-events-title">
    <div class="card-header">
      <h2 id="community-events-title" class="card-title">在地活動</h2>
      <span class="card-badge">📍 社區生活</span>
    </div>

    <!-- Tab -->
    <nav class="tab-nav" aria-label="活動分類">
      <button
        v-for="tab in tabs" :key="tab.key"
        class="tab-btn" :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </nav>

    <!-- 社區活動 -->
    <div v-if="activeTab === 'community'" class="event-list">
      <article v-for="event in communityEvents" :key="event.id" class="event-card" :class="{ full: event.currentParticipants >= event.maxParticipants }">
        <h3 class="event-name">{{ event.name }}</h3>
        <div class="event-details">
          <p class="detail-row">📅 {{ event.date }} {{ event.time }}</p>
          <p class="detail-row">📍 {{ event.location }}</p>
          <p class="detail-row">🏢 {{ event.organizer }}</p>
        </div>
        <div class="event-footer">
          <div class="footer-left">
            <span class="event-fee">{{ event.fee === 0 ? '免費' : `$${event.fee}` }}</span>
            <span class="event-count">{{ event.currentParticipants }}/{{ event.maxParticipants }} 人</span>
          </div>
          <!-- 已報名 → 顯示報到按鈕 -->
          <button v-if="isRegistered(event.id)" class="btn-checkin" @click="openQrCheckin(event.id, event.name)">
            📱 QR 報到
          </button>
          <!-- 未報名且未額滿 -->
          <button v-else-if="event.currentParticipants < event.maxParticipants" class="btn-register" @click="openPayment(event.id, event.name, event.fee, 'community')">
            我要報名
          </button>
          <span v-else class="full-label">已額滿</span>
        </div>
        <!-- 向里長提問 -->
        <button class="btn-ask" @click="openAskQuestion(event.id)">❓ 向里長提問</button>
        <div v-if="askingEventId === event.id" class="ask-form">
          <div v-if="!questionSentSuccess">
            <textarea v-model="questionText" class="ask-input" placeholder="請輸入您的問題..." rows="2"></textarea>
            <div class="ask-actions">
              <button class="ask-send" @click="submitQuestion">送出</button>
              <button class="ask-cancel" @click="askingEventId = null">取消</button>
            </div>
          </div>
          <div v-else class="ask-success">✅ 提問已送出！里長會盡快回覆</div>
        </div>
      </article>
    </div>

    <!-- 社大課程 -->
    <div v-if="activeTab === 'course'" class="event-list">
      <article v-for="course in courses" :key="course.id" class="event-card" :class="{ full: course.status === 'full' }">
        <div class="course-header">
          <h3 class="event-name">{{ course.name }}</h3>
          <span class="status-badge" :class="getStatusClass(course.status)">{{ getStatusLabel(course.status) }}</span>
        </div>
        <div class="event-details">
          <p class="detail-row">👨‍🏫 {{ course.instructor }}</p>
          <p class="detail-row">🕐 {{ course.schedule }}</p>
          <p class="detail-row">📖 {{ course.credits }} 學分 / {{ course.sessions }} 堂</p>
          <p v-if="course.location" class="detail-row">📍 {{ course.location }}</p>
        </div>
        <div class="event-footer">
          <span class="event-fee">${{ course.fee.toLocaleString() }}</span>
          <button v-if="isRegistered(course.id)" class="btn-checkin" @click="openQrCheckin(course.id, course.name)">
            📱 QR 報到
          </button>
          <button v-else-if="course.status !== 'full'" class="btn-register" @click="openPayment(course.id, course.name, course.fee, 'course')">
            報名
          </button>
          <span v-else class="full-label">已額滿</span>
        </div>
      </article>
    </div>

    <!-- 報名成功 Overlay -->
    <Teleport to="body">
      <div v-if="showRegisterSuccess" class="overlay-backdrop" @click.self="closeRegisterSuccess">
        <div class="overlay-panel" role="dialog" aria-modal="true" aria-label="報名成功">
          <div class="payment-success" aria-live="assertive">
            <span class="success-icon" aria-hidden="true">✓</span>
            <h3>報名成功！</h3>
            <p class="success-hint">已生成 QR Code 報到憑證</p>
            <div v-if="lastPaymentResult" class="success-details">
              <div class="success-detail-row">
                <span>付款方式</span>
                <span>{{ lastPaymentResult.methodLabel }}</span>
              </div>
              <div class="success-detail-row">
                <span>實付金額</span>
                <strong>${{ lastPaymentResult.finalAmount.toLocaleString() }}</strong>
              </div>
              <div class="success-detail-row">
                <span>交易編號</span>
                <span class="txn-id">{{ lastPaymentResult.transactionId }}</span>
              </div>
            </div>
            <div v-else class="success-details">
              <div class="success-detail-row">
                <span>費用</span>
                <strong>免費</strong>
              </div>
            </div>
            <div class="register-success-actions">
              <button class="btn-view-ticket" @click="closeRegisterSuccess(); navigateTo('/member?tab=tickets')">📋 查看活動</button>
              <button class="btn-primary" @click="closeRegisterSuccess">確認</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- PaymentFlow 付款流程 -->
    <UiPaymentFlow
      :visible="showPaymentFlow"
      :order-items="paymentOrderItems"
      :total-amount="paymentTotalAmount"
      accent-color="#ec4899"
      success-title="付款成功"
      @payment-complete="handlePaymentComplete"
      @close="handlePaymentClose"
    />

    <!-- QR 報到 Overlay -->
    <Teleport to="body">
      <div v-if="showQr" class="overlay-backdrop" @click.self="closeQr">
        <div class="overlay-panel qr-panel" role="dialog" aria-modal="true" aria-label="QR 報到">
          <h3 class="overlay-title">現場報到</h3>
          <p class="qr-subtitle">{{ qrTarget?.name }}</p>
          <div class="qr-display">
            <div class="qr-code-large">
              <div class="qr-pattern-large"></div>
            </div>
            <p class="qr-hint">請出示此 QR Code 給工作人員掃碼</p>
            <p class="qr-id">報到編號：REG-{{ qrTarget?.id?.toUpperCase().slice(0, 6) }}-{{ Date.now().toString(36).slice(-4).toUpperCase() }}</p>
          </div>
          <button class="btn-primary" @click="closeQr">關閉</button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.community-events {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3, 12px); }
.card-title { font-size: var(--text-lg, 17px); font-weight: 700; color: var(--color-text-primary, #1e293b); margin: 0; }
.card-badge { font-size: var(--text-xs, 11px); color: var(--color-text-secondary, #64748b); background: var(--color-primary-light, #fdf2f8); padding: 2px 8px; border-radius: var(--radius-full, 9999px); }

.tab-nav { display: flex; gap: var(--space-2, 8px); margin-bottom: var(--space-3, 12px); }
.tab-btn { flex: 1; padding: var(--space-2, 8px) var(--space-3, 12px); min-height: 44px; border: none; border-radius: var(--radius-full, 9999px); background: transparent; font-size: var(--text-sm, 13px); font-weight: 500; color: var(--color-text-disabled, #cbd5e1); cursor: pointer; transition: all 0.15s ease; }
.tab-btn.active { color: #ffffff; background-color: var(--color-primary, #ec4899); font-weight: 600; }
.tab-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.event-list { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.event-card { padding: var(--space-3, 12px); border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); }
.event-card.full { opacity: 0.5; }
.course-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.event-name { font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-text-primary, #1e293b); margin: 0 0 8px; }
.status-badge { flex-shrink: 0; font-size: var(--text-xs, 11px); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full, 9999px); }
.status-open { color: var(--color-primary, #ec4899); background: var(--color-primary-light, #fdf2f8); }
.status-almost { color: var(--color-secondary, #8b5cf6); background: var(--color-secondary-light, #f5f3ff); }
.status-full { color: var(--color-text-disabled, #94a3b8); background: #f1f5f9; }
.event-details { margin-bottom: var(--space-3, 12px); }
.detail-row { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 3px; }
.event-footer { display: flex; justify-content: space-between; align-items: center; }
.footer-left { display: flex; align-items: center; gap: var(--space-3, 12px); }
.event-fee { font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-primary, #ec4899); }
.event-count { font-size: var(--text-xs, 11px); color: var(--color-text-secondary, #64748b); }

.btn-register { padding: var(--space-2, 8px) var(--space-4, 16px); min-height: 44px; border: none; border-radius: var(--radius-full, 9999px); background: var(--color-primary, #ec4899); color: #ffffff; font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; transition: opacity 0.15s ease; }
.btn-register:hover { opacity: 0.85; }
.btn-register:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.btn-checkin { padding: var(--space-2, 8px) var(--space-4, 16px); min-height: 44px; border: 2px solid var(--color-primary, #ec4899); border-radius: var(--radius-full, 9999px); background: var(--color-primary-light, #fdf2f8); color: var(--color-primary, #ec4899); font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; transition: opacity 0.15s ease; }
.btn-checkin:hover { opacity: 0.85; }
.full-label { font-size: var(--text-sm, 13px); color: var(--color-text-disabled, #94a3b8); font-weight: 500; }

/* ─── 向里長提問 ─── */
.btn-ask { width: 100%; margin-top: 8px; padding: 8px; border: 1px solid var(--color-primary, #ec4899); border-radius: var(--radius-md, 8px); background: transparent; color: var(--color-primary, #ec4899); font-size: var(--text-xs, 11px); font-weight: 600; cursor: pointer; min-height: 36px; }
.btn-ask:hover { background: var(--color-primary-light, #fdf2f8); }
.ask-form { margin-top: 8px; padding: 10px; background: #f8fafc; border-radius: var(--radius-md, 8px); border: 1px solid var(--color-border, #e2e8f0); }
.ask-input { width: 100%; padding: 8px 10px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; font-size: var(--text-sm, 13px); font-family: inherit; resize: none; box-sizing: border-box; }
.ask-input:focus { border-color: var(--color-primary, #ec4899); outline: none; }
.ask-actions { display: flex; gap: 8px; margin-top: 8px; }
.ask-send { padding: 6px 14px; background: var(--color-primary, #ec4899); color: #fff; border: none; border-radius: 8px; font-size: var(--text-xs, 11px); font-weight: 600; cursor: pointer; }
.ask-cancel { padding: 6px 14px; background: transparent; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; font-size: var(--text-xs, 11px); cursor: pointer; }
.ask-success { font-size: var(--text-sm, 13px); color: #16a34a; font-weight: 600; text-align: center; padding: 8px; }

/* Overlay */
.overlay-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
.overlay-panel { background: #ffffff; border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0; padding: var(--space-5, 20px); width: 100%; max-width: 430px; animation: slide-up 0.3s ease; }
.qr-panel { align-items: center; text-align: center; }
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

.overlay-title { font-size: var(--text-lg, 17px); font-weight: 700; margin: 0 0 12px; }
.qr-subtitle { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 16px; }

/* 付款 */
.payment-info { margin-bottom: 16px; }
.pay-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--color-border, #e2e8f0); font-size: var(--text-sm, 13px); }
.pay-amount { color: var(--color-primary, #ec4899); font-size: var(--text-lg, 17px); }

/* 付款成功 */
.payment-success { text-align: center; padding: 24px 0; }
.payment-success .success-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary, #ec4899); color: #fff; font-size: 24px; font-weight: 700; margin-bottom: 12px; animation: bounce-in 0.4s ease; }
@keyframes bounce-in { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
.payment-success h3 { font-size: var(--text-lg, 17px); font-weight: 700; margin: 0 0 4px; }
.success-hint { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 16px; }

.success-details { text-align: left; background: #f8fafc; border-radius: 10px; padding: 12px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
.success-detail-row { display: flex; justify-content: space-between; font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); }
.success-detail-row strong { color: var(--color-primary, #ec4899); }
.txn-id { font-family: monospace; font-size: var(--text-xs, 11px); color: var(--color-text-disabled, #94a3b8); }

.btn-primary { width: 100%; padding: var(--space-3, 12px); min-height: 44px; border: none; border-radius: var(--radius-md, 8px); background: var(--color-primary, #ec4899); color: #ffffff; font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.85; }
.btn-primary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.register-success-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.btn-view-ticket { width: 100%; padding: var(--space-3, 12px); min-height: 44px; border: 1.5px solid var(--color-primary, #ec4899); border-radius: var(--radius-md, 8px); background: transparent; color: var(--color-primary, #ec4899); font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; }
.btn-view-ticket:hover { background: var(--color-primary-light, #fdf2f8); }

/* QR 報到 */
.qr-display { padding: 16px 0; }
.qr-code-large { width: 160px; height: 160px; margin: 0 auto 12px; border: 3px solid var(--color-primary, #ec4899); border-radius: var(--radius-md, 8px); display: flex; align-items: center; justify-content: center; background: #fff; }
.qr-pattern-large { width: 128px; height: 128px; background: repeating-conic-gradient(var(--color-text-primary, #1e293b) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px; border-radius: 4px; }
.qr-hint { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 6px; }
.qr-id { font-size: var(--text-xs, 11px); color: var(--color-text-disabled, #94a3b8); font-family: monospace; margin: 0 0 16px; }
</style>
