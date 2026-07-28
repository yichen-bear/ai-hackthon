<script setup lang="ts">
interface Announcement {
  id: string
  title: string
  date: string
  summary: string
}

defineProps<{
  announcements: Announcement[]
}>()

const emit = defineEmits<{
  'report-malfunction': []
}>()
</script>

<template>
  <section class="cs__card" aria-label="社區公告">
    <!-- 標題 -->
    <h2 class="cs__title">📢 社區公告</h2>

    <!-- 公告列表 -->
    <ul v-if="announcements.length > 0" class="cs__list">
      <li
        v-for="(item, index) in announcements.slice(0, 3)"
        :key="item.id"
        class="cs__item"
        :class="{ 'cs__item--bordered': index < Math.min(announcements.length, 3) - 1 }"
      >
        <div class="cs__item-header">
          <span class="cs__item-title">{{ item.title }}</span>
          <span class="cs__item-date">{{ item.date }}</span>
        </div>
        <p class="cs__item-summary">{{ item.summary }}</p>
      </li>
    </ul>

    <!-- 空狀態 -->
    <p v-else class="cs__empty">目前暫無社區公告</p>

    <!-- 公設故障回報按鈕 -->
    <button
      class="cs__report-btn"
      aria-label="公設故障回報"
      @click="emit('report-malfunction')"
    >
      📷 公設故障回報
    </button>
  </section>
</template>

<style scoped>
/* ── 卡片容器 ── */
.cs__card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

/* ── 標題 ── */
.cs__title {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

/* ── 公告列表 ── */
.cs__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* ── 公告項目 ── */
.cs__item {
  padding: var(--space-3, 12px) 0;
}

.cs__item:first-child {
  padding-top: 0;
}

.cs__item:last-child {
  padding-bottom: 0;
}

.cs__item--bordered {
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.cs__item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1, 4px);
}

.cs__item-title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.cs__item-date {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
}

.cs__item-summary {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  line-height: 1.5;
}

/* ── 空狀態 ── */
.cs__empty {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  padding: var(--space-4, 16px) 0;
}

/* ── 公設故障回報按鈕 ── */
.cs__report-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  background-color: var(--color-secondary, #22c55e);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.cs__report-btn:hover {
  opacity: 0.85;
}

.cs__report-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}
</style>
