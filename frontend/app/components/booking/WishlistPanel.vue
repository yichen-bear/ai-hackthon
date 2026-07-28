<script setup lang="ts">
/**
 * WishlistPanel - 收藏清單 / 願望清單
 * 管理收藏商品，支援降價/截止提醒、排序、移除動畫
 */

export interface WishlistItem {
  id: string
  productId: string
  productName: string
  channel: 'preorder' | 'groupbuy'
  currentPrice: number
  originalPrice: number
  hasPriceDrop: boolean
  deadline: string
  addedAt: string
  image?: string
}

const props = defineProps<{
  items: WishlistItem[]
}>()

const emit = defineEmits<{
  'buy-now': [payload: { productId: string; channel: string }]
  'remove-item': [productId: string]
}>()

// ─── 排序 ───
type SortMode = 'recent' | 'deadline' | 'price-asc'
const activeSort = ref<SortMode>('recent')

const sortOptions = [
  { key: 'recent' as const, label: '最近加入' },
  { key: 'deadline' as const, label: '即將截止' },
  { key: 'price-asc' as const, label: '價格低到高' },
]

const sortedItems = computed(() => {
  const list = [...props.items]
  switch (activeSort.value) {
    case 'recent':
      return list.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    case 'deadline':
      return list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    case 'price-asc':
      return list.sort((a, b) => a.currentPrice - b.currentPrice)
    default:
      return list
  }
})

// ─── 移除動畫 ───
const removingId = ref<string | null>(null)

function handleRemove(productId: string) {
  removingId.value = productId
  setTimeout(() => {
    emit('remove-item', productId)
    removingId.value = null
  }, 300)
}

// ─── 工具函數 ───
function isExpiringSoon(item: WishlistItem): boolean {
  const diff = new Date(item.deadline).getTime() - Date.now()
  const daysLeft = diff / (1000 * 60 * 60 * 24)
  return daysLeft <= 3 && daysLeft > 0
}

function getChannelLabel(channel: 'preorder' | 'groupbuy'): string {
  return channel === 'preorder' ? 'i預購' : 'i划算'
}
</script>

<template>
  <UiDashboardCard>
    <div class="wishlist-header">
      <h2 class="wishlist-title">我的收藏</h2>
      <span class="wishlist-count">{{ items.length }} 件</span>
    </div>

    <!-- 排序選項 -->
    <div class="sort-tabs" role="tablist" aria-label="收藏排序方式">
      <button
        v-for="opt in sortOptions"
        :key="opt.key"
        class="sort-tab"
        :class="{ active: activeSort === opt.key }"
        role="tab"
        :aria-selected="activeSort === opt.key"
        @click="activeSort = opt.key"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- 收藏列表 -->
    <div class="wishlist-list" aria-live="polite">
      <div
        v-for="item in sortedItems"
        :key="item.id"
        class="wishlist-card"
        :class="{ removing: removingId === item.productId }"
      >
        <!-- 左側圖片 -->
        <div
          class="wishlist-image"
          :style="{ background: item.image || 'linear-gradient(135deg, #e5e7eb, #d1d5db)' }"
        ></div>

        <!-- 中間內容 -->
        <div class="wishlist-content">
          <p class="wishlist-name">{{ item.productName }}</p>
          <div class="wishlist-meta">
            <span class="channel-tag" :class="item.channel === 'preorder' ? 'tag-secondary' : 'tag-primary'">
              {{ getChannelLabel(item.channel) }}
            </span>
            <!-- Badge 提示 -->
            <span v-if="item.hasPriceDrop" class="drop-badge">🔥 降價了！</span>
            <span v-else-if="isExpiringSoon(item)" class="expiring-badge">⏰ 即將截止</span>
          </div>
          <div class="wishlist-prices">
            <span v-if="item.hasPriceDrop" class="price-old">${{ item.originalPrice }}</span>
            <span class="price-current" :class="{ 'price-drop': item.hasPriceDrop }">${{ item.currentPrice }}</span>
          </div>
        </div>

        <!-- 右側操作 -->
        <div class="wishlist-actions">
          <button
            class="buy-btn"
            :aria-label="`立即購買 ${item.productName}`"
            @click="emit('buy-now', { productId: item.productId, channel: item.channel })"
          >
            🛒
          </button>
          <button
            class="remove-btn"
            :aria-label="`從收藏移除 ${item.productName}`"
            @click="handleRemove(item.productId)"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-if="items.length === 0" class="empty-state">
        <p>還沒有收藏商品，去逛逛吧 💚</p>
      </div>
    </div>
  </UiDashboardCard>
</template>

<style scoped>
.wishlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.wishlist-title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0;
}

.wishlist-count {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}

/* ─── 排序 Tab ─── */
.sort-tabs {
  display: flex;
  gap: var(--space-1, 4px);
  margin-bottom: var(--space-3, 12px);
}

.sort-tab {
  padding: 6px 12px;
  font-size: var(--text-xs, 11px);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-full, 9999px);
  background: #fff;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}

.sort-tab.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.sort-tab:hover {
  opacity: 0.85;
}

.sort-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 收藏列表 ─── */
.wishlist-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.wishlist-card {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: var(--space-3, 12px);
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.wishlist-card.removing {
  transform: translateX(-100%);
  opacity: 0;
}

.wishlist-image {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md, 12px);
  flex-shrink: 0;
}

.wishlist-content {
  flex: 1;
  min-width: 0;
}

.wishlist-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wishlist-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.channel-tag {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

.tag-primary {
  background: var(--color-primary);
  color: #fff;
}

.tag-secondary {
  background: var(--color-secondary);
  color: #fff;
}

.drop-badge {
  font-size: 9px;
  padding: 1px 6px;
  background: #ef4444;
  color: #fff;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

.expiring-badge {
  font-size: 9px;
  padding: 1px 6px;
  background: var(--color-secondary);
  color: #fff;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

.wishlist-prices {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-old {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #9ca3af);
  text-decoration: line-through;
}

.price-current {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  color: var(--color-text, #1f2937);
}

.price-current.price-drop {
  color: var(--color-primary);
}

/* ─── 操作按鈕 ─── */
.wishlist-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.buy-btn,
.remove-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: opacity 0.15s ease;
}

.buy-btn {
  background: var(--color-primary-light);
}

.remove-btn {
  background: #fef2f2;
}

.buy-btn:hover,
.remove-btn:hover {
  opacity: 0.85;
}

.buy-btn:focus-visible,
.remove-btn:focus-visible {
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
