<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

// ─── Types ───
type RoleTab = 'property' | 'plumber' | 'cleaning'
type PropertyTab = 'parcel' | 'repair' | 'announcement'
type ParcelSubTab = 'store' | 'pickup' | 'return'
type ParcelTempZone = 'normal' | 'refrigerated' | 'frozen'
type RepairPriority = 'critical' | 'high' | 'normal'
type RepairStatus = 'pending' | 'dispatched' | 'completed'
type PlumberStage = 'pending' | 'departed' | 'arrived' | 'completed'
type CleaningStatus = 'scheduled' | 'assigned' | 'completed'
type AnnCategory = 'maintenance' | 'cleaning' | 'meeting'

// ─── State ───
const currentRole = ref<RoleTab>('property')
const propertyTab = ref<PropertyTab>('parcel')
const parcelSubTab = ref<ParcelSubTab>('store')
const isHeaderExpanded = ref(false)

// ─── Toast ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ═══════════════════════════════════════
// 一、社區物業 / 管委會端
// ═══════════════════════════════════════

// ─── 包裹入庫 ───
const newParcelRoom = ref('')
const newParcelCourier = ref('')
const newParcelTempZone = ref<ParcelTempZone>('normal')
const newParcelFreezerNo = ref('')
let parcelIdCounter = 6

const courierOptions = ['黑貓宅急便', '新竹物流', '蝦皮店到店', '7-11 交貨便', 'MOMO 自配', '其他']

interface ParcelItem {
  id: string
  room: string
  trackingNo: string
  courier: string
  tempZone: ParcelTempZone
  freezerNo?: string
  status: 'stored' | 'picked-up'
  storedAt: string
  photo?: string
}

const parcelList = ref<ParcelItem[]>([
  { id: 'p-1', room: 'A棟-12樓', trackingNo: 'TW2026073100001', courier: '黑貓宅急便', tempZone: 'frozen', freezerNo: '冰櫃#2', status: 'stored', storedAt: '09:30' },
  { id: 'p-2', room: 'B棟-5樓', trackingNo: 'TW2026073100002', courier: '新竹物流', tempZone: 'refrigerated', freezerNo: '冰櫃#1', status: 'stored', storedAt: '10:15' },
  { id: 'p-3', room: 'C棟-8樓', trackingNo: 'TW2026073100003', courier: '蝦皮店到店', tempZone: 'normal', status: 'stored', storedAt: '11:00' },
  { id: 'p-4', room: 'A棟-3樓', trackingNo: 'TW2026073100004', courier: '7-11 交貨便', tempZone: 'normal', status: 'stored', storedAt: '11:45' },
  { id: 'p-5', room: 'B棟-9樓', trackingNo: 'TW2026073100005', courier: 'MOMO 自配', tempZone: 'refrigerated', freezerNo: '冰櫃#3', status: 'stored', storedAt: '13:20' },
])

function addParcel() {
  if (!newParcelRoom.value.trim()) { showToast('⚠️ 請輸入住戶戶號'); return }
  if (!newParcelCourier.value) { showToast('⚠️ 請選擇快遞公司'); return }
  parcelList.value.unshift({
    id: `p-${parcelIdCounter++}`,
    room: newParcelRoom.value.trim(),
    trackingNo: `TW${Date.now()}`,
    courier: newParcelCourier.value,
    tempZone: newParcelTempZone.value,
    freezerNo: ['frozen', 'refrigerated'].includes(newParcelTempZone.value) ? (newParcelFreezerNo.value || '冰櫃#1') : undefined,
    status: 'stored',
    storedAt: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
  })
  showToast('✅ 已入庫！催領通知已自動推播給住戶')
  newParcelRoom.value = ''
  newParcelCourier.value = ''
  newParcelTempZone.value = 'normal'
  newParcelFreezerNo.value = ''
}

// ─── 住戶領件核銷 ───
const pickupSearchRoom = ref('')

const storedParcels = computed(() => {
  const stored = parcelList.value.filter(p => p.status === 'stored')
  if (!pickupSearchRoom.value.trim()) return stored
  return stored.filter(p => p.room.includes(pickupSearchRoom.value.trim()))
})

function confirmPickupAll() {
  const targets = storedParcels.value
  if (targets.length === 0) { showToast('⚠️ 目前無符合條件的待領包裹'); return }
  targets.forEach(p => { p.status = 'picked-up' })
  showToast(`✅ 已完成 ${targets.length} 件簽收領取`)
  pickupSearchRoom.value = ''
}

function scanPickupSingle(parcel: ParcelItem) {
  parcel.status = 'picked-up'
  showToast(`✅ ${parcel.room} 包裹已領取`)
}

// ─── 退貨代發 ───
interface ReturnParcel {
  id: string
  room: string
  returnNo: string
  courier: string
  description: string
  photo: string
  status: 'waiting' | 'handed'
}

const returnParcels = ref<ReturnParcel[]>([
  { id: 'rp-1', room: 'A棟-6樓', returnNo: 'RT20260731001', courier: '蝦皮店到店', description: '退貨包裹 x1（服飾尺寸不合）', photo: '📷 return1.jpg', status: 'waiting' },
  { id: 'rp-2', room: 'B棟-9樓', returnNo: 'RT20260731002', courier: 'MOMO 自配', description: '退貨包裹 x2（商品瑕疵）', photo: '📷 return2.jpg', status: 'waiting' },
  { id: 'rp-3', room: 'C棟-3樓', returnNo: 'RT20260731003', courier: '黑貓宅急便', description: '退貨包裹 x1（訂錯商品）', photo: '📷 return3.jpg', status: 'waiting' },
])

function handOverReturn(rp: ReturnParcel) {
  rp.status = 'handed'
  showToast('🚚 已移交物流人員簽收，標記已寄出')
}

// ─── 公設報修處理 ───
interface FacilityRepair {
  id: string
  area: string
  description: string
  photo: string
  priority: RepairPriority
  status: RepairStatus
  reporter: string
}

const facilityRepairs = ref<FacilityRepair[]>([
  { id: 'fr-1', area: 'B1 健身房', description: '跑步機無法啟動，螢幕全黑', photo: '📷 treadmill.jpg', priority: 'high', status: 'pending', reporter: 'A棟-6樓 王先生' },
  { id: 'fr-2', area: 'B2 停車場', description: 'B2 角落區域照明全滅，影響行車安全', photo: '📷 parking.jpg', priority: 'critical', status: 'pending', reporter: 'C棟-4樓 林小姐' },
  { id: 'fr-3', area: '1F 中庭', description: '噴水池邊緣持續漏水至步道', photo: '📷 fountain.jpg', priority: 'normal', status: 'pending', reporter: 'B棟-8樓 張先生' },
])

function forwardToPlumber(repair: FacilityRepair) {
  repair.status = 'dispatched'
  showToast('🔧 已標記排修中 / 轉發水電廠商')
}

function markRepairDone(repair: FacilityRepair) {
  repair.status = 'completed'
  showToast('✅ 已標記維修完成')
}

// ─── 社區公告發布 ───
interface Announcement {
  id: string
  title: string
  category: AnnCategory
  content: string
  effectiveDate: string
  publishedAt?: string
}

const annCategoryOptions: { value: AnnCategory; label: string }[] = [
  { value: 'maintenance', label: '🔧 保養通知' },
  { value: 'cleaning', label: '🧹 清潔公告' },
  { value: 'meeting', label: '📋 會議通知' },
]

const announcements = ref<Announcement[]>([
  { id: 'ann-1', title: '電梯保養通知', category: 'maintenance', content: 'A棟電梯將於 8/5 進行年度保養，暫停使用 09:00-12:00', effectiveDate: '2026-08-05', publishedAt: '2026-07-30' },
  { id: 'ann-2', title: '大廳清潔公告', category: 'cleaning', content: '8/3 進行大廳地板打蠟，請住戶改走側門', effectiveDate: '2026-08-03', publishedAt: '2026-07-29' },
])

const newAnnTitle = ref('')
const newAnnCategory = ref<AnnCategory>('maintenance')
const newAnnContent = ref('')
const newAnnDate = ref('')

function publishAnnouncement() {
  if (!newAnnTitle.value.trim() || !newAnnContent.value.trim()) {
    showToast('⚠️ 請填寫標題與內文')
    return
  }
  announcements.value.unshift({
    id: `ann-${Date.now()}`,
    title: newAnnTitle.value.trim(),
    category: newAnnCategory.value,
    content: newAnnContent.value.trim(),
    effectiveDate: newAnnDate.value || new Date().toISOString().split('T')[0],
    publishedAt: new Date().toISOString().split('T')[0],
  })
  showToast('📢 公告已發布，自動同步至住戶端橫滑卡片')
  newAnnTitle.value = ''
  newAnnContent.value = ''
  newAnnDate.value = ''
  newAnnCategory.value = 'maintenance'
}

function deleteAnnouncement(ann: Announcement) {
  announcements.value = announcements.value.filter(a => a.id !== ann.id)
  showToast('🗑️ 公告已撤銷')
}

function editAnnouncement(ann: Announcement) {
  newAnnTitle.value = ann.title
  newAnnCategory.value = ann.category
  newAnnContent.value = ann.content
  newAnnDate.value = ann.effectiveDate
  announcements.value = announcements.value.filter(a => a.id !== ann.id)
  showToast('✏️ 已載入公告內容，修改後請重新發布')
}

function getCategoryLabel(cat: AnnCategory): string {
  return { maintenance: '🔧 保養通知', cleaning: '🧹 清潔公告', meeting: '📋 會議通知' }[cat]
}

// ═══════════════════════════════════════
// 二、水電工程行端
// ═══════════════════════════════════════

interface PlumberOrder {
  id: string
  urgencyLabel: string
  urgencyLevel: 'critical' | 'high' | 'normal'
  issue: string
  distance: string
  resident: string
  address: string
  stage: PlumberStage
  eta?: string
}

const plumberOrders = ref<PlumberOrder[]>([
  { id: 'po-1', urgencyLabel: '🚨 極緊急', urgencyLevel: 'critical', issue: '浴室水管爆裂', distance: '1.2km', resident: '王小明', address: 'A棟-8樓', stage: 'pending' },
  { id: 'po-2', urgencyLabel: '⚠️ 緊急', urgencyLevel: 'high', issue: '廚房水龍頭漏水', distance: '2.5km', resident: '李美華', address: 'B棟-3樓', stage: 'pending' },
  { id: 'po-3', urgencyLabel: '📋 一般', urgencyLevel: 'normal', issue: '熱水器點火不順', distance: '3.8km', resident: '陳大明', address: 'C棟-12樓', stage: 'pending' },
])

function acceptPlumberOrder(order: PlumberOrder) {
  order.stage = 'departed'
  order.eta = '約 15 分鐘'
  showToast('⚡ 已接單，已傳送預計到達時間給住戶')
}

function advancePlumberStage(order: PlumberOrder) {
  if (order.stage === 'departed') {
    order.stage = 'arrived'
    showToast('📍 已通知住戶：師傅已抵達現場')
  } else if (order.stage === 'arrived') {
    order.stage = 'completed'
    showToast('✅ 已完工結案，收據已開立')
  }
}

// ═══════════════════════════════════════
// 三、家事清潔公司端
// ═══════════════════════════════════════

interface CleaningBooking {
  id: string
  resident: string
  address: string
  date: string
  timeSlot: string
  serviceType: string
  notes: string
  status: CleaningStatus
  assignee?: string
}

const cleaningBookings = ref<CleaningBooking[]>([
  { id: 'cb-1', resident: '張美玲', address: 'A棟-10樓', date: '2026/08/01', timeSlot: '09:00-12:00', serviceType: '全屋清潔', notes: '有寵物（貓），請注意門窗', status: 'scheduled' },
  { id: 'cb-2', resident: '陳志明', address: 'B棟-5樓', date: '2026/08/01', timeSlot: '14:00-16:00', serviceType: '冷氣清洗', notes: '共 3 台分離式', status: 'scheduled' },
  { id: 'cb-3', resident: '林小花', address: 'C棟-7樓', date: '2026/08/02', timeSlot: '10:00-13:00', serviceType: '全屋清潔', notes: '搬家前大掃除', status: 'assigned', assignee: '小陳' },
])

function assignCleaner(booking: CleaningBooking) {
  booking.status = 'assigned'
  booking.assignee = '小李'
  showToast('👷 已指派清潔人員：小李')
}

function completeCleaning(booking: CleaningBooking) {
  booking.status = 'completed'
  showToast('✅ 服務完成回報成功')
}

// ─── 六大模組導航 ───
const modules = [
  { label: '食', path: '/admin/food' },
  { label: '醫', path: '/admin/medical' },
  { label: '住', path: '/admin/housing' },
  { label: '行', path: '/admin/transport' },
  { label: '育', path: '/admin/education' },
  { label: '樂', path: '/admin/entertainment' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex justify-center">
    <div class="w-full max-w-[430px] min-h-screen bg-white shadow-xl relative pb-12">

      <!-- ═══ Top Header ═══ -->
      <header class="sticky top-0 z-40 h-[50px] bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm">
        <div class="flex items-center gap-1 text-sm font-semibold text-slate-900 truncate">
          <span>🏠 住居模組</span>
          <span class="text-slate-300">|</span>
          <span>👤 廠商後台</span>
        </div>
        <button
          class="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 text-sm font-bold rounded-lg border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all"
          @click="isHeaderExpanded = !isHeaderExpanded"
        >
          ⚙️ 選單 {{ isHeaderExpanded ? '🔼' : '🔽' }}
        </button>
      </header>

      <!-- ═══ Collapsible Menu ═══ -->
      <div
        class="overflow-hidden transition-all duration-300 ease-in-out bg-orange-50 border-b border-orange-100"
        :style="{ maxHeight: isHeaderExpanded ? '200px' : '0px', opacity: isHeaderExpanded ? 1 : 0 }"
      >
        <div class="px-4 py-3 flex flex-col gap-3">
          <div class="flex justify-between gap-1.5">
            <NuxtLink
              v-for="mod in modules"
              :key="mod.label"
              :to="mod.path"
              class="flex-1 py-2 text-center text-sm font-bold rounded-xl bg-white border border-slate-200 no-underline text-slate-800 hover:bg-orange-100 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
            >
              {{ mod.label }}
            </NuxtLink>
          </div>
          <NuxtLink
            class="w-full py-2.5 bg-white text-orange-500 font-bold rounded-xl border border-orange-200 text-center block no-underline hover:bg-orange-50 transition-colors shadow-sm"
            to="/housing"
          >
            📱 切換至用戶端 (住)
          </NuxtLink>
        </div>
      </div>

      <!-- ═══ 主內容區 ═══ -->
      <main class="flex flex-col gap-4 p-4">

        <!-- ═══ 角色 Tab 切換列 ═══ -->
        <nav class="flex bg-slate-100 rounded-2xl p-1 gap-1 shadow-sm" role="tablist" aria-label="廠商角色切換">
          <button
            role="tab"
            :aria-selected="currentRole === 'property'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="currentRole === 'property' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="currentRole = 'property'"
          >
            🏢 社區物業
          </button>
          <button
            role="tab"
            :aria-selected="currentRole === 'plumber'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="currentRole === 'plumber' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="currentRole = 'plumber'"
          >
            🔧 水電工程
          </button>
          <button
            role="tab"
            :aria-selected="currentRole === 'cleaning'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="currentRole === 'cleaning' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="currentRole = 'cleaning'"
          >
            🧹 家事清潔
          </button>
        </nav>

        <!-- ═══════════════════════════════════════ -->
        <!-- 一、社區物業 / 管委會端 -->
        <!-- ═══════════════════════════════════════ -->
        <section v-show="currentRole === 'property'" role="tabpanel" aria-label="社區物業管理">

          <!-- 物業主 Tab 切換列 -->
          <nav class="flex bg-white rounded-2xl border border-slate-200 p-1 gap-1 mb-4 shadow-sm" role="tablist" aria-label="物業功能切換">
            <button
              role="tab"
              :aria-selected="propertyTab === 'parcel'"
              class="flex-1 py-2 px-1 text-xs font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
              :class="propertyTab === 'parcel' ? 'bg-slate-800 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
              @click="propertyTab = 'parcel'"
            >
              📦 包裹管理
            </button>
            <button
              role="tab"
              :aria-selected="propertyTab === 'repair'"
              class="flex-1 py-2 px-1 text-xs font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
              :class="propertyTab === 'repair' ? 'bg-slate-800 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
              @click="propertyTab = 'repair'"
            >
              🛠️ 公設報修
            </button>
            <button
              role="tab"
              :aria-selected="propertyTab === 'announcement'"
              class="flex-1 py-2 px-1 text-xs font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
              :class="propertyTab === 'announcement' ? 'bg-slate-800 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'"
              @click="propertyTab = 'announcement'"
            >
              📢 社區公告
            </button>
          </nav>

          <!-- ═══ 主 Tab 1：包裹管理 ═══ -->
          <div v-show="propertyTab === 'parcel'" role="tabpanel" aria-label="包裹管理">

            <!-- 包裹子頁籤 Sub-tabs -->
            <div class="flex gap-2 mb-4">
              <button
                class="flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                :class="parcelSubTab === 'store' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
                @click="parcelSubTab = 'store'"
              >
                📥 快速代收入庫
              </button>
              <button
                class="flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                :class="parcelSubTab === 'pickup' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
                @click="parcelSubTab = 'pickup'"
              >
                📱 住戶領件核銷
              </button>
              <button
                class="flex-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                :class="parcelSubTab === 'return' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
                @click="parcelSubTab = 'return'"
              >
                🚚 退貨代發移交
              </button>
            </div>

            <!-- Sub-tab 1: 快速代收入庫 -->
            <div v-show="parcelSubTab === 'store'">
              <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm">
                <h3 class="text-sm font-bold text-slate-800 m-0">📥 快速代收入庫</h3>

                <!-- 住戶戶號 -->
                <input
                  v-model="newParcelRoom"
                  type="text"
                  class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                  placeholder="輸入住戶戶號（如 A棟-12樓）"
                />

                <!-- 快遞公司選擇 -->
                <select
                  v-model="newParcelCourier"
                  class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all appearance-none"
                >
                  <option value="" disabled>選擇快遞公司</option>
                  <option v-for="c in courierOptions" :key="c" :value="c">{{ c }}</option>
                </select>

                <!-- 溫層選擇 -->
                <div class="flex gap-2">
                  <button
                    class="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    :class="newParcelTempZone === 'normal' ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                    @click="newParcelTempZone = 'normal'"
                  >
                    📦 常溫
                  </button>
                  <button
                    class="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    :class="newParcelTempZone === 'refrigerated' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                    @click="newParcelTempZone = 'refrigerated'"
                  >
                    🧊 冷藏
                  </button>
                  <button
                    class="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                    :class="newParcelTempZone === 'frozen' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                    @click="newParcelTempZone = 'frozen'"
                  >
                    ❄️ 冷凍
                  </button>
                </div>

                <!-- 冰櫃編號（冷藏/冷凍時顯示） -->
                <select
                  v-if="newParcelTempZone === 'frozen' || newParcelTempZone === 'refrigerated'"
                  v-model="newParcelFreezerNo"
                  class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                >
                  <option value="" disabled>選擇冰櫃編號</option>
                  <option value="冰櫃#1">冰櫃#1</option>
                  <option value="冰櫃#2">冰櫃#2</option>
                  <option value="冰櫃#3">冰櫃#3</option>
                  <option value="冰櫃#4">冰櫃#4</option>
                </select>

                <!-- 入庫按鈕 -->
                <button
                  class="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                  @click="addParcel"
                >
                  📷 拍照/掃描單號並入庫
                </button>
                <p class="text-xs text-slate-400 text-center m-0">入庫後自動發送催領推播通知給住戶</p>
              </div>
            </div>

            <!-- Sub-tab 2: 住戶領件核銷 -->
            <div v-show="parcelSubTab === 'pickup'">
              <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4 shadow-sm">
                <h3 class="text-sm font-bold text-slate-800 m-0">📱 住戶領件核銷</h3>

                <!-- 掃描 / 搜尋 -->
                <button class="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md">
                  📷 開啟相機掃描住戶領件 QR Code
                </button>
                <div class="relative">
                  <input
                    v-model="pickupSearchRoom"
                    type="text"
                    class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all pl-8"
                    placeholder="或手動輸入住戶戶號搜尋..."
                  />
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                </div>

                <!-- 待領包裹清單 -->
                <div class="flex flex-col gap-2">
                  <div v-if="storedParcels.length === 0" class="text-center text-sm text-slate-400 py-6 bg-slate-50 rounded-xl">
                    {{ pickupSearchRoom ? '查無此住戶的待領包裹' : '目前無待領包裹' }}
                  </div>
                  <div
                    v-for="parcel in storedParcels"
                    :key="parcel.id"
                    class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-3 border border-slate-100"
                  >
                    <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-slate-800">{{ parcel.room }}</span>
                        <span
                          class="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                          :class="{
                            'bg-orange-100 text-orange-700': parcel.tempZone === 'normal',
                            'bg-blue-100 text-blue-700': parcel.tempZone === 'refrigerated',
                            'bg-indigo-100 text-indigo-700': parcel.tempZone === 'frozen',
                          }"
                        >
                          {{ { normal: '📦 常溫', refrigerated: '🧊 冷藏', frozen: '❄️ 冷凍' }[parcel.tempZone] }}
                        </span>
                      </div>
                      <span class="text-xs text-slate-500 truncate">
                        {{ parcel.courier }} · {{ parcel.freezerNo ? parcel.freezerNo + ' · ' : '' }}入庫 {{ parcel.storedAt }}
                      </span>
                    </div>
                    <button
                      class="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg active:scale-95 transition-all flex-shrink-0 ml-2"
                      @click="scanPickupSingle(parcel)"
                    >
                      領取
                    </button>
                  </div>
                </div>

                <!-- 全數領取按鈕 -->
                <button
                  v-if="storedParcels.length > 0"
                  class="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                  @click="confirmPickupAll"
                >
                  ✅ 確認全數領取並完成簽收
                </button>
              </div>
            </div>

            <!-- Sub-tab 3: 退貨代發移交清單 -->
            <div v-show="parcelSubTab === 'return'">
              <div class="flex flex-col gap-3">
                <div v-if="returnParcels.length === 0" class="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                  <span class="text-sm text-slate-400">目前無退貨代發包裹</span>
                </div>
                <div
                  v-for="rp in returnParcels"
                  :key="rp.id"
                  class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-slate-800">{{ rp.room }}</span>
                    <span
                      class="text-xs font-bold px-2 py-0.5 rounded-full"
                      :class="rp.status === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
                    >
                      {{ rp.status === 'waiting' ? '⏳ 待移交' : '✅ 已寄出' }}
                    </span>
                  </div>
                  <div class="flex flex-col gap-1 text-sm text-slate-600">
                    <span>📋 退貨單號：{{ rp.returnNo }}</span>
                    <span>🚚 快遞公司：{{ rp.courier }}</span>
                    <span>📝 {{ rp.description }}</span>
                    <span class="text-xs text-slate-400">{{ rp.photo }}</span>
                  </div>
                  <button
                    v-if="rp.status === 'waiting'"
                    class="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                    @click="handOverReturn(rp)"
                  >
                    🚚 移交物流人員簽收 (標記已寄出)
                  </button>
                  <div v-else class="text-center text-xs font-bold py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200">
                    ✅ 已移交物流，等待退貨完成
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ═══ 主 Tab 2：公設報修 ═══ -->
          <div v-show="propertyTab === 'repair'" role="tabpanel" aria-label="公設報修處理">
            <div class="flex flex-col gap-4">
              <div
                v-for="repair in facilityRepairs"
                :key="repair.id"
                class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm"
              >
                <!-- Header -->
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-slate-800">📍 {{ repair.area }}</span>
                  <span
                    class="text-xs font-bold px-2.5 py-1 rounded-full"
                    :class="{
                      'bg-red-100 text-red-600': repair.priority === 'critical',
                      'bg-orange-100 text-orange-600': repair.priority === 'high',
                      'bg-green-100 text-green-600': repair.priority === 'normal',
                    }"
                  >
                    {{ { critical: '🔴 緊急', high: '🟠 中等', normal: '🟢 一般' }[repair.priority] }}
                  </span>
                </div>

                <!-- 描述與照片 -->
                <p class="text-sm text-slate-700 m-0 leading-relaxed">{{ repair.description }}</p>
                <div class="flex items-center gap-3 text-xs text-slate-400">
                  <span>{{ repair.photo }}</span>
                  <span>👤 回報者：{{ repair.reporter }}</span>
                </div>

                <!-- 操作按鈕 -->
                <div v-if="repair.status === 'pending'" class="flex gap-2">
                  <button
                    class="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                    @click="forwardToPlumber(repair)"
                  >
                    🟡 標記排修中 / 轉發水電廠商
                  </button>
                  <button
                    class="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                    @click="markRepairDone(repair)"
                  >
                    ✅ 標記維修完成
                  </button>
                </div>
                <div v-else class="text-center text-xs font-bold py-2.5 rounded-xl" :class="repair.status === 'dispatched' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-green-50 text-green-600 border border-green-200'">
                  {{ repair.status === 'dispatched' ? '🟡 排修中 / 已轉發廠商' : '✅ 維修完成' }}
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ 主 Tab 3：社區公告 ═══ -->
          <div v-show="propertyTab === 'announcement'" role="tabpanel" aria-label="社區公告發布">

            <!-- 公告發布表單 -->
            <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
              <h3 class="text-sm font-bold text-slate-800 m-0">📢 發布新公告</h3>

              <input
                v-model="newAnnTitle"
                type="text"
                class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                placeholder="公告標題"
              />

              <!-- 公告類別 -->
              <select
                v-model="newAnnCategory"
                class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all appearance-none"
              >
                <option v-for="cat in annCategoryOptions" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>

              <!-- 生效日期 -->
              <input
                v-model="newAnnDate"
                type="date"
                class="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />

              <!-- 內文 -->
              <textarea
                v-model="newAnnContent"
                class="w-full min-h-[100px] px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                placeholder="公告內文說明..."
              />

              <!-- 發布按鈕 -->
              <button
                class="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                @click="publishAnnouncement"
              >
                📢 發布公告
              </button>
              <p class="text-xs text-slate-400 text-center m-0">發布後自動同步至住戶端頂部橫滑大卡片</p>
            </div>

            <!-- 歷史公告管理清單 -->
            <h4 class="text-sm font-bold text-slate-700 mb-2">📋 歷史公告管理</h4>
            <div class="flex flex-col gap-3">
              <div v-if="announcements.length === 0" class="bg-slate-50 rounded-2xl p-6 text-center">
                <span class="text-sm text-slate-400">尚無已發布公告</span>
              </div>
              <div
                v-for="ann in announcements"
                :key="ann.id"
                class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 shadow-sm"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-slate-800">{{ ann.title }}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {{ getCategoryLabel(ann.category) }}
                  </span>
                </div>
                <p class="text-xs text-slate-600 m-0 leading-relaxed">{{ ann.content }}</p>
                <div class="text-xs text-slate-400">
                  生效日期：{{ ann.effectiveDate }} · 發布於 {{ ann.publishedAt }}
                </div>
                <div class="flex gap-2 pt-1">
                  <button
                    class="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold border border-blue-200 active:scale-95 transition-all"
                    @click="editAnnouncement(ann)"
                  >
                    ✏️ 編輯
                  </button>
                  <button
                    class="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold border border-red-200 active:scale-95 transition-all"
                    @click="deleteAnnouncement(ann)"
                  >
                    🗑️ 撤銷公告
                  </button>
                </div>
              </div>
            </div>
          </div>

        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- 二、水電工程行端 -->
        <!-- ═══════════════════════════════════════ -->
        <section v-show="currentRole === 'plumber'" role="tabpanel" aria-label="水電工程派單">

          <h2 class="text-base font-bold text-slate-800 mb-3">🚨 即時派單與接單</h2>

          <div v-for="order in plumberOrders" :key="order.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-full"
                :class="{
                  'bg-red-100 text-red-600': order.urgencyLevel === 'critical',
                  'bg-orange-100 text-orange-600': order.urgencyLevel === 'high',
                  'bg-slate-100 text-slate-600': order.urgencyLevel === 'normal',
                }"
              >
                {{ order.urgencyLabel }}
              </span>
              <span class="text-xs text-slate-400">📍 距離 {{ order.distance }}</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-base font-bold text-slate-900">{{ order.issue }}</span>
              <span class="text-sm text-slate-500">住戶：{{ order.resident }} · {{ order.address }}</span>
            </div>

            <!-- 階段按鈕 -->
            <div v-if="order.stage === 'pending'">
              <button
                class="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                @click="acceptPlumberOrder(order)"
              >
                ⚡ 立即接單修繕
              </button>
            </div>
            <div v-else-if="order.stage === 'departed'" class="flex flex-col gap-2">
              <div class="text-xs text-blue-600 font-semibold bg-blue-50 rounded-lg px-3 py-2 text-center">
                🚀 已出發 · 預計到達時間：{{ order.eta }}
              </div>
              <button
                class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                @click="advancePlumberStage(order)"
              >
                📍 已抵達現場，開始施工
              </button>
            </div>
            <div v-else-if="order.stage === 'arrived'" class="flex flex-col gap-2">
              <div class="text-xs text-amber-600 font-semibold bg-amber-50 rounded-lg px-3 py-2 text-center">
                🔧 施工中...
              </div>
              <button
                class="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold active:scale-[0.97] transition-all shadow-md"
                @click="advancePlumberStage(order)"
              >
                ✅ 完工開立收據/結案
              </button>
            </div>
            <div v-else class="text-center text-sm font-bold py-3 rounded-xl bg-green-50 text-green-600 border border-green-200">
              ✅ 已完工結案
            </div>

            <!-- 進度指示條 -->
            <div class="flex items-center gap-1 pt-1">
              <div class="h-1.5 flex-1 rounded-full transition-colors" :class="['departed', 'arrived', 'completed'].includes(order.stage) ? 'bg-blue-500' : 'bg-slate-200'"></div>
              <div class="h-1.5 flex-1 rounded-full transition-colors" :class="['arrived', 'completed'].includes(order.stage) ? 'bg-amber-500' : 'bg-slate-200'"></div>
              <div class="h-1.5 flex-1 rounded-full transition-colors" :class="order.stage === 'completed' ? 'bg-green-500' : 'bg-slate-200'"></div>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- 三、家事清潔公司端 -->
        <!-- ═══════════════════════════════════════ -->
        <section v-show="currentRole === 'cleaning'" role="tabpanel" aria-label="家事清潔管理">

          <h2 class="text-base font-bold text-slate-800 mb-3">📅 預約行程表</h2>

          <div v-for="booking in cleaningBookings" :key="booking.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-full"
                :class="{
                  'bg-blue-100 text-blue-700': booking.status === 'scheduled',
                  'bg-amber-100 text-amber-700': booking.status === 'assigned',
                  'bg-green-100 text-green-700': booking.status === 'completed',
                }"
              >
                {{ { scheduled: '📅 待指派', assigned: '👷 已指派', completed: '✅ 已完成' }[booking.status] }}
              </span>
              <span class="text-xs text-slate-400">{{ booking.date }}</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-base font-bold text-slate-900">{{ booking.serviceType }}</span>
              <span class="text-sm text-slate-600">👤 {{ booking.resident }} · {{ booking.address }}</span>
              <span class="text-sm text-slate-500">🕐 {{ booking.timeSlot }}</span>
            </div>

            <div v-if="booking.notes" class="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              📝 備註：{{ booking.notes }}
            </div>

            <div v-if="booking.assignee" class="text-xs text-blue-600 font-semibold bg-blue-50 rounded-lg px-3 py-2">
              👷 指派人員：{{ booking.assignee }}
            </div>

            <div v-if="booking.status === 'scheduled'" class="flex gap-2">
              <button
                class="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                @click="assignCleaner(booking)"
              >
                👷 指派清潔人員
              </button>
            </div>
            <div v-else-if="booking.status === 'assigned'" class="flex gap-2">
              <button
                class="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                @click="completeCleaning(booking)"
              >
                ✅ 服務完成回報
              </button>
            </div>
            <div v-else class="text-center text-xs font-bold py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200">
              ✅ 服務已完成
            </div>
          </div>
        </section>

      </main>

      <!-- ═══ Toast Notification ═══ -->
      <Transition name="toast-fade">
        <div
          v-if="toastMessage"
          class="fixed bottom-6 left-1/2 z-50 px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-2xl shadow-lg -translate-x-1/2 max-w-[90%] text-center"
        >
          {{ toastMessage }}
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}
.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
