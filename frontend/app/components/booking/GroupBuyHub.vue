<script setup lang="ts">
/**
 * GroupBuyHub - i划算 門市店長開團
 * 展示附近門市團購商品，支援一人即享與集體揪團雙價格模式
 * 門市店長擔任團長，消費者加入附近門市團購
 */

import type { StoreInfo } from '~/composables/useBookingState'

export interface GroupBuyItem {
  id: string
  productName: string
  spec: string
  soloPrice: number
  groupPrice: number
  originalPrice: number
  currentMembers: number
  targetMembers: number
  isSoloBuy: boolean
  category: 'daily' | 'fresh' | 'beverage' | 'solo'
  storeId: string
  storeName: string
  deadline: string
  image?: string
}

const props = defineProps<{
  groups: GroupBuyItem[]
  currentStore: StoreInfo
}>()

const emit = defineEmits<{
  'join-group': [payload: { productId: string; groupId: string; storeId: string }]
  'confirm-purchase': [payload: { productId: string; quantity: number; storeId: string }]
  'switch-store': []
}>()

// ─── 分類 Tab ───
const categories = [
  { key: 'all', label: '全部' },
  { key: 'daily', label: '日用箱購🧻' },
  { key: 'fresh', label: '生鮮食材🥬' },
  { key: 'beverage', label: '飲品量販🥤' },
  { key: 'solo', label: '一人即享👤' },
] as const

type CategoryKey = (typeof categories)[number]['key']
const activeCategory = ref<CategoryKey>('all')

const filteredGroups = computed(() => {
  if (activeCategory.value === 'all') return props.groups
  return props.groups.filter((g) => g.category === activeCategory.value)
})

// ─── 互動邏輯 ───
const joiningId = ref<string | null>(null)
const quantities = ref<Record<string, number>>({})

function getQuantity(itemId: string): number {
  return quantities.value[itemId] || 1
}

function incrementQty(itemId: string) {
  quantities.value[itemId] = Math.min((quantities.value[itemId] || 1) + 1, 10)
}

function decrementQty(itemId: string) {
  quantities.value[itemId] = Math.max((quantities.value[itemId] || 1) - 1, 1)
}

function handleJoinGroup(item: GroupBuyItem) {
  if (isGrouped(item)) return
  joiningId.value = item.id

  emit('join-group', {
    productId: item.id,
    groupId: item.id,
    storeId: item.storeId,
  })

  // 動畫結束後重置
  setTimeout(() => {
    joiningId.value = null
  }, 300)
}

function handleConfirmPurchase(item: GroupBuyItem) {
  emit('confirm-purchase', {
    productId: item.id,
    quantity: getQuantity(item.id),
    storeId: item.storeId,
  })
}

function isGrouped(item: GroupBuyItem): boolean {
  return !item.isSoloBuy && item.currentMembers >= item.targetMembers
}

function getProgressPercent(item: GroupBuyItem): number {
  if (item.isSoloBuy) return 100
  if (item.targetMembers <= 0) return 100
  return Math.min((item.currentMembers / item.targetMembers) * 100, 100)
}
</script>

<template>
  <UiDashboardCard>
    <div class="hub-header">
      <h2 class="hub-title">i划算</h2>
      <span class="hub-subtitle">🛒 門市團購</span>
    </div>

    <!-- 門市定位區 -->
    <div class="store-location">
      <span class="store-icon">📍</span>
      <span class="store-name">{{ currentStore.name }}</span>
      <button
        class="switch-store-btn"
        aria-label="切換取貨門市"
        @click="emit('switch-store')"
      >
        切換門市
      </button>
    </div>

    <!-- 分類 Tab -->
    <div class="category-tabs" role="tablist" aria-label="團購商品分類">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="category-tab"
        :class="{ active: activeCategory === cat.key }"
        role="tab"
        :aria-selected="activeCategory === cat.key"
        @click="activeCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 團購列表 -->
    <div class="group-list" aria-live="polite">
      <div
        v-for="item in filteredGroups"
        :key="item.id"
        class="group-card"
      >
        <!-- 一人即享 Badge -->
        <span v-if="item.isSoloBuy" class="solo-badge">👤 一人即享</span>

        <div class="group-card-body">
          <!-- 左側圖片 -->
          <div
            class="group-image"
            :style="{ background: item.image || 'linear-gradient(135deg, #e5e7eb, #d1d5db)' }"
          ></div>

          <!-- 右側內容 -->
          <div class="group-content">
            <p class="group-name">{{ item.productName }}</p>
            <p class="group-spec">{{ item.spec }}</p>

            <!-- 雙價格 -->
            <div class="group-prices">
              <span class="price-solo">一人享 ${{ item.soloPrice }}</span>
              <span v-if="!item.isSoloBuy" class="price-group">揪團 ${{ item.groupPrice }}</span>
              <span class="price-original">${{ item.originalPrice }}</span>
            </div>
          </div>
        </div>

        <!-- 底部：進度條 + 跟團按鈕 -->
        <div v-if="!item.isSoloBuy" class="group-progress-row">
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${getProgressPercent(item)}%` }"
                :class="{ joining: joiningId === item.id }"
              ></div>
            </div>
            <span class="progress-text">{{ item.currentMembers }}/{{ item.targetMembers }} 人已參加</span>
          </div>

          <button
            v-if="!isGrouped(item)"
            class="join-btn"
            :aria-label="`加入 ${item.productName} 團購`"
            @click="handleJoinGroup(item)"
          >
            +1 跟團
          </button>
          <span v-else class="grouped-label">已成團 ✓</span>
        </div>

        <!-- 數量選擇 + 確認購買 -->
        <div class="purchase-row">
          <div class="quantity-control">
            <button class="qty-btn" :aria-label="`減少 ${item.productName} 數量`" @click="decrementQty(item.id)">−</button>
            <span class="qty-value">{{ getQuantity(item.id) }}</span>
            <button class="qty-btn" :aria-label="`增加 ${item.productName} 數量`" @click="incrementQty(item.id)">+</button>
          </div>
          <button
            class="confirm-purchase-btn"
            :aria-label="`確認購買 ${item.productName}`"
            @click="handleConfirmPurchase(item)"
          >
            確認購買
          </button>
        </div>

        <!-- 取貨門市標示 -->
        <div class="store-pickup-label">
          🏪 {{ item.storeName }} 取貨付款
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="filteredGroups.length === 0" class="empty-state">
        <p>目前附近門市沒有團購活動</p>
      </div>
    </div>
  </UiDashboardCard>
</template>

<style scoped>
.hub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.hub-title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0;
}

.hub-subtitle {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}

/* ─── 門市定位區 ─── */
.store-location {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-primary-light);
  border-radius: var(--radius-md, 12px);
  margin-bottom: var(--space-3, 12px);
}

.store-icon {
  font-size: 16px;
}

.store-name {
  flex: 1;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text, #1f2937);
}

.switch-store-btn {
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

.switch-store-btn:hover {
  opacity: 0.85;
}

/* ─── 分類 Tab ─── */
.category-tabs {
  display: flex;
  gap: var(--space-1, 4px);
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: var(--space-2, 8px);
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: var(--text-xs, 11px);
  border: none;
  border-radius: var(--radius-full, 9999px);
  cursor: pointer;
  background: var(--color-bg-card, #fff);
  color: var(--color-text-secondary, #6b7280);
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}

.category-tab.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.category-tab:hover {
  opacity: 0.85;
}

.category-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 團購列表 ─── */
.group-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.group-card {
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  position: relative;
}

.solo-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-secondary);
  color: #fff;
  font-weight: 600;
}

.group-card-body {
  display: flex;
  gap: var(--space-3, 12px);
}

.group-image {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md, 12px);
  flex-shrink: 0;
}

.group-content {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-spec {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 6px;
}

.group-prices {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.price-solo {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  color: var(--color-primary);
}

.price-group {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  color: var(--color-secondary);
}

.price-original {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #9ca3af);
  text-decoration: line-through;
}

/* ─── 進度條區 ─── */
.group-progress-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
}

.progress-wrapper {
  flex: 1;
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

.progress-fill.joining {
  animation: pulse 0.3s ease;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.progress-text {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin-top: 2px;
  display: block;
}

.join-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s ease;
}

.join-btn:hover {
  opacity: 0.85;
}

.join-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.grouped-label {
  flex-shrink: 0;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #9ca3af);
  font-weight: 600;
}

/* ─── 數量 + 確認購買 ─── */
.purchase-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
  padding-top: var(--space-2, 8px);
  border-top: 1px dashed var(--color-border, #e5e7eb);
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-full, 9999px);
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.qty-btn:hover {
  opacity: 0.85;
}

.qty-value {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

.confirm-purchase-btn {
  flex: 1;
  padding: 8px 14px;
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

.confirm-purchase-btn:hover {
  opacity: 0.85;
}

.confirm-purchase-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 取貨門市標示 ─── */
.store-pickup-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin-top: var(--space-2, 8px);
  padding-top: var(--space-2, 8px);
  border-top: 1px solid var(--color-border, #e5e7eb);
}

/* ─── 空狀態 ─── */
.empty-state {
  text-align: center;
  padding: var(--space-6, 24px);
  color: var(--color-text-secondary, #6b7280);
  font-size: var(--text-sm, 13px);
}
</style>
