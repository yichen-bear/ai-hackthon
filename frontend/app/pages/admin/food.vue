<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

// ─── Types ───
interface TimeSlot {
  id: string
  time: string
  remainingTables: number
  totalTables: number
  capacity: number
  status: 'open' | 'full' | 'low'
}

interface MenuItem {
  id: string
  name: string
  calories: number
  price: number
  available: boolean
}

interface TakeoutOrder {
  id: string
  customerName: string
  phone: string
  type: 'takeout' | 'delivery'
  address?: string
  pickupTime?: string
  items: { name: string; qty: number; price: number }[]
  total: number
  note: string
  status: 'preparing' | 'ready' | 'delivering' | 'completed'
}

// ─── Tab 狀態 ───
const activeTab = ref<'orders' | 'menu' | 'dispatch'>('orders')

// 支援 ?tab=orders/menu/dispatch 跳轉
const adminRoute = useRoute()
onMounted(() => { const t = adminRoute.query.tab as string; if (t && ['orders', 'menu', 'dispatch'].includes(t)) activeTab.value = t as any })

// ─── Toast 系統 ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

// ─── 空位管理 ───
const availableTables = ref(2)
const waitingGroups = ref(3)

function incrementTables() {
  availableTables.value++
}

function decrementTables() {
  if (availableTables.value > 0) availableTables.value--
}

const LINKED_PLACE_ID = 'linked_restaurant_01'

async function syncToClient() {
  try {
    await $fetch('http://localhost:3001/api/queue/admin/update', {
      method: 'PUT',
      body: {
        placeId: LINKED_PLACE_ID,
        emptyTables: availableTables.value,
      },
    })
    showToast('✅ 已同步空位資訊至客戶端')
  } catch {
    showToast('❌ 同步失敗，請稍後再試')
  }
}

// ─── 桌位分配情況 ───
const showSeatPanel = ref(false)
const seatLoading = ref(false)
const seatedCustomers = ref<{ id: number; ticketNumber: number; partySize: number; customerName: string; customerPhone: string; note: string | null }[]>([])
const waitingCustomers = ref<{ id: number; ticketNumber: number; partySize: number; customerName: string; customerPhone: string; note: string | null }[]>([])

async function fetchSeatDetail() {
  seatLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`http://localhost:3001/api/queue/detail/${LINKED_PLACE_ID}`)
    if (res.success) {
      seatedCustomers.value = res.data.seated
      waitingCustomers.value = res.data.waiting
      availableTables.value = res.data.emptyTables
      waitingGroups.value = res.data.waitingGroups
    }
  } catch {
    showToast('❌ 無法載入桌位資訊')
  } finally {
    seatLoading.value = false
  }
}

function openSeatPanel() {
  showSeatPanel.value = true
  fetchSeatDetail()
}

function closeSeatPanel() {
  showSeatPanel.value = false
}

async function callNextCustomer() {
  try {
    await $fetch('http://localhost:3001/api/queue/admin/call-next', {
      method: 'POST',
      body: { placeId: LINKED_PLACE_ID },
    })
    showToast('✅ 已叫號，下一組入座')
    await fetchSeatDetail()
  } catch {
    showToast('❌ 叫號失敗')
  }
}

// 進入頁面時載入即時資料
onMounted(() => {
  fetchSeatDetail()
  fetchTimeSlots()
})

// ─── 日曆與時段管理 ───
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const selectedDateOffset = ref(0) // 0 = today

const selectedDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + selectedDateOffset.value)
  return d
})

const selectedDateLabel = computed(() => {
  const d = selectedDate.value
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const wd = weekdays[d.getDay()]
  const isToday = selectedDateOffset.value === 0
  return `${y} 年 ${m} 月 ${day} 日 (${wd})${isToday ? ' [今日]' : ''}`
})

const selectedDateStatus = computed(() => {
  const slots = timeSlots.value
  const allFull = slots.every(s => s.status === 'full')
  return allFull ? 'full' : 'available'
})

function prevDate() {
  selectedDateOffset.value--
  expandedSlot.value = null
  fetchTimeSlots()
}

function nextDate() {
  selectedDateOffset.value++
  expandedSlot.value = null
  fetchTimeSlots()
}

// Mock time slots for the selected date
const timeSlots = ref<TimeSlot[]>([])
const slotsLoading = ref(false)

async function fetchTimeSlots() {
  slotsLoading.value = true
  try {
    const dateStr = selectedDate.value.toISOString().slice(0, 10)
    const res = await $fetch<{ success: boolean; data: { slots: { time: string; remainingTables: number; totalTables: number; capacity: number; status: string; bookedCount: number }[] } }>(`http://localhost:3001/api/food-reservations/slots/linked_restaurant_01?date=${dateStr}`)
    if (res.success) {
      timeSlots.value = res.data.slots.map((s, idx) => ({
        id: `ts-${idx}`,
        time: s.time,
        remainingTables: s.remainingTables,
        totalTables: s.totalTables || 4,
        capacity: s.capacity,
        status: s.status as TimeSlot['status'],
      }))
    }
  } catch {
    // Fallback to empty
    timeSlots.value = []
  } finally {
    slotsLoading.value = false
  }
}

async function closeSlot(slot: TimeSlot) {
  try {
    await $fetch(`http://localhost:3001/api/food-reservations/slots/linked_restaurant_01`, {
      method: 'PUT',
      body: { time: slot.time, totalTables: 0 },
    })
    showToast(`🔴 已關閉 ${slot.time} 時段`)
    await fetchTimeSlots()
  } catch {
    showToast('❌ 關閉失敗')
  }
}

function addTable(slot: TimeSlot) {
  slot.remainingTables++
  slot.capacity += 4
  if (slot.status === 'full') {
    slot.status = slot.remainingTables <= 1 ? 'low' : 'open'
  }
  showToast(`➕ ${slot.time} 時段已加開 1 桌`)
}

const editingSlotTime = ref<string | null>(null)
const editingSlotValue = ref(4)

function startEditSlot(slot: TimeSlot) {
  editingSlotTime.value = slot.time
  editingSlotValue.value = slot.totalTables
}

async function saveSlotTables(slot: TimeSlot) {
  const newTotal = Math.max(0, editingSlotValue.value)
  try {
    await $fetch(`http://localhost:3001/api/food-reservations/slots/linked_restaurant_01`, {
      method: 'PUT',
      body: { time: slot.time, totalTables: newTotal },
    })
    editingSlotTime.value = null
    showToast(`✅ ${slot.time} 時段已更新為 ${newTotal} 桌`)
    await fetchTimeSlots()
  } catch {
    showToast('❌ 更新失敗')
  }
}

function cancelEditSlot() {
  editingSlotTime.value = null
}

// ─── 訂位詳情 ───
const expandedSlot = ref<string | null>(null)
const slotReservations = ref<{ id: number; customerName: string; customerPhone: string; partySize: number; date: string; time: string; note: string | null }[]>([])
const slotResLoading = ref(false)

async function toggleSlotDetail(slotTime: string) {
  if (expandedSlot.value === slotTime) {
    expandedSlot.value = null
    return
  }
  expandedSlot.value = slotTime
  slotResLoading.value = true
  try {
    const dateStr = selectedDate.value.toISOString().slice(0, 10)
    const res = await $fetch<{ success: boolean; data: { bySlot: Record<string, any[]> } }>(`http://localhost:3001/api/food-reservations/linked_restaurant_01?date=${dateStr}`)
    if (res.success) {
      slotReservations.value = res.data.bySlot[slotTime] || []
    }
  } catch {
    slotReservations.value = []
  } finally {
    slotResLoading.value = false
  }
}

function getSlotStatusLabel(status: TimeSlot['status']) {
  switch (status) {
    case 'open': return '🟢 開放預約'
    case 'full': return '🔴 已額滿'
    case 'low': return '🟡 剩餘少量'
  }
}

function getSlotStatusClass(status: TimeSlot['status']) {
  switch (status) {
    case 'open': return 'bg-green-100 text-green-700'
    case 'full': return 'bg-red-100 text-red-600'
    case 'low': return 'bg-yellow-100 text-yellow-700'
  }
}

// ─── AI 菜單熱量試算 ───
const aiDishDescription = ref('')
const aiAnalysisLoading = ref(false)
const aiAnalysisComplete = ref(false)
const aiAnalysisResult = ref({
  name: '',
  calories: 680,
  protein: 38,
  carbs: 65,
  fiber: 5,
  fat: 18,
  price: 250,
})

function triggerAiAnalysis() {
  if (!aiDishDescription.value.trim()) {
    showToast('⚠️ 請先輸入菜色描述或上傳照片')
    return
  }
  aiAnalysisLoading.value = true
  aiAnalysisComplete.value = false
  // Simulate API call
  setTimeout(() => {
    aiAnalysisResult.value = {
      name: aiDishDescription.value.split('（')[0].split('(')[0].trim() || '新菜色',
      calories: 680,
      protein: 38,
      carbs: 65,
      fiber: 5,
      fat: 18,
      price: 250,
    }
    aiAnalysisLoading.value = false
    aiAnalysisComplete.value = true
    showToast('✅ 已完成熱量與營養素分析')
  }, 1500)
}

function uploadPhoto() {
  // Simulate photo upload
  showToast('📷 已選取照片（模擬）')
  aiDishDescription.value = '招牌牛肉麵（牛腱肉、手工粗麵、青江菜、紅燒高湯）'
}

function publishToMenu() {
  const newId = `m-${Date.now()}`
  menuItems.value.unshift({
    id: newId,
    name: aiAnalysisResult.value.name,
    calories: aiAnalysisResult.value.calories,
    price: aiAnalysisResult.value.price,
    available: true,
  })
  // Reset state
  aiDishDescription.value = ''
  aiAnalysisComplete.value = false
  showToast('✅ 已上架至菜單並公開至客戶端')
}

// ─── Mock 資料：菜單 ───
const menuItems = ref<MenuItem[]>([
  { id: 'm-1', name: '舒肥雞胸肉餐盒', calories: 450, price: 180, available: true },
  { id: 'm-2', name: '日式鮭魚丼飯', calories: 520, price: 220, available: true },
  { id: 'm-3', name: '有機沙拉碗', calories: 280, price: 150, available: true },
  { id: 'm-4', name: '松露燉飯', calories: 620, price: 320, available: false },
  { id: 'm-5', name: '手作甜點拼盤', calories: 380, price: 280, available: true },
  { id: 'm-6', name: '冷壓果汁（綜合莓果）', calories: 120, price: 90, available: true },
])

function toggleAvailability(item: MenuItem) {
  item.available = !item.available
}

function deleteMenuItem(item: MenuItem) {
  menuItems.value = menuItems.value.filter(m => m.id !== item.id)
  showToast(`🗑️ 已刪除：${item.name}`)
}

function editMenuItem(item: MenuItem) {
  showToast(`✏️ 編輯模式：${item.name}（功能開發中）`)
}

// ─── Mock 資料：外帶外送 ───
const takeoutOrders = ref<TakeoutOrder[]>([
  {
    id: 't-1',
    customerName: '陳小明',
    phone: '0912-345-678',
    type: 'delivery',
    address: '台北市信義區忠孝東路五段 100 號 8 樓',
    items: [
      { name: '招牌牛肉麵', qty: 1, price: 220 },
      { name: '燙青菜 (高麗菜)', qty: 1, price: 50 },
      { name: '無糖綠茶', qty: 1, price: 35 },
    ],
    total: 305,
    note: '不要加蔥，謝謝！',
    status: 'preparing',
  },
  {
    id: 't-2',
    customerName: '林美玲',
    phone: '0923-456-789',
    type: 'takeout',
    pickupTime: '18:30',
    items: [
      { name: '舒肥雞胸肉餐盒', qty: 2, price: 180 },
      { name: '冷壓果汁（綜合莓果）', qty: 2, price: 90 },
    ],
    total: 540,
    note: '需要餐具',
    status: 'preparing',
  },
  {
    id: 't-3',
    customerName: '王大維',
    phone: '0934-567-890',
    type: 'delivery',
    address: '台北市大安區復興南路二段 68 號 3 樓',
    items: [
      { name: '松露燉飯', qty: 1, price: 320 },
      { name: '有機沙拉碗', qty: 1, price: 150 },
    ],
    total: 470,
    note: '',
    status: 'delivering',
  },
])

const orderStatusFlow: TakeoutOrder['status'][] = ['preparing', 'ready', 'delivering', 'completed']

function getOrderStatusLabel(order: TakeoutOrder) {
  switch (order.status) {
    case 'preparing': return '🟡 製作中'
    case 'ready': return order.type === 'takeout' ? '🔵 取餐中' : '🔵 待取餐'
    case 'delivering': return '🟢 外送中'
    case 'completed': return '⚪ 已完成'
  }
}

function getOrderStatusClass(status: TakeoutOrder['status']) {
  switch (status) {
    case 'preparing': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'ready': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'delivering': return 'bg-green-100 text-green-700 border-green-200'
    case 'completed': return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function cycleOrderStatus(order: TakeoutOrder) {
  const currentIdx = orderStatusFlow.indexOf(order.status)
  // For takeout orders, skip 'delivering' status
  if (order.type === 'takeout') {
    if (order.status === 'preparing') {
      order.status = 'ready'
    } else if (order.status === 'ready') {
      order.status = 'completed'
    }
  } else {
    // Delivery orders go through all statuses
    if (currentIdx < orderStatusFlow.length - 1) {
      order.status = orderStatusFlow[currentIdx + 1]
    }
  }
  showToast(`� 訂單狀態已更新為：${getOrderStatusLabel(order)}`)
}

function contactCustomer(order: TakeoutOrder) {
  showToast(`📞 正在聯繫 ${order.customerName} (${order.phone})`)
}

function completeOrder(order: TakeoutOrder) {
  order.status = 'completed'
  showToast(`✅ 訂單已完成：${order.customerName}`)
}
</script>

<template>
  <!-- ═══ Admin Page Container ═══ -->
  <div class="admin-page pb-12">

      <!-- ═══ 主內容區 ═══ -->
      <main class="flex flex-col gap-4 p-4">

        <!-- ═══ Tab 切換列 ═══ -->
        <nav class="flex bg-slate-100 rounded-2xl p-1 gap-1 shadow-sm" role="tablist" aria-label="店家管理功能切換">
          <button
            role="tab"
            :aria-selected="activeTab === 'orders'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="activeTab === 'orders' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'orders'"
          >
            空位預約
          </button>
          <button
            role="tab"
            :aria-selected="activeTab === 'menu'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="activeTab === 'menu' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'menu'"
          >
            菜單熱量
          </button>
          <button
            role="tab"
            :aria-selected="activeTab === 'dispatch'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="activeTab === 'dispatch' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'dispatch'"
          >
            外帶外送
          </button>
        </nav>

        <!-- ═══ Tab 1：實時空位管理與預約接單 ═══ -->
        <section v-show="activeTab === 'orders'" role="tabpanel" aria-label="實時空位管理與預約接單">

          <!-- 🔥 空位控制卡 -->
          <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 m-0">🪑 即時空位控制</h3>

            <!-- 空桌數加減 -->
            <div class="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <span class="text-sm font-semibold text-slate-600">空桌數</span>
              <div class="flex items-center gap-3">
                <button
                  class="w-9 h-9 rounded-full bg-white border-2 border-slate-200 text-lg font-bold text-slate-700 cursor-pointer flex items-center justify-center hover:border-orange-400 hover:text-orange-500 active:scale-90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="availableTables === 0"
                  @click="decrementTables"
                >
                  −
                </button>
                <span class="text-2xl font-extrabold text-slate-900 min-w-[2ch] text-center">{{ availableTables }}</span>
                <button
                  class="w-9 h-9 rounded-full bg-white border-2 border-slate-200 text-lg font-bold text-slate-700 cursor-pointer flex items-center justify-center hover:border-orange-400 hover:text-orange-500 active:scale-90 transition-all shadow-sm"
                  @click="incrementTables"
                >
                  +
                </button>
              </div>
            </div>

            <!-- 候位組數 -->
            <div class="flex items-center gap-2 px-1">
              <span class="text-sm text-slate-500">候位組數：</span>
              <span class="text-sm font-bold text-slate-900">{{ waitingGroups }} 組</span>
            </div>

            <!-- 動態提示 -->
            <div
              v-if="availableTables === 0"
              class="text-sm font-bold text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-center border border-red-200"
            >
              ⏱️ 預估客戶現場等候時間：約 {{ waitingGroups * 15 }} 分鐘
            </div>
            <div
              v-else
              class="text-sm font-bold text-green-600 bg-green-50 rounded-xl px-4 py-2.5 text-center border border-green-200"
            >
              🟢 目前有空位，無須等候
            </div>

            <!-- 同步按鈕 -->
            <button
              class="w-full py-2.5 bg-orange-500 text-white rounded-xl text-base font-bold cursor-pointer border-none hover:bg-orange-600 active:scale-[0.97] transition-all shadow-md"
              @click="syncToClient"
            >
              📲 連動同步至客戶端
            </button>
            <button
              class="w-full py-2.5 bg-blue-500 text-white rounded-xl text-base font-bold cursor-pointer border-none hover:bg-blue-600 active:scale-[0.97] transition-all shadow-md"
              @click="openSeatPanel"
            >
              🪑 看桌位分配情況
            </button>
          </div>

          <!-- ═══ 📅 訂位日曆與時段空位連動管理 ═══ -->
          <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 m-0">📅 訂位日曆與時段空位連動管理</h3>

            <!-- 日期選擇列 -->
            <div class="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-3">
              <button
                class="w-8 h-8 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-700 cursor-pointer flex items-center justify-center hover:border-orange-400 hover:text-orange-500 active:scale-90 transition-all shadow-sm"
                @click="prevDate"
              >
                &lt;
              </button>
              <div class="flex flex-col items-center gap-1">
                <span class="text-sm font-bold text-slate-800">{{ selectedDateLabel }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                  :class="selectedDateStatus === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
                >
                  {{ selectedDateStatus === 'available' ? '🟢 尚有空位' : '🔴 已額滿' }}
                </span>
              </div>
              <button
                class="w-8 h-8 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-700 cursor-pointer flex items-center justify-center hover:border-orange-400 hover:text-orange-500 active:scale-90 transition-all shadow-sm"
                @click="nextDate"
              >
                &gt;
              </button>
            </div>

            <!-- 時段空位控制卡片列表 -->
            <div class="flex flex-col gap-3">
              <div
                v-for="slot in timeSlots"
                :key="slot.id"
                class="bg-slate-50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100"
              >
                <!-- 時段 header -->
                <div class="flex items-center justify-between">
                  <span class="text-sm font-extrabold text-slate-900">{{ slot.time }}</span>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                    :class="getSlotStatusClass(slot.status)"
                  >
                    {{ getSlotStatusLabel(slot.status) }}
                  </span>
                </div>

                <!-- 剩餘資訊 -->
                <div class="text-sm text-slate-600">
                  <span v-if="slot.remainingTables > 0">
                    剩餘 <span class="font-bold text-slate-800">{{ slot.remainingTables }} 桌 ({{ slot.capacity }}人)</span>
                  </span>
                  <span v-else class="font-bold text-red-500">剩餘 0 桌</span>
                </div>

                <!-- 操作按鈕 / 編輯桌數 -->
                <div class="flex gap-2 flex-wrap items-center">
                  <template v-if="editingSlotTime === slot.time">
                    <div class="flex items-center gap-2 w-full">
                      <span class="text-xs text-slate-600 font-medium">總桌數：</span>
                      <input
                        v-model.number="editingSlotValue"
                        type="number"
                        min="0"
                        max="20"
                        class="w-16 px-2 py-1.5 text-sm font-bold text-center border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <button
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white border-none cursor-pointer hover:bg-blue-600 active:scale-95 transition-all"
                        @click="saveSlotTables(slot)"
                      >
                        儲存
                      </button>
                      <button
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200 active:scale-95 transition-all"
                        @click="cancelEditSlot"
                      >
                        取消
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <button
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 cursor-pointer hover:bg-blue-100 active:scale-95 transition-all"
                      @click="startEditSlot(slot)"
                    >
                      ✏️ 修改桌數 ({{ slot.totalTables }})
                    </button>
                    <button
                      v-if="slot.status !== 'full'"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:bg-red-100 active:scale-95 transition-all"
                      @click="closeSlot(slot)"
                    >
                      關閉時段
                    </button>
                  </template>
                </div>

                <!-- 點擊展開訂位明細 -->
                <button
                  class="w-full mt-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 active:scale-95 transition-all"
                  @click="toggleSlotDetail(slot.time)"
                >
                  {{ expandedSlot === slot.time ? '收合訂位明細 ▲' : '查看訂位明細 ▼' }}
                </button>

                <!-- 訂位明細展開區 -->
                <div v-if="expandedSlot === slot.time" class="flex flex-col gap-2 mt-2">
                  <div v-if="slotResLoading" class="text-center text-sm text-slate-400 py-3">載入中...</div>
                  <div v-else-if="slotReservations.length === 0" class="text-center text-sm text-slate-400 py-3">此時段尚無訂位</div>
                  <div v-else class="grid grid-cols-2 gap-2">
                    <div
                      v-for="r in slotReservations"
                      :key="r.id"
                      class="bg-white border border-blue-100 rounded-xl p-3 flex flex-col gap-1 shadow-sm"
                    >
                      <span class="text-sm font-bold text-slate-900">{{ r.customerName }}</span>
                      <span class="text-xs text-slate-500">📞 {{ r.customerPhone }}</span>
                      <span class="text-xs text-blue-700 font-semibold">{{ r.partySize }} 位 · {{ r.time }}</span>
                      <span class="text-xs text-slate-400">{{ r.date }}</span>
                      <span v-if="r.note" class="text-xs text-amber-600">📝 {{ r.note }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 連動提示列 -->
            <p class="text-xs text-slate-400 m-0 text-center leading-relaxed">
              💡 此處設定的日期與時段空位，將即時連線同步至客戶端『想吃什麼 ➔ 訂位』選單中。
            </p>
          </div>
        </section>

        <!-- ═══ 桌位分配情況面板 ═══ -->
        <section v-if="showSeatPanel" class="fixed inset-0 z-40 bg-black/40 flex items-end justify-center">
          <div class="bg-white w-full max-w-md rounded-t-3xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-900 m-0">🪑 桌位分配情況</h3>
              <button class="text-2xl text-slate-400 cursor-pointer border-none bg-transparent" @click="closeSeatPanel">✕</button>
            </div>

            <!-- Loading -->
            <div v-if="seatLoading" class="text-center py-8 text-slate-500 text-sm">載入中...</div>

            <template v-else>
              <!-- 在座顧客 -->
              <div>
                <h4 class="text-sm font-bold text-green-700 mb-2">🟢 在座顧客（{{ seatedCustomers.length }} 桌）</h4>
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="c in seatedCustomers"
                    :key="c.id"
                    class="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col gap-1"
                  >
                    <span class="text-sm font-bold text-slate-900">{{ c.customerName }}</span>
                    <span class="text-xs text-slate-500">📞 {{ c.customerPhone }}</span>
                    <span class="text-xs text-green-700 font-semibold">{{ c.partySize }} 位用餐</span>
                  </div>
                </div>
              </div>

              <!-- 候位顧客 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-bold text-orange-700 m-0">🟡 候位顧客（{{ waitingCustomers.length }} 組）</h4>
                  <button
                    v-if="waitingCustomers.length > 0"
                    class="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg border-none cursor-pointer hover:bg-orange-600 active:scale-95 transition-all"
                    @click="callNextCustomer"
                  >
                    📢 叫下一號
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="c in waitingCustomers"
                    :key="c.id"
                    class="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col gap-1"
                  >
                    <span class="text-sm font-bold text-slate-900">{{ c.customerName }}</span>
                    <span class="text-xs text-slate-500">📞 {{ c.customerPhone }}</span>
                    <span class="text-xs text-orange-700 font-semibold">{{ c.partySize }} 位候位</span>
                    <span v-if="c.note" class="text-xs text-amber-600">📝 {{ c.note }}</span>
                  </div>
                </div>
                <p v-if="waitingCustomers.length === 0" class="text-sm text-slate-400 text-center py-4">目前沒有候位顧客</p>
              </div>
            </template>
          </div>
        </section>

        <!-- ═══ Tab 2：菜單與熱量標籤 ═══ -->
        <section v-show="activeTab === 'menu'" role="tabpanel" aria-label="菜單與熱量標籤">

          <!-- ═══ 📸 AI 菜單熱量自動分析與試算區塊 ═══ -->
          <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4 mb-4 shadow-sm">
            <h3 class="text-base font-bold text-slate-900 m-0">📸 AI 菜單熱量試算與上架</h3>

            <!-- 拍照 / 上傳按鈕 -->
            <button
              class="w-full py-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 cursor-pointer hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 active:scale-[0.97] transition-all"
              @click="uploadPhoto"
            >
              📷 上傳菜色照片
            </button>

            <!-- 菜色描述輸入 -->
            <textarea
              v-model="aiDishDescription"
              class="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              placeholder="例如：招牌牛肉麵（牛腱肉、手工粗麵、青江菜、紅燒高湯）..."
            />

            <!-- AI 試算按鈕 -->
            <button
              class="w-full py-2.5 bg-orange-500 text-white rounded-xl text-base font-bold cursor-pointer border-none hover:bg-orange-600 active:scale-[0.97] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="aiAnalysisLoading"
              @click="triggerAiAnalysis"
            >
              <span v-if="aiAnalysisLoading">⏳ AI 分析中...</span>
              <span v-else>🤖 AI 試算熱量</span>
            </button>

            <!-- 營養分析結果卡片 -->
            <div v-if="aiAnalysisComplete" class="bg-slate-50 rounded-xl p-4 flex flex-col gap-3 border border-slate-100">
              <div class="text-center">
                <span class="text-lg font-extrabold text-slate-900">預估熱量：</span>
                <span class="text-lg font-extrabold text-orange-500">{{ aiAnalysisResult.calories }} kcal / 份</span>
              </div>

              <!-- 四大營養素 -->
              <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                  <span class="text-sm">🔵</span>
                  <div class="flex flex-col">
                    <span class="text-xs text-slate-500">蛋白質</span>
                    <span class="text-sm font-bold text-blue-700">{{ aiAnalysisResult.protein }} g</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                  <span class="text-sm">🟠</span>
                  <div class="flex flex-col">
                    <span class="text-xs text-slate-500">碳水化合物</span>
                    <span class="text-sm font-bold text-orange-700">{{ aiAnalysisResult.carbs }} g</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                  <span class="text-sm">🟢</span>
                  <div class="flex flex-col">
                    <span class="text-xs text-slate-500">膳食纖維</span>
                    <span class="text-sm font-bold text-green-700">{{ aiAnalysisResult.fiber }} g</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  <span class="text-sm">🔴</span>
                  <div class="flex flex-col">
                    <span class="text-xs text-slate-500">脂質/脂肪</span>
                    <span class="text-sm font-bold text-red-700">{{ aiAnalysisResult.fat }} g</span>
                  </div>
                </div>
              </div>

              <!-- 一鍵上架 -->
              <button
                class="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold cursor-pointer border-none hover:bg-green-600 active:scale-[0.97] transition-all shadow-md"
                @click="publishToMenu"
              >
                ➕ 同步儲存至菜單並公開至客戶端
              </button>
            </div>
          </div>

          <!-- ═══ 📋 已上架菜單清單與熱量列表 ═══ -->
          <div v-for="item in menuItems" :key="item.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-slate-900">{{ item.name }}</span>
              <span class="text-sm font-extrabold text-orange-500">${{ item.price }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-500 font-medium">🔥 {{ item.calories }} kcal</span>
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :class="item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
              >
                {{ item.available ? '🟢 販售中' : '🔴 已售完' }}
              </span>
            </div>
            <!-- 操作按鈕列 -->
            <div class="flex gap-2">
              <button
                class="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 cursor-pointer hover:bg-blue-100 active:scale-95 transition-all"
                @click="editMenuItem(item)"
              >
                ✏️ 編輯
              </button>
              <button
                class="flex-1 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:bg-red-100 active:scale-95 transition-all"
                @click="deleteMenuItem(item)"
              >
                🗑️ 刪除
              </button>
              <button
                class="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-all active:scale-95"
                :class="item.available
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                @click="toggleAvailability(item)"
              >
                {{ item.available ? '🟢 販售中' : '🔴 已售完' }}
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ Tab 3：外帶外送訂單管理 ═══ -->
        <section v-show="activeTab === 'dispatch'" role="tabpanel" aria-label="外帶外送訂單管理">
          <div v-for="order in takeoutOrders" :key="order.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">

            <!-- 卡片頂部：顧客資訊 + 狀態 Badge -->
            <div class="flex items-center justify-between">
              <div class="flex flex-col gap-0.5">
                <span class="text-base font-bold text-slate-900">👤 {{ order.customerName }} ({{ order.phone }})</span>
                <span class="text-xs font-semibold" :class="order.type === 'delivery' ? 'text-green-600' : 'text-blue-600'">
                  {{ order.type === 'delivery' ? '🛵 外送' : '🥡 外帶自取' }}
                </span>
              </div>
              <button
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer border transition-all active:scale-95"
                :class="getOrderStatusClass(order.status)"
                @click="cycleOrderStatus(order)"
              >
                {{ getOrderStatusLabel(order) }}
              </button>
            </div>

            <!-- 外送地址 / 自取時間 -->
            <div v-if="order.type === 'delivery' && order.address" class="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              📍 {{ order.address }}
            </div>
            <div v-if="order.type === 'takeout' && order.pickupTime" class="text-sm text-slate-600 bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
              ⏱️ 預計自取時間：{{ order.pickupTime }}
            </div>

            <!-- 餐點明細 -->
            <div class="flex flex-col gap-1.5">
              <div v-for="item in order.items" :key="item.name" class="flex justify-between text-sm text-slate-700">
                <span>• {{ item.name }} x {{ item.qty }}</span>
                <span class="font-semibold">${{ item.price * item.qty }}</span>
              </div>
            </div>

            <!-- 小計 + 備註 -->
            <div class="flex items-center justify-between border-t border-slate-100 pt-2">
              <span class="text-sm font-bold text-slate-900">� 總計</span>
              <span class="text-base font-extrabold text-orange-500">${{ order.total }}</span>
            </div>
            <div v-if="order.note" class="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
              � 備註：{{ order.note }}
            </div>

            <!-- 底部操作按鈕 -->
            <div class="flex gap-2">
              <button
                class="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 border border-blue-200 cursor-pointer hover:bg-blue-100 active:scale-95 transition-all"
                @click="contactCustomer(order)"
              >
                📞 聯繫顧客
              </button>
              <button
                class="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none active:scale-[0.97] transition-all shadow-md"
                :class="order.status === 'completed' ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'"
                :disabled="order.status === 'completed'"
                @click="completeOrder(order)"
              >
                ✅ 完成訂單
              </button>
            </div>
          </div>
        </section>

      </main>

      <!-- ═══ Toast Notification ═══ -->
      <Transition name="toast-fade">
        <div
          v-if="toastMessage"
          class="fixed bottom-6 left-1/2 z-50 px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-2xl shadow-lg -translate-x-1/2"
        >
          {{ toastMessage }}
        </div>
      </Transition>

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
