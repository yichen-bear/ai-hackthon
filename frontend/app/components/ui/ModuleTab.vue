<script setup lang="ts">
type ModuleKey = 'food' | 'medical' | 'home' | 'transport' | 'booking' | 'entertainment'

interface ModuleItem {
  key: ModuleKey
  label: string
  route: string
}

const props = defineProps<{ activeTab: ModuleKey }>()

const modules: ModuleItem[] = [
  { key: 'food',          label: '食', route: '/food' },
  { key: 'medical',       label: '醫', route: '/medical' },
  { key: 'home',          label: '住', route: '/home' },
  { key: 'transport',     label: '行', route: '/transport' },
  { key: 'booking',       label: '預', route: '/booking' },
  { key: 'entertainment', label: '樂', route: '/entertainment' },
]

const router = useRouter()

function navigate(route: string) {
  router.push(route)
}
</script>

<template>
  <nav aria-label="模組導覽" class="module-tab-nav">
    <button
      v-for="mod in modules"
      :key="mod.key"
      class="module-tab-btn"
      :class="{ 'is-active': mod.key === props.activeTab }"
      :aria-current="mod.key === props.activeTab ? 'page' : undefined"
      type="button"
      @click="navigate(mod.route)"
    >
      {{ mod.label }}
    </button>
  </nav>
</template>

<style scoped>
.module-tab-nav {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
  /* 隱藏捲軸但保留捲動功能 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-card, #ffffff);
}

.module-tab-nav::-webkit-scrollbar {
  display: none;
}

.module-tab-btn {
  display: inline-block;
  flex-shrink: 0;
  padding: var(--space-3, 12px) var(--space-5, 20px);
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  /* 備用靜態值 */
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
  font-size: var(--text-base, 15px);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease, border-bottom-color 0.15s ease;
  outline: none;
}

.module-tab-btn.is-active {
  /* 備用靜態值 */
  color: #f97316;
  color: var(--color-primary, #f97316);
  /* 備用靜態值 */
  border-bottom-color: #f97316;
  border-bottom-color: var(--color-primary, #f97316);
}

.module-tab-btn:focus-visible {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: -2px;
  border-radius: var(--radius-sm, 6px);
}

.module-tab-btn:not(.is-active):hover {
  color: var(--color-text-secondary, #78716c);
}
</style>
