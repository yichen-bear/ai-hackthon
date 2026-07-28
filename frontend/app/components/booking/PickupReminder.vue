<script setup lang="ts">
/**
 * PickupReminder - 取貨提醒與門市地圖
 * 顯示待取貨清單、門市地圖展開、導航聯動
 */

import type { StoreInfo } from '~/composables/useBookingState'

export interface PickupItem {
  id: string
  orderId: string
  productName: string
  pickupCode: string
  store: StoreInfo
  deadline: string
  status: 'pending' | 'expiring' | 'expired'
}

const props = defineProps<{
  pickups: PickupItem[]
}>()

const emit = defineEmits<{
  'navigate-to-store': [payload: { storeId: string; mode: string }]
  'confirm-pickup': [pickupId: string]
}>()

// ─── 展開地圖狀態 ───
const expandedPickupId = ref<string | null>(null)

function toggleMap(pickupId: string) {
  expandedPickupId.value = expandedPickupId.value === pickupId ? null : pickupId
}

function handleNavigate(storeId: string, mode: 'walk' | 'drive') {
  emit('navigate-to-store', { storeId, mode })
}

// ─── 工具函數 ───
function getPendingCount(): number {
  return props.pickups.filter((p) => p.status !== 'expired').length
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

function isExpiring(item: PickupItem): boolean {
  return item.status === 'expiring'
}

function isExpired(item: PickupItem): boolean {
  return item.status === 'expired'
}
</script>

<template>
  <UiDashboardCard>
    <div class="reminder-header">
      <h2 class="reminder-title">取貨提醒</h2>
      <span v-if="getPendingCount() > 0" class="pending-badge">{{ getPendingCount() }}</span>
    </div>

    <div class="pickup-list" aria-live="polite">
      <div
        v-for="item in pickups"
        :key="item.id"
        class="pickup-card"
        :class="{ expired: isExpired(item) }"
      >
        <!-- 商品資訊 -->
        <div class="pickup-info">
          <p class="pickup-product" :class="{ 'line-through': isExpired(item) }">
            {{ item.productName }}
          </p>
          <p class="pickup-code">取貨編號：{{ item.pickupCode }}</p>
          <p class="pickup-store-name">{{ item.store.name }}</p>
          <p class="pickup-deadline" :class="{ 'deadline-urgent': isExpiring(item) }">
            <span v-if="isExpired(item)" class="expired-badge-inline">已逾期</span>
            <span v-else>請於 {{ formatDeadline(item.deadline) }} 前取貨</span>
          </p>
        </div>

        <!-- 導航按鈕 -->
        <button
          v-if="!isExpired(item)"
          class="navigate-btn"
          :aria-label="`導航前往 ${item.store.name} 取貨`"
          @click="toggleMap(item.id)"
        >
          {{ expandedPickupId === item.id ? '收合' : '導航前往' }}
        </button>

        <!-- 門市地圖展開 -->
        <div v-if="expandedPickupId === item.id" class="store-map-section">
          <!-- 模擬地圖區域 -->
          <div class="map-placeholder" aria-label="門市地圖">
            <div class="map-pin">📍</div>
            <p class="map-text">{{ item.store.name }}</p>
          </div>

          <!-- 門市資訊 -->
          <div class="store-detail">
            <p class="store-detail-row"><strong>地址：</strong>{{ item.store.address }}</p>
            <p v-if="item.store.hours" class="store-detail-row"><strong>營業：</strong>{{ item.store.hours }}</p>
            <p v-if="item.store.phone" class="store-detail-row"><strong>電話：</strong>{{ item.store.phone }}</p>
          </div>

          <!-- 導航按鈕 -->
          <div class="nav-actions">
            <button
              class="nav-mode-btn"
              aria-label="步行導航至門市"
              @click="handleNavigate(item.store.id, 'walk')"
            >
              🚶 步行導航
            </button>
            <button
              class="nav-mode-btn"
              aria-label="開車導航至門市"
              @click="handleNavigate(item.store.id, 'drive')"
            >
              🚗 開車導航
            </button>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="pickups.length === 0" class="empty-state">
        <p>目前沒有待取貨商品 🎉</p>
      </div>
    </div>
  </UiDashboardCard>
</template>

<style scoped>
.reminder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.reminder-title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0;
}

.pending-badge {
  font-size: 10px;
  background: #ef4444;
  color: #fff;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* ─── 取貨列表 ─── */
.pickup-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.pickup-card {
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
}

.pickup-card.expired {
  opacity: 0.6;
}

.pickup-info {
  margin-bottom: var(--space-2, 8px);
}

.pickup-product {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  margin: 0 0 2px;
}

.pickup-product.line-through {
  text-decoration: line-through;
  color: var(--color-text-disabled, #9ca3af);
}

.pickup-code {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 2px;
}

.pickup-store-name {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 4px;
}

.pickup-deadline {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.pickup-deadline.deadline-urgent {
  color: var(--color-accent-red, #ef4444);
  font-weight: 600;
}

.expired-badge-inline {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  background: #ef4444;
  color: #fff;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

/* ─── 導航按鈕 ─── */
.navigate-btn {
  width: 100%;
  padding: 8px;
  font-size: var(--text-sm, 13px);
  color: var(--color-primary);
  background: none;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.navigate-btn:hover {
  opacity: 0.85;
}

.navigate-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 門市地圖區 ─── */
.store-map-section {
  margin-top: var(--space-3, 12px);
  border-top: 1px solid var(--color-border, #e5e7eb);
  padding-top: var(--space-3, 12px);
}

.map-placeholder {
  height: 120px;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border-radius: var(--radius-md, 12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2, 8px);
}

.map-pin {
  font-size: 28px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.map-text {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 4px 0 0;
}

.store-detail {
  margin-bottom: var(--space-2, 8px);
}

.store-detail-row {
  font-size: var(--text-xs, 11px);
  color: var(--color-text, #1f2937);
  margin: 2px 0;
  line-height: 1.5;
}

.nav-actions {
  display: flex;
  gap: var(--space-2, 8px);
}

.nav-mode-btn {
  flex: 1;
  padding: 10px;
  font-size: var(--text-sm, 13px);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md, 12px);
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: opacity 0.15s ease;
}

.nav-mode-btn:hover {
  opacity: 0.85;
}

.nav-mode-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 空狀態 ─── */
.empty-state {
  text-align: center;
  padding: var(--space-6, 24px);
  color: var(--color-text-secondary, #6b7280);
  font-size: var(--text-sm, 13px);
}
</style>
