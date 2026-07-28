<script setup lang="ts">
/**
 * 常用路線收藏元件
 * 橫向可滾動卡片列表，一鍵啟動路線規劃或叫車
 */

export interface FavoriteRoute {
  id: string
  name: string
  origin: string
  destination: string
  preferredMode: string
  lastUsed: string
}

const MAX_ROUTES = 10

const props = defineProps<{
  routes: FavoriteRoute[]
}>()

const emit = defineEmits<{
  'select-route': [route: FavoriteRoute]
  'call-ride': [route: FavoriteRoute]
  'add': []
  'edit': [route: FavoriteRoute]
  'delete': [routeId: string]
}>()

// 交通方式圖示
const modeIcons: Record<string, string> = {
  bus: '🚌',
  metro: '🚇',
  hsr: '🚄',
  train: '🚃',
  car: '🚗',
  motorcycle: '🏍️',
  walk: '🚶',
}

// 格式化上次使用時間
function formatLastUsed(isoDate: string): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return `${Math.floor(diffDays / 7)} 週前`
}

// 是否可新增
const canAdd = computed(() => props.routes.length < MAX_ROUTES)
</script>

<template>
  <section class="favorite-routes" aria-label="常用路線">
    <div class="routes-header">
      <h3 class="routes-title">常用路線</h3>
      <span class="routes-count">{{ props.routes.length }}/{{ MAX_ROUTES }}</span>
    </div>

    <div class="routes-scroll">
      <!-- 路線卡片 -->
      <div
        v-for="route in props.routes"
        :key="route.id"
        class="route-card"
      >
        <button
          class="route-card-main"
          :aria-label="`${route.name}：${route.origin}到${route.destination}`"
          @click="emit('select-route', route)"
        >
          <span class="route-icon" aria-hidden="true">
            {{ modeIcons[route.preferredMode] || '📍' }}
          </span>
          <span class="route-name">{{ route.name }}</span>
          <span class="route-summary">{{ route.origin }} → {{ route.destination }}</span>
          <span class="route-last-used">{{ formatLastUsed(route.lastUsed) }}</span>
        </button>

        <div class="route-card-actions">
          <button
            class="route-action-btn"
            aria-label="叫車前往"
            @click="emit('call-ride', route)"
          >
            🚕
          </button>
          <button
            class="route-action-btn"
            aria-label="編輯路線"
            @click="emit('edit', route)"
          >
            ✏️
          </button>
          <button
            class="route-action-btn"
            aria-label="刪除路線"
            @click="emit('delete', route.id)"
          >
            🗑️
          </button>
        </div>
      </div>

      <!-- 新增按鈕卡片 -->
      <div class="route-card add-card">
        <button
          class="route-card-main add-btn"
          :disabled="!canAdd"
          :aria-label="canAdd ? '新增常用路線' : '已達上限 10 筆'"
          @click="canAdd && emit('add')"
        >
          <span class="add-icon" aria-hidden="true">＋</span>
          <span class="add-text">{{ canAdd ? '新增' : '已達上限' }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.favorite-routes {
  width: 100%;
}

.routes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2, 8px);
  padding: 0 var(--space-1, 4px);
}

.routes-title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.routes-count {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

/* 橫向滾動容器 */
.routes-scroll {
  display: flex;
  gap: var(--space-3, 12px);
  overflow-x: auto;
  white-space: nowrap;
  padding: var(--space-2, 8px) 0;
  -webkit-overflow-scrolling: touch;
}

.routes-scroll::-webkit-scrollbar {
  display: none;
}

/* 路線卡片 */
.route-card {
  flex-shrink: 0;
  width: 140px;
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.route-card-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1, 4px);
  width: 100%;
  min-height: 80px;
  padding: var(--space-3, 12px);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  white-space: normal;
  transition: background-color 0.15s ease;
}

.route-card-main:active {
  background-color: var(--color-primary-light, #fffbeb);
}

.route-icon {
  font-size: var(--text-lg, 17px);
}

.route-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.route-summary {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.route-last-used {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
}

/* 卡片操作列 */
.route-card-actions {
  display: flex;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.route-action-btn {
  flex: 1;
  min-height: 44px;
  border: none;
  background: transparent;
  font-size: var(--text-xs, 11px);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.route-action-btn:active {
  background-color: var(--color-primary-light, #fffbeb);
}

.route-action-btn:not(:last-child) {
  border-right: 1px solid var(--color-border, #e2e8f0);
}

/* 新增卡片 */
.add-card {
  border-style: dashed;
}

.add-btn {
  align-items: center;
  justify-content: center;
  min-height: 116px;
}

.add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.add-icon {
  font-size: var(--text-xl, 20px);
  color: var(--color-text-disabled, #cbd5e1);
}

.add-text {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
}
</style>
