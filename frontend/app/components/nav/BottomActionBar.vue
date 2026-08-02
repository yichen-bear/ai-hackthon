<script setup lang="ts">
// 未讀私訊數（全局狀態）
const msgUnread = useState<number>('global-msg-unread', () => 0)
const { apiFetch } = useApi()

onMounted(async () => {
  try {
    const data: any = await apiFetch('/api/messages/unread', { params: { userId: '00000000-0000-0000-0000-000000000001' } })
    msgUnread.value = data?.unreadCount || 0
  } catch { /* silent */ }
})

function openAiChat() {
  navigateTo('/ai-chat')
}

function goToMember() {
  navigateTo('/member')
}

function goToCalendar() {
  navigateTo('/calendar')
}
</script>

<template>
  <div class="bottom-bar-wrapper">
    <!-- 下方固定功能列 -->
    <nav class="bottom-bar" aria-label="功能列">
      <!-- 會員中心按鈕 -->
      <button
        class="bottom-bar__btn"
        type="button"
        aria-label="會員中心"
        @click="goToMember"
      >
        <span class="bottom-bar__btn-icon" aria-hidden="true">🏠</span>
        <span class="bottom-bar__btn-label">會員中心</span>
        <span v-if="msgUnread > 0" class="bottom-bar__unread"></span>
      </button>

      <!-- AI 聊天按鈕（圓形突出） -->
      <button
        class="bottom-bar__btn bottom-bar__btn--ai"
        type="button"
        aria-label="AI 聊天"
        @click="openAiChat"
      >
        <span class="bottom-bar__btn-ai-circle" aria-hidden="true">🤖</span>
        <span class="bottom-bar__btn-label bottom-bar__btn-label--ai">AI 聊天</span>
      </button>

      <!-- 行事曆按鈕 -->
      <button
        class="bottom-bar__btn"
        type="button"
        aria-label="行事曆"
        @click="goToCalendar"
      >
        <span class="bottom-bar__btn-icon" aria-hidden="true">📅</span>
        <span class="bottom-bar__btn-label">行事曆</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.bottom-bar-wrapper {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  z-index: 100;
}

.bottom-bar {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 64px;
  background-color: var(--color-bg-card, #ffffff);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  border-radius: 16px 16px 0 0;
}

/* ── 一般按鈕 ── */
.bottom-bar__btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.bottom-bar__btn:hover {
  opacity: 0.7;
}

.bottom-bar__btn-icon {
  font-size: 22px;
  line-height: 1;
}

.bottom-bar__btn-label {
  font-size: 11px;
  color: var(--color-text-secondary, #78716c);
  font-weight: 500;
  white-space: nowrap;
}

/* ── AI 聊天按鈕（圓形突出） ── */
.bottom-bar__btn--ai {
  position: relative;
  align-items: center;
  margin-top: -20px; /* 使按鈕整體上移，圓形突出 bar 上方 */
}

.bottom-bar__btn-ai-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  font-size: 24px;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  transition: transform 0.15s, box-shadow 0.15s;
}

.bottom-bar__btn--ai:hover .bottom-bar__btn-ai-circle {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
}

.bottom-bar__btn-label--ai {
  margin-top: 2px;
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.bottom-bar__unread {
  position: absolute;
  top: 6px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e11d48;
}
</style>
