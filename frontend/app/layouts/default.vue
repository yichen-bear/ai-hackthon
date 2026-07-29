<script setup lang="ts">
const route = useRoute()

const isAdmin = computed(() => route.path.includes('/admin'))

const switchText = computed(() => isAdmin.value ? '📱 切換至用戶端' : '🏢 切換至廠商端')
const switchTo = computed(() => isAdmin.value ? '/food' : '/food/admin')
</script>

<template>
  <div class="app-container">
    <header class="app-header" role="banner">
      <!-- 左側：模組導覽 -->
      <nav class="app-header__nav" aria-label="模組導覽">
        <NuxtLink to="/food" class="app-header__nav-link">食</NuxtLink>
        <NuxtLink to="/medical" class="app-header__nav-link">醫</NuxtLink>
        <NuxtLink to="/housing" class="app-header__nav-link">住</NuxtLink>
        <NuxtLink to="/transport" class="app-header__nav-link">行</NuxtLink>
        <NuxtLink to="/booking" class="app-header__nav-link">預</NuxtLink>
        <NuxtLink to="/entertainment" class="app-header__nav-link">樂</NuxtLink>
      </nav>

      <!-- 中間：切換按鈕 -->
      <NuxtLink :to="switchTo" class="app-header__switch-btn">
        {{ switchText }}
      </NuxtLink>
    </header>

    <slot />
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  padding-top: 56px;
  padding-bottom: 80px;
}

.app-header {
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
  padding: 0 16px;
  background-color: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

/* ── 左側導覽 ── */
.app-header__nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header__nav-link {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  text-decoration: none;
  transition: color 0.15s ease;
}

.app-header__nav-link:hover,
.app-header__nav-link.router-link-active {
  color: var(--color-primary, #f97316);
}

/* ── 中間切換按鈕 ── */
.app-header__switch-btn {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary, #78716c);
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.app-header__switch-btn:hover {
  color: var(--color-primary, #f97316);
  border-color: var(--color-primary, #f97316);
}
</style>
