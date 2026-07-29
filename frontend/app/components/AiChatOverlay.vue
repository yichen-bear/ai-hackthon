<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Transition name="overlay-slide">
    <div v-if="modelValue" class="ai-overlay" role="dialog" aria-label="AI 助理聊天">
      <!-- Header -->
      <div class="ai-overlay__header">
        <h2 class="ai-overlay__title">AI 助理</h2>
        <button
          class="ai-overlay__close"
          type="button"
          aria-label="關閉 AI 助理"
          @click="close"
        >
          ✕
        </button>
      </div>

      <!-- 聊天訊息區域 -->
      <div class="ai-overlay__messages">
        <p class="ai-overlay__placeholder">有什麼我可以幫忙的嗎？</p>
      </div>

      <!-- 輸入區域 -->
      <div class="ai-overlay__input-area">
        <input
          class="ai-overlay__input"
          type="text"
          placeholder="輸入訊息..."
          disabled
        />
        <button
          class="ai-overlay__send"
          type="button"
          aria-label="傳送訊息"
          disabled
        >
          ➤
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.ai-overlay {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  top: 0;
  z-index: 90;
  background-color: #ffffff;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
}

/* ── Header ── */
.ai-overlay__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e7e5e4;
}

.ai-overlay__title {
  font-size: 16px;
  font-weight: 600;
  color: #1c1917;
  margin: 0;
}

.ai-overlay__close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f4;
  border-radius: 50%;
  font-size: 16px;
  color: #78716c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.ai-overlay__close:hover {
  background-color: #e7e5e4;
}

/* ── 聊天訊息區域 ── */
.ai-overlay__messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-overlay__placeholder {
  font-size: 14px;
  color: #a8a29e;
  text-align: center;
  margin: 0;
}

/* ── 輸入區域 ── */
.ai-overlay__input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e7e5e4;
}

.ai-overlay__input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d6d3d1;
  border-radius: 20px;
  font-size: 14px;
  background-color: #fafaf9;
  color: #1c1917;
  outline: none;
}

.ai-overlay__input:focus {
  border-color: #3b82f6;
}

.ai-overlay__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-overlay__send {
  width: 40px;
  height: 40px;
  border: none;
  background-color: #3b82f6;
  border-radius: 50%;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.ai-overlay__send:hover:not(:disabled) {
  background-color: #2563eb;
}

.ai-overlay__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Slide-up Transition ── */
.overlay-slide-enter-active,
.overlay-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.overlay-slide-enter-from,
.overlay-slide-leave-to {
  transform: translateX(-50%) translateY(100%);
  opacity: 0;
}

.overlay-slide-enter-to,
.overlay-slide-leave-from {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
</style>
