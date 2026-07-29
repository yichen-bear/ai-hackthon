<script setup lang="ts">
/**
 * 跨模組導流
 * 購票成功後提供一鍵跳轉至行模組（交通規劃/叫車）與食模組（憑票優惠）
 */
import type { EntertainmentTicket, TicketCoupon } from '~/types/entertainment'

const props = defineProps<{
  ticket: EntertainmentTicket
  coupons: TicketCoupon[]
}>()

const emit = defineEmits<{
  'go-transport': [payload: { venue: string; venueAddress: string; date: string }]
  'go-ride': [payload: { venue: string; venueAddress: string }]
  'go-food-coupon': [payload: { ticketId: string; couponType: string }]
}>()

const hasAddress = computed(() => !!props.ticket.venueAddress)
const hasCoupons = computed(() => props.coupons.length > 0)

function handleTransport() {
  emit('go-transport', {
    venue: props.ticket.venue,
    venueAddress: props.ticket.venueAddress,
    date: props.ticket.date,
  })
  // 跨模組跳轉
  navigateTo('/transport')
}

function handleRide() {
  emit('go-ride', {
    venue: props.ticket.venue,
    venueAddress: props.ticket.venueAddress,
  })
  navigateTo('/transport')
}

function handleCoupon() {
  if (props.coupons[0]) {
    emit('go-food-coupon', {
      ticketId: props.ticket.id,
      couponType: props.coupons[0].couponType,
    })
  }
}
</script>

<template>
  <section class="cross-module-link" v-if="hasAddress || hasCoupons">
    <div class="link-cards">
      <!-- 規劃交通 -->
      <button
        v-if="hasAddress"
        class="link-card transport"
        @click="handleTransport"
        aria-label="規劃交通前往活動場館"
      >
        <span class="link-icon">🚗</span>
        <span class="link-label">規劃交通</span>
        <span class="link-desc">{{ ticket.venue }}</span>
      </button>

      <!-- 預約叫車 -->
      <button
        v-if="hasAddress"
        class="link-card ride"
        @click="handleRide"
        aria-label="預約叫車前往活動場館"
      >
        <span class="link-icon">🚕</span>
        <span class="link-label">預約叫車</span>
        <span class="link-desc">{{ ticket.date }} {{ ticket.time }}</span>
      </button>

      <!-- 憑票優惠 -->
      <button
        v-if="hasCoupons"
        class="link-card coupon"
        @click="handleCoupon"
        aria-label="查看憑票優惠"
      >
        <span class="link-icon">☕</span>
        <span class="link-label">憑票優惠</span>
        <span class="link-desc">{{ coupons[0].discount }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.cross-module-link {
  margin-top: calc(-1 * var(--space-2, 8px));
}

.link-cards {
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  padding: var(--space-1, 4px) 0;
}
.link-cards::-webkit-scrollbar { display: none; }

.link-card {
  flex: 1;
  min-width: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--space-3, 12px) var(--space-2, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.link-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  opacity: 0.85;
}
.link-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 模組色彩標示 */
.link-card.transport { border-top: 3px solid #f59e0b; }
.link-card.ride { border-top: 3px solid #f59e0b; }
.link-card.coupon { border-top: 3px solid #ff5252; }

.link-icon {
  font-size: 24px;
}

.link-label {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
}

.link-desc {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
