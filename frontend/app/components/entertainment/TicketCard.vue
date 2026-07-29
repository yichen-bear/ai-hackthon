<script setup lang="ts">
/**
 * 電子票券卡片
 * 支援展開/收合模式，顯示 QR Code 與票券詳情
 */
import type { EntertainmentTicket } from '~/types/entertainment'

const props = defineProps<{
  ticket: EntertainmentTicket
}>()

const emit = defineEmits<{
  'ticket-use': [ticketId: string]
}>()

const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
}

const typeIcon = computed(() => {
  const icons: Record<string, string> = {
    baseball: '⚾',
    exhibition: '🎭',
    concert: '🎵',
    theater: '🎬',
    experience: '☕',
  }
  return icons[props.ticket.eventType] || '🎫'
})

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    baseball: '統一獅',
    exhibition: '展覽',
    concert: '演唱會',
    theater: '音樂劇',
    experience: '體驗',
  }
  return labels[props.ticket.eventType] || '活動'
})

const statusClass = computed(() => {
  return `status-${props.ticket.status}`
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    unused: '未使用',
    used: '已使用',
    expired: '已過期',
  }
  return labels[props.ticket.status]
})
</script>

<template>
  <article
    class="ticket-card"
    :class="[statusClass, { expanded }]"
    @click="toggle"
    role="button"
    :aria-expanded="expanded"
    tabindex="0"
    @keydown.enter="toggle"
    @keydown.space.prevent="toggle"
  >
    <!-- 頂部色帶 -->
    <div class="ticket-color-bar">
      <span class="ticket-type">{{ typeIcon }} {{ typeLabel }}</span>
      <span class="ticket-status" :class="statusClass">{{ statusLabel }}</span>
    </div>

    <!-- 收合狀態：基本資訊 -->
    <div class="ticket-summary">
      <h3 class="ticket-name">{{ ticket.eventName }}</h3>
      <p class="ticket-meta">{{ ticket.date }} {{ ticket.time }} · {{ ticket.ticketType }} ×{{ ticket.quantity }}</p>
    </div>

    <!-- 展開狀態：完整資訊 + QR Code -->
    <div v-if="expanded" class="ticket-detail">
      <div class="ticket-info-grid">
        <div class="info-row">
          <span class="info-label">場館</span>
          <span class="info-value">{{ ticket.venue }}</span>
        </div>
        <div class="info-row" v-if="ticket.seatInfo">
          <span class="info-label">座位</span>
          <span class="info-value">{{ ticket.seatInfo }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">金額</span>
          <span class="info-value">${{ ticket.totalAmount.toLocaleString() }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">購買日</span>
          <span class="info-value">{{ ticket.purchaseDate }}</span>
        </div>
      </div>

      <!-- QR Code 區域 -->
      <div class="qr-area">
        <div class="qr-code">
          <div class="qr-pattern"></div>
        </div>
        <!-- 已使用/已過期遮罩 -->
        <div v-if="ticket.status !== 'unused'" class="qr-overlay">
          <span>{{ statusLabel }}</span>
        </div>
      </div>
    </div>

    <!-- 展開提示 -->
    <div class="expand-hint">
      <span>{{ expanded ? '收合' : '展開查看 QR Code' }}</span>
      <span class="expand-arrow" :class="{ rotated: expanded }">▼</span>
    </div>
  </article>
</template>

<style scoped>
.ticket-card {
  background: var(--color-bg-card, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}
.ticket-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.ticket-card:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.ticket-card.status-used,
.ticket-card.status-expired { opacity: 0.7; }

/* 頂部色帶 */
.ticket-color-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-primary, #ec4899);
}

.ticket-type {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: #ffffff;
}

.ticket-status {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  background: rgba(255,255,255,0.25);
  color: #ffffff;
}
.ticket-status.status-unused { background: rgba(255,255,255,0.3); }
.ticket-status.status-used { background: rgba(0,0,0,0.2); }
.ticket-status.status-expired { background: #ef4444; }

/* 摘要 */
.ticket-summary {
  padding: var(--space-3, 12px);
}
.ticket-name {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  margin: 0 0 4px;
}
.ticket-meta {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0;
}

/* 詳情 */
.ticket-detail {
  padding: 0 var(--space-3, 12px) var(--space-3, 12px);
  border-top: 1px dashed var(--color-border, #e2e8f0);
  margin-top: 0;
}

.ticket-info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3, 12px) 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm, 13px);
}
.info-label { color: var(--color-text-secondary, #64748b); }
.info-value { color: var(--color-text-primary, #1e293b); font-weight: 500; }

/* QR Code */
.qr-area {
  display: flex;
  justify-content: center;
  padding: var(--space-3, 12px) 0;
  position: relative;
}

.qr-code {
  width: 120px;
  height: 120px;
  border: 2px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.qr-pattern {
  width: 96px;
  height: 96px;
  background:
    repeating-conic-gradient(var(--color-text-primary, #1e293b) 0% 25%, transparent 0% 50%) 
    0 0 / 12px 12px;
  border-radius: 4px;
}

.qr-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.85);
  font-size: var(--text-base, 15px);
  font-weight: 700;
  color: var(--color-text-disabled, #94a3b8);
}

/* 展開提示 */
.expand-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--space-2, 8px);
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #94a3b8);
  border-top: 1px solid var(--color-border, #e2e8f0);
}
.expand-arrow {
  transition: transform 0.2s ease;
  font-size: 10px;
}
.expand-arrow.rotated { transform: rotate(180deg); }
</style>
