<script setup lang="ts">
definePageMeta({ layout: 'admin' })
</script>

<template>
  <div class="admin-page">
    <h1 class="admin-page__title">食 — 廠商管理</h1>
    <div class="admin-page__content">
      <p class="admin-page__placeholder">管理功能開發中...</p>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding: var(--space-4, 16px);
}

.admin-page__title {
  font-size: var(--text-xl, 20px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin-bottom: var(--space-4, 16px);
}

.admin-page__content {
  background: var(--color-bg-card, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-6, 24px);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-page__placeholder {
  color: var(--color-text-secondary, #78716c);
  font-size: var(--text-base, 15px);
}
</style>
