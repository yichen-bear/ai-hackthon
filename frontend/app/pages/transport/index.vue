<script setup lang="ts">
/**
 * 行模組主頁面
 * 路由: /transport
 * 作用域 Token 覆寫：琥珀主色 + 天空藍次色
 * 組裝所有行模組元件並串接資料流
 */

import type { ContextSuggestion } from '~/components/transport/ContextPush.vue'
import type { FavoriteRoute } from '~/components/transport/FavoriteRoutes.vue'
import type { PurchasedTicket } from '~/components/transport/TicketBooking.vue'
import type { Ticket } from '~/components/ui/TicketWallet.vue'
import type { EmissionData } from '~/components/transport/CarbonTracker.vue'

const {
  sharedDestination,
  sharedOrigin,
  scrollToSection,
  setRouteDestination,
  setRideDestination,
  dismissSuggestion,
} = useTransportState()

// ─── 跨模組路線規劃：從 query params 讀取目的地 ───
const currentRoute = useRoute()
onMounted(() => {
  const dest = currentRoute.query.destination as string | undefined
  if (dest) {
    setRouteDestination(dest)
    activeNav.value = 'route'
  }
})

// ─── 功能區塊導航列 ───
const navTabs = [
  { key: 'route', label: '路線' },
  { key: 'ride', label: '叫車' },
  { key: 'ticket', label: '購票' },
  { key: 'sharing', label: '租車' },
  { key: 'parking', label: '停車' },
  { key: 'badge', label: '獎章' },
] as const

type NavKey = typeof navTabs[number]['key']
const activeNav = ref<NavKey>('route')

function handleNavClick(key: NavKey) {
  activeNav.value = key
}

// ─── Mock Data ───

// 情境推播
const mockSuggestions: ContextSuggestion[] = [
  {
    id: 'push-1',
    title: '前往鼎泰豐信義店？',
    description: '根據您 19:00 的訂位時間，建議 18:15 出發',
    destination: '鼎泰豐信義店',
    triggerType: 'cross-module',
    suggestedMode: 'metro',
  },
  {
    id: 'push-2',
    title: '今天可能下雨',
    description: '下午 3 點後降雨機率 80%，建議搭乘大眾運輸或叫車',
    destination: '',
    triggerType: 'weather',
    suggestedMode: 'bus',
  },
]

// 常用路線
const mockFavoriteRoutes: FavoriteRoute[] = [
  { id: 'fav-1', name: '上班通勤', origin: '家', destination: '公司', preferredMode: 'metro', lastUsed: new Date().toISOString() },
  { id: 'fav-2', name: '回家', origin: '公司', destination: '家', preferredMode: 'metro', lastUsed: new Date(Date.now() - 86400000).toISOString() },
  { id: 'fav-3', name: '常去餐廳', origin: '公司', destination: '鼎泰豐信義店', preferredMode: 'walk', lastUsed: new Date(Date.now() - 172800000).toISOString() },
]

// 票券
const tickets = ref<Ticket[]>([
  {
    id: 'ticket-1',
    type: 'hsr',
    origin: '台北',
    destination: '桃園',
    date: '2026-07-28',
    time: '19:00',
    trainNo: '1309',
    qrCode: 'mock-qr-1',
    status: 'unused',
    label: '高鐵',
  },
  {
    id: 'ticket-2',
    type: 'train',
    origin: '台北',
    destination: '基隆',
    date: '2026-07-25',
    time: '14:30',
    trainNo: '101',
    qrCode: 'mock-qr-2',
    status: 'used',
    label: '台鐵',
  },
])

// 碳排放資料
const mockEmissions: EmissionData = {
  total: 45.2,
  goal: 80,
  breakdown: {
    car: 32,
    transit: 8.2,
    green: 5,
  },
  badges: [
    { id: 'badge-1', icon: '🌱', name: '綠色通勤', description: '連續7天使用大眾運輸', unlocked: true },
    { id: 'badge-2', icon: '🚴', name: '單車達人', description: '累計騎乘50km', unlocked: true },
    { id: 'badge-3', icon: '🌍', name: '減碳先鋒', description: '本月碳排低於目標20%', unlocked: false },
  ],
}

// ─── 事件處理 ───

// ContextPush 事件
function handlePlanRoute(suggestion: ContextSuggestion) {
  if (suggestion.destination) {
    setRouteDestination(suggestion.destination)
  }
  activeNav.value = 'route'
}

function handleCallRide(suggestion: ContextSuggestion) {
  if (suggestion.destination) {
    setRideDestination(suggestion.destination)
  }
  activeNav.value = 'ride'
}

function handleDismiss(id: string) {
  dismissSuggestion(id)
}

// FavoriteRoutes 事件
function handleSelectRoute(route: FavoriteRoute) {
  setRouteDestination(route.destination, route.origin)
  activeNav.value = 'route'
}

function handleFavCallRide(route: FavoriteRoute) {
  setRideDestination(route.destination)
  activeNav.value = 'ride'
}

function handleFavAdd() {
  // TODO: 開啟新增常用路線表單
  console.log('新增常用路線')
}

function handleFavEdit(route: FavoriteRoute) {
  console.log('編輯路線', route.name)
}

function handleFavDelete(routeId: string) {
  console.log('刪除路線', routeId)
}

// TicketBooking 事件
function handleTicketPurchased(ticket: PurchasedTicket) {
  const newTicket: Ticket = {
    id: ticket.id,
    type: ticket.type as Ticket['type'],
    origin: ticket.origin,
    destination: ticket.destination,
    date: ticket.date,
    time: ticket.time,
    trainNo: ticket.trainNo,
    qrCode: `qr-${ticket.id}`,
    status: 'unused',
    label: ticket.type === 'hsr' ? '高鐵' : '台鐵',
  }
  tickets.value.unshift(newTicket)
}

// TicketWallet 事件
function handleTicketUse(ticketId: string) {
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (ticket) ticket.status = 'used'
}
</script>

<template>
  <div class="transport-module">
    <!-- 功能區塊快捷導航列 -->
    <nav class="transport-nav" aria-label="功能區塊導航">
      <div class="transport-nav-scroll">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="transport-nav-btn"
          :class="{ active: activeNav === tab.key }"
          :aria-current="activeNav === tab.key ? 'true' : undefined"
          @click="handleNavClick(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <main class="transport-page" role="main" aria-label="行模組">
      <!-- 情境智慧推播（所有頁面都顯示） -->
      <TransportContextPush
        :suggestions="mockSuggestions"
        @plan-route="handlePlanRoute"
        @call-ride="handleCallRide"
        @dismiss="handleDismiss"
      />

      <!-- 路線規劃 -->
      <template v-if="activeNav === 'route'">
        <TransportFavoriteRoutes
          :routes="mockFavoriteRoutes"
          @select-route="handleSelectRoute"
          @call-ride="handleFavCallRide"
          @add="handleFavAdd"
          @edit="handleFavEdit"
          @delete="handleFavDelete"
        />
        <TransportRoutePlanner
          :origin="sharedOrigin"
          :destination="sharedDestination"
        />
      </template>

      <!-- 叫車服務 -->
      <template v-if="activeNav === 'ride'">
        <TransportRideService
          :destination="sharedDestination"
        />
      </template>

      <!-- 模擬購票 -->
      <template v-if="activeNav === 'ticket'">
        <TransportTicketBooking
          @ticket-purchased="handleTicketPurchased"
        />
        <UiTicketWallet
          :tickets="tickets"
          @ticket-use="handleTicketUse"
        />
      </template>

      <!-- 共享運具 -->
      <template v-if="activeNav === 'sharing'">
        <TransportSharingVehicle
          vehicle-type="bike"
          :user-location="{ lat: 25.033, lng: 121.565 }"
        />
      </template>

      <!-- 停車助手 -->
      <template v-if="activeNav === 'parking'">
        <TransportParkingFinder
          :location="{ lat: 25.033, lng: 121.565 }"
        />
      </template>

      <!-- 獎章（碳足跡 + 成就） -->
      <template v-if="activeNav === 'badge'">
        <TransportCarbonTracker
          :emissions="mockEmissions"
        />
      </template>
    </main>
  </div>
</template>

<style scoped>
.transport-module {
  --color-primary: #f59e0b;
  --color-primary-light: #fffbeb;
  --color-secondary: #0ea5e9;
  --color-secondary-light: #e0f2fe;
}

.transport-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* 功能區塊快捷導航列 */
.transport-nav {
  position: sticky;
  top: 50px;
  z-index: 50;
  background: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  padding: var(--space-2, 8px) var(--space-4, 16px);
}

.transport-nav-scroll {
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.transport-nav-scroll::-webkit-scrollbar {
  display: none;
}

.transport-nav-btn {
  flex-shrink: 0;
  padding: var(--space-2, 8px) var(--space-4, 16px);
  min-height: 40px;
  border: 1.5px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.transport-nav-btn.active {
  color: #ffffff;
  background-color: var(--color-primary, #f59e0b);
  border-color: var(--color-primary, #f59e0b);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.transport-nav-btn:not(.active):hover {
  border-color: var(--color-primary, #f59e0b);
  color: var(--color-primary, #f59e0b);
}
</style>
