<script setup lang="ts">
/**
 * 預模組主頁面
 * 路由: /booking
 * 作用域 Token 覆寫：翡翠綠主色 + 琥珀色次色
 * 組裝所有預模組元件並串接資料流
 */

import type { PreOrderProduct } from '~/components/booking/PreOrderShelf.vue'
import type { GroupBuyItem } from '~/components/booking/GroupBuyHub.vue'
import type { BookingOrder } from '~/components/booking/OrderTracker.vue'
import type { PickupItem } from '~/components/booking/PickupReminder.vue'
import type { WishlistItem } from '~/components/booking/WishlistPanel.vue'
import type { StoreInfo } from '~/composables/useBookingState'

const { agentRecommendation, currentStore, dismissRecommendation } = useBookingState()

// ─── 功能區塊導航列 ───
const navTabs = [
  { key: 'pickup', label: '取貨' },
  { key: 'preorder', label: 'i預購' },
  { key: 'groupbuy', label: 'i划算' },
  { key: 'order', label: '訂單' },
  { key: 'wishlist', label: '收藏' },
] as const

type NavKey = (typeof navTabs)[number]['key']
const activeNav = ref<NavKey>('pickup')

function handleNavClick(key: NavKey) {
  activeNav.value = key
}

// ═══════════════════════════════════════════
// Mock 資料
// ═══════════════════════════════════════════

const MOCK_STORES: StoreInfo[] = [
  { id: 'store-xinyi', name: '7-11 信義門市', address: '台北市信義區信義路五段 7 號', phone: '02-2345-6789', hours: '24小時', lat: 25.0330, lng: 121.5654 },
  { id: 'store-zhongxiao', name: '7-11 忠孝門市', address: '台北市大安區忠孝東路四段 100 號', phone: '02-2771-1234', hours: '24小時', lat: 25.0418, lng: 121.5495 },
  { id: 'store-nanjing', name: '7-11 南京門市', address: '台北市中山區南京東路二段 50 號', phone: '02-2567-8901', hours: '06:00-23:00', lat: 25.0522, lng: 121.5314 },
]

// ─── i預購商品 ───
const initialProducts: PreOrderProduct[] = [
  { id: 'po-1', name: '2026 中秋限定 日出鳳梨酥禮盒', image: 'linear-gradient(135deg, #f59e0b, #d97706)', originalPrice: 680, preorderPrice: 580, tags: ['hot', 'limited'], deadline: '2026-09-15', category: 'festival', description: '嚴選台灣土鳳梨製作，金黃酥脆外皮搭配香甜內餡', specs: ['12入裝', '24入裝'] },
  { id: 'po-2', name: '微熱山丘 蘋果酥禮盒', image: 'linear-gradient(135deg, #ef4444, #dc2626)', originalPrice: 420, preorderPrice: 380, tags: ['exclusive'], deadline: '2026-08-30', category: 'famous', description: '日本青森蘋果搭配法式奶油酥皮', specs: ['6入裝', '10入裝'] },
  { id: 'po-3', name: '星巴克聯名 限量咖啡禮盒', image: 'linear-gradient(135deg, #10b981, #059669)', originalPrice: 1280, preorderPrice: 999, tags: ['limited', 'exclusive'], deadline: '2026-08-01', category: 'limited', description: '精選三款限定風味咖啡豆＋聯名馬克杯', specs: ['經典款', '限定款'] },
  { id: 'po-4', name: '郭元益 花好月圓禮盒', image: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', originalPrice: 520, preorderPrice: 450, tags: ['hot'], deadline: '2025-07-20', category: 'festival', description: '傳統月餅搭配創新口味，送禮體面大方', specs: ['綜合 8 入', '蛋黃酥 6 入'] },
]

// ─── i划算團購 ───
const initialGroups: GroupBuyItem[] = [
  { id: 'gb-1', productName: '舒潔衛生紙', spec: '72包/箱', soloPrice: 699, groupPrice: 599, originalPrice: 899, currentMembers: 3, targetMembers: 5, isSoloBuy: false, category: 'daily', storeId: 'store-xinyi', storeName: '7-11 信義門市', deadline: '2026-08-05', image: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
  { id: 'gb-2', productName: '白蘭洗衣精', spec: '2.5kg × 4瓶', soloPrice: 459, groupPrice: 389, originalPrice: 596, currentMembers: 7, targetMembers: 10, isSoloBuy: false, category: 'daily', storeId: 'store-xinyi', storeName: '7-11 信義門市', deadline: '2026-08-03', image: 'linear-gradient(135deg, #34d399, #10b981)' },
  { id: 'gb-3', productName: '有機蔬菜箱', spec: '綜合 8 種/箱', soloPrice: 499, groupPrice: 429, originalPrice: 650, currentMembers: 2, targetMembers: 3, isSoloBuy: false, category: 'fresh', storeId: 'store-zhongxiao', storeName: '7-11 忠孝門市', deadline: '2026-07-30', image: 'linear-gradient(135deg, #a3e635, #65a30d)' },
  { id: 'gb-4', productName: '可口可樂', spec: '330ml × 24 罐', soloPrice: 299, groupPrice: 299, originalPrice: 399, currentMembers: 1, targetMembers: 1, isSoloBuy: true, category: 'solo', storeId: 'store-xinyi', storeName: '7-11 信義門市', deadline: '2026-08-10', image: 'linear-gradient(135deg, #f87171, #ef4444)' },
]

// ─── 訂單 ───
const initialOrders: BookingOrder[] = [
  { id: 'ord-1', type: 'groupbuy', productName: '舒潔衛生紙 72包/箱', spec: '72包/箱', status: 'pending-group', currentStep: 0, totalSteps: 4, groupProgress: { current: 3, target: 5 }, pickupStore: '7-11 信義門市', createdAt: '2026-07-25' },
  { id: 'ord-2', type: 'preorder', productName: '中秋限定鳳梨酥禮盒', spec: '12入裝', status: 'shipping', currentStep: 2, totalSteps: 4, estimatedDate: '08/01', pickupStore: '7-11 松山門市', createdAt: '2026-07-20' },
  { id: 'ord-3', type: 'groupbuy', productName: '可口可樂 24罐裝', spec: '330ml × 24', status: 'ready', currentStep: 3, totalSteps: 4, pickupStore: '7-11 大安門市', createdAt: '2026-07-22' },
]

// ─── 取貨提醒 ───
const initialPickups: PickupItem[] = [
  { id: 'pk-1', orderId: 'ord-3', productName: '可口可樂 24罐裝', pickupCode: 'PK-20260728-001', store: MOCK_STORES[0], deadline: '2026-07-30', status: 'expiring' },
  { id: 'pk-2', orderId: 'ord-x', productName: '白蘭洗衣精 4瓶裝', pickupCode: 'PK-20260725-003', store: MOCK_STORES[1], deadline: '2026-08-05', status: 'pending' },
]

// ─── 收藏清單 ───
const initialWishlist: WishlistItem[] = [
  { id: 'wl-1', productId: 'po-1', productName: '2026 中秋限定 日出鳳梨酥禮盒', channel: 'preorder', currentPrice: 550, originalPrice: 580, hasPriceDrop: true, deadline: '2026-09-15', addedAt: '2026-07-20', image: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'wl-2', productId: 'gb-2', productName: '白蘭洗衣精 4瓶裝', channel: 'groupbuy', currentPrice: 389, originalPrice: 389, hasPriceDrop: false, deadline: '2026-08-03', addedAt: '2026-07-26', image: 'linear-gradient(135deg, #34d399, #10b981)' },
  { id: 'wl-3', productId: 'po-3', productName: '星巴克聯名限量咖啡禮盒', channel: 'preorder', currentPrice: 999, originalPrice: 999, hasPriceDrop: false, deadline: '2026-08-01', addedAt: '2026-07-15', image: 'linear-gradient(135deg, #10b981, #059669)' },
]

// ─── 響應式狀態 ───
const products = ref<PreOrderProduct[]>([...initialProducts])
const groups = ref<GroupBuyItem[]>(JSON.parse(JSON.stringify(initialGroups)))
const orders = ref<BookingOrder[]>(JSON.parse(JSON.stringify(initialOrders)))
const pickups = ref<PickupItem[]>(JSON.parse(JSON.stringify(initialPickups)))
const wishlist = ref<WishlistItem[]>([...initialWishlist])

// ═══════════════════════════════════════════
// 事件處理
// ═══════════════════════════════════════════

function handleAddPreorder(payload: { productId: string; quantity: number; spec?: string }) {
  const product = products.value.find((p) => p.id === payload.productId)
  if (!product) return
  // 新增訂單（取貨門市從共享狀態取得）
  const { selectedPickupStore } = useBookingState()
  const newOrder: BookingOrder = {
    id: `ord-${Date.now()}`,
    type: 'preorder',
    productName: product.name,
    spec: payload.spec || '',
    status: 'ordered',
    currentStep: 0,
    totalSteps: 4,
    estimatedDate: '08/15',
    pickupStore: selectedPickupStore.value.name,
    createdAt: new Date().toISOString().split('T')[0],
  }
  orders.value.unshift(newOrder)
}

function handleJoinGroup(payload: { productId: string; groupId: string; storeId: string }) {
  const group = groups.value.find((g) => g.id === payload.productId)
  if (!group || group.isSoloBuy) {
    // 一人即享：直接新增訂單
    if (group) {
      const { selectedPickupStore } = useBookingState()
      const newOrder: BookingOrder = {
        id: `ord-${Date.now()}`,
        type: 'groupbuy',
        productName: group.productName,
        spec: group.spec,
        status: 'preparing',
        currentStep: 2,
        totalSteps: 4,
        pickupStore: selectedPickupStore.value.name,
        createdAt: new Date().toISOString().split('T')[0],
      }
      orders.value.unshift(newOrder)
    }
    return
  }
  // 跟團：增加人數
  group.currentMembers = Math.min(group.currentMembers + 1, group.targetMembers)
}

function handleGoPickup(orderId: string) {
  handleNavClick('pickup')
}

function handleInviteFriend(orderId: string) {
  // 複製商品連結到剪貼簿
  const order = orders.value.find((o) => o.id === orderId)
  const link = `https://app.openpoint.com/booking/group/${orderId}`
  navigator.clipboard?.writeText(link)
  alert(`已複製連結：${link}\n分享給好友一起加入「${order?.productName}」團購！`)
}

function handleCancelOrder(orderId: string) {
  orders.value = orders.value.filter((o) => o.id !== orderId)
}

function handleConfirmPurchase(payload: { productId: string; quantity: number; storeId: string }) {
  const group = groups.value.find((g) => g.id === payload.productId)
  if (!group) return
  const newOrder: BookingOrder = {
    id: `ord-${Date.now()}`,
    type: 'groupbuy',
    productName: `${group.productName} ×${payload.quantity}`,
    spec: group.spec,
    status: group.isSoloBuy ? 'preparing' : 'pending-group',
    currentStep: group.isSoloBuy ? 2 : 0,
    totalSteps: 4,
    groupProgress: group.isSoloBuy ? undefined : { current: group.currentMembers + 1, target: group.targetMembers },
    createdAt: new Date().toISOString().split('T')[0],
  }
  orders.value.unshift(newOrder)
}

function handleNavigateToStore(payload: { storeId: string; mode: string }) {
  // 模擬跨模組聯動（行模組路線規劃）
  console.log(`[跨模組] 導航至門市 ${payload.storeId}，模式：${payload.mode}`)
}

function handleBuyNow(payload: { productId: string; channel: string }) {
  if (payload.channel === 'preorder') {
    handleNavClick('preorder')
  } else {
    handleNavClick('groupbuy')
  }
}

function handleRemoveWishlistItem(productId: string) {
  wishlist.value = wishlist.value.filter((w) => w.productId !== productId)
}

// ═══════════════════════════════════════════
// Demo 控制面板
// ═══════════════════════════════════════════

function demoSimulateJoinGroup() {
  // 隨機找一個未成團的團購增加人數
  const pending = groups.value.filter((g) => !g.isSoloBuy && g.currentMembers < g.targetMembers)
  if (pending.length > 0) {
    const target = pending[Math.floor(Math.random() * pending.length)]
    target.currentMembers = Math.min(target.currentMembers + 1, target.targetMembers)
  }
}

function demoSimulateArrival() {
  // 找第一筆進行中訂單切換為可取貨
  const active = orders.value.find((o) => o.status !== 'ready' && o.status !== 'completed')
  if (active) {
    active.status = 'ready'
    active.currentStep = 3
    // 新增取貨提醒
    const newPickup: PickupItem = {
      id: `pk-${Date.now()}`,
      orderId: active.id,
      productName: active.productName,
      pickupCode: `PK-${Date.now().toString().slice(-6)}`,
      store: MOCK_STORES[0],
      deadline: '2026-08-10',
      status: 'pending',
    }
    pickups.value.unshift(newPickup)
  }
}

function demoReset() {
  products.value = [...initialProducts]
  groups.value = JSON.parse(JSON.stringify(initialGroups))
  orders.value = JSON.parse(JSON.stringify(initialOrders))
  pickups.value = JSON.parse(JSON.stringify(initialPickups))
  wishlist.value = [...initialWishlist]
  agentRecommendation.value = null
}
</script>

<template>
  <div class="booking-module">
    <main role="main" class="booking-page">
      <!-- AI Agent 推薦提示區（條件顯示） -->
      <div
        v-if="agentRecommendation"
        class="agent-recommendation"
        aria-live="polite"
      >
        <div class="agent-rec-content">
          <span class="agent-rec-icon">🤖</span>
          <p class="agent-rec-message">{{ agentRecommendation.message }}</p>
          <button
            class="agent-rec-close"
            aria-label="關閉推薦提示"
            @click="dismissRecommendation"
          >
            ✕
          </button>
        </div>
        <div class="agent-rec-actions">
          <span
            class="agent-rec-badge"
            :class="agentRecommendation.channel === 'preorder' ? 'badge-secondary' : 'badge-primary'"
          >
            {{ agentRecommendation.channel === 'preorder' ? 'i預購' : 'i划算' }}
          </span>
          <button
            class="agent-rec-cta"
            aria-label="前往查看推薦商品"
            @click="handleNavClick(agentRecommendation.channel === 'preorder' ? 'preorder' : 'groupbuy')"
          >
            前往查看
          </button>
        </div>
      </div>

      <!-- 功能區塊快捷導航列 -->
      <nav class="booking-nav" aria-label="預模組功能導航">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="booking-nav-tab"
          :class="{ active: activeNav === tab.key }"
          :aria-label="`前往${tab.label}區塊`"
          @click="handleNavClick(tab.key)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- 取貨提醒 -->
      <template v-if="activeNav === 'pickup'">
        <BookingPickupReminder
          :pickups="pickups"
          @navigate-to-store="handleNavigateToStore"
          @confirm-pickup="() => {}"
        />
      </template>

      <!-- i預購 -->
      <template v-if="activeNav === 'preorder'">
        <BookingPreOrderShelf
          :products="products"
          @add-preorder="handleAddPreorder"
          @add-wishlist="(id) => {}"
        />
      </template>

      <!-- i划算 -->
      <template v-if="activeNav === 'groupbuy'">
        <BookingGroupBuyHub
          :groups="groups"
          :current-store="currentStore"
          @join-group="handleJoinGroup"
          @confirm-purchase="handleConfirmPurchase"
          @switch-store="() => {}"
        />
      </template>

      <!-- 訂單追蹤 -->
      <template v-if="activeNav === 'order'">
        <BookingOrderTracker
          :orders="orders"
          @go-pickup="handleGoPickup"
          @invite-friend="handleInviteFriend"
          @cancel-order="handleCancelOrder"
          @view-detail="() => {}"
        />
      </template>

      <!-- 收藏清單 -->
      <template v-if="activeNav === 'wishlist'">
        <BookingWishlistPanel
          :items="wishlist"
          @buy-now="handleBuyNow"
          @remove-item="handleRemoveWishlistItem"
        />
      </template>
    </main>

    <!-- Demo 控制面板 -->
    <div class="demo-panel">
      <button class="demo-btn" aria-label="模擬跟團" @click="demoSimulateJoinGroup">🛒 模擬跟團</button>
      <button class="demo-btn" aria-label="模擬到貨" @click="demoSimulateArrival">📦 模擬到貨</button>
      <button class="demo-btn" aria-label="重設狀態" @click="demoReset">🔄 重設</button>
    </div>
  </div>
</template>

<style scoped>
.booking-module {
  --color-primary: #10b981;
  --color-primary-light: #ecfdf5;
  --color-secondary: #f59e0b;
  --color-secondary-light: #fffbeb;
}

.booking-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
  padding-bottom: 80px;
}

/* ─── AI Agent 推薦提示區 ─── */
.agent-recommendation {
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-lg, 16px);
  padding: var(--space-3, 12px) var(--space-4, 16px);
}

.agent-rec-content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2, 8px);
}

.agent-rec-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.agent-rec-message {
  flex: 1;
  font-size: var(--text-sm, 13px);
  color: var(--color-text, #1f2937);
  margin: 0;
  line-height: 1.5;
}

.agent-rec-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--color-text-disabled, #9ca3af);
  padding: 4px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease;
}

.agent-rec-close:hover {
  opacity: 0.85;
}

.agent-rec-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-top: var(--space-2, 8px);
}

.agent-rec-badge {
  font-size: var(--text-xs, 11px);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

.badge-primary {
  background: var(--color-primary);
  color: #fff;
}

.badge-secondary {
  background: var(--color-secondary);
  color: #fff;
}

.agent-rec-cta {
  font-size: var(--text-sm, 13px);
  color: var(--color-primary);
  background: none;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-full, 9999px);
  padding: 6px 16px;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.agent-rec-cta:hover {
  opacity: 0.85;
}

/* ─── 功能導航列 ─── */
.booking-nav {
  position: sticky;
  top: 50px;
  z-index: 50;
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  background: #fff;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  padding: var(--space-2, 8px) var(--space-4, 16px);
  scrollbar-width: none;
}

.booking-nav::-webkit-scrollbar {
  display: none;
}

.booking-nav-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: var(--text-sm, 13px);
  border: 1.5px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-full, 9999px);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  color: var(--color-text-secondary, #78716c);
  font-weight: 500;
  min-height: 40px;
  transition: all 0.15s ease;
}

.booking-nav-tab.active {
  color: #ffffff;
  background-color: var(--color-primary, #10b981);
  border-color: var(--color-primary, #10b981);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.booking-nav-tab:not(.active):hover {
  border-color: var(--color-primary, #10b981);
  color: var(--color-primary, #10b981);
}

.booking-nav-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── Demo 控制面板 ─── */
.demo-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #fff;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-lg, 16px);
  padding: var(--space-2, 8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.demo-btn {
  padding: 6px 12px;
  font-size: var(--text-xs, 11px);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  background: #fff;
  cursor: pointer;
  min-height: 36px;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.demo-btn:hover {
  background: var(--color-primary-light, #ecfdf5);
}

.demo-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
