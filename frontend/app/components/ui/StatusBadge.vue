<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ type: string; label: string }>()

interface BadgeStyle {
  background: string
  color: string
}

const badgeStyle = computed<BadgeStyle>(() => {
  switch (props.type) {
    case 'available':
      return { background: '#dcfce7', color: '#15803d' }
    case 'delivery':
      return { background: '#e0f2fe', color: '#0369a1' }
    case 'popular':
      return { background: '#ffe4e6', color: '#e11d48' }
    default:
      return {
        background: '#f1f5f9',
        color: 'var(--color-text-secondary, #78716c)',
      }
  }
})
</script>

<template>
  <span class="status-badge" :style="badgeStyle">{{ label }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  border-radius: var(--radius-full, 9999px);
  padding: 2px 10px;
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  line-height: 1.6;
  white-space: nowrap;
}
</style>
