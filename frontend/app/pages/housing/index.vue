<script setup lang="ts">
// 設定頁面 lang 屬性
useHead({
  htmlAttrs: {
    lang: 'zh-TW',
  },
})

// ─── Tab 狀態 ───
const activeTab = ref<'notice' | 'parcel' | 'trash' | 'repair' | 'housework'>('notice')

const tabs = [
  { key: 'notice', label: '社區' },
  { key: 'parcel', label: '包裹' },
  { key: 'trash', label: '垃圾' },
  { key: 'repair', label: '水電' },
  { key: 'housework', label: '家事服務' },
] as const

// ─── Mock 資料：社區公告 ───
const announcements = ref([
  { id: 'ann-1', title: '電梯保養通知', date: '2024-01-15', summary: 'B1-1F 電梯將於本週六 09:00-12:00 進行年度保養，届時請改搭另一部電梯。' },
  { id: 'ann-2', title: '水塔清洗公告', date: '2024-01-10', summary: '本週日凌晨 2:00-5:00 進行水塔清洗作業，届時將暫停供水，請提前儲水備用。' },
])

// ─── Mock 資料：包裹 ───
const parcels = ref([
  { id: 'pkg-1', name: '鮮食宅配', type: 'frozen' as const, urgent: true },
  { id: 'pkg-2', name: '生鮮蔬果包', type: 'refrigerated' as const, urgent: true },
  { id: 'pkg-3', name: '書籍包裹', type: 'normal' as const, urgent: false },
])

// ─── Mock 資料：垃圾 ───
const truckMinutes = ref<number>(8)

// ─── Mock 資料：水電修繕 ───
const technicianName = '王先生'
const etaMinutes = ref(15)

// ─── Mock 資料：家事服務 ───
const houseworkServices = ref([
  { id: 'hw-1', name: '鐘點清潔', icon: '🧹', price: 'NT$400/hr' },
  { id: 'hw-2', name: '冷氣清洗', icon: '❄️', price: 'NT$1,800/台' },
  { id: 'hw-3', name: '除塵蟎', icon: '🛏️', price: 'NT$2,500/次' },
])
const selectedService = ref('')
const selectedDate = ref('')
const selectedTime = ref('')

// ─── 大型家具回收 ───
const recycleItemType = ref('')
const recycleDate = ref('')

// ─── 事件處理 ───
function handleReportMalfunction() { console.log('公設故障回報觸發') }
function handleParcelMessage() { console.log('系統留言替代電話') }
function handleParcelPickup() { console.log('7-11/智取櫃代領') }
function handleParcelReturn() { console.log('一鍵退貨/代發') }
function handleTrashScan() { console.log('拍照辨識垃圾分類') }
function handleSubmitRecycling() { console.log('回收預約：', recycleItemType.value, recycleDate.value) }
function handleCallTechnician() { console.log('撥打電話給', technicianName) }
function handleMessageTechnician() { console.log('傳送訊息確認抵達') }
function handleSubmitHousework() { console.log('家事服務預約：', selectedService.value, selectedDate.value, selectedTime.value) }
</script>

<template>
  <div class="housing-module">
    <main class="housing-page" role="main">

      <!-- ═══ 頂部功能切換 Bar ═══ -->
      <nav class="tab-bar" role="tablist" aria-label="住模組功能切換">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          :aria-selected="activeTab === tab.key"
          :class="['tab-item', { 'tab-item--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- ═══ Tab 1：社區 ═══ -->
      <section v-if="activeTab === 'notice'" class="tab-content" aria-label="社區公告">
        <div v-for="ann in announcements" :key="ann.id" class="card card--notice">
          <h3 class="card__title">📋 {{ ann.title }}</h3>
          <p class="card__date">{{ ann.date }}</p>
          <p class="card__summary">{{ ann.summary }}</p>
        </div>
        <button class="btn btn--green btn--wide" @click="handleReportMalfunction">
          公設故障回報
        </button>
      </section>

      <!-- ═══ Tab 2：包裹 ═══ -->
      <section v-if="activeTab === 'parcel'" class="tab-content" aria-label="包裹管理">
        <!-- 溫層分區 -->
        <div class="parcel-zones">
          <div class="parcel-zone parcel-zone--frozen">
            <h4>🧊 冷凍</h4>
            <ul>
              <li v-for="p in parcels.filter(x => x.type === 'frozen')" :key="p.id">
                {{ p.name }} <span v-if="p.urgent" class="badge badge--urgent">急</span>
              </li>
            </ul>
          </div>
          <div class="parcel-zone parcel-zone--refrigerated">
            <h4>🥶 冷藏</h4>
            <ul>
              <li v-for="p in parcels.filter(x => x.type === 'refrigerated')" :key="p.id">
                {{ p.name }} <span v-if="p.urgent" class="badge badge--urgent">急</span>
              </li>
            </ul>
          </div>
          <div class="parcel-zone parcel-zone--normal">
            <h4>📦 常溫</h4>
            <ul>
              <li v-for="p in parcels.filter(x => x.type === 'normal')" :key="p.id">
                {{ p.name }}
              </li>
            </ul>
          </div>
        </div>
        <!-- 操作按鈕 -->
        <div class="btn-group">
          <button class="btn btn--outline" @click="handleParcelMessage">系統留言替代電話</button>
          <button class="btn btn--outline" @click="handleParcelPickup">7-11/智取櫃代領</button>
          <button class="btn btn--outline" @click="handleParcelReturn">一鍵退貨/代發</button>
        </div>
      </section>

      <!-- ═══ Tab 3：垃圾 ═══ -->
      <section v-if="activeTab === 'trash'" class="tab-content" aria-label="垃圾分類">
        <button class="btn btn--brown btn--wide" @click="handleTrashScan">
          📷 拍照辨識垃圾分類
        </button>

        <div class="truck-eta">
          <span class="truck-eta__icon">🚛</span>
          <span class="truck-eta__text">垃圾車還有 <strong>{{ truckMinutes }}</strong> 分鐘到社區</span>
        </div>

        <!-- 大型家具回收預約 -->
        <div class="card card--recycle">
          <h3 class="card__title">🪑 大型家具回收預約</h3>
          <label class="form-label">
            物品類型
            <input v-model="recycleItemType" type="text" class="form-input" placeholder="如：沙發、書櫃">
          </label>
          <label class="form-label">
            預約日期
            <input v-model="recycleDate" type="date" class="form-input">
          </label>
          <button class="btn btn--brown" @click="handleSubmitRecycling">送出回收預約</button>
        </div>
      </section>

      <!-- ═══ Tab 4：水電 ═══ -->
      <section v-if="activeTab === 'repair'" class="tab-content" aria-label="水電修繕">
        <div class="card card--repair">
          <h3 class="card__title">🔧 {{ technicianName }} <span class="card__subtitle">(鄰近合作水電行)</span></h3>
          <div class="repair-tag repair-tag--urgent">緊急案件 (高優先派發)</div>
          <div class="repair-eta">
            <span class="repair-eta__icon">🕐</span>
            <span>預估 <strong>{{ etaMinutes }}</strong> 分鐘抵達</span>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn--green" @click="handleCallTechnician">📞 撥打電話</button>
          <button class="btn btn--outline" @click="handleMessageTechnician">💬 傳送訊息確認抵達</button>
        </div>
      </section>

      <!-- ═══ Tab 5：家事服務 ═══ -->
      <section v-if="activeTab === 'housework'" class="tab-content" aria-label="家事服務">
        <!-- 熱門服務卡片 -->
        <div class="housework-grid">
          <label
            v-for="svc in houseworkServices"
            :key="svc.id"
            :class="['housework-card', { 'housework-card--selected': selectedService === svc.id }]"
          >
            <input
              v-model="selectedService"
              type="radio"
              :value="svc.id"
              class="sr-only"
              name="housework-service"
            >
            <span class="housework-card__icon">{{ svc.icon }}</span>
            <span class="housework-card__name">{{ svc.name }}</span>
            <span class="housework-card__price">{{ svc.price }}</span>
          </label>
        </div>

        <!-- 日期與時段 -->
        <div class="form-row">
          <label class="form-label">
            預約日期
            <input v-model="selectedDate" type="date" class="form-input">
          </label>
          <label class="form-label">
            時段
            <select v-model="selectedTime" class="form-input">
              <option value="" disabled>請選擇</option>
              <option value="morning">上午 (09:00-12:00)</option>
              <option value="afternoon">下午 (13:00-17:00)</option>
              <option value="evening">晚間 (18:00-21:00)</option>
            </select>
          </label>
        </div>

        <button class="btn btn--green btn--wide" @click="handleSubmitHousework">
          🟢 送出家事服務預約
        </button>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* ─── 模組 Token ─── */
.housing-module {
  --color-green: #3b7a70;
  --color-brown: #c67d33;
  --color-red: #d93838;
  --color-green-light: #e8f5f0;
  --color-brown-light: #fdf3e7;
  --radius: 12px;
}

.housing-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

/* ─── Tab Bar ─── */
.tab-bar {
  display: flex;
  overflow-x: auto;
  gap: 0;
  background: #f5f5f5;
  border-radius: var(--radius);
  padding: 4px;
  -webkit-overflow-scrolling: touch;
}

.tab-item {
  flex: 1 0 auto;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.tab-item--active {
  background: #fff;
  color: var(--color-green);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ─── Tab Content ─── */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ─── Cards ─── */
.card {
  background: #fff;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.card__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 6px;
}

.card__subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #888;
}

.card__date {
  font-size: 12px;
  color: #999;
  margin: 0 0 8px;
}

.card__summary {
  font-size: 14px;
  color: #444;
  margin: 0;
  line-height: 1.5;
}

/* ─── Buttons ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.btn:active {
  transform: scale(0.97);
}

.btn--green {
  background: var(--color-green);
  color: #fff;
}

.btn--brown {
  background: var(--color-brown);
  color: #fff;
}

.btn--outline {
  background: #fff;
  border: 1.5px solid var(--color-green);
  color: var(--color-green);
}

.btn--wide {
  width: 100%;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* ─── Parcel Zones ─── */
.parcel-zones {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parcel-zone {
  border-radius: var(--radius);
  padding: 14px;
}

.parcel-zone h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.parcel-zone ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.parcel-zone li {
  font-size: 14px;
  padding: 4px 0;
}

.parcel-zone--frozen {
  background: #e0f2fe;
}

.parcel-zone--refrigerated {
  background: #e0f7fa;
}

.parcel-zone--normal {
  background: #f5f5f5;
}

.badge--urgent {
  display: inline-block;
  background: var(--color-red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
}

/* ─── Truck ETA ─── */
.truck-eta {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-brown-light);
  border-radius: var(--radius);
  padding: 14px;
}

.truck-eta__icon {
  font-size: 24px;
}

.truck-eta__text {
  font-size: 14px;
  color: #5a3e1b;
}

/* ─── Repair ─── */
.repair-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin: 8px 0;
}

.repair-tag--urgent {
  background: #fee2e2;
  color: var(--color-red);
}

.repair-eta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-top: 8px;
}

.repair-eta__icon {
  font-size: 18px;
}

/* ─── Housework Grid ─── */
.housework-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.housework-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: var(--radius);
  background: #fff;
  border: 2px solid #e5e5e5;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  text-align: center;
}

.housework-card--selected {
  border-color: var(--color-green);
  background: var(--color-green-light);
}

.housework-card__icon {
  font-size: 28px;
}

.housework-card__name {
  font-size: 13px;
  font-weight: 600;
}

.housework-card__price {
  font-size: 12px;
  color: #888;
}

/* ─── Form ─── */
.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-label {
  flex: 1;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.form-input {
  padding: 10px 12px;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-green);
}

/* ─── Accessibility: Screen reader only ─── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
