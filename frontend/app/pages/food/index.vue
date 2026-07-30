<script setup lang="ts">
import { ref, computed } from 'vue'
import FoodBookingCard from '~/components/food/BookingCard.vue'

/* ─── Tab 定義 ─── */
type TabKey = 'eat' | 'group' | 'calorie' | 'passport'

const activeTab = ref<TabKey>('eat')

const tabs: { key: TabKey; label: string }[] = [
  { key: 'eat', label: '想吃什麼' },
  { key: 'group', label: '聚餐企劃' },
  { key: 'calorie', label: '熱量儀表板' },
  { key: 'passport', label: '美食護照' },
]

/* ─── Tab 1: 想吃什麼 ─── */
type DineMode = 'dine-in' | 'takeout' | 'delivery'
const dineMode = ref<DineMode>('dine-in')

interface BookingData {
  userName: string
  phone: string
  restaurantName: string
  time: string
  partySize: number
}

function handleConfirm(data: BookingData) {
  console.log('訂位確認：', data)
}

/* ─── Tab 2: 聚餐企劃 ─── */
const friendLocations = ref(['信義區', '板橋區'])
const newLocation = ref('')
const groupSize = ref(4)
const needPrivateRoom = ref(false)
const specialNote = ref('')

const suggestedStation = computed(() => {
  if (friendLocations.value.includes('信義區') && friendLocations.value.includes('板橋區')) {
    return '板南線 — 府中站 / 新埔站'
  }
  if (friendLocations.value.length > 0) return '台北車站周邊'
  return ''
})

const groupRestaurants = [
  { name: '饗食天堂 板橋店', type: '吃到飽', distance: '步行 3 分鐘', emoji: '🍱' },
  { name: '瓦城泰統 府中店', type: '泰式料理', distance: '步行 5 分鐘', emoji: '🍛' },
  { name: '海底撈 新埔店', type: '麻辣火鍋', distance: '步行 7 分鐘', emoji: '🍲' },
]

function addLocation() {
  const loc = newLocation.value.trim()
  if (loc && !friendLocations.value.includes(loc)) {
    friendLocations.value.push(loc)
  }
  newLocation.value = ''
}

function removeLocation(index: number) {
  friendLocations.value.splice(index, 1)
}

/* ─── Tab 3: 熱量儀表板 ─── */
const calorieIntake = 1450
const calorieGoal = 2000
const caloriePercent = computed(() => Math.min(100, (calorieIntake / calorieGoal) * 100))

const nutrients = [
  { name: '蛋白質', value: 65, unit: 'g', color: '#3b82f6', percent: 25 },
  { name: '碳水', value: 180, unit: 'g', color: '#f97316', percent: 40 },
  { name: '膳食纖維', value: 18, unit: 'g', color: '#22c55e', percent: 15 },
  { name: '脂肪', value: 45, unit: 'g', color: '#ef4444', percent: 20 },
]

/* ─── Tab 4: 美食護照 ─── */
type RegionLevel = 'area' | 'city' | 'district'
const regionLevel = ref<RegionLevel>('area')

const areas = [
  { name: '北部', count: 12 },
  { name: '中部', count: 3 },
  { name: '南部', count: 1 },
]

const cities = [
  { name: '台北市', count: 8 },
  { name: '新北市', count: 3 },
  { name: '桃園市', count: 1 },
]

const districts = [
  { name: '信義區', count: 4 },
  { name: '松山區', count: 2 },
  { name: '大安區', count: 2 },
]

const passportCheckins = [
  { restaurant: '鼎泰豐 101店', district: '信義區', date: '2025/07/20', emoji: '🥟' },
  { restaurant: '一蘭拉麵 台北店', district: '信義區', date: '2025/07/18', emoji: '🍜' },
  { restaurant: 'PAUL 仁愛店', district: '大安區', date: '2025/07/15', emoji: '🥐' },
  { restaurant: '添好運 松山店', district: '松山區', date: '2025/07/12', emoji: '🥟' },
]

const passportBadges = [
  { icon: '🏆', name: '信義區美食通', unlocked: true },
  { icon: '🍜', name: '拉麵大師', unlocked: true },
  { icon: '🥐', name: '烘焙鑑賞家', unlocked: true },
  { icon: '🌍', name: '全台走透透', unlocked: false },
  { icon: '⭐', name: '百店達人', unlocked: false },
]
</script>

<template>
  <div class="food-module">
    <main class="food-page" role="main">

      <!-- ═══ 功能切換 Bar ═══ -->
      <nav class="feature-bar" aria-label="功能切換">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="feature-bar__tab"
          :class="{ 'feature-bar__tab--active': activeTab === tab.key }"
          :aria-pressed="activeTab === tab.key ? 'true' : 'false'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- ═══ Tab 1: 想吃什麼 ═══ -->
      <section v-if="activeTab === 'eat'" class="tab-content">
        <!-- 內用 / 外帶 / 外送 切換鈕 -->
        <div class="dine-mode-bar">
          <button
            class="dine-mode-btn"
            :class="{ 'dine-mode-btn--active': dineMode === 'dine-in' }"
            @click="dineMode = 'dine-in'"
          >內用</button>
          <button
            class="dine-mode-btn"
            :class="{ 'dine-mode-btn--active': dineMode === 'takeout' }"
            @click="dineMode = 'takeout'"
          >外帶</button>
          <button
            class="dine-mode-btn"
            :class="{ 'dine-mode-btn--active': dineMode === 'delivery' }"
            @click="dineMode = 'delivery'"
          >外送</button>
        </div>

        <!-- 保留現有餐廳卡片 -->
        <FoodBookingCard @confirm="handleConfirm" />
      </section>

      <!-- ═══ Tab 2: 聚餐企劃 ═══ -->
      <section v-else-if="activeTab === 'group'" class="tab-content">

        <!-- 多人中點距離計算器 -->
        <div class="group-card">
          <h3 class="group-card__title">📍 多人中點距離計算器</h3>
          <p class="group-card__desc">輸入參與好友位置，自動計算中點並推薦捷運站周邊聚餐餐廳</p>

          <!-- 已加入地點 -->
          <div class="group-card__locations">
            <span
              v-for="(loc, idx) in friendLocations"
              :key="idx"
              class="group-card__loc-tag"
            >
              {{ loc }}
              <button class="group-card__loc-remove" @click="removeLocation(idx)">×</button>
            </span>
          </div>

          <!-- 輸入新地點 -->
          <div class="group-card__input-row">
            <input
              v-model="newLocation"
              class="group-card__input"
              placeholder="輸入區域（如：中山區）"
              @keyup.enter="addLocation"
            />
            <button class="group-card__add-btn" @click="addLocation">加入</button>
          </div>

          <!-- 推薦結果 -->
          <div v-if="suggestedStation" class="group-card__result">
            <p class="group-card__station">🚇 推薦中點：<strong>{{ suggestedStation }}</strong></p>
            <div class="group-card__restaurant-list">
              <div v-for="r in groupRestaurants" :key="r.name" class="group-card__restaurant">
                <span class="group-card__restaurant-emoji">{{ r.emoji }}</span>
                <div class="group-card__restaurant-info">
                  <span class="group-card__restaurant-name">{{ r.name }}</span>
                  <span class="group-card__restaurant-meta">{{ r.type }} · {{ r.distance }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 多人預約設定 -->
        <div class="group-card">
          <h3 class="group-card__title">🎉 多人預約設定</h3>

          <div class="group-booking__row">
            <label class="group-booking__label">👥 用餐人數</label>
            <div class="group-booking__stepper">
              <button class="stepper-btn" :disabled="groupSize <= 2" @click="groupSize--">−</button>
              <span class="stepper-val">{{ groupSize }} 人</span>
              <button class="stepper-btn" :disabled="groupSize >= 20" @click="groupSize++">＋</button>
            </div>
          </div>

          <div class="group-booking__row">
            <label class="group-booking__label">🚪 包廂需求</label>
            <button
              class="toggle-btn"
              :class="{ 'toggle-btn--on': needPrivateRoom }"
              @click="needPrivateRoom = !needPrivateRoom"
            >
              {{ needPrivateRoom ? '需要包廂' : '不需要' }}
            </button>
          </div>

          <div class="group-booking__note-section">
            <label class="group-booking__label">🤖 AI 特殊備註</label>
            <textarea
              v-model="specialNote"
              class="group-booking__textarea"
              placeholder="例如：慶生桌 / 需要嬰兒椅 / 過敏食材"
              rows="3"
            />
          </div>
        </div>
      </section>

      <!-- ═══ Tab 3: 熱量儀表板 ═══ -->
      <section v-else-if="activeTab === 'calorie'" class="tab-content">

        <!-- 區塊 1：總熱量進度條 -->
        <div class="calorie-card">
          <h3 class="calorie-card__title">🔥 今日熱量攝取</h3>
          <p class="calorie-card__summary">
            今日已攝取 <strong>{{ calorieIntake.toLocaleString() }}</strong> / {{ calorieGoal.toLocaleString() }} kcal
          </p>
          <div class="calorie-bar">
            <div class="calorie-bar__fill" :style="{ width: caloriePercent + '%' }" />
          </div>
          <p class="calorie-bar__percent">{{ Math.round(caloriePercent) }}%</p>
        </div>

        <!-- 區塊 2：環形營養素比例圖 (SVG Donut) -->
        <div class="calorie-card">
          <h3 class="calorie-card__title">🥗 營養素比例</h3>
          <div class="donut-container">
            <svg viewBox="0 0 120 120" class="donut-svg" aria-label="營養素比例環形圖">
              <!-- 背景環 -->
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="16" />
              <!-- 蛋白質 (25%) -->
              <circle cx="60" cy="60" r="50" fill="none"
                stroke="#3b82f6" stroke-width="16"
                stroke-dasharray="78.5 235.6"
                stroke-dashoffset="0"
                transform="rotate(-90 60 60)" />
              <!-- 碳水 (40%) -->
              <circle cx="60" cy="60" r="50" fill="none"
                stroke="#f97316" stroke-width="16"
                stroke-dasharray="125.7 188.5"
                stroke-dashoffset="-78.5"
                transform="rotate(-90 60 60)" />
              <!-- 膳食纖維 (15%) -->
              <circle cx="60" cy="60" r="50" fill="none"
                stroke="#22c55e" stroke-width="16"
                stroke-dasharray="47.1 267"
                stroke-dashoffset="-204.2"
                transform="rotate(-90 60 60)" />
              <!-- 脂肪 (20%) -->
              <circle cx="60" cy="60" r="50" fill="none"
                stroke="#ef4444" stroke-width="16"
                stroke-dasharray="62.8 251.3"
                stroke-dashoffset="-251.3"
                transform="rotate(-90 60 60)" />
            </svg>

            <!-- 圖例 -->
            <div class="donut-legend">
              <div v-for="n in nutrients" :key="n.name" class="donut-legend__item">
                <span class="donut-legend__dot" :style="{ background: n.color }" />
                <span class="donut-legend__name">{{ n.name }}</span>
                <span class="donut-legend__val">{{ n.value }}{{ n.unit }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 區塊 3：AI 智慧分析建議 -->
        <div class="ai-advice-card">
          <p class="ai-advice-card__text">
            🤖 <strong>AI 建議：</strong>今日膳食纖維尚有缺口，下一餐建議補充高纖蔬菜！
          </p>
        </div>
      </section>

      <!-- ═══ Tab 4: 美食護照 ═══ -->
      <section v-else-if="activeTab === 'passport'" class="tab-content">

        <!-- 三層地圖足跡切換 -->
        <div class="passport-card">
          <h3 class="passport-card__title">📜 地圖足跡</h3>

          <!-- 層級切換 -->
          <div class="passport-level-bar">
            <button
              class="passport-level-btn"
              :class="{ 'passport-level-btn--active': regionLevel === 'area' }"
              @click="regionLevel = 'area'"
            >大區</button>
            <button
              class="passport-level-btn"
              :class="{ 'passport-level-btn--active': regionLevel === 'city' }"
              @click="regionLevel = 'city'"
            >縣市</button>
            <button
              class="passport-level-btn"
              :class="{ 'passport-level-btn--active': regionLevel === 'district' }"
              @click="regionLevel = 'district'"
            >行政區</button>
          </div>

          <!-- 區域標籤 -->
          <div class="passport-tags">
            <template v-if="regionLevel === 'area'">
              <span v-for="a in areas" :key="a.name" class="passport-tag">
                {{ a.name }} ({{ a.count }})
              </span>
            </template>
            <template v-else-if="regionLevel === 'city'">
              <span v-for="c in cities" :key="c.name" class="passport-tag">
                {{ c.name }} ({{ c.count }})
              </span>
            </template>
            <template v-else>
              <span v-for="d in districts" :key="d.name" class="passport-tag">
                {{ d.name }} ({{ d.count }})
              </span>
            </template>
          </div>
        </div>

        <!-- 打卡卡片 -->
        <div class="passport-card">
          <h3 class="passport-card__title">📌 打卡紀錄</h3>
          <div class="checkin-list">
            <div v-for="c in passportCheckins" :key="c.restaurant" class="checkin-item">
              <span class="checkin-item__emoji">{{ c.emoji }}</span>
              <div class="checkin-item__info">
                <span class="checkin-item__name">{{ c.restaurant }}</span>
                <span class="checkin-item__meta">{{ c.district }} · {{ c.date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 成就徽章 -->
        <div class="passport-card">
          <h3 class="passport-card__title">🎖️ 成就徽章</h3>
          <div class="badge-grid">
            <div
              v-for="b in passportBadges"
              :key="b.name"
              class="badge-item"
              :class="{ 'badge-item--locked': !b.unlocked }"
            >
              <span class="badge-item__icon">{{ b.icon }}</span>
              <span class="badge-item__name">{{ b.unlocked ? b.name : '???' }}</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* ─── 模組 Token ─── */
.food-module {
  --color-primary: #ff5252;
  --color-primary-light: #fff1f2;
  --color-secondary: #00a86b;
  --color-secondary-light: #d1fae5;
}

.food-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* ═══ Feature Bar (頂部功能切換) ═══ */
.feature-bar {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.feature-bar::-webkit-scrollbar { display: none; }

.feature-bar__tab {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  text-align: center;
}

.feature-bar__tab--active {
  background: #ffffff;
  color: var(--color-primary, #ff5252);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* ═══ Tab Content ═══ */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
}

/* ═══ Tab 1: 想吃什麼 — 用餐模式 ═══ */
.dine-mode-bar {
  display: flex;
  gap: 8px;
}

.dine-mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.dine-mode-btn--active {
  background: var(--color-primary, #ff5252);
  border-color: var(--color-primary, #ff5252);
  color: #fff;
}

/* ═══ Tab 2: 聚餐企劃 ═══ */
.group-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.group-card__desc {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}

.group-card__locations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.group-card__loc-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.group-card__loc-remove {
  border: none;
  background: none;
  color: #6d28d9;
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  font-family: inherit;
}

.group-card__input-row {
  display: flex;
  gap: 8px;
}

.group-card__input {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.group-card__input:focus {
  border-color: var(--color-primary, #ff5252);
}

.group-card__add-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary, #ff5252);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.group-card__result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.group-card__station {
  margin: 0;
  font-size: 13px;
  color: #1c1917;
}

.group-card__restaurant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-card__restaurant {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fafaf9;
  border-radius: 10px;
}

.group-card__restaurant-emoji {
  font-size: 24px;
}

.group-card__restaurant-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-card__restaurant-name {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

.group-card__restaurant-meta {
  font-size: 11px;
  color: #78716c;
}

/* 多人預約設定 */
.group-booking__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-booking__label {
  font-size: 13px;
  color: #1c1917;
  font-weight: 500;
}

.group-booking__stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stepper-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: border-color 0.15s;
}
.stepper-btn:hover:not(:disabled) {
  border-color: var(--color-primary, #ff5252);
  color: var(--color-primary, #ff5252);
}
.stepper-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.stepper-val {
  font-size: 15px;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
}

.toggle-btn {
  padding: 6px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn--on {
  background: var(--color-secondary, #00a86b);
  border-color: var(--color-secondary, #00a86b);
  color: #fff;
}

.group-booking__note-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-booking__textarea {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.group-booking__textarea:focus {
  border-color: var(--color-primary, #ff5252);
}

/* ═══ Tab 3: 熱量儀表板 ═══ */
.calorie-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calorie-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.calorie-card__summary {
  margin: 0;
  font-size: 13px;
  color: #78716c;
}

.calorie-bar {
  height: 14px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.calorie-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #ff5252, #ff8a65);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.calorie-bar__percent {
  margin: 0;
  font-size: 11px;
  color: #78716c;
  text-align: right;
}

/* SVG Donut */
.donut-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.donut-svg {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.donut-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.donut-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.donut-legend__name {
  font-size: 12px;
  color: #1c1917;
}

.donut-legend__val {
  font-size: 12px;
  font-weight: 600;
  color: #78716c;
}

/* AI 建議卡 */
.ai-advice-card {
  background: #fff7ed;
  border-radius: 12px;
  padding: 14px 16px;
}

.ai-advice-card__text {
  margin: 0;
  font-size: 13px;
  color: #9a3412;
  line-height: 1.6;
}

/* ═══ Tab 4: 美食護照 ═══ */
.passport-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.passport-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.passport-level-bar {
  display: flex;
  gap: 6px;
}

.passport-level-btn {
  padding: 6px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.passport-level-btn--active {
  background: #6d28d9;
  border-color: #6d28d9;
  color: #fff;
}

.passport-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.passport-tag {
  padding: 6px 14px;
  background: #f5f3ff;
  color: #6d28d9;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

/* 打卡紀錄 */
.checkin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkin-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fafaf9;
  border-radius: 10px;
}

.checkin-item__emoji {
  font-size: 22px;
}

.checkin-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkin-item__name {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

.checkin-item__meta {
  font-size: 11px;
  color: #78716c;
}

/* 成就徽章 */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.badge-item__icon {
  font-size: 28px;
}

.badge-item--locked .badge-item__icon {
  filter: grayscale(100%) opacity(0.4);
}

.badge-item__name {
  font-size: 11px;
  color: #1c1917;
  text-align: center;
}

.badge-item--locked .badge-item__name {
  color: #cbd5e1;
}
</style>
