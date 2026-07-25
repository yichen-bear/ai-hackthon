<script setup lang="ts">
import { computed } from 'vue'

interface ProgressBarProps {
  value: number
  label?: string
  overLimit?: boolean
}

const props = defineProps<ProgressBarProps>()

// clamp 邏輯：NaN → 0，< 0 → 0，> 100 → 100
const clampedValue = computed(() =>
  Math.min(100, Math.max(0, isNaN(props.value) ? 0 : props.value))
)

// overLimit：外部顯式傳入，或 value > 100 時自動啟用
const isOverLimit = computed(() => props.overLimit || props.value > 100)

const fillStyle = computed(() => ({
  width: `${clampedValue.value}%`,
  background: isOverLimit.value
    ? 'linear-gradient(90deg, #ff7e5f, var(--color-accent-red, #e11d48))'
    : 'linear-gradient(90deg, #ff7e5f, #ff5252)',
}))
</script>

<template>
  <div class="progress-bar-wrapper">
    <div
      class="progress-bar-track"
      role="progressbar"
      :aria-valuenow="clampedValue"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label"
    >
      <div class="progress-bar-fill" :style="fillStyle" />
    </div>
    <p v-if="label" class="progress-bar-label">{{ label }}</p>
  </div>
</template>

<style scoped>
.progress-bar-wrapper {
  width: 100%;
}

.progress-bar-track {
  width: 100%;
  height: 8px;
  /* 備用靜態值（舊版瀏覽器降級） */
  background-color: #f1f5f9;
  background-color: var(--color-progress-bg, #f1f5f9);
  border-radius: 9999px;
  border-radius: var(--radius-full, 9999px);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 9999px;
  border-radius: var(--radius-full, 9999px);
  transition: width 0.3s ease;
}

.progress-bar-label {
  margin: 4px 0 0;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}
</style>
