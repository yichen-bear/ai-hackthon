<script setup lang="ts">
import { computed } from 'vue'
import { calculateWaterProgress } from '~/utils/medical-validators'

interface VitaminReminder {
  name: string
  time: string // HH:mm format
}

interface HealthRemindersProps {
  waterIntake: number
  waterGoal?: number
  vitamins: VitaminReminder[]
  healthTip: string
}

const props = withDefaults(defineProps<HealthRemindersProps>(), {
  waterGoal: 2000,
})

const progress = computed(() => calculateWaterProgress(props.waterIntake, props.waterGoal ?? 2000))

const waterLabel = computed(() => `${props.waterIntake} / ${props.waterGoal ?? 2000} ml`)
</script>

<template>
  <section class="mc__health-card" aria-label="每日健康追蹤">
    <!-- 飲水量進度 -->
    <div class="mc__health-water">
      <h3 class="mc__health-title">💧 今日飲水</h3>
      <UiProgressBar
        :value="progress.percentage"
        :label="waterLabel"
        :over-limit="progress.overLimit"
      />
    </div>

    <!-- 維生素提醒 -->
    <div class="mc__health-vitamins">
      <h3 class="mc__health-title">💊 維生素提醒</h3>
      <ul class="mc__health-vitamin-list">
        <li
          v-for="vitamin in vitamins"
          :key="vitamin.name + vitamin.time"
          class="mc__health-vitamin-item"
        >
          <span class="mc__health-vitamin-name">{{ vitamin.name }}</span>
          <span class="mc__health-vitamin-time">{{ vitamin.time }}</span>
        </li>
      </ul>
    </div>

    <!-- 健康小提示 -->
    <div class="mc__health-tip">
      <h3 class="mc__health-title">💡 今日健康提示</h3>
      <div class="mc__health-tip-card">
        <p class="mc__health-tip-text">{{ healthTip }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mc__health-card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
}

.mc__health-title {
  margin: 0 0 var(--space-2, 8px);
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

/* 飲水量區塊 */
.mc__health-water {
  display: flex;
  flex-direction: column;
}

/* 維生素提醒列表 */
.mc__health-vitamin-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.mc__health-vitamin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-secondary-light, #dcfce7);
  border-radius: var(--radius-sm, 6px);
}

.mc__health-vitamin-name {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
}

.mc__health-vitamin-time {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  font-variant-numeric: tabular-nums;
}

/* 健康小提示卡片 */
.mc__health-tip-card {
  padding: var(--space-3, 12px);
  background: var(--color-primary-light, #eff6ff);
  border-radius: var(--radius-sm, 6px);
}

.mc__health-tip-text {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  line-height: 1.5;
}
</style>
