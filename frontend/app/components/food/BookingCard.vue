<script setup lang="ts">
import { ref, computed } from 'vue'

/* ─── 型別定義 ─── */

interface Restaurant {
  id: string
  name: string
  tag: string            // 料理類型
  priceMin: number       // 人均最低
  priceMax: number       // 人均最高
  priceAvg: number       // 預估人均（訂位確認用）
  rating: number
  distance: string
  image: string          // emoji 作為封面
  badge?: 'popular' | 'delivery' | 'available'
  badgeLabel?: string
  timeSlots: { time: string; available: boolean }[]
}

interface BookingData {
  userName: string
  phone: string
  restaurantName: string
  time: string
  partySize: number
}

/* ─── Emits ─── */
const emit = defineEmits<{
  confirm: [data: BookingData]
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

/* ─── 狀態 ─── */
const isBookingMode = ref(false)
const selectedRestaurant = ref<Restaurant | null>(null)
const selectedTime = ref('')
const partySize = ref(2)

// 預填用戶資料（模擬 AI 帶入）
const userName = ref('陳小明')
const phone = ref('0912-345-678')

/* ─── 計算屬性 ─── */
const estimatedTotal = computed(() => {
  if (!selectedRestaurant.value) return 0
  return selectedRestaurant.value.priceAvg * partySize.value
})

const canConfirm = computed(() =>
  !!selectedRestaurant.value && !!selectedTime.value
)

/* ─── 行為 ─── */

/** 點擊餐廳卡片的「預訂」→ 進入訂位確認模式 */
function enterBooking(restaurant: Restaurant) {
  selectedRestaurant.value = restaurant
  selectedTime.value = ''
  isBookingMode.value = true
}

/** 返回推薦列表 */
function exitBooking() {
  isBookingMode.value = false
  selectedRestaurant.value = null
  selectedTime.value = ''
}

/** 確認訂位 */
function handleConfirm() {
  if (!canConfirm.value || !selectedRestaurant.value) return
  emit('confirm', {
    userName: userName.value,
    phone: phone.value,
    restaurantName: selectedRestaurant.value.name,
    time: selectedTime.value,
    partySize: partySize.value,
  })
}

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

    <!-- ════════════════════════════════
         狀態 A：推薦列表
         ════════════════════════════════ -->
    <template v-if="!isBookingMode">
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

            <!-- 狀態徽章 + 預訂按鈕 -->
            <div class="bc__card-footer">
              <span
                v-if="r.badge"
                class="bc__badge"
                :style="badgeStyle(r.badge)"
              >{{ r.badgeLabel }}</span>
              <button
                class="bc__reserve-btn"
                @click="enterBooking(r)"
              >
                預訂
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════
         狀態 B：訂位確認（AI 預填）
         ════════════════════════════════ -->
    <template v-else-if="selectedRestaurant">
      <!-- 頂部：返回 + 餐廳名稱 -->
      <div class="bc__booking-header">
        <button class="bc__back-btn" aria-label="返回推薦列表" @click="exitBooking">
          ← 返回
        </button>
        <div class="bc__booking-title-row">
          <span class="bc__booking-emoji">{{ selectedRestaurant.image }}</span>
          <span class="bc__booking-name">{{ selectedRestaurant.name }}</span>
        </div>
      </div>

      <!-- AI 預填提示 -->
      <div class="bc__ai-hint">
        ✨ AI 已為你預填訂位資料
      </div>

      <!-- 用戶資訊 -->
      <div class="bc__info-grid">
        <div class="bc__info-item">
          <span class="bc__info-label">👤 姓名</span>
          <span class="bc__info-value">{{ userName }}</span>
        </div>
        <div class="bc__info-item">
          <span class="bc__info-label">📞 電話</span>
          <span class="bc__info-value">{{ phone }}</span>
        </div>
      </div>

      <!-- 用餐人數 + 即時費用估算（同一行） -->
      <div class="bc__party-row">
        <div class="bc__party-controls">
          <span class="bc__info-label">🍴 用餐人數</span>
          <div class="bc__stepper">
            <button
              class="bc__stepper-btn"
              :disabled="partySize <= 1"
              @click="partySize = Math.max(1, partySize - 1)"
            >−</button>
            <span class="bc__stepper-val">{{ partySize }} 人</span>
            <button
              class="bc__stepper-btn"
              :disabled="partySize >= 10"
              @click="partySize = Math.min(10, partySize + 1)"
            >＋</button>
          </div>
        </div>
        <div class="bc__price-estimate">
          <span class="bc__price-unit">人均 ${{ selectedRestaurant.priceAvg }}</span>
          <span class="bc__price-total">總計約 ${{ estimatedTotal.toLocaleString() }}</span>
        </div>
      </div>

      <!-- 時段選擇 -->
      <div class="bc__section">
        <span class="bc__info-label">🕐 選擇時段</span>
        <div class="bc__slots">
          <button
            v-for="slot in selectedRestaurant.timeSlots"
            :key="slot.time"
            class="bc__slot-btn"
            :class="{
              'bc__slot-btn--selected': slot.time === selectedTime,
              'bc__slot-btn--full': !slot.available,
            }"
            :disabled="!slot.available"
            :aria-pressed="slot.time === selectedTime ? 'true' : 'false'"
            @click="selectedTime = slot.time"
          >
            {{ slot.time }}
          </button>
        </div>
      </div>

      <!-- 外送標籤 -->
      <div class="bc__badges-row">
        <span
          v-if="selectedRestaurant.badge"
          class="bc__badge"
          :style="badgeStyle(selectedRestaurant.badge)"
        >{{ selectedRestaurant.badgeLabel }}</span>
      </div>

      <!-- 確認訂位按鈕 -->
      <button
        class="bc__confirm-btn"
        :disabled="!canConfirm"
        @click="handleConfirm"
      >
        確認訂位
      </button>

      <p v-if="!selectedTime" class="bc__hint-text">請先選擇用餐時段</p>
    </template>

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

/* ══════════════════════
   狀態 A：推薦列表
══════════════════════ */

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

/* 徽章 + 預訂按鈕 */
.bc__card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

/* 通用徽章（inline style 控制顏色） */
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

/* 預訂按鈕（小） */
.bc__reserve-btn {
  padding: 5px 16px;
  border-radius: 9999px;
  border: 1.5px solid #ff5252;
  border-color: var(--color-primary, #ff5252);
  color: #ff5252;
  color: var(--color-primary, #ff5252);
  background: transparent;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.bc__reserve-btn:hover {
  background: #ff5252;
  background: var(--color-primary, #ff5252);
  color: #ffffff;
}

/* ══════════════════════
   狀態 B：訂位確認
══════════════════════ */

/* 頂部：返回 + 餐廳 */
.bc__booking-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bc__back-btn {
  align-self: flex-start;
  background: none;
  border: none;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
}

.bc__back-btn:hover {
  color: #ff5252;
  color: var(--color-primary, #ff5252);
}

.bc__booking-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bc__booking-emoji {
  font-size: 22px;
  line-height: 1;
}

.bc__booking-name {
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

/* AI 提示條 */
.bc__ai-hint {
  font-size: 12px;
  color: #00a86b;
  color: var(--color-secondary, #00a86b);
  background: #d1fae5;
  background: var(--color-secondary-light, #d1fae5);
  border-radius: 8px;
  padding: 6px 12px;
  font-weight: 500;
}

/* 用戶資訊網格 */
.bc__info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.bc__info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bc__info-label {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.bc__info-value {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

/* 人數 + 費用估算 同一行 */
.bc__party-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #fafaf9;
  background: var(--color-bg-page, #fafaf9);
  border-radius: 10px;
}

.bc__party-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 加減按鈕 */
.bc__stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bc__stepper-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #ffffff;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.bc__stepper-btn:hover:not(:disabled) {
  border-color: #ff5252;
  border-color: var(--color-primary, #ff5252);
  color: #ff5252;
  color: var(--color-primary, #ff5252);
}

.bc__stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.bc__stepper-val {
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  min-width: 36px;
  text-align: center;
}

/* 費用估算 */
.bc__price-estimate {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.bc__price-unit {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.bc__price-total {
  font-size: 14px;
  font-weight: 700;
  color: #ff5252;
  color: var(--color-primary, #ff5252);
}

/* 時段選擇 */
.bc__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bc__slots {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.bc__slots::-webkit-scrollbar { display: none; }

.bc__slot-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1.5px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #ffffff;
  background: var(--color-bg-card, #ffffff);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.bc__slot-btn--selected {
  background: #00a86b;
  background: var(--color-secondary, #00a86b);
  border-color: #00a86b;
  border-color: var(--color-secondary, #00a86b);
  color: #ffffff;
}

.bc__slot-btn--full {
  background: #f1f5f9;
  background: var(--color-progress-bg, #f1f5f9);
  border-color: #f1f5f9;
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
  cursor: not-allowed;
}

/* 徽章列 */
.bc__badges-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 確認訂位按鈕 */
.bc__confirm-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background-color: #ff5252;
  background-color: var(--color-primary, #ff5252);
  color: #ffffff;
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.04em;
}

.bc__confirm-btn:hover:not(:disabled) { opacity: 0.88; }
.bc__confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 提示文字 */
.bc__hint-text {
  margin: -6px 0 0;
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  text-align: center;
}
</style>
