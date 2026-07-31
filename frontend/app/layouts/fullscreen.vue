<template>
  <div class="fullscreen-wrapper">
    <div class="fullscreen-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.fullscreen-wrapper {
  display: flex;
  justify-content: center;
  height: 100vh;
  background-color: #e5e5e5;
}

.fullscreen-container {
  width: 100%;
  max-width: 430px;
  height: 100vh;
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style>
