<script setup lang="ts">
const route = useRoute()
const { logout } = useAuth()

// 從路由路徑提取模組名稱：/admin/{module} → 'module'
const currentModule = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  // /admin/food → segments = ['admin', 'food'] → return 'food'
  return segments[1] ?? ''
})

const moduleLabels: Record<string, string> = {
  food: '食',
  medical: '醫',
  housing: '住',
  transport: '行',
  booking: '預',
  entertainment: '樂',
}

const pageTitle = computed(() => {
  const label = moduleLabels[currentModule.value] ?? currentModule.value
  return label ? `${label} — 廠商管理` : '廠商管理'
})

function handleLogout() {
  logout()
}
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
        <button class="admin-header__logout-btn" @click="handleLogout">登出</button>
      </div>
    </header>
    <nav class="admin-nav">
      <NuxtLink to="/admin/food" class="admin-nav__link" :class="{ active: currentModule === 'food' }">食</NuxtLink>
      <NuxtLink to="/admin/medical" class="admin-nav__link" :class="{ active: currentModule === 'medical' }">醫</NuxtLink>
      <NuxtLink to="/admin/housing" class="admin-nav__link" :class="{ active: currentModule === 'housing' }">住</NuxtLink>
      <NuxtLink to="/admin/transport" class="admin-nav__link" :class="{ active: currentModule === 'transport' }">行</NuxtLink>
      <NuxtLink to="/admin/booking" class="admin-nav__link" :class="{ active: currentModule === 'booking' }">預</NuxtLink>
      <NuxtLink to="/admin/entertainment" class="admin-nav__link" :class="{ active: currentModule === 'entertainment' }">樂</NuxtLink>
    </nav>
    <slot />
  </div>
</template>

<style scoped>
.admin-container {
  position: relative;
  padding-top: 100px;
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

.admin-header__logout-btn {
  padding: 6px 14px;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  background-color: transparent;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-header__logout-btn:hover {
  color: var(--color-text-primary, #1c1917);
  border-color: var(--color-text-secondary, #78716c);
  background-color: var(--color-bg-hover, #f5f5f4);
}

.admin-nav {
  position: fixed;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 44px;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
  background-color: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.admin-nav__link {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.admin-nav__link:hover {
  color: var(--color-text-primary, #1c1917);
  background-color: var(--color-bg-hover, #f5f5f4);
}

.admin-nav__link.active {
  color: var(--color-primary, #2563eb);
  font-weight: 600;
  border-bottom-color: var(--color-primary, #2563eb);
}
</style>
