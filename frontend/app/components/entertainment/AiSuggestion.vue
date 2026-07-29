<script setup lang="ts">
/**
 * AI 週末/休閒提案
 * 情境式智慧推薦 + 內嵌購票 CTA
 */
import type { EntertainmentRecommendation } from '~/types/entertainment'

const props = defineProps<{
  recommendation: EntertainmentRecommendation | null
}>()

const emit = defineEmits<{
  'go-purchase': [payload: { eventId: string; eventType: string }]
  'dismiss': []
  'refresh': []
}>()
</script>

<template>
  <section class="ai-suggestion" aria-labelledby="ai-suggestion-title" aria-live="polite">
    <div class="card-header">
      <div class="header-left">
        <span class="ai-icon" aria-hidden="true">🤖</span>
        <h2 id="ai-suggestion-title" class="card-title">AI 為你推薦</h2>
      </div>
      <div class="header-right">
        <span class="card-badge">✨ 個人化</span>
        <button
          v-if="recommendation"
          class="dismiss-btn"
          aria-label="關閉推薦"
          @click="emit('dismiss')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 有推薦時 -->
    <template v-if="recommendation">
      <p class="ai-message">{{ recommendation.message }}</p>

      <div class="recommend-list">
        <article
          v-for="event in recommendation.events"
          :key="event.id"
          class="recommend-card"
        >
          <div class="recommend-cover" :style="{ background: event.coverImage }"></div>
          <div class="recommend-info">
            <h3 class="recommend-title">{{ event.title }}</h3>
            <p class="recommend-meta">{{ event.date }} · {{ event.venue }}</p>
            <p class="recommend-price">{{ event.price }}</p>
          </div>
          <button
            class="btn-purchase"
            aria-label="購票"
            @click="emit('go-purchase', { eventId: event.id, eventType: event.type })"
          >
            🎫 購票
          </button>
        </article>
      </div>

      <button class="btn-refresh" @click="emit('refresh')">
        換一批推薦
      </button>
    </template>

    <!-- 無推薦時：預設引導狀態 -->
    <template v-else>
      <div class="empty-state">
        <p class="empty-message">告訴 AI 助手你的休閒需求，獲得個人化推薦 💡</p>
        <p class="empty-hint">試試說：「這週末想看展覽」</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ai-suggestion {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
  border: 1px solid var(--color-primary-light, #fdf2f8);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3, 12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.ai-icon { font-size: 20px; }

.card-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.card-badge {
  font-size: var(--text-xs, 11px);
  color: var(--color-primary, #ec4899);
  background: var(--color-primary-light, #fdf2f8);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

.dismiss-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--color-border, #e2e8f0);
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease;
}
.dismiss-btn:hover { opacity: 0.7; }
.dismiss-btn:focus-visible { outline: 2px solid var(--color-primary); }

.ai-message {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 var(--space-3, 12px);
  line-height: 1.5;
}

/* 推薦列表 */
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.recommend-card {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: var(--space-2, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  transition: box-shadow 0.15s ease;
}
.recommend-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.recommend-cover {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md, 8px);
  flex-shrink: 0;
}

.recommend-info {
  flex: 1;
  min-width: 0;
}

.recommend-title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-meta {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-price {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-primary, #ec4899);
  margin: 0;
}

.btn-purchase {
  flex-shrink: 0;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  min-height: 36px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-primary, #ec4899);
  color: #ffffff;
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-purchase:hover { opacity: 0.85; }
.btn-purchase:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.btn-refresh {
  display: block;
  width: 100%;
  margin-top: var(--space-3, 12px);
  padding: var(--space-2, 8px);
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #64748b);
  font-size: var(--text-sm, 13px);
  cursor: pointer;
  transition: color 0.15s ease;
}
.btn-refresh:hover { color: var(--color-primary, #ec4899); }

/* 空狀態 */
.empty-state {
  text-align: center;
  padding: var(--space-4, 16px) 0;
}

.empty-message {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 8px;
}

.empty-hint {
  font-size: var(--text-sm, 13px);
  color: var(--color-primary, #ec4899);
  font-style: italic;
  margin: 0;
}
</style>
