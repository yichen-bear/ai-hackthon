<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

// ─── Types（對齊客戶端 PreOrderShelf / GroupBuyHub） ───
type ProductCategory = 'festival' | 'famous' | 'limited' | 'exclusive'
type GroupCategory = 'daily' | 'fresh' | 'beverage' | 'solo'
type OrderSource = 'preorder' | 'groupbuy'
type ConsultStatus = 'pending' | 'accepted' | 'rejected'
type OrderStatus = 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'completed' | 'cancelled'
type GroupBuyStatus = 'open' | 'reached' | 'closed'

interface IncomingOrder {
  id: string
  feedbackNo: string
  source: OrderSource
  contactName: string
  contactPhone: string
  productName: string
  spec?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  paymentMethod: string
  pickupStore: string
  aiNote: string
  status: ConsultStatus
  createdAt: string
}

interface ManagedOrder {
  id: string
  orderNo: string
  source: OrderSource
  contactName: string
  contactPhone: string
  productName: string
  spec?: string
  quantity: number
  totalAmount: number
  paymentMethod: string
  pickupStore: string
  status: OrderStatus
  orderTime: string
  shipTime?: string
  completeTime?: string
}

interface GroupBuyCampaign {
  id: string
  productName: string
  spec: string
  soloPrice: number
  groupPrice: number
  originalPrice: number
  currentMembers: number
  targetMembers: number
  category: GroupCategory
  storeName: string
  deadline: string
  status: GroupBuyStatus
}

// ─── Tab 狀態 ───
const activeTab = ref<number>(0)
const tabs = ['叫貨訂單', '出貨管理', '團購進度']

// ─── Toast 系統 ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ─── 工具函數 ───
function getSourceLabel(source: OrderSource): string {
  return { preorder: 'i預購', groupbuy: 'i划算' }[source]
}
function getSourceIcon(source: OrderSource): string {
  return { preorder: '🏪', groupbuy: '🛒' }[source]
}
function getOrderStatusLabel(status: OrderStatus): string {
  return {
    confirmed: '已確認',
    preparing: '備貨中',
    ready: '可取貨',
    shipped: '已出貨',
    completed: '已完成',
    cancelled: '已取消',
  }[status]
}
function getGroupStatusLabel(status: GroupBuyStatus): string {
  return { open: '開團中', reached: '已成團', closed: '已結團' }[status]
}

// ─── Mock 資料：叫貨訂單（客戶下單/預購後產生） ───
const incomingOrders = ref<IncomingOrder[]>([
  {
    id: 'ic-1',
    feedbackNo: 'FB202407300010',
    source: 'preorder',
    contactName: '王小姐',
    contactPhone: '0912-***-456',
    productName: '中秋限定月餅禮盒',
    spec: '經典蛋黃酥 x6 入',
    quantity: 2,
    unitPrice: 680,
    totalAmount: 1360,
    paymentMethod: '💳 線上付款（OPEN錢包）',
    pickupStore: '7-11 信義門市',
    aiNote: '🤖 AI 標註：中秋送禮需求 / VIP 會員 / 建議優先備貨',
    status: 'pending',
    createdAt: '2024-07-30 10:15',
  },
  {
    id: 'ic-2',
    feedbackNo: 'FB202407300011',
    source: 'groupbuy',
    contactName: '林先生',
    contactPhone: '0933-***-789',
    productName: '舒潔衛生紙箱購',
    spec: '100 抽 x 72 包',
    quantity: 1,
    unitPrice: 599,
    totalAmount: 599,
    paymentMethod: '🏪 取貨付款',
    pickupStore: '7-11 松山門市',
    aiNote: '🤖 AI 標註：團購訂單 / 已達成團門檻 / 大型包裹注意取貨空間',
    status: 'pending',
    createdAt: '2024-07-30 11:30',
  },
  {
    id: 'ic-3',
    feedbackNo: 'FB202407300012',
    source: 'preorder',
    contactName: '陳媽媽',
    contactPhone: '0922-***-012',
    productName: '日本A5和牛禮盒',
    spec: '300g 霜降片',
    quantity: 1,
    unitPrice: 1980,
    totalAmount: 1980,
    paymentMethod: '💳 線上付款（信用卡）',
    pickupStore: '7-11 大安門市',
    aiNote: '🤖 AI 標註：限量商品 / 冷凍配送 / 預計到貨 8/5',
    status: 'pending',
    createdAt: '2024-07-30 14:20',
  },
  {
    id: 'ic-4',
    feedbackNo: 'FB202407300013',
    source: 'groupbuy',
    contactName: '張同學',
    contactPhone: '0955-***-321',
    productName: '光泉鮮乳量販組',
    spec: '1858ml x 6 瓶',
    quantity: 1,
    unitPrice: 399,
    totalAmount: 399,
    paymentMethod: '🏪 取貨付款',
    pickupStore: '7-11 公館門市',
    aiNote: '🤖 AI 標註：冷藏商品 / 保存期限短 / 建議到貨即通知',
    status: 'pending',
    createdAt: '2024-07-30 16:45',
  },
])

// ─── Mock 資料：出貨管理（已接受的訂單） ───
const managedOrders = ref<ManagedOrder[]>([
  {
    id: 'mo-1',
    orderNo: 'BK-2024-0001',
    source: 'preorder',
    contactName: '趙先生',
    contactPhone: '0966-***-888',
    productName: '法式甜點禮盒',
    spec: '馬卡龍 12 入',
    quantity: 1,
    totalAmount: 880,
    paymentMethod: '💳 線上付款',
    pickupStore: '7-11 忠孝門市',
    status: 'preparing',
    orderTime: '2024-07-29 18:00',
  },
  {
    id: 'mo-2',
    orderNo: 'BK-2024-0002',
    source: 'groupbuy',
    contactName: '孫太太',
    contactPhone: '0911-***-555',
    productName: '有機蔬菜箱',
    spec: '綜合時蔬 5kg',
    quantity: 1,
    totalAmount: 450,
    paymentMethod: '🏪 取貨付款',
    pickupStore: '7-11 內湖門市',
    status: 'ready',
    orderTime: '2024-07-29 09:30',
    shipTime: '2024-07-30 08:00',
  },
])

// ─── Mock 資料：團購進度 ───
const groupBuyCampaigns = ref<GroupBuyCampaign[]>([
  { id: 'g-1', productName: '舒潔衛生紙箱購', spec: '100抽x72包', soloPrice: 699, groupPrice: 599, originalPrice: 799, currentMembers: 18, targetMembers: 20, category: 'daily', storeName: '7-11 松山門市', deadline: '2024-08-05', status: 'open' },
  { id: 'g-2', productName: '光泉鮮乳量販組', spec: '1858ml x 6瓶', soloPrice: 459, groupPrice: 399, originalPrice: 520, currentMembers: 10, targetMembers: 10, category: 'fresh', storeName: '7-11 公館門市', deadline: '2024-08-03', status: 'reached' },
  { id: 'g-3', productName: '可口可樂量販箱', spec: '330ml x 24罐', soloPrice: 299, groupPrice: 249, originalPrice: 360, currentMembers: 5, targetMembers: 15, category: 'beverage', storeName: '7-11 信義門市', deadline: '2024-08-10', status: 'open' },
  { id: 'g-4', productName: '花王洗衣精超值組', spec: '2.4kg x 3瓶', soloPrice: 549, groupPrice: 469, originalPrice: 650, currentMembers: 12, targetMembers: 12, category: 'daily', storeName: '7-11 大安門市', deadline: '2024-08-01', status: 'reached' },
])

// ─── Computed Stats ───
const pendingOrderCount = computed(() =>
  incomingOrders.value.filter(o => o.status === 'pending').length
)
const activeShipCount = computed(() =>
  managedOrders.value.filter(o => !['completed', 'cancelled'].includes(o.status)).length
)
const reachedGroupCount = computed(() =>
  groupBuyCampaigns.value.filter(g => g.status === 'reached').length
)

let orderCounter = 3

// ─── Actions：叫貨訂單 → 接受 ───
function acceptOrder(incoming: IncomingOrder) {
  const newOrder: ManagedOrder = {
    id: `mo-${orderCounter}`,
    orderNo: `BK-2024-${String(orderCounter).padStart(4, '0')}`,
    source: incoming.source,
    contactName: incoming.contactName,
    contactPhone: incoming.contactPhone,
    productName: incoming.productName,
    spec: incoming.spec,
    quantity: incoming.quantity,
    totalAmount: incoming.totalAmount,
    paymentMethod: incoming.paymentMethod,
    pickupStore: incoming.pickupStore,
    status: 'confirmed',
    orderTime: new Date().toLocaleString('zh-TW', { hour12: false }),
  }
  orderCounter++
  managedOrders.value.unshift(newOrder)
  incoming.status = 'accepted'
  showToast(`✅ 已接受訂單：${incoming.contactName} — ${incoming.productName}`)
}

function rejectOrder(incoming: IncomingOrder) {
  incoming.status = 'rejected'
  showToast(`❌ 已拒絕：${incoming.contactName} 的訂單`)
}

// ─── Actions：出貨管理 ───
function advanceOrderStatus(order: ManagedOrder) {
  const flow: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'shipped', 'completed']
  const idx = flow.indexOf(order.status)
  if (idx >= 0 && idx < flow.length - 1) {
    order.status = flow[idx + 1]
    if (order.status === 'shipped') {
      order.shipTime = new Date().toLocaleString('zh-TW', { hour12: false })
    }
    if (order.status === 'completed') {
      order.completeTime = new Date().toLocaleString('zh-TW', { hour12: false })
      showToast(`🎉 訂單完成：${order.contactName} 已取貨`)
    } else {
      showToast(`📦 狀態更新：${getOrderStatusLabel(order.status)}`)
    }
  }
}

function cancelManagedOrder(order: ManagedOrder) {
  order.status = 'cancelled'
  showToast(`🚫 已取消：${order.orderNo}`)
}

// ─── Actions：團購管理 ───
function closeGroup(campaign: GroupBuyCampaign) {
  campaign.status = 'closed'
  showToast(`🔒 已結團：${campaign.productName}`)
}

function getProgressPercent(campaign: GroupBuyCampaign): number {
  if (campaign.targetMembers <= 0) return 100
  return Math.min((campaign.currentMembers / campaign.targetMembers) * 100, 100)
}

// ─── Demo 重設 ───
function resetDemo() {
  incomingOrders.value.forEach(o => { o.status = 'pending' })
  managedOrders.value = [
    { id: 'mo-1', orderNo: 'BK-2024-0001', source: 'preorder', contactName: '趙先生', contactPhone: '0966-***-888', productName: '法式甜點禮盒', spec: '馬卡龍 12 入', quantity: 1, totalAmount: 880, paymentMethod: '💳 線上付款', pickupStore: '7-11 忠孝門市', status: 'preparing', orderTime: '2024-07-29 18:00' },
    { id: 'mo-2', orderNo: 'BK-2024-0002', source: 'groupbuy', contactName: '孫太太', contactPhone: '0911-***-555', productName: '有機蔬菜箱', spec: '綜合時蔬 5kg', quantity: 1, totalAmount: 450, paymentMethod: '🏪 取貨付款', pickupStore: '7-11 內湖門市', status: 'ready', orderTime: '2024-07-29 09:30', shipTime: '2024-07-30 08:00' },
  ]
  groupBuyCampaigns.value.forEach(g => {
    g.status = g.currentMembers >= g.targetMembers ? 'reached' : 'open'
  })
  orderCounter = 3
  showToast('🔄 已重設所有資料')
}
</script>

<template>
  <div class="w-full max-w-[430px] mx-auto min-h-screen bg-[#fafaf9] relative flex flex-col pb-20 shadow-xl border-x border-[#e2e8f0]">

    <!-- ═══ Header ═══ -->
    <header class="ba__header">
      <div class="ba__header-left">
        <span>🛒 i預購 / i划算 賣家端</span>
      </div>
      <div class="ba__header-center">
        <NuxtLink
          class="px-3 py-1 bg-[#ecfdf5] text-[#10b981] border border-[#10b981]/20 rounded-full text-xs font-bold inline-flex items-center gap-1 no-underline"
          to="/booking"
        >
          📱 切換至用戶端
        </NuxtLink>
      </div>
      <div class="ba__header-right">
        <span>👤 賣家中心</span>
      </div>
    </header>

    <main class="ba__content" role="main">

      <!-- ═══ 頂部統計 ═══ -->
      <section class="ba__stats" aria-label="統計概覽">
        <div class="ba__stat-badge ba__stat-badge--red">
          <span>🔴 待處理 ({{ pendingOrderCount }})</span>
        </div>
        <div class="ba__stat-badge ba__stat-badge--blue">
          <span>📦 出貨中 ({{ activeShipCount }})</span>
        </div>
        <div class="ba__stat-badge ba__stat-badge--green">
          <span>✅ 已成團 ({{ reachedGroupCount }})</span>
        </div>
      </section>

      <!-- ═══ Tab ═══ -->
      <nav class="ba__tabs" role="tablist" aria-label="賣家管理功能切換">
        <button
          v-for="(tab, idx) in tabs"
          :key="tab"
          role="tab"
          :aria-selected="activeTab === idx"
          :aria-controls="`panel-${idx}`"
          class="ba__tab"
          :class="{ 'ba__tab--active': activeTab === idx }"
          @click="activeTab = idx"
        >
          {{ ['🛒', '📦', '👥'][idx] }} {{ tab }}
        </button>
      </nav>

      <!-- ═══ Tab 1：叫貨訂單 ═══ -->
      <section v-show="activeTab === 0" id="panel-0" role="tabpanel" aria-label="客戶下單/預購訂單">
        <div v-if="incomingOrders.filter(o => o.status === 'pending').length === 0" class="ba__empty">
          <p>🎉 目前沒有待處理的訂單</p>
        </div>
        <div v-for="order in incomingOrders" :key="order.id" class="ba__card">
          <div class="ba__card-row">
            <span class="ba__card-feedbackno">{{ order.feedbackNo }}</span>
            <span
              class="ba__badge"
              :class="{
                'ba__badge--amber': order.status === 'pending',
                'ba__badge--green': order.status === 'accepted',
                'ba__badge--gray': order.status === 'rejected',
              }"
            >
              {{ order.status === 'pending' ? '⏳ 待處理' : order.status === 'accepted' ? '✅ 已接受' : '❌ 已拒絕' }}
            </span>
          </div>

          <!-- 來源標籤 -->
          <div class="ba__source-tag">
            {{ getSourceIcon(order.source) }} {{ getSourceLabel(order.source) }}
          </div>

          <!-- 客戶資訊 -->
          <div class="ba__customer-info">
            <span class="ba__customer-name">👤 {{ order.contactName }}</span>
            <span class="ba__customer-phone">📞 {{ order.contactPhone }}</span>
          </div>

          <!-- 商品明細 -->
          <div class="ba__product-detail">
            <p class="ba__product-name">{{ order.productName }}</p>
            <p v-if="order.spec" class="ba__product-spec">規格：{{ order.spec }}</p>
            <div class="ba__product-row">
              <span>數量：{{ order.quantity }} 件</span>
              <span>單價：${{ order.unitPrice }}</span>
              <span class="ba__product-total">合計 ${{ order.totalAmount }}</span>
            </div>
          </div>

          <!-- 付款與取貨 -->
          <div class="ba__card-details">
            <span>{{ order.paymentMethod }}</span>
            <span>🏪 {{ order.pickupStore }}</span>
          </div>
          <div class="ba__card-details">
            <span>🕐 {{ order.createdAt }}</span>
          </div>

          <!-- AI 標註 -->
          <p class="ba__card-ai-note">{{ order.aiNote }}</p>

          <!-- 操作 -->
          <div v-if="order.status === 'pending'" class="ba__btn-group">
            <button class="ba__action-btn" @click="acceptOrder(order)">
              ✅ 接受訂單
            </button>
            <button class="ba__action-btn ba__action-btn--outline-red" @click="rejectOrder(order)">
              ❌ 拒絕
            </button>
          </div>
          <div v-else-if="order.status === 'accepted'" class="ba__status-msg ba__status-msg--success">
            ✅ 已接受 — 進入出貨流程
          </div>
          <div v-else class="ba__status-msg ba__status-msg--warn">
            ❌ 已拒絕此訂單
          </div>
        </div>
      </section>

      <!-- ═══ Tab 2：出貨管理 ═══ -->
      <section v-show="activeTab === 1" id="panel-1" role="tabpanel" aria-label="出貨管理">
        <div v-if="managedOrders.length === 0" class="ba__empty">
          <p>📦 尚無進行中訂單</p>
        </div>
        <div v-for="order in managedOrders" :key="order.id" class="ba__card">
          <div class="ba__card-row">
            <span class="ba__card-orderno">{{ order.orderNo }}</span>
            <span
              class="ba__badge"
              :class="{
                'ba__badge--blue': ['confirmed', 'preparing'].includes(order.status),
                'ba__badge--amber': order.status === 'ready',
                'ba__badge--green': ['shipped', 'completed'].includes(order.status),
                'ba__badge--gray': order.status === 'cancelled',
              }"
            >
              {{ getOrderStatusLabel(order.status) }}
            </span>
          </div>

          <div class="ba__source-tag">
            {{ getSourceIcon(order.source) }} {{ getSourceLabel(order.source) }}
          </div>

          <div class="ba__customer-info">
            <span class="ba__customer-name">👤 {{ order.contactName }}</span>
            <span class="ba__customer-phone">📞 {{ order.contactPhone }}</span>
          </div>

          <div class="ba__product-detail">
            <p class="ba__product-name">{{ order.productName }}</p>
            <p v-if="order.spec" class="ba__product-spec">規格：{{ order.spec }}</p>
            <div class="ba__product-row">
              <span>數量：{{ order.quantity }} 件</span>
              <span class="ba__product-total">${{ order.totalAmount }}</span>
            </div>
          </div>

          <div class="ba__card-details">
            <span>{{ order.paymentMethod }}</span>
            <span>🏪 {{ order.pickupStore }}</span>
          </div>

          <div class="ba__card-details ba__card-details--small">
            <span>📝 下單 {{ order.orderTime }}</span>
            <span v-if="order.shipTime">🚚 出貨 {{ order.shipTime }}</span>
            <span v-if="order.completeTime">✅ 完成 {{ order.completeTime }}</span>
          </div>

          <!-- 狀態推進 -->
          <div v-if="!['completed', 'cancelled'].includes(order.status)" class="ba__btn-group">
            <button class="ba__action-btn" @click="advanceOrderStatus(order)">
              ▶️ {{ order.status === 'confirmed' ? '開始備貨' : order.status === 'preparing' ? '備貨完成' : order.status === 'ready' ? '通知取貨' : '確認完成' }}
            </button>
            <button class="ba__action-btn ba__action-btn--outline-red" @click="cancelManagedOrder(order)">
              取消
            </button>
          </div>
          <div v-else-if="order.status === 'completed'" class="ba__status-msg ba__status-msg--success">
            🎉 訂單完成
          </div>
          <div v-else class="ba__status-msg ba__status-msg--warn">
            🚫 訂單已取消
          </div>
        </div>
      </section>

      <!-- ═══ Tab 3：團購進度 ═══ -->
      <section v-show="activeTab === 2" id="panel-2" role="tabpanel" aria-label="團購成團進度">
        <div v-for="campaign in groupBuyCampaigns" :key="campaign.id" class="ba__card">
          <div class="ba__card-row">
            <span class="ba__card-title" style="margin:0">{{ campaign.productName }}</span>
            <span
              class="ba__badge"
              :class="{
                'ba__badge--amber': campaign.status === 'open',
                'ba__badge--green': campaign.status === 'reached',
                'ba__badge--gray': campaign.status === 'closed',
              }"
            >
              {{ getGroupStatusLabel(campaign.status) }}
            </span>
          </div>

          <p class="ba__card-meta">{{ campaign.spec }} · 🏪 {{ campaign.storeName }}</p>

          <!-- 價格 -->
          <div class="ba__price-row">
            <span class="ba__price-solo">一人享 ${{ campaign.soloPrice }}</span>
            <span class="ba__price-group">揪團 ${{ campaign.groupPrice }}</span>
            <span class="ba__price-original">${{ campaign.originalPrice }}</span>
          </div>

          <!-- 進度條 -->
          <div class="ba__progress-section">
            <div class="ba__progress-bar">
              <div
                class="ba__progress-fill"
                :style="{ width: `${getProgressPercent(campaign)}%` }"
                :class="{ 'ba__progress-fill--full': campaign.currentMembers >= campaign.targetMembers }"
              ></div>
            </div>
            <div class="ba__progress-info">
              <span>👥 {{ campaign.currentMembers }} / {{ campaign.targetMembers }} 人</span>
              <span>📅 截止 {{ campaign.deadline }}</span>
            </div>
          </div>

          <!-- 操作 -->
          <button
            v-if="campaign.status !== 'closed'"
            class="ba__action-btn"
            :class="campaign.status === 'reached' ? '' : 'ba__action-btn--outline'"
            @click="closeGroup(campaign)"
          >
            {{ campaign.status === 'reached' ? '🔒 結團出貨' : '⏹️ 提前結團' }}
          </button>
          <div v-else class="ba__status-msg ba__status-msg--info">
            🔒 已結團 — 進入出貨流程
          </div>
        </div>
      </section>

    </main>

    <!-- Toast -->
    <Transition name="toast-fade">
      <div v-if="toastMessage" class="ba__toast">{{ toastMessage }}</div>
    </Transition>

    <!-- Demo -->
    <div class="ba__demo-panel">
      <button class="ba__demo-btn" @click="resetDemo">🔄 重設</button>
    </div>

  </div>
</template>

<style scoped>
/* ═══ Header ═══ */
.ba__header {
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
.ba__header-left { font-size: var(--text-sm, 13px); font-weight: 600; color: var(--color-text-primary, #1c1917); white-space: nowrap; }
.ba__header-center { display: flex; align-items: center; justify-content: center; }
.ba__header-right { font-size: var(--text-sm, 13px); font-weight: 600; color: var(--color-text-primary, #1c1917); white-space: nowrap; }

/* ═══ Content ═══ */
.ba__content { display: flex; flex-direction: column; gap: var(--space-4, 16px); padding: var(--space-4, 16px); flex: 1; }

/* ═══ Stats ═══ */
.ba__stats { display: flex; justify-content: center; gap: var(--space-2, 8px); }
.ba__stat-badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 9999px; font-size: var(--text-xs, 11px); font-weight: 600; white-space: nowrap; }
.ba__stat-badge--red { background: #ffe4e6; color: #e11d48; }
.ba__stat-badge--blue { background: #e0f2fe; color: #0369a1; }
.ba__stat-badge--green { background: #dcfce7; color: #16a34a; }

/* ═══ Tabs ═══ */
.ba__tabs { display: flex; gap: 0; background: var(--color-bg-card, #ffffff); border-radius: 16px; border: 1px solid var(--color-border, #e2e8f0); overflow: hidden; }
.ba__tab { flex: 1; padding: 12px 8px; border: none; background: transparent; font-size: var(--text-sm, 13px); font-weight: 600; font-family: inherit; color: var(--color-text-secondary, #78716c); cursor: pointer; transition: all 0.15s ease; text-align: center; white-space: nowrap; }
.ba__tab:not(:last-child) { border-right: 1px solid var(--color-border, #e2e8f0); }
.ba__tab:focus { outline: 2px solid #10b981; outline-offset: -2px; }
.ba__tab--active { background: #10b981; color: #ffffff; }

/* ═══ Card ═══ */
.ba__card { background: var(--color-bg-card, #ffffff); border-radius: 16px; border: 1px solid var(--color-border, #e2e8f0); padding: var(--space-4, 16px); display: flex; flex-direction: column; gap: var(--space-3, 12px); margin-bottom: var(--space-3, 12px); }
.ba__card:last-child { margin-bottom: 0; }

.ba__card-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.ba__card-title { margin: 0; font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-text-primary, #1c1917); }
.ba__card-meta { margin: 0; font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #78716c); }
.ba__card-feedbackno, .ba__card-orderno { font-size: var(--text-sm, 13px); font-weight: 700; color: #10b981; font-family: monospace; }

/* ═══ Source tag ═══ */
.ba__source-tag { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-xs, 11px); font-weight: 600; color: #7c3aed; background: #f3e8ff; padding: 2px 10px; border-radius: 9999px; width: fit-content; }

/* ═══ Customer info ═══ */
.ba__customer-info { display: flex; align-items: center; gap: var(--space-3, 12px); }
.ba__customer-name { font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-text-primary, #1c1917); }
.ba__customer-phone { font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #78716c); }

/* ═══ Product detail ═══ */
.ba__product-detail { background: #f8fafc; border-radius: 12px; padding: var(--space-3, 12px); }
.ba__product-name { margin: 0 0 4px; font-size: var(--text-base, 15px); font-weight: 600; color: var(--color-text-primary, #1c1917); }
.ba__product-spec { margin: 0 0 8px; font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #78716c); }
.ba__product-row { display: flex; align-items: center; gap: var(--space-3, 12px); font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #78716c); }
.ba__product-total { font-weight: 700; color: #10b981; }

/* ═══ Card details ═══ */
.ba__card-details { display: flex; flex-wrap: wrap; gap: var(--space-2, 8px); font-size: var(--text-sm, 13px); color: var(--color-text-secondary, #78716c); }
.ba__card-details--small { font-size: var(--text-xs, 11px); }
.ba__card-ai-note { margin: 0; font-size: var(--text-sm, 13px); color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 8px 12px; line-height: 1.5; }

/* ═══ Price row ═══ */
.ba__price-row { display: flex; align-items: center; gap: var(--space-2, 8px); }
.ba__price-solo { font-size: var(--text-sm, 13px); font-weight: 700; color: #10b981; }
.ba__price-group { font-size: var(--text-sm, 13px); font-weight: 700; color: #7c3aed; }
.ba__price-original { font-size: var(--text-xs, 11px); color: #9ca3af; text-decoration: line-through; }

/* ═══ Progress ═══ */
.ba__progress-section { display: flex; flex-direction: column; gap: 6px; }
.ba__progress-bar { height: 8px; background: #e0f2fe; border-radius: 9999px; overflow: hidden; }
.ba__progress-fill { height: 100%; background: #10b981; border-radius: 9999px; transition: width 0.3s ease; }
.ba__progress-fill--full { background: #7c3aed; }
.ba__progress-info { display: flex; justify-content: space-between; font-size: var(--text-xs, 11px); color: var(--color-text-secondary, #78716c); }

/* ═══ Badge ═══ */
.ba__badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: var(--text-xs, 11px); font-weight: 600; white-space: nowrap; }
.ba__badge--green { background: #dcfce7; color: #16a34a; }
.ba__badge--blue { background: #e0f2fe; color: #0369a1; }
.ba__badge--amber { background: #fef3c7; color: #d97706; }
.ba__badge--gray { background: #f1f5f9; color: #64748b; }

/* ═══ Buttons ═══ */
.ba__action-btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 12px 16px; background-color: #10b981; color: #ffffff; border: none; border-radius: 12px; font-size: var(--text-base, 15px); font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity 0.15s ease, transform 0.1s ease; }
.ba__action-btn:hover:not(:disabled) { opacity: 0.85; }
.ba__action-btn:active:not(:disabled) { transform: scale(0.97); }
.ba__action-btn:focus { outline: 2px solid #10b981; outline-offset: 2px; }
.ba__action-btn--outline { background: transparent; border: 1.5px solid #10b981; color: #10b981; }
.ba__action-btn--outline-red { background: transparent; border: 1.5px solid #e11d48; color: #e11d48; }
.ba__btn-group { display: flex; gap: var(--space-2, 8px); }
.ba__btn-group .ba__action-btn { flex: 1; }

/* ═══ Status msg ═══ */
.ba__status-msg { font-size: var(--text-sm, 13px); font-weight: 600; padding: 8px 12px; border-radius: 12px; text-align: center; }
.ba__status-msg--success { background: #dcfce7; color: #16a34a; }
.ba__status-msg--info { background: #e0f2fe; color: #0369a1; }
.ba__status-msg--warn { background: #fef3c7; color: #d97706; }

/* ═══ Empty ═══ */
.ba__empty { text-align: center; padding: 32px 16px; color: var(--color-text-secondary, #78716c); font-size: var(--text-base, 15px); }

/* ═══ Toast ═══ */
.ba__toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; background: #1e293b; color: #ffffff; font-size: var(--text-sm, 13px); font-weight: 600; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); white-space: nowrap; }

/* ═══ Demo ═══ */
.ba__demo-panel { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
.ba__demo-btn { display: flex; align-items: center; justify-content: center; padding: 8px 14px; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: opacity 0.15s, transform 0.1s; white-space: nowrap; background: #78716c; color: #ffffff; }
.ba__demo-btn:active { transform: scale(0.95); }

/* ═══ Toast animation ═══ */
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
