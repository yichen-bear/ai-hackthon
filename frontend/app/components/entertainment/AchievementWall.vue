<script setup lang="ts">
/**
 * 成就徽章牆
 * 蒐集解鎖娛樂相關成就徽章
 */
import type { EntertainmentBadge } from '~/types/entertainment'

const props = defineProps<{
  badges: EntertainmentBadge[]
}>()

const unlockedCount = computed(() => props.badges.filter(b => b.unlocked).length)

const activeBadge = ref<EntertainmentBadge | null>(null)

function showDetail(badge: EntertainmentBadge) {
  if (badge.unlocked) {
    activeBadge.value = badge
  }
}

function hideDetail() {
  activeBadge.value = null
}
</script>

<template>
  <section class="achievement-wall" aria-labelledby="achievement-title">
    <div class="card-header">
      <h2 id="achievement-title" class="card-title">娛樂成就</h2>
      <span class="card-badge" aria-label="已解鎖 {{ unlockedCount }} 個，共 {{ badges.length }} 個">{{ unlockedCount }}/{{ badges.length }}</span>
    </div>

    <div class="badge-grid">
      <button
        v-for="badge in badges"
        :key="badge.id"
        class="badge-item"
        :class="{ unlocked: badge.unlocked, locked: !badge.unlocked }"
        :aria-label="`${badge.name}${badge.unlocked ? '（已解鎖）' : '（未解鎖）'}`"
        @click="showDetail(badge)"
      >
        <span class="badge-icon">{{ badge.unlocked ? badge.icon : '🔒' }}</span>
        <span class="badge-name">{{ badge.name }}</span>
      </button>
    </div>

    <!-- Tooltip / 彈窗 -->
    <Teleport to="body">
      <div v-if="activeBadge" class="badge-tooltip-overlay" @click.self="hideDetail">
        <div class="badge-tooltip" role="dialog" aria-modal="true">
          <span class="tooltip-icon">{{ activeBadge.icon }}</span>
          <h3 class="tooltip-title">{{ activeBadge.name }}</h3>
          <p class="tooltip-desc">{{ activeBadge.description }}</p>
          <p v-if="activeBadge.unlockedAt" class="tooltip-date">
            解鎖日期：{{ activeBadge.unlockedAt }}
          </p>
          <button class="btn-close" @click="hideDetail">確認</button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.achievement-wall {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3, 12px);
}

.card-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin: 0;
}

.card-badge {
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  color: var(--color-primary, #ec4899);
  background: var(--color-primary-light, #fdf2f8);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

/* 徽章網格 */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3, 12px);
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-3, 12px) var(--space-2, 8px);
  border: none;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;
}
.badge-item:hover { background: var(--color-primary-light, #fdf2f8); }
.badge-item:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.badge-item.unlocked .badge-icon {
  background: var(--color-primary-light, #fdf2f8);
}
.badge-item.locked {
  opacity: 0.5;
  cursor: default;
}
.badge-item.locked:hover { background: transparent; }

.badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: var(--color-border, #f1f5f9);
}

.badge-name {
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  color: var(--color-text-primary, #1e293b);
  text-align: center;
  line-height: 1.3;
}

/* Tooltip Overlay */
.badge-tooltip-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.badge-tooltip {
  background: #ffffff;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 20px);
  width: 260px;
  text-align: center;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.tooltip-icon { font-size: 40px; display: block; margin-bottom: 8px; }
.tooltip-title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--color-text-primary, #1e293b);
}
.tooltip-desc {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 6px;
}
.tooltip-date {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #94a3b8);
  margin: 0 0 16px;
}

.btn-close {
  width: 100%;
  padding: var(--space-2, 8px) var(--space-4, 16px);
  min-height: 40px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--color-text-primary, #1e293b);
  font-size: var(--text-sm, 13px);
  cursor: pointer;
}
.btn-close:hover { background: var(--color-primary-light, #fdf2f8); }
</style>
