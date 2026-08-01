<script setup lang="ts">
const route = useRoute()
const { state: authState, logout } = useAuth()

const userName = computed(() => authState.value.user?.name || '廠商')

const pageTitle = computed(() => {
  const path = route.path
  const role = route.query.role as string | undefined

  if (path === '/admin/food') return '餐廳'
  if (path === '/admin/medical') {
    if (role === 'pharmacy') return '藥局'
    if (role === 'delivery') return '送藥'
    return '診所'
  }
  if (path === '/admin/housing') {
    if (role === 'plumber') return '水電工程'
    if (role === 'cleaning') return '家事清潔'
    return '社區物業'
  }
  if (path === '/admin/transport') return 'yoxi'
  if (path === '/admin/booking') return '7-11'
  if (path === '/admin/entertainment') return '里長辦公處'
  if (path === '/admin/community-college') return '社區大學'
  return ''
})

function handleLogout() {
  logout()
}
</script>

<template>
  <div class="admin-layout">
    <!-- Login Header -->
    <header class="admin-login-header">
      <div class="admin-login-header__left">
        <span class="admin-login-header__name">{{ userName }}</span>
      </div>
      <div class="admin-login-header__center">
        <span class="admin-login-header__title">{{ pageTitle }}</span>
      </div>
      <div class="admin-login-header__right">
        <button class="admin-login-header__logout" @click="handleLogout">登出</button>
      </div>
    </header>

    <AdminSideNav />
    <slot />
  </div>
</template>

<style scoped>
.admin-layout {
  position: relative;
  min-height: 100vh;
  background: var(--color-bg-page, #fafaf9);
  padding-top: 48px;
}

.admin-login-header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 48px;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4, 16px);
  background: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.admin-login-header__left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.admin-login-header__name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.admin-login-header__center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.admin-login-header__title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  color: var(--color-text-primary, #1c1917);
}

.admin-login-header__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.admin-login-header__logout {
  padding: 6px 14px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: #ffffff;
  background: var(--color-accent-red, #e11d48);
  border: none;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s ease;
}

.admin-login-header__logout:hover {
  opacity: 0.85;
}

.admin-login-header__logout:active {
  transform: scale(0.97);
}
</style>
