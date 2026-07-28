<script setup lang="ts">
/**
 * 票券夾元件（全站共用）
 * 管理動態 QR Code 票券的展示、篩選與放大
 * 存放於 components/ui/，供行/預/樂模組共同使用
 */

export type TicketType = 'hsr' | 'train' | 'event' | 'other'
export type TicketStatus = 'unused' | 'used' | 'expired'
export type TicketFilter = 'all' | 'unused' | 'used' | 'expired'

export interface Ticket {
  id: string
  type: TicketType
  origin: string
  destination: string
  date: string
  time: string
  trainNo?: string
  qrCode: string
  status: TicketStatus
  label?: string
}

const props = defineProps<{
  tickets: Ticket[]
}>()

const emit = defineEmits<{
  'ticket-select': [ticket: Ticket]
  'ticket-use': [ticketId: string]
}>()

// 篩選狀態
const currentFilter = ref<TicketFilter>('all')

const filterOptions: { key: TicketFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已過期' },
]

// 篩選後的票券
const filteredTickets = computed(() => {
  if (currentFilter.value === 'all') return props.tickets
  return props.tickets.filter(t => t.status === currentFilter.value)
})

// 展開的票券 ID
const expandedTicketId = ref<string | null>(null)

function toggleExpand(ticket: Ticket) {
  if (expandedTicketId.value === ticket.id) {
    expandedTicketId.value = null
  } else {
    expandedTicketId.value = ticket.id
    emit('ticket-select', ticket)
  }
}

function handleUseTicket(ticketId: string) {
  emit('ticket-use', ticketId)
}

// 票種標籤映射
const typeLabels: Record<TicketType, string> = {
  hsr: '高鐵',
  train: '台鐵',
  event: '活動',
  other: '其他',
}

// 票種色帶顏色
const typeColors: Record<TicketType, string> = {
  hsr: '#e11d48',
  train: '#0369a1',
  event: '#8b5cf6',
  other: '#78716c',
}

// 狀態標籤映射
const statusLabels: Record<TicketStatus, string> = {
  unused: '未使用',
  used: '已使用',
  expired: '已過期',
}

const statusBadgeType: Record<TicketStatus, string> = {
  unused: 'available',
  used: 'delivery',
  expired: 'popular',
}
</script>

<template>
  <section class="ticket-wallet" aria-label="票券夾">
    <div class="wallet-card">
      <h3 class="wallet-title">票券夾</h3>

      <!-- 篩選列 -->
      <div class="filter-row" role="tablist" aria-label="票券狀態篩選">
        <button
          v-for="opt in filterOptions"
          :key="opt.key"
          class="filter-btn"
          :class="{ active: currentFilter === opt.key }"
          role="tab"
          :aria-selected="currentFilter === opt.key"
          @click="currentFilter = opt.key"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- 空狀態 -->
      <div v-if="filteredTickets.length === 0" class="wallet-empty">
        <span class="empty-icon" aria-hidden="true">🎫</span>
        <p class="empty-text">尚無票券</p>
      </div>

      <!-- 票券列表 -->
      <div v-else class="ticket-list">
        <div
          v-for="ticket in filteredTickets"
          :key="ticket.id"
          class="ticket-item"
          :class="{ expired: ticket.status === 'expired' }"
        >
          <!-- 票種色帶 -->
          <div
            class="ticket-type-bar"
            :style="{ backgroundColor: typeColors[ticket.type] }"
            aria-hidden="true"
          />

          <!-- 摘要（可點擊展開） -->
          <button
            class="ticket-summary"
            :aria-expanded="expandedTicketId === ticket.id"
            :aria-label="`${typeLabels[ticket.type]} ${ticket.origin}到${ticket.destination} ${ticket.date} ${statusLabels[ticket.status]}`"
            @click="toggleExpand(ticket)"
          >
            <div class="ticket-main">
              <div class="ticket-header-row">
                <span class="ticket-type-label">
                  {{ ticket.label || typeLabels[ticket.type] }}
                </span>
                <span v-if="ticket.trainNo" class="ticket-train-no">
                  {{ ticket.trainNo }}
                </span>
              </div>
              <div class="ticket-route">
                {{ ticket.origin }} → {{ ticket.destination }}
              </div>
              <div class="ticket-meta">
                <span class="ticket-datetime">{{ ticket.date }} {{ ticket.time }}</span>
                <span
                  class="ticket-status-badge"
                  :class="`status-${ticket.status}`"
                >
                  {{ statusLabels[ticket.status] }}
                </span>
              </div>
            </div>

            <!-- QR Code 縮圖 -->
            <div class="ticket-qr-thumb" aria-hidden="true">
              <div class="qr-placeholder">QR</div>
            </div>
          </button>

          <!-- 展開詳情 -->
          <div v-show="expandedTicketId === ticket.id" class="ticket-detail">
            <!-- QR Code 放大 -->
            <div
              class="qr-large"
              aria-label="票券 QR Code，請出示給驗票閘門掃描"
              role="img"
            >
              <div class="qr-large-placeholder">
                <span class="qr-large-icon" aria-hidden="true">📱</span>
                <span class="qr-large-text">QR Code</span>
                <span class="qr-large-hint">出示此畫面掃描進站</span>
              </div>
            </div>

            <!-- 完整資訊 -->
            <div class="ticket-full-info">
              <div class="info-row">
                <span class="info-label">票種</span>
                <span class="info-value">{{ typeLabels[ticket.type] }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">路線</span>
                <span class="info-value">{{ ticket.origin }} → {{ ticket.destination }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">日期時間</span>
                <span class="info-value">{{ ticket.date }} {{ ticket.time }}</span>
              </div>
              <div v-if="ticket.trainNo" class="info-row">
                <span class="info-label">車次</span>
                <span class="info-value">{{ ticket.trainNo }}</span>
              </div>
            </div>

            <!-- 標記已使用按鈕 -->
            <button
              v-if="ticket.status === 'unused'"
              class="use-btn"
              aria-label="標記此票券為已使用"
              @click.stop="handleUseTicket(ticket.id)"
            >
              標記已使用
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ticket-wallet {
  width: 100%;
}

.wallet-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.wallet-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

/* 篩選列 */
.filter-row {
  display: flex;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-row::-webkit-scrollbar {
  display: none;
}

.filter-btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn.active {
  border-color: var(--color-primary, #f59e0b);
  background-color: var(--color-primary-light, #fffbeb);
  color: var(--color-primary, #f59e0b);
  font-weight: 600;
}

/* 空狀態 */
.wallet-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6, 24px) 0;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: var(--space-2, 8px);
}

.empty-text {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-disabled, #cbd5e1);
  margin: 0;
}

/* 票券列表 */
.ticket-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.ticket-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  position: relative;
  transition: opacity 0.15s ease;
}

.ticket-item.expired {
  opacity: 0.5;
  filter: grayscale(100%);
}

/* 票種色帶 */
.ticket-type-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

/* 摘要按鈕 */
.ticket-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  width: 100%;
  padding: var(--space-3, 12px) var(--space-3, 12px) var(--space-3, 12px) var(--space-4, 16px);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: background-color 0.15s ease;
}

.ticket-summary:active {
  background-color: var(--color-primary-light, #fffbeb);
}

.ticket-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ticket-header-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.ticket-type-label {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-text-secondary, #78716c);
}

.ticket-train-no {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ticket-route {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ticket-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.ticket-datetime {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.ticket-status-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
}

.status-unused {
  background-color: #dcfce7;
  color: #15803d;
}

.status-used {
  background-color: var(--color-progress-bg, #f1f5f9);
  color: var(--color-text-secondary, #78716c);
}

.status-expired {
  background-color: #ffe4e6;
  color: #e11d48;
}

/* QR 縮圖 */
.ticket-qr-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-placeholder {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
  font-weight: 600;
}

/* 展開詳情 */
.ticket-detail {
  padding: 0 var(--space-4, 16px) var(--space-4, 16px);
  border-top: 1px dashed var(--color-border, #e2e8f0);
}

.qr-large {
  width: 200px;
  height: 200px;
  margin: var(--space-4, 16px) auto;
  border: 2px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-progress-bg, #f1f5f9);
}

.qr-large-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1, 4px);
}

.qr-large-icon {
  font-size: 40px;
}

.qr-large-text {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-secondary, #78716c);
}

.qr-large-hint {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
}

/* 完整資訊 */
.ticket-full-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.info-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

/* 標記已使用按鈕 */
.use-btn {
  width: 100%;
  min-height: 44px;
  padding: var(--space-2, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.use-btn:active {
  background-color: var(--color-primary-light, #fffbeb);
}
</style>
