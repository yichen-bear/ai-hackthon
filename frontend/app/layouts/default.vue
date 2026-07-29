<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <NavTopNavigationBar />
    <slot />
    <NavBottomActionBar />
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  padding-top: 69px; 
  padding-bottom: 80px;
}
</style>