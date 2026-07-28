<script setup lang="ts">
type ParcelType = 'frozen' | 'refrigerated' | 'normal'

interface Parcel {
  id: string
  name: string
  type: ParcelType
  urgent: boolean
}

interface ParcelDashboardProps {
  parcels: Parcel[]
}

const props = defineProps<ParcelDashboardProps>()

// 溫層分類配置
const typeConfig: Record<ParcelType, { icon: string; label: string }> = {
  frozen: { icon: '❄️', label: '冷凍' },
  refrigerated: { icon: '🧊', label: '冷藏' },
  normal: { icon: '📦', label: '常溫' },
}

// 分類函式：依溫層將包裹分組（冷凍 → 冷藏 → 常溫 順序）
function classifyByType(parcels: Parcel[]): Record<ParcelType, Parcel[]> {
  const groups: Record<ParcelType, Parcel[]> = {
    frozen: [],
    refrigerated: [],
    normal: [],
  }
  for (const parcel of parcels) {
    groups[parcel.type].push(parcel)
  }
  return groups
}

// 快速操作按鈕 toggle 狀態
const actionStates = ref<Record<string, boolean>>({
  'system-message': false,
  'proxy-pickup': false,
  'return-send': false,
})

const actions = [
  { key: 'system-message', label: '系統留言替代電話' },
  { key: 'proxy-pickup', label: '7-11/智取櫃代領' },
  { key: 'return-send', label: '一鍵退貨/代發' },
]

function toggleAction(key: string) {
  actionStates.value[key] = !actionStates.value[key]
}

// 是否顯示 Urgency Badge
function shouldDisplayUrgencyBadge(type: ParcelType): boolean {
  return type === 'frozen' || type === 'refrigerated'
}

const groupedParcels = computed(() => classifyByType(props.parcels))
</script>

<template>
  <section class="pd__card" aria-label="待領包裹">
    <h3 class="pd__title">📦 待領包裹</h3>

    <!-- 空狀態 -->
    <div v-if="parcels.length === 0" class="pd__empty">
      🎉 目前沒有待領包裹
    </div>

    <!-- 溫層分類列表 -->
    <div v-else class="pd__groups">
      <div
        v-for="typeKey in (['frozen', 'refrigerated', 'normal'] as ParcelType[])"
        :key="typeKey"
      >
        <div v-if="groupedParcels[typeKey].length > 0" class="pd__group">
          <h4 class="pd__group-label">
            {{ typeConfig[typeKey].icon }} {{ typeConfig[typeKey].label }}
          </h4>
          <ul class="pd__parcel-list">
            <li
              v-for="parcel in groupedParcels[typeKey]"
              :key="parcel.id"
              class="pd__parcel-item"
            >
              <span class="pd__parcel-name">{{ parcel.name }}</span>
              <span
                v-if="shouldDisplayUrgencyBadge(parcel.type)"
                class="pd__urgency-badge"
                role="status"
                aria-live="polite"
              >
                需今日領取
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 快速操作按鈕 -->
    <div class="pd__actions">
      <button
        v-for="action in actions"
        :key="action.key"
        class="pd__action-pill"
        :class="{ 'pd__action-pill--active': actionStates[action.key] }"
        :aria-label="action.label"
        :aria-pressed="actionStates[action.key]"
        @click="toggleAction(action.key)"
      >
        {{ action.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 卡片容器 */
.pd__card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.pd__title {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

/* 空狀態 */
.pd__empty {
  text-align: center;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  padding: var(--space-4, 16px) 0;
}

/* 溫層群組 */
.pd__groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.pd__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.pd__group-label {
  margin: 0;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

/* 包裹列表 */
.pd__parcel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.pd__parcel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-primary-light, #fffbeb);
  border-radius: var(--radius-sm, 6px);
}

.pd__parcel-name {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
}

/* Urgency Badge */
.pd__urgency-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  background-color: var(--color-accent-red, #e11d48);
  color: #ffffff;
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  white-space: nowrap;
}

/* 快速操作按鈕區 */
.pd__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
}

/* Pill 按鈕（停用狀態） */
.pd__action-pill {
  padding: 6px 12px;
  border-radius: var(--radius-full, 9999px);
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-card, #ffffff);
  color: var(--color-text-primary, #1c1917);
  font-size: var(--text-sm, 13px);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pd__action-pill:hover {
  opacity: 0.85;
}

.pd__action-pill:focus {
  outline: 2px solid var(--color-primary, #d97706);
  outline-offset: 2px;
}

/* Pill 按鈕（啟用狀態） */
.pd__action-pill--active {
  background: var(--color-primary, #d97706);
  border-color: var(--color-primary, #d97706);
  color: #ffffff;
}
</style>
