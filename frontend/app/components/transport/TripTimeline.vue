<script setup lang="ts">
/**
 * 行程時間軸元件
 * 以垂直時間軸串聯當日所有交通行程
 */

export interface TripItem {
  id: string
  time: string
  mode: string
  origin: string
  destination: string
  status: 'pending' | 'active' | 'completed'
  ticketId?: string
}

const props = defineProps<{
  trips: TripItem[]
}>()

const emit = defineEmits<{
  'trip-action': [trip: TripItem, action: 'view-ticket' | 'cancel' | 'navigate']
}>()

// 展開的行程節點 ID
const expandedTripId = ref<string | null>(null)

function toggleExpand(tripId: string) {
  expandedTripId.value = expandedTripId.value === tripId ? null : tripId
}

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

// 狀態文字
const statusLabels: Record<string, string> = {
  pending: '待出發',
  active: '進行中',
  completed: '已完成',
}
</script>

<template>
  <section class="trip-timeline-wrapper" aria-label="今日行程">
    <div class="timeline-card">
      <h3 class="timeline-title">今日行程</h3>

      <!-- 空狀態 -->
      <div v-if="props.trips.length === 0" class="timeline-empty">
        <span class="empty-icon" aria-hidden="true">📅</span>
        <p class="empty-text">尚無行程安排</p>
      </div>

      <!-- 時間軸 -->
      <div v-else class="timeline">
        <div
          v-for="trip in props.trips"
          :key="trip.id"
          class="timeline-item"
          :class="`status-${trip.status}`"
        >
          <!-- 時間線節點 -->
          <div class="timeline-node">
            <div class="node-dot" :class="`dot-${trip.status}`" aria-hidden="true" />
            <div
              v-if="trip !== props.trips[props.trips.length - 1]"
              class="node-line"
              aria-hidden="true"
            />
          </div>

          <!-- 內容區 -->
          <div class="timeline-content">
            <button
              class="timeline-summary"
              :aria-expanded="expandedTripId === trip.id"
              :aria-label="`${trip.time} ${statusLabels[trip.status]} ${trip.origin}到${trip.destination}`"
              @click="toggleExpand(trip.id)"
            >
              <span class="trip-time">{{ trip.time }}</span>
              <span class="trip-mode" aria-hidden="true">{{ modeIcons[trip.mode] || '🚗' }}</span>
              <span class="trip-route">{{ trip.origin }} → {{ trip.destination }}</span>
              <span class="trip-status" :class="`badge-${trip.status}`">
                {{ statusLabels[trip.status] }}
              </span>
            </button>

            <!-- 展開詳情 -->
            <div v-show="expandedTripId === trip.id" class="timeline-detail">
              <div class="detail-actions">
                <button
                  v-if="trip.ticketId"
                  class="detail-btn"
                  aria-label="查看票券"
                  @click="emit('trip-action', trip, 'view-ticket')"
                >
                  🎫 查看票券
                </button>
                <button
                  v-if="trip.status === 'pending'"
                  class="detail-btn"
                  aria-label="取消行程"
                  @click="emit('trip-action', trip, 'cancel')"
                >
                  ❌ 取消
                </button>
                <button
                  v-if="trip.status === 'pending' || trip.status === 'active'"
                  class="detail-btn"
                  aria-label="導航至上車點"
                  @click="emit('trip-action', trip, 'navigate')"
                >
                  📍 導航
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trip-timeline-wrapper {
  width: 100%;
}

.timeline-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.timeline-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

/* 空狀態 */
.timeline-empty {
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

/* 時間軸 */
.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: var(--space-3, 12px);
  min-height: 56px;
}

/* 節點 */
.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}

.node-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.dot-pending {
  background-color: var(--color-primary, #f59e0b);
}

.dot-active {
  background-color: var(--color-secondary, #0ea5e9);
  box-shadow: 0 0 0 3px var(--color-secondary-light, #e0f2fe);
}

.dot-completed {
  background-color: var(--color-text-disabled, #cbd5e1);
}

.node-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background-color: var(--color-border, #e2e8f0);
  margin-top: 4px;
}

/* 內容區 */
.timeline-content {
  flex: 1;
  padding-bottom: var(--space-3, 12px);
}

.timeline-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2, 8px);
  border: none;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.timeline-summary:active {
  background-color: var(--color-primary-light, #fffbeb);
}

.trip-time {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  min-width: 40px;
}

.trip-mode {
  font-size: var(--text-base, 15px);
}

.trip-route {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trip-status {
  font-size: var(--text-xs, 11px);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  white-space: nowrap;
}

.badge-pending {
  background-color: var(--color-primary-light, #fffbeb);
  color: var(--color-primary, #f59e0b);
}

.badge-active {
  background-color: var(--color-secondary-light, #e0f2fe);
  color: var(--color-secondary, #0ea5e9);
}

.badge-completed {
  background-color: var(--color-progress-bg, #f1f5f9);
  color: var(--color-text-disabled, #cbd5e1);
}

/* 展開詳情 */
.timeline-detail {
  padding: var(--space-2, 8px) var(--space-2, 8px) 0;
}

.detail-actions {
  display: flex;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
}

.detail-btn {
  min-height: 44px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-xs, 11px);
  color: var(--color-text-primary, #1c1917);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.detail-btn:active {
  background-color: var(--color-primary-light, #fffbeb);
}
</style>
