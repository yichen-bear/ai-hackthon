<script setup lang="ts">
import { useRestaurantRecommend } from '~/composables/useRestaurantRecommend'
import type { Restaurant } from '~/composables/useRestaurantRecommend'

/* ─── Props ─── */
const props = defineProps<{
  eatMode: 'dine_in' | 'takeout' | 'delivery'
}>()

/* ─── Emits ─── */
const emit = defineEmits<{
  'go-reserve': [restaurant: Restaurant]
  'go-queue': [restaurant: Restaurant]
  'go-menu': [restaurant: Restaurant]
}>()

/* ─── 使用 composable 取得真實推薦資料 ─── */
const {
  loading,
  error,
  restaurants,
  locationError,
  fetchRecommendations,
} = useRestaurantRecommend()

// 進入頁面時自動載入推薦
onMounted(() => {
  fetchRecommendations({ mode: props.eatMode })
})

// 當用餐模式切換時重新載入
watch(() => props.eatMode, (newMode) => {
  fetchRecommendations({ mode: newMode })
})

/* ─── 輔助 ─── */
function badgeStyle(type?: string) {
  if (type === 'popular')  return { background: '#ffe4e6', color: '#e11d48' }
  if (type === 'delivery') return { background: '#e0f2fe', color: '#0369a1' }
  if (type === 'available') return { background: '#dcfce7', color: '#15803d' }
  return { background: '#f1f5f9', color: '#78716c' }
}
</script>

<template>
  <div class="bc">
    <!-- 標題列 -->
    <div class="bc__header">
      <span class="bc__title">🍽️ 想吃什麼？</span>
      <span class="bc__subtitle">為你推薦附近熱門餐廳</span>
    </div>

    <!-- 定位提示 -->
    <div v-if="locationError" class="bc__location-hint">
      📍 {{ locationError }}（已使用預設位置）
    </div>

    <!-- Loading 狀態 -->
    <div v-if="loading" class="bc__loading">
      <div class="bc__spinner" />
      <span>正在尋找附近好餐廳...</span>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="bc__error">
      <p>❌ {{ error }}</p>
      <button class="bc__retry-btn" @click="fetchRecommendations({ mode: props.eatMode })">重新搜尋</button>
    </div>

    <!-- 無結果 -->
    <div v-else-if="restaurants.length === 0" class="bc__empty">
      <p>附近暫無推薦餐廳</p>
      <button class="bc__retry-btn" @click="fetchRecommendations({ mode: props.eatMode, radius: 3000 })">擴大搜索範圍</button>
    </div>

    <!-- 餐廳推薦卡片列表 -->
    <div v-else class="bc__list">
      <div
        v-for="r in restaurants"
        :key="r.id"
        class="bc__restaurant-card"
      >
        <!-- 卡片封面 -->
        <div class="bc__card-cover">
          <span class="bc__card-emoji">{{ r.image }}</span>
        </div>

        <!-- 卡片內容 -->
        <div class="bc__card-body">
          <!-- 名稱 + 價格 同一行 -->
          <div class="bc__card-name-row">
            <span class="bc__card-name">{{ r.name }}</span>
            <span class="bc__card-price">NT$ {{ r.priceMin }}–{{ r.priceMax }}&thinsp;/&thinsp;人</span>
          </div>

          <!-- 標籤 + 評分 -->
          <div class="bc__card-meta">
            <span class="bc__card-tag">{{ r.tag }}</span>
            <span class="bc__card-rating">⭐ {{ r.rating }}</span>
            <span class="bc__card-distance">📍 {{ r.distance }}</span>
          </div>

          <!-- 狀態徽章 + 動態按鈕 -->
          <div class="bc__card-footer">
            <span
              v-if="r.badge"
              class="bc__badge"
              :style="badgeStyle(r.badge)"
            >{{ r.badgeLabel }}</span>

            <!-- 內用模式 -->
            <div v-if="props.eatMode === 'dine_in'" class="bc__footer-btns">
              <button
                class="bc__action-btn bc__action-btn--sm"
                @click="emit('go-queue', r)"
              >現場候位</button>
              <button
                class="bc__action-btn bc__action-btn--sm bc__action-btn--outline"
                @click="emit('go-reserve', r)"
              >訂位</button>
            </div>

            <!-- 外帶 / 外送模式 -->
            <div v-else class="bc__footer-btns">
              <button
                class="bc__action-btn bc__action-btn--sm"
                @click="emit('go-menu', r)"
              >點餐</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 卡片容器 ── */
.bc {
  background-color: #ffffff;
  background-color: var(--color-bg-card, #ffffff);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: 16px;
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bc__header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.bc__title {
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.bc__subtitle {
  font-size: 12px;
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

/* 餐廳卡片列表 */
.bc__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bc__restaurant-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #ffffff;
  transition: box-shadow 0.15s;
}

.bc__restaurant-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

/* 封面（emoji 方塊） */
.bc__card-cover {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fff7ed, #ffe4d6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bc__card-emoji {
  font-size: 30px;
  line-height: 1;
}

/* 卡片文字區 */
.bc__card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

/* 名稱 + 價格 同一行 */
.bc__card-name-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}

.bc__card-name {
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bc__card-price {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  white-space: nowrap;
  flex-shrink: 0;
}

/* 標籤列 */
.bc__card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bc__card-tag {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.bc__card-rating,
.bc__card-distance {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

/* 徽章 + 按鈕 footer */
.bc__card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  gap: 6px;
}

/* 通用徽章 */
.bc__badge {
  display: inline-block;
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  line-height: 1.6;
  white-space: nowrap;
}

/* 右下角按鈕容器 */
.bc__footer-btns {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
  margin-left: auto;
}

/* 動態按鈕（取代舊的 reserve-btn） */
.bc__action-btn {
  padding: 5px 14px;
  border-radius: 9999px;
  border: 1.5px solid #ff5252;
  border-color: var(--color-primary, #ff5252);
  background: #ff5252;
  background: var(--color-primary, #ff5252);
  color: #ffffff;
  font-size: 12px;
  font-size: var(--text-xs, 12px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.bc__action-btn:hover {
  opacity: 0.88;
}

.bc__action-btn--sm {
  padding: 4px 10px;
  font-size: 11px;
}

.bc__action-btn--outline {
  background: transparent;
  color: #ff5252;
  color: var(--color-primary, #ff5252);
}

.bc__action-btn--outline:hover {
  background: #fff1f2;
  background: var(--color-primary-light, #fff1f2);
  opacity: 1;
}

/* ── Loading / Error / Empty 狀態 ── */
.bc__location-hint {
  font-size: 11px;
  color: #78716c;
  background: #fff7ed;
  border-radius: 8px;
  padding: 8px 12px;
}

.bc__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 0;
  font-size: 13px;
  color: #78716c;
}

.bc__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #f1f5f9;
  border-top-color: #ff5252;
  border-radius: 50%;
  animation: bc-spin 0.7s linear infinite;
}

@keyframes bc-spin {
  to { transform: rotate(360deg); }
}

.bc__error {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: #dc2626;
}

.bc__error p {
  margin: 0 0 10px;
}

.bc__empty {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: #78716c;
}

.bc__empty p {
  margin: 0 0 10px;
}

.bc__retry-btn {
  padding: 8px 18px;
  border: 1.5px solid #ff5252;
  border-radius: 9999px;
  background: #fff;
  color: #ff5252;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.bc__retry-btn:hover {
  background: #fff1f2;
}
</style>
