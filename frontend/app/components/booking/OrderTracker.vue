<script setup lang="ts">
/**
 * OrderTracker - 預購/團購訂單追蹤
 * 顯示訂單狀態步驟條，支援篩選與操作
 */

export interface BookingOrder {
  id: string
  type: 'preorder' | 'groupbuy'
  productName: string
  spec: string
  status: string
  currentStep: number
  totalSteps: number
  estimatedDate?: string
  pickupStore?: string
  groupProgress?: { current: number; target: number }
  createdAt: string
}

const props = defineProps<{
  orders: BookingOrder[]
}>()

const emit = defineEmits<{
  'go-pickup': [orderId: string]
  'invite-friend': [orderId: string]
  'cancel-order': [orderId: string]
  'view-detail': [orderId: string]
}>()

// ─── 篩選 Tab ───
type OrderFilter = 'all' | 'active' | 'ready' | 'completed'
const activeFilter = ref<OrderFilter>('all')

const filters = [
  { key: 'all' as const, label: '全部' },
  { key: 'active' as const, label: '進行中' },
  { key: 'ready' as const, label: '可取貨' },
  { key: 'completed' as const, label: '已完成' },
]

const filteredOrders = computed(() => {
  if (activeFilter.value === 'all') return props.orders
  if (activeFilter.value === 'active') {
    return props.orders.filter((o) => o.status !== 'ready' && o.status !== 'completed')
  }
  if (activeFilter.value === 'ready') {
    return props.orders.filter((o) => o.status === 'ready')
  }
  return props.orders.filter((o) => o.status === 'completed')
})

// ─── 步驟條邏輯（對齊廠商端流程） ───
function getStepLabels(order: BookingOrder): string[] {
  // i二手面交：2步
  if (order.productName.includes('i二手') && order.spec?.includes('面交')) {
    return ['已確認交易', '自行確認已面交']
  }
  // i二手代收：3步
  if (order.productName.includes('i二手') && order.spec?.includes('代收')) {
    return ['賣家已寄放', '取貨倒數中', '買家已取貨']
  }
  if (order.type === 'groupbuy') return ['待成團', '門市彙整', '區域配送', '已到店']
  return ['已下單', '門市彙整', '區域配送', '已到店']
}

function getStepStatus(stepIndex: number, currentStep: number): 'completed' | 'current' | 'pending' {
  if (stepIndex < currentStep) return 'completed'
  if (stepIndex === currentStep) return 'current'
  return 'pending'
}

function isReady(order: BookingOrder): boolean {
  return order.status === 'ready'
}

function isPendingGroup(order: BookingOrder): boolean {
  return order.status === 'pending-group'
}

function getGroupPercent(order: BookingOrder): number {
  if (!order.groupProgress) return 0
  if (order.groupProgress.target <= 0) return 100
  return Math.min((order.groupProgress.current / order.groupProgress.target) * 100, 100)
}
</script>

<template>
  <UiDashboardCard>
    <div class="tracker-header">
      <h2 class="tracker-title">我的訂單</h2>
      <span v-if="orders.length > 0" class="order-count-badge">{{ orders.length }}</span>
    </div>

    <!-- 篩選 Tab -->
    <div class="filter-tabs" role="tablist" aria-label="訂單篩選">
      <button
        v-for="f in filters"
        :key="f.key"
        class="filter-tab"
        :class="{ active: activeFilter === f.key }"
        role="tab"
        :aria-selected="activeFilter === f.key"
        @click="activeFilter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- 訂單列表 -->
    <div class="order-list" aria-live="polite">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        role="button"
        :aria-label="`${order.productName} 訂單`"
        tabindex="0"
        @click="emit('view-detail', order.id)"
        @keydown.enter="emit('view-detail', order.id)"
      >
        <!-- 訂單類型標籤 -->
        <span class="order-type-pill" :class="order.type === 'preorder' ? 'pill-secondary' : 'pill-primary'">
          {{ order.type === 'preorder' ? 'i預購' : 'i划算' }}
        </span>

        <!-- 商品資訊 -->
        <p class="order-product-name">{{ order.productName }}</p>
        <p class="order-spec">{{ order.spec }}</p>
        <p v-if="order.pickupStore" class="order-pickup-store">📍 取貨門市：{{ order.pickupStore }}</p>

        <!-- 步驟條 -->
        <div class="step-indicator" :aria-label="`訂單進度：第 ${order.currentStep + 1} 步，共 ${order.totalSteps} 步`">
          <div
            v-for="(label, idx) in getStepLabels(order)"
            :key="idx"
            class="step-item"
          >
            <div class="step-node" :class="getStepStatus(idx, order.currentStep)">
              <span v-if="getStepStatus(idx, order.currentStep) === 'completed'" class="step-check">✓</span>
            </div>
            <span class="step-label" :class="getStepStatus(idx, order.currentStep)">{{ label }}</span>
            <div v-if="idx < getStepLabels(order).length - 1" class="step-line" :class="{ filled: idx < order.currentStep }"></div>
          </div>
        </div>

        <!-- 附加資訊 -->
        <div v-if="order.estimatedDate && !isReady(order)" class="order-extra">
          預計 {{ order.estimatedDate }} 到貨
        </div>

        <!-- 待成團進度條 -->
        <div v-if="isPendingGroup(order) && order.groupProgress" class="group-progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${getGroupPercent(order)}%` }"></div>
          </div>
          <div class="progress-actions">
            <span class="progress-text">{{ order.groupProgress.current }}/{{ order.groupProgress.target }} 人</span>
            <button
              class="invite-btn"
              aria-label="複製商品連結分享給好友"
              @click.stop="emit('invite-friend', order.id)"
            >
              📋 複製連結分享
            </button>
          </div>
        </div>

        <!-- 可取貨按鈕 -->
        <button
          v-if="isReady(order)"
          class="pickup-btn"
          :aria-label="`前往取貨 ${order.productName}`"
          @click.stop="emit('go-pickup', order.id)"
        >
          📍 前往取貨
        </button>

        <!-- 取消訂單按鈕（非已完成/可取貨狀態） -->
        <button
          v-if="!isReady(order) && order.status !== 'completed'"
          class="cancel-btn"
          :aria-label="`取消 ${order.productName} 訂單`"
          @click.stop="emit('cancel-order', order.id)"
        >
          取消訂單
        </button>
      </div>

      <!-- 空狀態 -->
      <div v-if="filteredOrders.length === 0" class="empty-state">
        <p class="empty-text">還沒有訂單，去逛逛吧！</p>
        <div class="empty-actions">
          <button class="empty-btn" aria-label="前往 i預購">前往 i預購</button>
          <button class="empty-btn" aria-label="前往 i划算">前往 i划算</button>
          <button class="empty-btn" aria-label="前往 i二手">前往 i二手</button>
        </div>
      </div>
    </div>
  </UiDashboardCard>
</template>

<style scoped>
.tracker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.tracker-title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0;
}

.order-count-badge {
  font-size: 10px;
  background: var(--color-primary);
  color: #fff;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* ─── 篩選 Tab ─── */
.filter-tabs {
  display: flex;
  gap: var(--space-1, 4px);
  margin-bottom: var(--space-3, 12px);
}

.filter-tab {
  flex: 1;
  padding: 8px 4px;
  font-size: var(--text-xs, 11px);
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-disabled, #9ca3af);
  border-bottom: 2px solid transparent;
  min-height: 44px;
  transition: all 0.15s ease;
}

.filter-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.filter-tab:hover {
  opacity: 0.85;
}

.filter-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 訂單列表 ─── */
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.order-card {
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.order-card:hover {
  opacity: 0.85;
}

.order-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.order-type-pill {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
  margin-bottom: 6px;
}

.pill-primary {
  background: var(--color-primary);
  color: #fff;
}

.pill-secondary {
  background: var(--color-secondary);
  color: #fff;
}

.order-product-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  margin: 0 0 2px;
}

.order-spec {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 var(--space-3, 12px);
}

.order-pickup-store {
  font-size: var(--text-xs, 11px);
  color: var(--color-primary);
  font-weight: 500;
  margin: 0 0 var(--space-3, 12px);
}

/* ─── 步驟條 ─── */
.step-indicator {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-2, 8px);
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-node {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  margin-bottom: 4px;
}

.step-node.completed {
  background: var(--color-primary);
  color: #fff;
}

.step-node.current {
  background: var(--color-primary);
  color: #fff;
  animation: stepPulse 1.5s ease-in-out infinite;
}

.step-node.pending {
  background: none;
  border: 2px solid var(--color-border, #e5e7eb);
}

@keyframes stepPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
}

.step-check {
  font-size: 10px;
  font-weight: 700;
}

.step-label {
  font-size: 9px;
  text-align: center;
  line-height: 1.2;
}

.step-label.completed,
.step-label.current {
  color: var(--color-primary);
  font-weight: 600;
}

.step-label.pending {
  color: var(--color-text-disabled, #9ca3af);
}

.step-line {
  position: absolute;
  top: 10px;
  left: 60%;
  width: 80%;
  height: 2px;
  background: var(--color-border, #e5e7eb);
}

.step-line.filled {
  background: var(--color-primary);
}

/* ─── 附加資訊 ─── */
.order-extra {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin-top: var(--space-1, 4px);
}

/* ─── 成團進度 ─── */
.group-progress-section {
  margin-top: var(--space-2, 8px);
}

.progress-bar {
  height: 6px;
  background: var(--color-primary-light);
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full, 9999px);
  transition: width 0.3s ease;
}

.progress-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}

.progress-text {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}

.invite-btn {
  font-size: var(--text-xs, 11px);
  color: var(--color-primary);
  background: none;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-full, 9999px);
  padding: 4px 10px;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s ease;
}

.invite-btn:hover {
  opacity: 0.85;
}

/* ─── 可取貨按鈕 ─── */
.pickup-btn {
  width: 100%;
  margin-top: var(--space-2, 8px);
  padding: 10px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.pickup-btn:hover {
  opacity: 0.85;
}

.pickup-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 取消按鈕 ─── */
.cancel-btn {
  width: 100%;
  margin-top: var(--space-2, 8px);
  padding: 8px;
  background: none;
  color: var(--color-accent-red, #ef4444);
  border: 1px solid var(--color-accent-red, #ef4444);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-xs, 11px);
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.cancel-btn:hover {
  opacity: 0.85;
  background: #fef2f2;
}

.cancel-btn:focus-visible {
  outline: 2px solid var(--color-accent-red, #ef4444);
  outline-offset: 2px;
}

/* ─── 空狀態 ─── */
.empty-state {
  text-align: center;
  padding: var(--space-6, 24px);
}

.empty-text {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 var(--space-3, 12px);
}

.empty-actions {
  display: flex;
  gap: var(--space-2, 8px);
  justify-content: center;
}

.empty-btn {
  padding: 8px 16px;
  font-size: var(--text-xs, 11px);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-full, 9999px);
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s ease;
}

.empty-btn:hover {
  opacity: 0.85;
}
</style>
