<script setup lang="ts">
type ModuleKey = 'food' | 'medical' | 'home' | 'transport' | 'booking' | 'entertainment'

const route = useRoute()

const activeTab = computed((): ModuleKey => {
  const pathMap: Record<string, ModuleKey> = {
    '/food': 'food',
    '/medical': 'medical',
    '/home': 'home',
    '/transport': 'transport',
    '/booking': 'booking',
    '/entertainment': 'entertainment',
  }
  return pathMap[route.path] ?? 'food'
})

function handleOpenAi() {
  console.log('開啟 AI 助手')
}
</script>

<template>
  <div class="app-container">
    <UiAppHeader :active-tab="activeTab" />
    <slot />
    <UiAiButton @open-ai="handleOpenAi" />
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  padding-top: 70px;    /* Header 高度預留：地點列 30px + Tab 列 ~40px = 70px */
  padding-bottom: 80px; /* AI 按鈕保留空間 */
}
</style>
