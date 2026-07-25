<script setup lang="ts">
import { computed } from 'vue'

interface CalorieDashboardProps {
  calories: number  // 當日已攝取熱量（kcal）
  goal: number      // 每日熱量目標（kcal）
}

const props = defineProps<CalorieDashboardProps>()

// 百分比：防止除以零，clamp 至 [0, 100]
const percentage = computed(() =>
  Math.min(100, Math.max(0, props.goal > 0 ? (props.calories / props.goal) * 100 : 0))
)

// 超標旗標
const overLimit = computed(() => props.calories > props.goal)
</script>

<template>
  <UiDashboardCard>
    <!-- 標題列 -->
    <div class="calorie-header">
      <span class="calorie-title">🔥 今日熱量</span>
      <span v-if="overLimit" class="over-limit-badge">⚠️ 已超標</span>
    </div>

    <!-- 熱量數字 -->
    <p class="calorie-value">+{{ calories }} kcal</p>

    <!-- 目標文字 -->
    <p class="calorie-goal">目標 {{ goal }} kcal</p>

    <!-- 進度條 -->
    <UiProgressBar :value="percentage" :over-limit="overLimit" />

    <!-- 百分比文字 -->
    <p class="calorie-percent">{{ Math.round(percentage) }}%</p>
  </UiDashboardCard>
</template>

<style scoped>
.calorie-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  margin-bottom: var(--space-2, 8px);
}

.calorie-title {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.over-limit-badge {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #e11d48;
  color: var(--color-accent-red, #e11d48);
  font-weight: 500;
}

.calorie-value {
  margin: 0 0 4px;
  margin: 0 0 var(--space-1, 4px);
  font-size: 20px;
  font-size: var(--text-xl, 20px);
  font-weight: 700;
  color: #ff5252;
  color: var(--color-primary, #ff5252);
}

.calorie-goal {
  margin: 0 0 8px;
  margin: 0 0 var(--space-2, 8px);
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.calorie-percent {
  margin: 8px 0 0;
  margin: var(--space-2, 8px) 0 0;
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  text-align: right;
}
</style>
