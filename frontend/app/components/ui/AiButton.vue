<script setup lang="ts">
const emit = defineEmits<{ 'open-ai': [] }>()
</script>

<template>
  <button
    class="ai-button"
    aria-label="開啟 AI 助手"
    @click="emit('open-ai')"
  >
    🤖
  </button>
</template>

<style scoped>
.ai-button {
  position: absolute;
  bottom: 24px;
  right: 20px;
  z-index: 999;

  width: 52px;
  height: 52px;
  border-radius: 9999px;
  border-radius: var(--radius-full, 9999px);

  /* 備用靜態值（舊版瀏覽器降級） */
  background-color: #f97316;
  background-color: var(--color-primary, #f97316);

  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  line-height: 1;

  transition: opacity 0.15s ease;

  /* 消除 button 預設樣式 */
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  box-shadow: var(--shadow-float, 0 4px 16px rgba(0, 0, 0, 0.14));
}

.ai-button:hover {
  opacity: 0.85;
}

.ai-button:focus-visible {
  outline: 2px solid #f97316;
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}
</style>
