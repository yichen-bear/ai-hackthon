<script setup lang="ts">
/**
 * 在地社區活動與社大課程
 * 報名 → 付款確認 → QR Code 報到憑證
 */
import type { CommunityEvent, CommunityCourse } from '~/types/entertainment'

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

// 報名付款 overlay
const showPayment = ref(false)
const paymentTarget = ref<{ id: string; name: string; fee: number; type: 'community' | 'course' } | null>(null)
const paymentSuccess = ref(false)
const registeredIds = ref<Set<string>>(new Set())

function openPayment(id: string, name: string, fee: number, type: 'community' | 'course') {
  paymentTarget.value = { id, name, fee, type }
  paymentSuccess.value = false
  showPayment.value = true
}

function confirmPayment() {
  if (!paymentTarget.value) return
  paymentSuccess.value = true
  registeredIds.value.add(paymentTarget.value.id)
  emit('register', { eventId: paymentTarget.value.id, type: paymentTarget.value.type })
}

function closePayment() {
  showPayment.value = false
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

    <!-- 付款確認 Overlay -->
    <Teleport to="body">
      <div v-if="showPayment" class="overlay-backdrop" @click.self="closePayment">
        <div class="overlay-panel" role="dialog" aria-modal="true" aria-label="付款確認">
          <!-- 付款成功 -->
          <div v-if="paymentSuccess" class="payment-success" aria-live="assertive">
            <span class="success-icon" aria-hidden="true">✓</span>
            <h3>報名成功！</h3>
            <p class="success-hint">已生成 QR Code 報到憑證</p>
            <button class="btn-primary" @click="closePayment">確認</button>
          </div>
          <!-- 付款表單 -->
          <template v-else-if="paymentTarget">
            <h3 class="overlay-title">確認報名</h3>
            <div class="payment-info">
              <div class="pay-row">
                <span>活動</span>
                <strong>{{ paymentTarget.name }}</strong>
              </div>
              <div class="pay-row">
                <span>費用</span>
                <strong class="pay-amount">{{ paymentTarget.fee === 0 ? '免費' : `$${paymentTarget.fee}` }}</strong>
              </div>
            </div>
            <div class="payment-method">
              <p class="method-label">付款方式</p>
              <div class="method-options">
                <label class="method-option active">
                  <input type="radio" name="pay" checked>
                  <span>💳 OPEN 錢包</span>
                </label>
                <label class="method-option">
                  <input type="radio" name="pay">
                  <span>🏧 ATM 轉帳</span>
                </label>
              </div>
            </div>
            <button class="btn-primary btn-confirm" @click="confirmPayment">
              {{ paymentTarget.fee === 0 ? '確認報名' : `付款 $${paymentTarget.fee}` }}
            </button>
            <button class="btn-cancel" @click="closePayment">取消</button>
          </template>
        </div>
      </div>
    </Teleport>

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
.payment-method { margin-bottom: 16px; }
.method-label { font-size: var(--text-sm, 13px); font-weight: 600; margin: 0 0 8px; }
.method-options { display: flex; flex-direction: column; gap: 8px; }
.method-option { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); font-size: var(--text-sm, 13px); cursor: pointer; }
.method-option.active { border-color: var(--color-primary, #ec4899); background: var(--color-primary-light, #fdf2f8); }
.method-option input { accent-color: var(--color-primary, #ec4899); }

.btn-primary { width: 100%; padding: var(--space-3, 12px); min-height: 44px; border: none; border-radius: var(--radius-md, 8px); background: var(--color-primary, #ec4899); color: #ffffff; font-size: var(--text-sm, 13px); font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.85; }
.btn-confirm { margin-bottom: 8px; }
.btn-cancel { width: 100%; padding: var(--space-3, 12px); min-height: 44px; border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-md, 8px); background: transparent; color: var(--color-text-secondary, #64748b); font-size: var(--text-sm, 13px); cursor: pointer; }

/* 付款成功 */
.payment-success { text-align: center; padding: 24px 0; }
.payment-success .success-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary, #ec4899); color: #fff; font-size: 24px; font-weight: 700; margin-bottom: 12px; animation: bounce-in 0.4s ease; }
@keyframes bounce-in { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
.payment-success h3 { font-size: var(--text-lg, 17px); font-weight: 700; margin: 0 0 4px; }
.success-hint { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 16px; }

/* QR 報到 */
.qr-display { padding: 16px 0; }
.qr-code-large { width: 160px; height: 160px; margin: 0 auto 12px; border: 3px solid var(--color-primary, #ec4899); border-radius: var(--radius-md, 8px); display: flex; align-items: center; justify-content: center; background: #fff; }
.qr-pattern-large { width: 128px; height: 128px; background: repeating-conic-gradient(var(--color-text-primary, #1e293b) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px; border-radius: 4px; }
.qr-hint { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #64748b); margin: 0 0 6px; }
.qr-id { font-size: var(--text-xs, 11px); color: var(--color-text-disabled, #94a3b8); font-family: monospace; margin: 0 0 16px; }
</style>
