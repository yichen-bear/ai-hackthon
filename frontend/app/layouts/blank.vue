<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <slot />
    <NavBottomActionBar />
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  padding-bottom: 80px;
}
</style>