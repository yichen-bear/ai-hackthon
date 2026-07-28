<script setup lang="ts">
const route = useRoute()

const isAdminPage = computed(() => route.path.includes('/admin'))

const buttonText = computed(() =>
  isAdminPage.value ? '📱 切換至用戶端' : '🏢 切換至廠商端'
)

const switchTo = computed(() => {
  if (isAdminPage.value) {
    // /food/admin → /food
    return route.path.replace('/admin', '')
  }
  // /food → /food/admin
  return `${route.path}/admin`
})
</script>

<template>
  <NuxtLink
    :to="switchTo"
    class="role-switch-btn"
  >
    {{ buttonText }}
  </NuxtLink>
</template>

<style scoped>
.role-switch-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--color-text-secondary, #78716c);
  font-size: var(--text-xs, 12px);
  font-weight: 500;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.role-switch-btn:hover {
  color: var(--color-primary, #f97316);
  border-color: var(--color-primary, #f97316);
}

.role-switch-btn:focus-visible {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}
</style>
