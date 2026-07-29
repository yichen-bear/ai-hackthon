<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

// ─── Types ───
interface Order {
  id: string
  customerName: string
  items: { name: string; qty: number; price: number }[]
  totalAmount: number
  aiNote: string
  status: 'pending' | 'accepted'
}

interface MenuItem {
  id: string
  name: string
  calories: number
  price: number
  available: boolean
}

interface DeliveryOrder {
  id: string
  orderRef: string
  driverName: string
  eta: number
  destination: string
  status: 'picking' | 'delivering' | 'delivered'
}

// ─── Header 狀態 ───
const isHeaderExpanded = ref(false)

// ─── Tab 狀態 ───
const activeTab = ref<'orders' | 'menu' | 'dispatch'>('orders')

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

function syncToClient() {
  showToast('✅ 已同步空位資訊至客戶端')
}

// ─── Mock 資料：訂單 ───
const orders = ref<Order[]>([
  {
    id: 'o-1',
    customerName: '王小姐 (4人)',
    items: [
      { name: '舒肥雞胸肉餐盒', qty: 2, price: 180 },
      { name: '日式鮭魚丼飯', qty: 1, price: 220 },
      { name: '有機沙拉碗', qty: 1, price: 150 },
    ],
    totalAmount: 730,
    aiNote: '🤖 AI 標註：慶生桌 / 需要嬰兒椅',
    status: 'pending',
  },
  {
    id: 'o-2',
    customerName: '李先生 (2人)',
    items: [
      { name: '松露燉飯', qty: 1, price: 320 },
      { name: '日式鮭魚丼飯', qty: 1, price: 220 },
    ],
    totalAmount: 540,
    aiNote: '🤖 AI 標註：素食需求 / 靠窗座位',
    status: 'pending',
  },
  {
    id: 'o-3',
    customerName: '張太太 (6人)',
    items: [
      { name: '舒肥雞胸肉餐盒', qty: 3, price: 180 },
      { name: '有機沙拉碗', qty: 2, price: 150 },
      { name: '手作甜點拼盤', qty: 1, price: 280 },
    ],
    totalAmount: 1120,
    aiNote: '🤖 AI 標註：商務聚餐 / 需要投影設備',
    status: 'pending',
  },
])

function acceptOrder(order: Order) {
  order.status = 'accepted'
  if (availableTables.value > 0) {
    availableTables.value--
  }
  showToast(`✅ 已接單：${order.customerName}`)
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

// ─── Mock 資料：外送 ───
const deliveryOrders = ref<DeliveryOrder[]>([
  { id: 'd-1', orderRef: '#F-2024-001', driverName: '張外送員', eta: 8, destination: '台北市大安區忠孝東路 100 號', status: 'delivering' },
  { id: 'd-2', orderRef: '#F-2024-002', driverName: '林外送員', eta: 15, destination: '台北市信義區松仁路 55 號', status: 'picking' },
  { id: 'd-3', orderRef: '#F-2024-003', driverName: '陳外送員', eta: 3, destination: '台北市中山區南京東路 200 號', status: 'delivering' },
])

function pushEta(delivery: DeliveryOrder) {
  showToast(`📲 已推送 ETA（${delivery.eta} 分鐘）給客戶`)
}

// ─── 六大模組導航 ───
const modules = [
  { label: '食', path: '/food' },
  { label: '醫', path: '/medical' },
  { label: '住', path: '/housing' },
  { label: '行', path: '/transport' },
  { label: '預', path: '/booking' },
  { label: '樂', path: '/entertainment' },
]
</script>

<template>
  <!-- ═══ 全頁外層：slate-100 背景 + 置中 430px 手機容器 ═══ -->
  <div class="min-h-screen bg-slate-100 flex justify-center">
    <div class="w-full max-w-[430px] min-h-screen bg-white shadow-xl relative pb-12">

      <!-- ═══ Top Header (Layer 1) ═══ -->
      <header class="sticky top-0 z-40 h-[50px] bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm">
        <div class="flex items-center gap-1 text-sm font-semibold text-slate-900 truncate">
          <span>👤 小明 (店家後台)</span>
          <span class="text-slate-300">|</span>
          <span>📍 台北市</span>
        </div>
        <button
          class="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 text-sm font-bold rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 active:scale-95 transition-all"
          @click="isHeaderExpanded = !isHeaderExpanded"
        >
          ⚙️ 選單 {{ isHeaderExpanded ? '🔼' : '🔽' }}
        </button>
      </header>

      <!-- ═══ Sub Header (Layer 2) — Collapsible Panel ═══ -->
      <div
        class="overflow-hidden transition-all duration-300 ease-in-out bg-orange-50 border-b border-orange-100"
        :style="{ maxHeight: isHeaderExpanded ? '200px' : '0px', opacity: isHeaderExpanded ? 1 : 0 }"
      >
        <div class="px-4 py-3 flex flex-col gap-3">
          <!-- 六大模組導航 -->
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
          <!-- 切換至用戶端 -->
          <NuxtLink
            class="w-full py-2.5 bg-white text-orange-500 font-bold rounded-xl border border-orange-200 text-center block no-underline hover:bg-orange-50 transition-colors shadow-sm"
            to="/food"
          >
            📱 切換至用戶端 (食)
          </NuxtLink>
        </div>
      </div>

      <!-- ═══ 主內容區 ═══ -->
      <main class="flex flex-col gap-4 p-4">

        <!-- ═══ Top Dashboard (3 stat badges) ═══ -->
        <section class="flex justify-center gap-2 flex-wrap" aria-label="統計概覽">
          <div class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-600 shadow-sm">
            🔴 待接單 (3)
          </div>
          <div class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 shadow-sm">
            🍳 製作中 (2)
          </div>
          <div class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-600 shadow-sm">
            🪑 現場空位 ({{ availableTables }} 桌)
          </div>
        </section>

        <!-- ═══ Tab 切換列 ═══ -->
        <nav class="flex bg-slate-100 rounded-2xl p-1 gap-1 shadow-sm" role="tablist" aria-label="店家管理功能切換">
          <button
            role="tab"
            :aria-selected="activeTab === 'orders'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="activeTab === 'orders' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'orders'"
          >
            🪑 空位預約
          </button>
          <button
            role="tab"
            :aria-selected="activeTab === 'menu'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="activeTab === 'menu' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'menu'"
          >
            📋 菜單熱量
          </button>
          <button
            role="tab"
            :aria-selected="activeTab === 'dispatch'"
            class="flex-1 py-2.5 px-2 text-sm font-bold rounded-xl cursor-pointer transition-all text-center whitespace-nowrap border-none"
            :class="activeTab === 'dispatch' ? 'bg-orange-500 text-white shadow-md' : 'bg-transparent text-slate-500 hover:text-slate-700'"
            @click="activeTab = 'dispatch'"
          >
            🚗 外送派單
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
          </div>

          <!-- 預約與內用訂單列表 -->
          <div v-for="order in orders" :key="order.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <!-- 顧客名 + 狀態 -->
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-slate-900">{{ order.customerName }}</span>
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :class="order.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'"
              >
                {{ order.status === 'pending' ? '待接單' : '✅ 已接單' }}
              </span>
            </div>

            <!-- AI 標註 -->
            <p class="text-sm text-amber-700 m-0 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
              {{ order.aiNote }}
            </p>

            <!-- 品項列表 -->
            <div class="flex flex-col gap-1.5">
              <div v-for="item in order.items" :key="item.name" class="flex justify-between text-sm text-slate-700">
                <span>{{ item.name }} x{{ item.qty }}</span>
                <span class="font-semibold">${{ item.price * item.qty }}</span>
              </div>
            </div>

            <!-- 合計 -->
            <div class="flex justify-between items-center border-t border-slate-100 pt-3">
              <span class="text-sm text-slate-500">合計</span>
              <span class="text-lg font-extrabold text-orange-500">${{ order.totalAmount }}</span>
            </div>

            <!-- 接單按鈕 -->
            <button
              v-if="order.status === 'pending'"
              class="w-full py-2.5 bg-green-500 text-white rounded-xl text-base font-bold cursor-pointer border-none hover:bg-green-600 active:scale-[0.97] transition-all shadow-md"
              @click="acceptOrder(order)"
            >
              🟢 確認接單 / 安排入座
            </button>
            <div v-else class="text-sm font-bold text-green-600 bg-green-50 rounded-xl px-3 py-2.5 text-center border border-green-200">
              ✅ 已接單 — 安排入座中
            </div>
          </div>
        </section>

        <!-- ═══ Tab 2：菜單與熱量標籤 ═══ -->
        <section v-show="activeTab === 'menu'" role="tabpanel" aria-label="菜單與熱量標籤">
          <div v-for="item in menuItems" :key="item.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-slate-900">{{ item.name }}</span>
              <span class="text-sm font-extrabold text-orange-500">${{ item.price }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-500 font-medium">🔥 {{ item.calories }} kcal</span>
              <button
                class="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer border-none transition-all active:scale-95 shadow-sm"
                :class="item.available
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'"
                @click="toggleAvailability(item)"
              >
                {{ item.available ? '🟢 販售中' : '🔴 已售完' }}
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ Tab 3：外送派單與進度 ═══ -->
        <section v-show="activeTab === 'dispatch'" role="tabpanel" aria-label="外送派單與進度">
          <div v-for="delivery in deliveryOrders" :key="delivery.id" class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 mb-4 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-slate-900">{{ delivery.orderRef }}</span>
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                :class="delivery.status === 'delivering' ? 'bg-blue-100 text-blue-700' : delivery.status === 'picking' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'"
              >
                {{ delivery.status === 'picking' ? '🍳 取餐中' : delivery.status === 'delivering' ? '🚗 外送中' : '✅ 已送達' }}
              </span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="font-bold text-slate-800">🚗 {{ delivery.driverName }}</span>
              <span class="text-slate-500">— 預計 {{ delivery.eta }} 分鐘抵達</span>
            </div>
            <p class="text-sm text-slate-500 m-0">📍 {{ delivery.destination }}</p>
            <button
              class="w-full py-2.5 bg-orange-500 text-white rounded-xl text-base font-bold cursor-pointer border-none hover:bg-orange-600 active:scale-[0.97] transition-all shadow-md"
              @click="pushEta(delivery)"
            >
              📲 模擬推送 ETA 給客戶
            </button>
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
