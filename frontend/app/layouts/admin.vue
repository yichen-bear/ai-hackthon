<script setup lang="ts">
const route = useRoute()

// 從路由路徑提取模組名稱：/food/admin → 'food'
const currentModule = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments[0] ?? ''
})

const moduleLabels: Record<string, string> = {
  food: '食',
  medical: '醫',
  housing: '住',
}

const pageTitle = computed(() => {
  const label = moduleLabels[currentModule.value] ?? currentModule.value
  return `${label} — 廠商管理`
})
</script>

<template>
  <div class="admin-container">
    <header class="admin-header" role="banner">
      <div class="admin-header__left">
        <span class="admin-header__icon" aria-hidden="true">⚙️</span>
        <span class="admin-header__title">廠商管理後台</span>
        <span class="admin-header__divider" aria-hidden="true">|</span>
        <span class="admin-header__module">{{ pageTitle }}</span>
      </div>
      <div class="admin-header__right">
        <UiRoleSwitchButton />
      </div>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.admin-container {
  position: relative;
  padding-top: 56px;
}

.admin-header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 56px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4, 16px);
  background-color: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.admin-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.admin-header__icon {
  font-size: 18px;
  line-height: 1;
}

.admin-header__title {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.admin-header__divider {
  color: var(--color-border, #e2e8f0);
  font-weight: 300;
}

.admin-header__module {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.admin-header__right {
  display: flex;
  align-items: center;
}
</style>
