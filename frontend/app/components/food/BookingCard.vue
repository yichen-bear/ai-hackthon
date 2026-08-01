<script setup lang="ts">
/* ─── 型別定義 ─── */

export interface Restaurant {
  id: string
  name: string
  tag: string
  priceMin: number
  priceMax: number
  priceAvg: number
  rating: number
  distance: string
  image: string
  badge?: 'popular' | 'delivery' | 'available'
  badgeLabel?: string
  timeSlots: { time: string; available: boolean }[]
}

/* ─── Props ─── */
const props = defineProps<{
  eatMode: 'dine_in' | 'takeout' | 'delivery'
}>()

/* ─── Emits ─── */
const emit = defineEmits<{
  'go-reserve': [restaurant: Restaurant]
  'go-queue': [restaurant: Restaurant]
  'go-menu': [restaurant: Restaurant]
  'go-form': [restaurant: Restaurant]
}>()

/* ─── Mock 餐廳資料 ─── */
const restaurants: Restaurant[] = [
  {
    id: 'dintaifung',
    name: '鼎泰豐 101店',
    tag: '台式小籠包',
    priceMin: 500,
    priceMax: 800,
    priceAvg: 600,
    rating: 4.9,
    distance: '0.3 km',
    image: '🥟',
    badge: 'popular',
    badgeLabel: '🔥 熱門推薦',
    timeSlots: [
      { time: '18:00', available: true },
      { time: '18:30', available: true },
      { time: '19:00', available: true },
      { time: '19:30', available: false },
      { time: '20:00', available: true },
    ],
  },
  {
    id: 'ichiran',
    name: '一蘭拉麵 台北店',
    tag: '日式拉麵',
    priceMin: 350,
    priceMax: 500,
    priceAvg: 420,
    rating: 4.7,
    distance: '0.8 km',
    image: '🍜',
    badge: 'available',
    badgeLabel: '🟢 實時有位',
    timeSlots: [
      { time: '18:00', available: true },
      { time: '18:30', available: false },
      { time: '19:00', available: true },
      { time: '19:30', available: true },
      { time: '20:00', available: true },
    ],
  },
  {
    id: 'dingwang',
    name: '鼎王麻辣鍋',
    tag: '麻辣火鍋',
    priceMin: 800,
    priceMax: 1200,
    priceAvg: 950,
    rating: 4.8,
    distance: '1.2 km',
    image: '🍲',
    badge: 'delivery',
    badgeLabel: '🛵 支援外送',
    timeSlots: [
      { time: '17:30', available: true },
      { time: '18:00', available: true },
      { time: '18:30', available: false },
      { time: '19:00', available: false },
      { time: '20:00', available: true },
    ],
  },
]

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

    <!-- 餐廳推薦卡片列表 -->
    <div class="bc__list">
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

            <!-- 內用模式：三個按鈕 -->
            <div v-if="props.eatMode === 'dine_in'" class="bc__footer-btns">
              <button
                class="bc__action-btn bc__action-btn--sm"
                @click="emit('go-queue', r)"
              >現場候位</button>
              <button
                class="bc__action-btn bc__action-btn--sm bc__action-btn--outline"
                @click="emit('go-reserve', r)"
              >訂位</button>
              <button
                class="bc__action-btn bc__action-btn--sm bc__action-btn--green"
                @click="emit('go-form', r)"
              >填寫需求</button>
            </div>

            <!-- 外帶模式 -->
            <div v-else-if="props.eatMode === 'takeout'" class="bc__footer-btns">
              <button
                class="bc__action-btn bc__action-btn--sm"
                @click="emit('go-menu', r)"
              >點餐</button>
              <button
                class="bc__action-btn bc__action-btn--sm bc__action-btn--green"
                @click="emit('go-form', r)"
              >填寫需求</button>
            </div>

            <!-- 外送模式 -->
            <div v-else class="bc__footer-btns">
              <button
                class="bc__action-btn bc__action-btn--sm"
                @click="emit('go-menu', r)"
              >點餐</button>
              <button
                class="bc__action-btn bc__action-btn--sm bc__action-btn--green"
                @click="emit('go-form', r)"
              >填寫需求</button>
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
  margin-top: 2px;
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

/* 右下角按鈕容器（內用雙按鈕） */
.bc__footer-btns {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
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

.bc__action-btn--green {
  background: #00a86b;
  border-color: #00a86b;
  color: #ffffff;
}

.bc__action-btn--green:hover {
  opacity: 0.88;
}
</style>
