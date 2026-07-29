<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <TopNavigationBar />
    <slot />
    <BottomActionBar />
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  padding-top: 56px;
  padding-bottom: 80px;
}
</style>
