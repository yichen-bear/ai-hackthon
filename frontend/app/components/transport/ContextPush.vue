<script setup lang="ts">
/**
 * 情境智慧推播元件
 * 依據時間/天氣/跨模組行程主動建議交通方案
 */

export interface ContextSuggestion {
  id: string
  title: string
  description: string
  destination: string
  triggerType: 'time' | 'weather' | 'cross-module'
  suggestedMode: string
}

const props = defineProps<{
  suggestions: ContextSuggestion[]
}>()

const emit = defineEmits<{
  'plan-route': [suggestion: ContextSuggestion]
  'call-ride': [suggestion: ContextSuggestion]
  'dismiss': [id: string]
}>()

const { dismissedSuggestions, dismissSuggestion } = useTransportState()

// 過濾已忽略的推播
const filteredSuggestions = computed(() =>
  props.suggestions.filter(s => !dismissedSuggestions.value.has(s.id))
)

// 正在消失動畫中的卡片 ID
const dismissingIds = ref<Set<string>>(new Set())

function handleDismiss(id: string) {
  dismissingIds.value.add(id)
  // 動畫結束後真正移除
  setTimeout(() => {
    dismissSuggestion(id)
    dismissingIds.value.delete(id)
    emit('dismiss', id)
  }, 300)
}

// 觸發類型對應圖示
const triggerIcons: Record<string, string> = {
  time: '⏰',
  weather: '🌧️',
  'cross-module': '🔗',
}

// 交通方式對應圖示
const modeIcons: Record<string, string> = {
  bus: '🚌',
  metro: '🚇',
  hsr: '🚄',
  train: '🚃',
  car: '🚗',
  motorcycle: '🏍️',
  walk: '🚶',
}
</script>

<template>
  <section
    v-if="filteredSuggestions.length > 0"
    class="context-push"
    aria-label="交通建議推播"
  >
    <div
      v-for="suggestion in filteredSuggestions"
      :key="suggestion.id"
      class="push-card"
      :class="{ dismissing: dismissingIds.has(suggestion.id) }"
    >
      <div class="push-header">
        <span class="push-trigger-icon" aria-hidden="true">
          {{ triggerIcons[suggestion.triggerType] || '💡' }}
        </span>
        <h3 class="push-title">{{ suggestion.title }}</h3>
      </div>

      <p class="push-description">{{ suggestion.description }}</p>

      <div class="push-mode">
        <span class="mode-icon" aria-hidden="true">
          {{ modeIcons[suggestion.suggestedMode] || '🚗' }}
        </span>
        <span class="mode-label">建議交通方式</span>
      </div>

      <div class="push-actions">
        <button
          class="push-btn push-btn-route"
          aria-label="規劃路線"
          @click="emit('plan-route', suggestion)"
        >
          規劃路線
        </button>
        <button
          class="push-btn push-btn-ride"
          aria-label="叫車前往"
          @click="emit('call-ride', suggestion)"
        >
          叫車前往
        </button>
        <button
          class="push-btn push-btn-dismiss"
          aria-label="忽略此建議"
          @click="handleDismiss(suggestion.id)"
        >
          忽略
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.context-push {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.push-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.push-card.dismissing {
  transform: translateX(100%);
  opacity: 0;
}

.push-header {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-2, 8px);
}

.push-trigger-icon {
  font-size: var(--text-lg, 17px);
}

.push-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.push-description {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  margin: 0 0 var(--space-3, 12px) 0;
  line-height: 1.4;
}

.push-mode {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-3, 12px);
}

.mode-icon {
  font-size: var(--text-lg, 17px);
}

.mode-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.push-actions {
  display: flex;
  gap: var(--space-2, 8px);
  align-items: center;
}

.push-btn {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.push-btn:active {
  opacity: 0.7;
}

.push-btn-route {
  background-color: var(--color-secondary, #0ea5e9);
  color: #ffffff;
}

.push-btn-ride {
  background-color: var(--color-primary, #f59e0b);
  color: #ffffff;
}

.push-btn-dismiss {
  background: transparent;
  color: var(--color-text-secondary, #78716c);
  margin-left: auto;
}
</style>
