<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

// ─── Types ───
type RepairPriority = 'urgent' | 'normal'
type RepairStatus = 'pending' | 'dispatched'
type ParcelTempZone = 'frozen' | 'refrigerated' | 'normal'
type ParcelStatus = 'pending' | 'received' | 'returned'
type CommunityStatus = 'pending' | 'in_progress' | 'completed'

interface RepairTicket {
  id: string
  address: string
  category: string
  priority: RepairPriority
  description: string
  photo: string
  status: RepairStatus
}

interface Parcel {
  id: string
  room: string
  name: string
  tempZone: ParcelTempZone
  preference: string
  status: ParcelStatus
}

interface CommunityReport {
  id: string
  title: string
  location: string
  reporter: string
  photo: string
  description: string
  status: CommunityStatus
}

// ─── Tab 狀態 ───
const activeTab = ref<number>(0)
const tabs = ['水電派單', '包裹物流', '公設維修']

// ─── Mock 資料：水電急件 ───
const repairTickets = ref<RepairTicket[]>([
  { id: 'r-1', address: 'A棟 8樓-2', category: '水管漏水', priority: 'urgent', description: '廚房水管嚴重漏水，地板已積水', photo: '📷 leak.jpg', status: 'pending' },
  { id: 'r-2', address: 'B棟 3樓-5', category: '電路問題', priority: 'urgent', description: '客廳電燈閃爍，疑似短路', photo: '📷 circuit.jpg', status: 'pending' },
  { id: 'r-3', address: 'C棟 12樓-1', category: '冷氣故障', priority: 'normal', description: '冷氣不冷，已清洗濾網仍無效', photo: '📷 ac.jpg', status: 'pending' },
  { id: 'r-4', address: 'A棟 5樓-3', category: '馬桶堵塞', priority: 'normal', description: '馬桶沖水不順暢', photo: '📷 toilet.jpg', status: 'pending' },
])

// ─── Mock 資料：包裹 ───
const parcelList = ref<Parcel[]>([
  { id: 'p-1', room: 'A棟 3樓-1', name: '鮮食宅配', tempZone: 'frozen', preference: '🚫 免電話，系統留言即可', status: 'pending' },
  { id: 'p-2', room: 'B棟 7樓-2', name: '生鮮蔬果包', tempZone: 'refrigerated', preference: '🏪 7-11 智取櫃代領', status: 'pending' },
  { id: 'p-3', room: 'C棟 5樓-4', name: '書籍包裹', tempZone: 'normal', preference: '🚫 免電話，系統留言即可', status: 'pending' },
  { id: 'p-4', room: 'A棟 10樓-3', name: '電子產品', tempZone: 'normal', preference: '', status: 'pending' },
  { id: 'p-5', room: 'B棟 2樓-1', name: '冷凍水餃', tempZone: 'frozen', preference: '🏪 7-11 智取櫃代領', status: 'pending' },
])

// ─── Mock 資料：公設維修 ───
const communityReports = ref<CommunityReport[]>([
  { id: 'c-1', title: '健身房跑步機故障', location: 'B1 健身房', reporter: 'A棟 6樓-2 住戶', photo: '📷 treadmill.jpg', description: '跑步機無法啟動，螢幕無顯示', status: 'pending' },
  { id: 'c-2', title: '地下室燈泡不亮', location: 'B2 停車場', reporter: 'C棟 4樓-1 住戶', photo: '📷 light.jpg', description: 'B2 角落區域照明全滅', status: 'pending' },
  { id: 'c-3', title: '中庭噴水池漏水', location: '1F 中庭', reporter: 'B棟 8樓-3 住戶', photo: '📷 fountain.jpg', description: '噴水池邊緣持續漏水至步道', status: 'in_progress' },
])

// ─── 入庫表單狀態 ───
const newParcelRoom = ref('')
const newParcelTempZone = ref<ParcelTempZone>('normal')
let parcelIdCounter = 6

// ─── 基礎完工數（Demo mock） ───
const baseCompleted = ref(12)

// ─── Computed Stats ───
const urgentRepairCount = computed(() =>
  repairTickets.value.filter(t => t.priority === 'urgent' && t.status === 'pending').length
)
const pendingParcelCount = computed(() =>
  parcelList.value.filter(p => p.status === 'pending').length
)
const completedCount = computed(() =>
  baseCompleted.value + communityReports.value.filter(r => r.status === 'completed').length
)

// ─── Actions ───
function dispatchRepair(ticket: RepairTicket) {
  ticket.status = 'dispatched'
}

function addParcel() {
  if (!newParcelRoom.value.trim()) return
  parcelList.value.push({
    id: `p-${parcelIdCounter++}`,
    room: newParcelRoom.value.trim(),
    name: '新包裹',
    tempZone: newParcelTempZone.value,
    preference: '',
    status: 'pending',
  })
  newParcelRoom.value = ''
  newParcelTempZone.value = 'normal'
}

function receiveParcel(parcel: Parcel) {
  parcel.status = 'received'
}

function returnParcel(parcel: Parcel) {
  parcel.status = 'returned'
}

function advanceCommunityStatus(report: CommunityReport) {
  if (report.status === 'pending') report.status = 'in_progress'
  else if (report.status === 'in_progress') report.status = 'completed'
}

function getTempZoneIcon(zone: ParcelTempZone): string {
  return { frozen: '❄️', refrigerated: '🧊', normal: '📦' }[zone]
}

function getTempZoneLabel(zone: ParcelTempZone): string {
  return { frozen: '冷凍', refrigerated: '冷藏', normal: '常溫' }[zone]
}

// ─── Demo 用：重設所有狀態 ───
function resetDemo() {
  repairTickets.value.forEach(t => { t.status = 'pending' })
  parcelList.value.forEach(p => { p.status = 'pending' })
  communityReports.value[0].status = 'pending'
  communityReports.value[1].status = 'pending'
  communityReports.value[2].status = 'in_progress'
}
</script>

<template>
  <!-- ═══ 430px 手機容器 ═══ -->
  <div class="w-full max-w-[430px] mx-auto min-h-screen bg-[#fafaf9] relative flex flex-col pb-20 shadow-xl border-x border-[#e2e8f0]">

    <!-- ═══ 固定 Header：三欄式 50px ═══ -->
    <header class="ha__header">
      <div class="ha__header-left">
        <span>📍 台北市</span>
      </div>
      <div class="ha__header-center">
        <NuxtLink
          class="px-3 py-1 bg-[#fff7ed] text-[#f97316] border border-[#f97316]/20 rounded-full text-xs font-bold inline-flex items-center gap-1 no-underline"
          to="/housing"
        >
          📱 切換至用戶端
        </NuxtLink>
      </div>
      <div class="ha__header-right">
        <span>👤 小明</span>
      </div>
    </header>

    <!-- ═══ 主內容區（Header 下方留空間） ═══ -->
    <main class="ha__content" role="main">

      <!-- ═══ 頂部數據 Badge 列 ═══ -->
      <section class="ha__stats" aria-label="統計概覽">
        <div class="ha__stat-badge ha__stat-badge--red">
          <span>🔴 急件 ({{ urgentRepairCount }})</span>
        </div>
        <div class="ha__stat-badge ha__stat-badge--blue">
          <span>📦 包裹 ({{ pendingParcelCount }})</span>
        </div>
        <div class="ha__stat-badge ha__stat-badge--green">
          <span>🛠️ 完工 ({{ completedCount }})</span>
        </div>
      </section>

      <!-- ═══ Tab 切換列 (Segmented Control) ═══ -->
      <nav class="ha__tabs" role="tablist" aria-label="廠商管理功能切換">
        <button
          v-for="(tab, idx) in tabs"
          :key="tab"
          role="tab"
          :aria-selected="activeTab === idx"
          :aria-controls="`panel-${idx}`"
          class="ha__tab"
          :class="{ 'ha__tab--active': activeTab === idx }"
          @click="activeTab = idx"
        >
          {{ ['🛠️', '📦', '🏢'][idx] }} {{ tab }}
        </button>
      </nav>

      <!-- ═══ Tab 1：水電派單 ═══ -->
      <section v-show="activeTab === 0" id="panel-0" role="tabpanel" aria-label="水電急件派單">
        <div v-for="ticket in repairTickets" :key="ticket.id" class="ha__card">
          <div class="ha__card-row">
            <span
              class="ha__badge"
              :class="ticket.priority === 'urgent' ? 'ha__badge--red' : 'ha__badge--green'"
            >
              {{ ticket.priority === 'urgent' ? '🔴 急件' : '🟢 一般' }}
            </span>
            <span class="ha__card-category">{{ ticket.category }}</span>
          </div>
          <p class="ha__card-title">📍 {{ ticket.address }}</p>
          <p class="ha__card-meta">{{ ticket.photo }}</p>
          <p class="ha__card-desc">{{ ticket.description }}</p>
          <button
            v-if="ticket.status === 'pending'"
            class="ha__action-btn"
            aria-label="指派人員處理"
            @click="dispatchRepair(ticket)"
          >
            👨‍🔧 指派人員處理
          </button>
          <div v-else class="ha__status-msg ha__status-msg--success">
            🚗 前往中（預計 12 分鐘抵達）· GPS 定位已傳送
          </div>
        </div>
      </section>

      <!-- ═══ Tab 2：包裹物流 ═══ -->
      <section v-show="activeTab === 1" id="panel-1" role="tabpanel" aria-label="包裹物流管理">
        <!-- 快速入庫 -->
        <div class="ha__card">
          <h3 class="ha__card-title">📱 快速入庫</h3>
          <div class="ha__form-row">
            <input
              v-model="newParcelRoom"
              type="text"
              class="ha__input"
              placeholder="房號（如 A棟 3樓-1）"
              aria-label="包裹房號"
            />
            <select v-model="newParcelTempZone" class="ha__select" aria-label="溫層選擇">
              <option value="normal">常溫</option>
              <option value="refrigerated">冷藏</option>
              <option value="frozen">冷凍</option>
            </select>
          </div>
          <button class="ha__action-btn" aria-label="掃碼入庫" @click="addParcel">
            📱 掃碼入庫
          </button>
        </div>

        <!-- 包裹清單 -->
        <div v-for="parcel in parcelList" :key="parcel.id" class="ha__card">
          <div class="ha__card-row">
            <span class="ha__badge ha__badge--blue">
              {{ getTempZoneIcon(parcel.tempZone) }} {{ getTempZoneLabel(parcel.tempZone) }}
            </span>
            <span class="ha__card-meta">{{ parcel.room }}</span>
          </div>
          <p class="ha__card-title">{{ parcel.name }}</p>
          <p v-if="parcel.preference" class="ha__card-desc">{{ parcel.preference }}</p>
          <div v-if="parcel.status === 'pending'" class="ha__btn-group">
            <button class="ha__action-btn" @click="receiveParcel(parcel)" aria-label="簽收">
              ✅ 簽收
            </button>
            <button class="ha__action-btn ha__action-btn--outline" @click="returnParcel(parcel)" aria-label="退貨">
              ↩️ 退貨
            </button>
          </div>
          <div v-else class="ha__status-msg" :class="parcel.status === 'received' ? 'ha__status-msg--success' : 'ha__status-msg--warn'">
            {{ parcel.status === 'received' ? '✅ 已簽收' : '↩️ 已退貨' }}
          </div>
        </div>
      </section>

      <!-- ═══ Tab 3：公設維修 ═══ -->
      <section v-show="activeTab === 2" id="panel-2" role="tabpanel" aria-label="公設與環境回報">
        <div v-for="report in communityReports" :key="report.id" class="ha__card">
          <h3 class="ha__card-title">{{ report.title }}</h3>
          <p class="ha__card-meta">📍 {{ report.location }} · 👤 {{ report.reporter }}</p>
          <p class="ha__card-meta">{{ report.photo }}</p>
          <p class="ha__card-desc">{{ report.description }}</p>
          <div class="ha__step-group" role="group" aria-label="狀態流程">
            <button
              class="ha__step-btn"
              :class="{ 'ha__step-btn--active ha__step-btn--red': report.status === 'pending' }"
              :disabled="report.status !== 'pending'"
              @click="advanceCommunityStatus(report)"
              aria-label="待處理，點擊進入維修中"
            >
              待處理
            </button>
            <span class="ha__step-arrow">→</span>
            <button
              class="ha__step-btn"
              :class="{ 'ha__step-btn--active ha__step-btn--amber': report.status === 'in_progress' }"
              :disabled="report.status !== 'in_progress'"
              @click="advanceCommunityStatus(report)"
              aria-label="維修中，點擊標記為已完成"
            >
              維修中
            </button>
            <span class="ha__step-arrow">→</span>
            <button
              class="ha__step-btn"
              :class="{ 'ha__step-btn--active ha__step-btn--green': report.status === 'completed' }"
              disabled
              aria-label="已完成"
            >
              已完成
            </button>
          </div>
        </div>
      </section>

    </main>

    <!-- ═══ Demo 控制面板（Hackathon 展示用） ═══ -->
    <div class="ha__demo-panel">
      <button class="ha__demo-btn" @click="resetDemo">
        🔄 重設
      </button>
    </div>

  </div>
</template>

<style scoped>
/* ═══ 固定 Header：三欄式 50px ═══ */
.ha__header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 var(--space-4, 16px);
  background: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.ha__header-left {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  white-space: nowrap;
}

.ha__header-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ha__header-right {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  white-space: nowrap;
}

/* ═══ 主內容區 ═══ */
.ha__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
  flex: 1;
}

/* ═══ 頂部數據 Badge 列 ═══ */
.ha__stats {
  display: flex;
  justify-content: center;
  gap: var(--space-2, 8px);
}

.ha__stat-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  white-space: nowrap;
}

.ha__stat-badge--red {
  background: var(--color-accent-red-light, #ffe4e6);
  color: var(--color-accent-red, #e11d48);
}

.ha__stat-badge--blue {
  background: var(--color-accent-blue-light, #e0f2fe);
  color: var(--color-accent-blue, #0369a1);
}

.ha__stat-badge--green {
  background: #dcfce7;
  color: #16a34a;
}

/* ═══ Tab 選擇器（Segmented Control） ═══ */
.ha__tabs {
  display: flex;
  gap: 0;
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.ha__tab {
  flex: 1;
  padding: var(--space-3, 12px) var(--space-2, 8px);
  border: none;
  background: transparent;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  font-family: inherit;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  white-space: nowrap;
}

.ha__tab:not(:last-child) {
  border-right: 1px solid var(--color-border, #e2e8f0);
}

.ha__tab:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: -2px;
}

.ha__tab--active {
  background: var(--color-primary, #f97316);
  color: #ffffff;
}

/* ═══ 卡片 ═══ */
.ha__card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--color-border, #e2e8f0);
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
}

.ha__card:last-child {
  margin-bottom: 0;
}

/* ═══ 卡片內部元素 ═══ */
.ha__card-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.ha__card-title {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ha__card-category {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ha__card-meta {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.ha__card-desc {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  line-height: 1.5;
}

/* ═══ Badge ═══ */
.ha__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  white-space: nowrap;
}

.ha__badge--red {
  background: var(--color-accent-red-light, #ffe4e6);
  color: var(--color-accent-red, #e11d48);
}

.ha__badge--green {
  background: #dcfce7;
  color: #16a34a;
}

.ha__badge--blue {
  background: var(--color-accent-blue-light, #e0f2fe);
  color: var(--color-accent-blue, #0369a1);
}

/* ═══ 滿版操作按鈕（手機大按鈕） ═══ */
.ha__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  background-color: var(--color-primary, #f97316);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.ha__action-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.ha__action-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.ha__action-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.ha__action-btn--outline {
  background: transparent;
  border: 1.5px solid var(--color-primary, #f97316);
  color: var(--color-primary, #f97316);
}

.ha__btn-group {
  display: flex;
  gap: var(--space-2, 8px);
}

.ha__btn-group .ha__action-btn {
  flex: 1;
}

/* ═══ 狀態訊息 ═══ */
.ha__status-msg {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-md, 12px);
  text-align: center;
}

.ha__status-msg--success {
  background: #dcfce7;
  color: #16a34a;
}

.ha__status-msg--warn {
  background: var(--color-primary-light, #fff7ed);
  color: var(--color-primary, #f97316);
}

/* ═══ 表單元素 ═══ */
.ha__form-row {
  display: flex;
  gap: var(--space-2, 8px);
}

.ha__input {
  flex: 1;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background: var(--color-bg-card, #ffffff);
}

.ha__input:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.ha__select {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
}

.ha__select:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

/* ═══ 三段式狀態按鈕（公設維修） ═══ */
.ha__step-group {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
}

.ha__step-btn {
  flex: 1;
  padding: var(--space-2, 8px) var(--space-1, 4px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  font-family: inherit;
  color: var(--color-text-disabled, #cbd5e1);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.ha__step-btn:disabled {
  cursor: default;
}

.ha__step-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.ha__step-btn--active {
  color: #ffffff;
  border-color: transparent;
}

.ha__step-btn--red {
  background: var(--color-accent-red, #e11d48);
}

.ha__step-btn--amber {
  background: var(--color-primary, #f97316);
}

.ha__step-btn--green {
  background: #16a34a;
}

.ha__step-arrow {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #cbd5e1);
  flex-shrink: 0;
}

/* ═══ Demo 控制面板 ═══ */
.ha__demo-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
}

.ha__demo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.15s, transform 0.1s;
  white-space: nowrap;
  background: #78716c;
  color: #ffffff;
}

.ha__demo-btn:active {
  transform: scale(0.95);
}
</style>
