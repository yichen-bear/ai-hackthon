<script setup lang="ts">
interface Badge {
  icon: string      // emoji，例如 '🍜'
  name: string      // 徽章名稱，例如 '拉麵大師'
  unlocked: boolean
}

interface FoodPassportProps {
  badges: Badge[]
}

defineProps<FoodPassportProps>()
</script>

<template>
  <UiDashboardCard>
    <!-- 標題 -->
    <p class="passport__title">🎖️ 美食護照</p>

    <!-- 徽章網格 -->
    <div class="passport__grid">
      <div
        v-for="badge in badges"
        :key="badge.name"
        class="passport__badge"
        :aria-label="`${badge.name} ${badge.unlocked ? '已解鎖' : '未解鎖'}`"
      >
        <span
          class="passport__badge-icon"
          :class="{ 'passport__badge-icon--locked': !badge.unlocked }"
        >
          {{ badge.icon }}
        </span>
        <span
          class="passport__badge-name"
          :class="{ 'passport__badge-name--locked': !badge.unlocked }"
        >
          {{ badge.unlocked ? badge.name : '???' }}
        </span>
      </div>
    </div>
  </UiDashboardCard>
</template>

<style scoped>
/* 標題 */
.passport__title {
  margin: 0 0 12px 0;
  margin-bottom: var(--space-3, 12px);
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  font-weight: 500;
}

/* 徽章網格：4欄等寬 */
.passport__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  gap: var(--space-3, 12px);
}

/* 單個徽章：垂直置中 */
.passport__badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* 圖示區 */
.passport__badge-icon {
  font-size: 28px;
  line-height: 1;
}

.passport__badge-icon--locked {
  filter: grayscale(100%) opacity(0.4);
}

/* 名稱文字 */
.passport__badge-name {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.passport__badge-name--locked {
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
}
</style>
