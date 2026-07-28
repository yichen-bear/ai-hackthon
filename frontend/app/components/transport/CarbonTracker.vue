<script setup lang="ts">
/**
 * 碳足跡追蹤元件
 * 統計交通碳排放量、進度條顯示、減碳成就徽章
 */

import { calculateCarbonProgress } from '~/composables/useCarbonCalculator'

export interface EmissionBreakdown {
  car: number
  transit: number
  green: number
}

export interface CarbonBadge {
  id: string
  icon: string
  name: string
  description: string
  unlocked: boolean
}

export interface EmissionData {
  total: number
  goal: number
  breakdown: EmissionBreakdown
  badges: CarbonBadge[]
}

const props = defineProps<{
  emissions: EmissionData
}>()

// 計算進度
const progress = computed(() =>
  calculateCarbonProgress(props.emissions.total, props.emissions.goal)
)

// 進度條漸層
const progressGradient = computed(() => {
  if (progress.value.overLimit) {
    return 'linear-gradient(90deg, #e11d48, #be123c)'
  }
  return 'linear-gradient(90deg, #22c55e, #16a34a)'
})

// 分類統計
const breakdownItems = computed(() => [
  { icon: '🚗', label: '汽車/叫車', value: props.emissions.breakdown.car, unit: 'kg' },
  { icon: '🚌', label: '大眾運輸', value: props.emissions.breakdown.transit, unit: 'kg' },
  { icon: '🚲', label: '減碳貢獻', value: props.emissions.breakdown.green, unit: 'kg', isGreen: true },
])
</script>

<template>
  <section class="carbon-tracker" aria-label="碳足跡追蹤">
    <div class="tracker-card">
      <h3 class="tracker-title">碳足跡追蹤</h3>

      <!-- 碳排放摘要 -->
      <div class="emission-summary">
        <div class="emission-current">
          <span class="emission-value">{{ props.emissions.total.toFixed(1) }}</span>
          <span class="emission-unit">kg CO₂</span>
        </div>
        <div class="emission-goal">
          <span class="goal-label">月度目標</span>
          <span class="goal-value">{{ props.emissions.goal }} kg</span>
        </div>
      </div>

      <!-- 進度條 -->
      <div class="progress-section">
        <div class="progress-bar-bg">
          <div
            class="progress-bar-fill"
            :style="{ width: `${progress.percentage}%`, background: progressGradient }"
            role="progressbar"
            :aria-valuenow="Math.round(progress.percentage)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`碳排放進度 ${Math.round(progress.percentage)}%`"
          />
        </div>
        <div class="progress-meta">
          <span class="progress-percent">{{ Math.round(progress.percentage) }}%</span>
          <span v-if="progress.overLimit" class="over-limit-warn">⚠️ 超過目標</span>
          <span v-else class="under-limit-hint">✅ 達標中</span>
        </div>
      </div>

      <!-- 分類統計 -->
      <div class="breakdown-section">
        <div
          v-for="item in breakdownItems"
          :key="item.label"
          class="breakdown-item"
        >
          <span class="breakdown-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="breakdown-label">{{ item.label }}</span>
          <span
            class="breakdown-value"
            :class="{ green: item.isGreen }"
          >
            {{ item.isGreen && item.value > 0 ? '-' : '' }}{{ item.value.toFixed(1) }} {{ item.unit }}
          </span>
        </div>
      </div>

      <!-- 減碳成就徽章 -->
      <div class="badges-section">
        <h4 class="badges-title">減碳成就</h4>
        <div class="badges-grid">
          <div
            v-for="badge in props.emissions.badges"
            :key="badge.id"
            class="badge-item"
            :class="{ unlocked: badge.unlocked }"
            :aria-label="`${badge.name} ${badge.unlocked ? '已解鎖' : '未解鎖'}`"
          >
            <span class="badge-icon" aria-hidden="true">{{ badge.icon }}</span>
            <span class="badge-name">{{ badge.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.carbon-tracker {
  width: 100%;
}

.tracker-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
}

.tracker-title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-3, 12px) 0;
}

/* 碳排放摘要 */
.emission-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--space-3, 12px);
}

.emission-current {
  display: flex;
  align-items: baseline;
  gap: var(--space-1, 4px);
}

.emission-value {
  font-size: var(--text-xl, 20px);
  font-weight: 700;
  color: var(--color-text-primary, #1c1917);
}

.emission-unit {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.emission-goal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.goal-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.goal-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

/* 進度條 */
.progress-section {
  margin-bottom: var(--space-4, 16px);
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-1, 4px);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-percent {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-text-secondary, #78716c);
}

.over-limit-warn {
  font-size: var(--text-xs, 11px);
  color: #e11d48;
  font-weight: 500;
}

.under-limit-hint {
  font-size: var(--text-xs, 11px);
  color: #15803d;
  font-weight: 500;
}

/* 分類統計 */
.breakdown-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
  padding: var(--space-3, 12px);
  background: var(--color-progress-bg, #f1f5f9);
  border-radius: var(--radius-md, 12px);
  margin-bottom: var(--space-4, 16px);
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.breakdown-icon {
  font-size: var(--text-base, 15px);
  width: 24px;
  text-align: center;
}

.breakdown-label {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  flex: 1;
}

.breakdown-value {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.breakdown-value.green {
  color: #15803d;
}

/* 徽章區 */
.badges-section {
  /* no extra spacing needed */
}

.badges-title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 var(--space-2, 8px) 0;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2, 8px);
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1, 4px);
  padding: var(--space-3, 12px) var(--space-2, 8px);
  border-radius: var(--radius-md, 12px);
  background: var(--color-progress-bg, #f1f5f9);
  transition: opacity 0.15s ease;
}

.badge-item:not(.unlocked) {
  filter: grayscale(100%);
  opacity: 0.5;
}

.badge-item:not(.unlocked) .badge-name {
  color: var(--color-text-disabled, #cbd5e1);
}

.badge-icon {
  font-size: 24px;
}

.badge-name {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
  text-align: center;
}
</style>
