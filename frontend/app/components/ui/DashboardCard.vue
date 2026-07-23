<script setup lang="ts">
// 純 slot 包裝器，無 Props
</script>

<template>
  <div class="dashboard-card">
    <slot />
  </div>
</template>

<style scoped>
.dashboard-card {
  /* 備用靜態值（舊版瀏覽器降級） */
  background-color: #fff;
  background-color: var(--color-bg-card, #fff);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: 16px;
  padding: var(--space-4, 16px);
}
</style>
