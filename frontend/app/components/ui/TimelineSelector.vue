<script setup lang="ts">
interface TimeSlot {
  time: string
  available: boolean
}

const props = defineProps<{
  slots: TimeSlot[]
  selected: string
}>()

const emit = defineEmits<{
  'update:selected': [timeSlot: string]
}>()

function handleSelect(slot: TimeSlot) {
  if (!slot.available) return
  emit('update:selected', slot.time)
}
</script>

<template>
  <div class="timeline-selector">
    <button
      v-for="slot in props.slots"
      :key="slot.time"
      class="time-slot"
      :class="{
        'time-slot--selected': slot.available && slot.time === props.selected,
        'time-slot--full': !slot.available,
      }"
      :aria-pressed="slot.available && slot.time === props.selected ? 'true' : 'false'"
      :aria-disabled="!slot.available ? 'true' : undefined"
      :disabled="!slot.available"
      @click="handleSelect(slot)"
    >
      {{ slot.time }}
    </button>
  </div>
</template>

<style scoped>
.timeline-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
}

.timeline-selector::-webkit-scrollbar {
  display: none;
}

.time-slot {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-sm, 13px);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  border: 1.5px solid;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;

  /* 備用靜態值 */
  background-color: #ffffff;
  background-color: var(--color-bg-card, #ffffff);
  border-color: #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

/* 已選中：綠底白字 */
.time-slot--selected {
  background-color: #22c55e;
  background-color: var(--color-secondary, #22c55e);
  border-color: #22c55e;
  border-color: var(--color-secondary, #22c55e);
  color: #ffffff;
}

/* 已滿：灰字禁用 */
.time-slot--full {
  background-color: #f1f5f9;
  background-color: var(--color-progress-bg, #f1f5f9);
  border-color: #f1f5f9;
  border-color: var(--color-progress-bg, #f1f5f9);
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
  cursor: not-allowed;
  pointer-events: none;
}
</style>
