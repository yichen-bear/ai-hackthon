<script setup lang="ts">
/**
 * 行事曆頁面
 * 路由: /calendar
 * 匯集所有模組中與時間有關的事件（預購截止、活動、訂位、就醫、交通票券等）
 * 讓使用者在單一月曆視圖一次總覽
 */

import { ref, computed } from 'vue'

useHead({ htmlAttrs: { lang: 'zh-TW' } })

// ─── 類型定義 ───
interface CalendarEvent {
  id: string
  title: string
  date: string          // YYYY-MM-DD
  time?: string         // HH:mm 或描述文字
  category: 'booking' | 'entertainment' | 'food' | 'medical' | 'transport'
  categoryLabel: string
  description?: string
  location?: string
  color: string
  icon: string
}

// ─── 類別配色 ───
const categoryConfig: Record<CalendarEvent['category'], { color: string; icon: string; label: string }> = {
  booking: { color: '#10b981', icon: '🛒', label: '預購/取貨' },
  entertainment: { color: '#8b5cf6', icon: '🎫', label: '娛樂活動' },
  food: { color: '#f59e0b', icon: '🍽️', label: '餐飲訂位' },
  medical: { color: '#ef4444', icon: '💊', label: '醫療健康' },
  transport: { color: '#3b82f6', icon: '🚄', label: '交通票券' },
}

// ─── 日期狀態 ───
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0-indexed
const selectedDate = ref(formatDate(today))

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── 月份導航 ───
const monthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })
})

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToToday() {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
  selectedDate.value = formatDate(today)
}

// ─── 月曆格子計算 ───
interface DayCell {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

const calendarDays = computed<DayCell[]>(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const startWeekday = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  const prevMonthDays = new Date(currentYear.value, currentMonth.value, 0).getDate()

  const cells: DayCell[] = []
  const todayStr = formatDate(today)

  // 前月補齊
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = currentMonth.value === 0 ? 11 : currentMonth.value - 1
    const y = currentMonth.value === 0 ? currentYear.value - 1 : currentYear.value
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === todayStr })
  }

  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === todayStr })
  }

  // 後月補齊至 42 格（6 週）
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth.value === 11 ? 0 : currentMonth.value + 1
    const y = currentMonth.value === 11 ? currentYear.value + 1 : currentYear.value
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === todayStr })
  }

  return cells
})

function selectDay(cell: DayCell) {
  selectedDate.value = cell.date
}

// ─── Mock 事件資料（整合各模組時間相關資訊） ───
const allEvents = ref<CalendarEvent[]>([
  // 預購/取貨
  {
    id: 'bk-1', title: '中秋限定鳳梨酥禮盒 — 預購截止',
    date: '2026-09-15', category: 'booking',
    categoryLabel: '預購/取貨', description: '日出鳳梨酥禮盒 12 入，預購價 $580',
    color: categoryConfig.booking.color, icon: categoryConfig.booking.icon,
  },
  {
    id: 'bk-2', title: '可口可樂 24 罐裝 — 取貨截止',
    date: '2026-07-30', category: 'booking',
    categoryLabel: '預購/取貨', description: '7-11 信義門市取貨，取貨碼 PK-20260728-001',
    location: '7-11 信義門市', color: categoryConfig.booking.color, icon: categoryConfig.booking.icon,
  },
  {
    id: 'bk-3', title: '白蘭洗衣精團購截止',
    date: '2026-08-03', category: 'booking',
    categoryLabel: '預購/取貨', description: '2.5kg × 4 瓶，團購價 $389',
    color: categoryConfig.booking.color, icon: categoryConfig.booking.icon,
  },
  {
    id: 'bk-4', title: '星巴克聯名咖啡禮盒 — 預購截止',
    date: '2026-08-01', category: 'booking',
    categoryLabel: '預購/取貨', description: '限量咖啡禮盒＋聯名馬克杯，預購價 $999',
    color: categoryConfig.booking.color, icon: categoryConfig.booking.icon,
  },
  // 娛樂活動
  {
    id: 'ent-1', title: '中信兄弟 vs 統一獅',
    date: '2026-08-02', time: '18:35', category: 'entertainment',
    categoryLabel: '娛樂活動', description: '中華職棒例行賽',
    location: '台南亞太國際棒球訓練中心', color: categoryConfig.entertainment.color, icon: categoryConfig.entertainment.icon,
  },
  {
    id: 'ent-2', title: '樂天桃猿 vs 統一獅',
    date: '2026-08-09', time: '17:05', category: 'entertainment',
    categoryLabel: '娛樂活動', description: '中華職棒例行賽',
    location: '台南亞太國際棒球訓練中心', color: categoryConfig.entertainment.color, icon: categoryConfig.entertainment.icon,
  },
  {
    id: 'ent-3', title: 'teamLab 未來遊樂園',
    date: '2026-08-01', time: '10:00~18:00', category: 'entertainment',
    categoryLabel: '娛樂活動', description: '互動光影藝術展覽',
    location: '國立臺灣科學教育館', color: categoryConfig.entertainment.color, icon: categoryConfig.entertainment.icon,
  },
  {
    id: 'ent-4', title: '告五人【帶你飛】巡迴演唱會',
    date: '2026-08-23', time: '19:30', category: 'entertainment',
    categoryLabel: '娛樂活動', description: '華語音樂演唱會',
    location: '台北小巨蛋', color: categoryConfig.entertainment.color, icon: categoryConfig.entertainment.icon,
  },
  {
    id: 'ent-5', title: '《小王子》音樂劇',
    date: '2026-09-06', time: '14:30', category: 'entertainment',
    categoryLabel: '娛樂活動', description: '音樂劇台北場',
    location: '國家兩廳院 戲劇院', color: categoryConfig.entertainment.color, icon: categoryConfig.entertainment.icon,
  },
  {
    id: 'ent-6', title: '星巴克咖啡拉花教室',
    date: '2026-08-10', time: '14:00~16:00', category: 'entertainment',
    categoryLabel: '娛樂活動', description: '門市體驗活動，含材料費',
    location: '星巴克典藏門市（信義店）', color: categoryConfig.entertainment.color, icon: categoryConfig.entertainment.icon,
  },
  // 餐飲訂位
  {
    id: 'food-1', title: '鼎泰豐信義店 — 晚餐訂位',
    date: '2026-08-01', time: '19:00', category: 'food',
    categoryLabel: '餐飲訂位', description: '2 位，預估消費 $1,200',
    location: '鼎泰豐信義店', color: categoryConfig.food.color, icon: categoryConfig.food.icon,
  },
  {
    id: 'food-2', title: '聚餐企劃 — 同事生日',
    date: '2026-08-05', time: '18:30', category: 'food',
    categoryLabel: '餐飲訂位', description: '6 人，地點待定',
    color: categoryConfig.food.color, icon: categoryConfig.food.icon,
  },

  // 醫療健康
  {
    id: 'med-1', title: '康健家醫診所 — 門診',
    date: '2026-07-31', time: '10:30', category: 'medical',
    categoryLabel: '醫療健康', description: '掛號號碼 19，預估候診 32 分鐘',
    location: '康健家醫診所（步行 5 分鐘）', color: categoryConfig.medical.color, icon: categoryConfig.medical.icon,
  },
  {
    id: 'med-2', title: '下次領藥日',
    date: '2026-08-15', category: 'medical',
    categoryLabel: '醫療健康', description: '處方簽到期，記得前往藥局領藥',
    color: categoryConfig.medical.color, icon: categoryConfig.medical.icon,
  },
  // 交通票券
  {
    id: 'tr-1', title: '高鐵 台北→桃園',
    date: '2026-07-28', time: '19:00', category: 'transport',
    categoryLabel: '交通票券', description: '車次 1309',
    location: '台北車站', color: categoryConfig.transport.color, icon: categoryConfig.transport.icon,
  },
  {
    id: 'tr-2', title: '台鐵 台北→基隆',
    date: '2026-07-31', time: '14:30', category: 'transport',
    categoryLabel: '交通票券', description: '車次 101',
    location: '台北車站', color: categoryConfig.transport.color, icon: categoryConfig.transport.icon,
  },
])

// ─── 篩選 ───
const activeFilter = ref<CalendarEvent['category'] | 'all'>('all')
const categories = computed(() => [
  { key: 'all' as const, label: '全部', color: '#6b7280', icon: '📋' },
  ...Object.entries(categoryConfig).map(([key, val]) => ({
    key: key as CalendarEvent['category'],
    label: val.label,
    color: val.color,
    icon: val.icon,
  })),
])

const filteredEvents = computed(() => {
  let events = allEvents.value
  if (activeFilter.value !== 'all') {
    events = events.filter(e => e.category === activeFilter.value)
  }
  return events
})

// ─── 某日有哪些分類有事件（用於顯示小圓點） ───
function getEventDotsForDate(dateStr: string): string[] {
  const colors = new Set<string>()
  for (const e of filteredEvents.value) {
    if (e.date === dateStr) colors.add(e.color)
  }
  return [...colors].slice(0, 3) // 最多 3 個小圓點
}

// ─── 選中日期的事件列表 ───
const selectedDayEvents = computed(() => {
  return filteredEvents.value
    .filter(e => e.date === selectedDate.value)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
})

// ─── 選中日期的友善顯示 ───
const selectedDateLabel = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })
})
</script>

<template>
  <div class="calendar-page">
    <!-- 頁面標題 -->
    <header class="calendar-header">
      <h1 class="page-title">行事曆</h1>
      <p class="page-subtitle">所有待辦、活動與行程一覽</p>
    </header>

    <!-- 類別篩選列 -->
    <div class="filter-bar">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="filter-chip"
        :class="{ active: activeFilter === cat.key }"
        :style="activeFilter === cat.key ? { backgroundColor: cat.color, borderColor: cat.color } : {}"
        @click="activeFilter = cat.key"
      >
        <span class="filter-icon">{{ cat.icon }}</span>
        <span class="filter-label">{{ cat.label }}</span>
      </button>
    </div>

    <!-- 月份導航 -->
    <div class="month-nav">
      <button class="month-btn" aria-label="上個月" @click="prevMonth">‹</button>
      <button class="month-label" @click="goToToday">{{ monthLabel }}</button>
      <button class="month-btn" aria-label="下個月" @click="nextMonth">›</button>
    </div>

    <!-- 月曆主體 -->
    <div class="calendar-grid">
      <!-- 星期標題 -->
      <div v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="weekday-header">
        {{ w }}
      </div>

      <!-- 日期格子 -->
      <button
        v-for="cell in calendarDays"
        :key="cell.date"
        class="day-cell"
        :class="{
          'other-month': !cell.isCurrentMonth,
          'is-today': cell.isToday,
          'is-selected': cell.date === selectedDate,
        }"
        @click="selectDay(cell)"
      >
        <span class="day-number">{{ cell.day }}</span>
        <div class="dot-row">
          <span
            v-for="(color, idx) in getEventDotsForDate(cell.date)"
            :key="idx"
            class="event-dot"
            :style="{ backgroundColor: color }"
          />
        </div>
      </button>
    </div>

    <!-- 選中日期的事件列表 -->
    <section class="event-section">
      <h2 class="event-section-title">{{ selectedDateLabel }}</h2>

      <div v-if="selectedDayEvents.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p class="empty-text">這天沒有安排，享受悠閒吧！</p>
      </div>

      <TransitionGroup name="list" tag="div" class="event-list">
        <div
          v-for="event in selectedDayEvents"
          :key="event.id"
          class="event-card"
          :style="{ borderLeftColor: event.color }"
        >
          <div class="event-card-header">
            <span class="event-icon">{{ event.icon }}</span>
            <span class="event-time" v-if="event.time">{{ event.time }}</span>
            <span class="event-category-badge" :style="{ backgroundColor: event.color + '20', color: event.color }">
              {{ event.categoryLabel }}
            </span>
          </div>
          <h3 class="event-title">{{ event.title }}</h3>
          <p v-if="event.description" class="event-desc">{{ event.description }}</p>
          <p v-if="event.location" class="event-location">📍 {{ event.location }}</p>
        </div>
      </TransitionGroup>
    </section>
  </div>
</template>

<style scoped>
.calendar-page {
  padding: var(--space-4) var(--space-4) 24px;
  max-width: 430px;
  margin: 0 auto;
}

/* ─── Header ─── */
.calendar-header {
  margin-bottom: var(--space-4);
}
.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 2px;
}
.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* ─── Filter Bar ─── */
.filter-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  scrollbar-width: none;
}
.filter-bar::-webkit-scrollbar { display: none; }

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-card);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-chip.active {
  color: #fff;
  border-color: transparent;
}
.filter-chip:not(.active):hover {
  border-color: var(--color-text-disabled);
}
.filter-icon { font-size: 14px; }
.filter-label { line-height: 1; }

/* ─── Month Navigation ─── */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}
.month-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-page);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.month-btn:hover { background: var(--color-border); }
.month-label {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.month-label:hover { background: var(--color-bg-page); }

/* ─── Calendar Grid ─── */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: var(--space-5);
}
.weekday-header {
  text-align: center;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 6px 0;
}
.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 6px 2px 4px;
  min-height: 48px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  transition: background 0.12s;
}
.day-cell:hover { background: var(--color-bg-page); }
.day-cell.other-month .day-number { color: var(--color-text-disabled); }
.day-number {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.12s;
}
.day-cell.is-today .day-number {
  background: var(--color-primary);
  color: #fff;
  font-weight: 700;
}
.day-cell.is-selected .day-number {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.day-cell.is-selected.is-today .day-number {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── Event Dots ─── */
.dot-row {
  display: flex;
  gap: 3px;
  margin-top: 2px;
  min-height: 6px;
}
.event-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

/* ─── Event Section ─── */
.event-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}
.event-section-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-3);
}

/* ─── Empty State ─── */
.empty-state {
  text-align: center;
  padding: var(--space-6) 0;
}
.empty-icon { font-size: 36px; display: block; margin-bottom: 8px; }
.empty-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* ─── Event Card ─── */
.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.event-card {
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-page);
  transition: transform 0.12s, box-shadow 0.12s;
}
.event-card:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.event-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.event-icon { font-size: 16px; }
.event-time {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
}
.event-category-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-left: auto;
}
.event-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}
.event-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: 0 0 2px;
  line-height: 1.4;
}
.event-location {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: 4px 0 0;
}

/* ─── List Transition ─── */
.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.list-move {
  transition: transform 0.2s ease;
}

/* ─── Accessibility: reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .list-enter-active,
  .list-leave-active,
  .list-move {
    transition: none;
  }
  .event-card:hover {
    transform: none;
  }
}
</style>
