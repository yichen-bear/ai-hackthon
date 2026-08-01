<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

// ─── Types（對齊客戶端 RideService 的 CarType / RideMode） ───
type CarType = 'sedan' | 'van' | 'accessible' | 'pet-friendly'
type RideMode = 'instant' | 'scheduled'
type ConsultationStatus = 'pending' | 'converted' | 'rejected'
type OrderStatus = 'confirmed' | 'dispatched' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled'
type DriverStatus = 'idle' | 'on_trip' | 'offline'

interface ConsultationForm {
  id: string
  feedbackNo: string
  // 客戶資訊（與客戶端叫車送出的資訊一致）
  contactName: string
  contactPhone: string
  pickup: string
  destination: string
  carType: CarType
  mode: RideMode
  scheduledTime?: string
  passengers: number
  estimateMin: number
  estimateMax: number
  // AI 標註
  aiNote: string
  // 狀態與時間
  status: ConsultationStatus
  createdAt: string
}

interface Order {
  id: string
  orderNo: string
  // 來自諮詢單的客戶資訊
  contactName: string
  contactPhone: string
  pickup: string
  destination: string
  carType: CarType
  passengers: number
  // 訂單管理欄位
  assignedDriver?: string
  assignedPlate?: string
  eta?: number
  finalAmount?: number
  status: OrderStatus
  orderTime: string
  serviceTime?: string
  completeTime?: string
}

interface Driver {
  id: string
  name: string
  plate: string
  vehicleType: string
  rating: number
  status: DriverStatus
  currentLocation: string
  completedToday: number
}

// ─── Tab 狀態 ───
const activeTab = ref<number>(0)
const tabs = ['叫車訂單', '訂單管理', '車隊狀態']

// 支援 ?tab=0/1/2 跳轉
const adminRoute = useRoute()
onMounted(() => { const t = adminRoute.query.tab; if (t != null) activeTab.value = Number(t) })

// ─── Toast 系統 ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ─── 車種對應（與客戶端 RideService carOptions 一致） ───
function getCarTypeIcon(type: CarType): string {
  return { sedan: '🚗', van: '🚐', accessible: '♿', 'pet-friendly': '🐾' }[type]
}
function getCarTypeLabel(type: CarType): string {
  return { sedan: '一般轎車', van: '多人座車', accessible: '無障礙專車', 'pet-friendly': '寵物友善' }[type]
}
function getModeLabel(mode: RideMode): string {
  return { instant: '即時叫車', scheduled: '預約叫車' }[mode]
}
function getOrderStatusLabel(status: OrderStatus): string {
  return {
    confirmed: '已確認',
    dispatched: '已派車',
    picked_up: '已接客',
    in_transit: '行駛中',
    completed: '已完成',
    cancelled: '已取消',
  }[status]
}

// ─── Mock 資料：叫車訂單（客戶叫車後自動產生） ───
// 格式對齊 DB pms_form_feedback.feedback_content (formId=1005)
// 廠商端顯示時：contactName/Phone 來自解密後的加密欄位
// pickup/destination/carType/mode 來自 feedbackContent.data
const consultations = ref<ConsultationForm[]>([
  {
    id: 'c-1',
    feedbackNo: 'FB20260731001',
    contactName: '陳先生',
    contactPhone: '0912-***-678',
    pickup: '臺北市中山區南京東路二段50號',
    destination: '桃園國際機場第一航廈',
    carType: 'van',
    mode: 'scheduled',
    scheduledTime: '2026-08-05T06:30',
    passengers: 2,
    estimateMin: 900,
    estimateMax: 1100,
    aiNote: '🤖 AI 標註：趕飛機旅客 / 大型行李 / 建議多人座車 / 預約 08/05 06:30',
    status: 'pending',
    createdAt: '2026-07-31 09:15',
  },
  {
    id: 'c-2',
    feedbackNo: 'FB20260801001',
    contactName: '林奶奶',
    contactPhone: '0922-***-789',
    pickup: '臺北市大安區忠孝東路四段200號',
    destination: '台大醫院門診大樓',
    carType: 'accessible',
    mode: 'instant',
    passengers: 1,
    estimateMin: 180,
    estimateMax: 250,
    aiNote: '🤖 AI 標註：輪椅乘客 / 需無障礙車輛 / 醫療接送',
    status: 'pending',
    createdAt: '2026-08-01 08:30',
  },
  {
    id: 'c-3',
    feedbackNo: 'FB20260801002',
    contactName: '張小姐',
    contactPhone: '0933-***-012',
    pickup: '臺北市信義區松壽路20號',
    destination: '臺北市內湖區瑞光路300號',
    carType: 'sedan',
    mode: 'instant',
    passengers: 1,
    estimateMin: 250,
    estimateMax: 320,
    aiNote: '🤖 AI 標註：加班晚歸 / 偏好女司機',
    status: 'pending',
    createdAt: '2026-08-01 22:30',
  },
  {
    id: 'c-4',
    feedbackNo: 'FB20260801003',
    contactName: '王經理',
    contactPhone: '0955-***-321',
    pickup: '臺北市信義區信義路五段7號B1',
    destination: '桃園國際機場第二航廈',
    carType: 'van',
    mode: 'scheduled',
    scheduledTime: '2026-08-02T08:00',
    passengers: 3,
    estimateMin: 900,
    estimateMax: 1100,
    aiNote: '🤖 AI 標註：商務接送 / 大型行李×3 / 預約 08/02 08:00',
    status: 'pending',
    createdAt: '2026-08-01 18:45',
  },
])

// ─── Mock 資料：訂單（叫車訂單接受派車後） ───
const orders = ref<Order[]>([
  {
    id: 'o-1',
    orderNo: 'TR-2026-0001',
    contactName: '劉先生',
    contactPhone: '0966-***-888',
    pickup: '臺北市南港區經貿二路1號',
    destination: '新北市板橋區站前路5號',
    carType: 'sedan',
    passengers: 1,
    assignedDriver: '王志明',
    assignedPlate: 'DEF-5678',
    eta: 12,
    finalAmount: 320,
    status: 'in_transit',
    orderTime: '2026-07-31 13:50',
    serviceTime: '2026-07-31 14:02',
  },
  {
    id: 'o-2',
    orderNo: 'TR-2026-0002',
    contactName: '許小姐',
    contactPhone: '0911-***-555',
    pickup: '臺北市萬華區中華路一段',
    destination: '臺北市士林區忠誠路二段200號',
    carType: 'sedan',
    passengers: 2,
    assignedDriver: '張國榮',
    assignedPlate: 'PQR-2468',
    eta: 5,
    finalAmount: 380,
    status: 'dispatched',
    orderTime: '2026-07-31 14:20',
  },
])

// ─── Mock 資料：司機車隊 ───
const drivers = ref<Driver[]>([
  { id: 'd-1', name: '李大衛', plate: 'ABC-1234', vehicleType: 'Toyota Camry', rating: 4.9, status: 'idle', currentLocation: '中正區', completedToday: 8 },
  { id: 'd-2', name: '王志明', plate: 'DEF-5678', vehicleType: 'Tesla Model 3', rating: 4.8, status: 'on_trip', currentLocation: '信義區', completedToday: 12 },
  { id: 'd-3', name: '黃美玲', plate: 'GHI-9012', vehicleType: 'Toyota Sienta (無障礙)', rating: 5.0, status: 'idle', currentLocation: '大安區', completedToday: 6 },
  { id: 'd-4', name: '陳建宏', plate: 'JKL-3456', vehicleType: 'Lexus ES300h', rating: 4.7, status: 'idle', currentLocation: '松山區', completedToday: 10 },
  { id: 'd-5', name: '周雅婷', plate: 'MNO-7890', vehicleType: 'Toyota Prius', rating: 4.6, status: 'offline', currentLocation: '—', completedToday: 0 },
])

// ─── Computed Stats ───
const pendingConsultCount = computed(() =>
  consultations.value.filter(c => c.status === 'pending').length
)
const activeOrderCount = computed(() =>
  orders.value.filter(o => !['completed', 'cancelled'].includes(o.status)).length
)
const idleDriverCount = computed(() =>
  drivers.value.filter(d => d.status === 'idle').length
)

let orderCounter = 3

// ─── Actions：叫車訂單 → 接受派車 ───
function convertToOrder(consultation: ConsultationForm) {
  // 找到閒置司機
  const available = drivers.value.find(d => d.status === 'idle')
  if (!available) {
    showToast('⚠️ 目前無閒置司機，請稍後再試')
    return
  }

  // 接受派車，建立訂單
  const newOrder: Order = {
    id: `o-${orderCounter}`,
    orderNo: `TR-2024-${String(orderCounter).padStart(4, '0')}`,
    contactName: consultation.contactName,
    contactPhone: consultation.contactPhone,
    pickup: consultation.pickup,
    destination: consultation.destination,
    carType: consultation.carType,
    passengers: consultation.passengers,
    assignedDriver: available.name,
    assignedPlate: available.plate,
    eta: Math.floor(Math.random() * 10) + 3,
    finalAmount: consultation.estimateMin + Math.floor(Math.random() * (consultation.estimateMax - consultation.estimateMin)),
    status: 'dispatched',
    orderTime: new Date().toLocaleString('zh-TW', { hour12: false }),
  }
  orderCounter++

  orders.value.unshift(newOrder)
  consultation.status = 'converted'
  available.status = 'on_trip'

  showToast(`✅ 已派車：${available.name}（${available.plate}）→ ${consultation.contactName}`)
}

function rejectConsultation(consultation: ConsultationForm) {
  consultation.status = 'rejected'
  showToast(`❌ 已婉拒：${consultation.contactName} 的叫車訂單`)
}

// ─── Actions：訂單管理 ───
function advanceOrderStatus(order: Order) {
  const flow: OrderStatus[] = ['confirmed', 'dispatched', 'picked_up', 'in_transit', 'completed']
  const idx = flow.indexOf(order.status)
  if (idx >= 0 && idx < flow.length - 1) {
    order.status = flow[idx + 1]
    if (order.status === 'completed') {
      order.completeTime = new Date().toLocaleString('zh-TW', { hour12: false })
      // 釋放司機
      const driver = drivers.value.find(d => d.name === order.assignedDriver)
      if (driver) {
        driver.status = 'idle'
        driver.completedToday++
      }
      showToast(`🎉 行程完成：${order.contactName} 已抵達目的地`)
    } else {
      showToast(`📍 訂單狀態更新：${getOrderStatusLabel(order.status)}`)
    }
  }
}

function cancelOrder(order: Order) {
  order.status = 'cancelled'
  const driver = drivers.value.find(d => d.name === order.assignedDriver)
  if (driver) driver.status = 'idle'
  showToast(`🚫 已取消訂單：${order.orderNo}`)
}

// ─── Actions：車隊管理 ───
function toggleDriverStatus(driver: Driver) {
  if (driver.status === 'idle') driver.status = 'offline'
  else if (driver.status === 'offline') driver.status = 'idle'
}

function getDriverStatusLabel(status: DriverStatus): string {
  return { idle: '待命中', on_trip: '服務中', offline: '離線' }[status]
}

// ─── Demo 重設 ───
function resetDemo() {
  consultations.value.forEach(c => { c.status = 'pending' })
  orders.value = [
    {
      id: 'o-1', orderNo: 'TR-2026-0001', contactName: '劉先生', contactPhone: '0966-***-888',
      pickup: '臺北市南港區經貿二路1號', destination: '新北市板橋區站前路5號', carType: 'sedan', passengers: 1,
      assignedDriver: '王志明', assignedPlate: 'DEF-5678', eta: 12, finalAmount: 320,
      status: 'in_transit', orderTime: '2026-07-31 13:50', serviceTime: '2026-07-31 14:02',
    },
    {
      id: 'o-2', orderNo: 'TR-2026-0002', contactName: '許小姐', contactPhone: '0911-***-555',
      pickup: '臺北市萬華區中華路一段', destination: '臺北市士林區忠誠路二段200號', carType: 'sedan', passengers: 2,
      assignedDriver: '張國榮', assignedPlate: 'PQR-2468', eta: 5, finalAmount: 380,
      status: 'dispatched', orderTime: '2026-07-31 14:20',
    },
  ]
  drivers.value = [
    { id: 'd-1', name: '李大衛', plate: 'ABC-1234', vehicleType: 'Toyota Camry', rating: 4.9, status: 'idle', currentLocation: '中正區', completedToday: 8 },
    { id: 'd-2', name: '王志明', plate: 'DEF-5678', vehicleType: 'Tesla Model 3', rating: 4.8, status: 'on_trip', currentLocation: '信義區', completedToday: 12 },
    { id: 'd-3', name: '黃美玲', plate: 'GHI-9012', vehicleType: 'Toyota Sienta (無障礙)', rating: 5.0, status: 'idle', currentLocation: '大安區', completedToday: 6 },
    { id: 'd-4', name: '陳建宏', plate: 'JKL-3456', vehicleType: 'Lexus ES300h', rating: 4.7, status: 'idle', currentLocation: '松山區', completedToday: 10 },
    { id: 'd-5', name: '周雅婷', plate: 'MNO-7890', vehicleType: 'Toyota Prius', rating: 4.6, status: 'offline', currentLocation: '—', completedToday: 0 },
  ]
  orderCounter = 3
  showToast('🔄 已重設所有資料')
}
</script>

<template>
  <div class="admin-page pb-20">

    <!-- ═══ 主內容區 ═══ -->
    <main class="ta__content" role="main">

      <!-- ═══ 頂部數據 Badge 列 ═══ -->
      <section class="ta__stats" aria-label="統計概覽">
        <div class="ta__stat-badge ta__stat-badge--red">
          <span>🔴 待派遣 ({{ pendingConsultCount }})</span>
        </div>
        <div class="ta__stat-badge ta__stat-badge--blue">
          <span>🚗 服務中 ({{ activeOrderCount }})</span>
        </div>
        <div class="ta__stat-badge ta__stat-badge--green">
          <span>🟢 可派司機 ({{ idleDriverCount }})</span>
        </div>
      </section>

      <!-- ═══ Tab 切換列 ═══ -->
      <nav class="ta__tabs" role="tablist" aria-label="車隊管理功能切換">
        <button
          v-for="(tab, idx) in tabs"
          :key="tab"
          role="tab"
          :aria-selected="activeTab === idx"
          :aria-controls="`panel-${idx}`"
          class="ta__tab"
          :class="{ 'ta__tab--active': activeTab === idx }"
          @click="activeTab = idx"
        >
          {{ ['🚕', '📦', '👥'][idx] }} {{ tab }}
        </button>
      </nav>

      <!-- ═══ Tab 1：叫車訂單（客戶叫車產生） ═══ -->
      <section v-show="activeTab === 0" id="panel-0" role="tabpanel" aria-label="客戶叫車訂單">
        <div v-if="consultations.filter(c => c.status === 'pending').length === 0" class="ta__empty">
          <p>🎉 目前沒有待派遣的叫車訂單</p>
        </div>
        <div v-for="consultation in consultations" :key="consultation.id" class="ta__card">
          <!-- 狀態 Badge + 編號 -->
          <div class="ta__card-row">
            <span class="ta__card-feedbackno">{{ consultation.feedbackNo }}</span>
            <span
              class="ta__badge"
              :class="{
                'ta__badge--amber': consultation.status === 'pending',
                'ta__badge--green': consultation.status === 'converted',
                'ta__badge--gray': consultation.status === 'rejected',
              }"
            >
              {{ consultation.status === 'pending' ? '⏳ 待派遣' : consultation.status === 'converted' ? '✅ 已派車' : '❌ 已婉拒' }}
            </span>
          </div>

          <!-- 客戶資訊 -->
          <div class="ta__customer-info">
            <span class="ta__customer-name">👤 {{ consultation.contactName }}</span>
            <span class="ta__customer-phone">📞 {{ consultation.contactPhone }}</span>
          </div>

          <!-- 路線資訊 -->
          <div class="ta__route-info">
            <div class="ta__route-row">
              <span class="ta__route-dot ta__route-dot--green"></span>
              <span class="ta__route-text">{{ consultation.pickup }}</span>
            </div>
            <div class="ta__route-line"></div>
            <div class="ta__route-row">
              <span class="ta__route-dot ta__route-dot--red"></span>
              <span class="ta__route-text">{{ consultation.destination }}</span>
            </div>
          </div>

          <!-- 叫車詳情 -->
          <div class="ta__card-details">
            <span>{{ getCarTypeIcon(consultation.carType) }} {{ getCarTypeLabel(consultation.carType) }}</span>
            <span>👥 {{ consultation.passengers }} 人</span>
            <span>{{ getModeLabel(consultation.mode) }}</span>
          </div>
          <div v-if="consultation.scheduledTime" class="ta__card-details">
            <span>📅 預約：{{ consultation.scheduledTime.replace('T', ' ') }}</span>
          </div>
          <div class="ta__card-details">
            <span>💰 預估 ${{ consultation.estimateMin }}~${{ consultation.estimateMax }}</span>
            <span>🕐 {{ consultation.createdAt }}</span>
          </div>

          <!-- AI 標註 -->
          <p class="ta__card-ai-note">{{ consultation.aiNote }}</p>

          <!-- 操作按鈕 -->
          <div v-if="consultation.status === 'pending'" class="ta__btn-group">
            <button
              class="ta__action-btn"
              @click="convertToOrder(consultation)"
              aria-label="接受並轉為訂單"
            >
              ✅ 接受派車
            </button>
            <button
              class="ta__action-btn ta__action-btn--outline-red"
              @click="rejectConsultation(consultation)"
              aria-label="婉拒此諮詢"
            >
              ❌ 婉拒
            </button>
          </div>
          <div v-else-if="consultation.status === 'converted'" class="ta__status-msg ta__status-msg--success">
            ✅ 已派車 — 司機前往中
          </div>
          <div v-else class="ta__status-msg ta__status-msg--warn">
            ❌ 已婉拒此需求
          </div>
        </div>
      </section>

      <!-- ═══ Tab 2：訂單管理 ═══ -->
      <section v-show="activeTab === 1" id="panel-1" role="tabpanel" aria-label="訂單管理">
        <div v-if="orders.length === 0" class="ta__empty">
          <p>📦 尚無進行中訂單</p>
        </div>
        <div v-for="order in orders" :key="order.id" class="ta__card">
          <!-- 訂單編號 + 狀態 -->
          <div class="ta__card-row">
            <span class="ta__card-orderno">{{ order.orderNo }}</span>
            <span
              class="ta__badge"
              :class="{
                'ta__badge--blue': ['dispatched', 'picked_up'].includes(order.status),
                'ta__badge--amber': order.status === 'in_transit',
                'ta__badge--green': order.status === 'completed',
                'ta__badge--gray': order.status === 'cancelled',
              }"
            >
              {{ getOrderStatusLabel(order.status) }}
            </span>
          </div>

          <!-- 客戶資訊（與諮詢單一致） -->
          <div class="ta__customer-info">
            <span class="ta__customer-name">👤 {{ order.contactName }}</span>
            <span class="ta__customer-phone">📞 {{ order.contactPhone }}</span>
          </div>

          <!-- 路線 -->
          <div class="ta__route-info">
            <div class="ta__route-row">
              <span class="ta__route-dot ta__route-dot--green"></span>
              <span class="ta__route-text">{{ order.pickup }}</span>
            </div>
            <div class="ta__route-line"></div>
            <div class="ta__route-row">
              <span class="ta__route-dot ta__route-dot--red"></span>
              <span class="ta__route-text">{{ order.destination }}</span>
            </div>
          </div>

          <!-- 車種 + 人數 -->
          <div class="ta__card-details">
            <span>{{ getCarTypeIcon(order.carType) }} {{ getCarTypeLabel(order.carType) }}</span>
            <span>👥 {{ order.passengers }} 人</span>
            <span v-if="order.finalAmount">💰 ${{ order.finalAmount }}</span>
          </div>

          <!-- 司機資訊 -->
          <div v-if="order.assignedDriver" class="ta__driver-badge">
            <span>🚗 {{ order.assignedDriver }}（{{ order.assignedPlate }}）</span>
            <span v-if="order.eta && order.status !== 'completed'">· ETA {{ order.eta }} 分鐘</span>
          </div>

          <!-- 時間軸 -->
          <div class="ta__card-details ta__card-details--small">
            <span>📝 下單 {{ order.orderTime }}</span>
            <span v-if="order.serviceTime">🚗 出發 {{ order.serviceTime }}</span>
            <span v-if="order.completeTime">✅ 完成 {{ order.completeTime }}</span>
          </div>

          <!-- 狀態推進按鈕 -->
          <div v-if="!['completed', 'cancelled'].includes(order.status)" class="ta__btn-group">
            <button
              class="ta__action-btn"
              @click="advanceOrderStatus(order)"
              aria-label="推進至下一狀態"
            >
              ▶️ {{ order.status === 'dispatched' ? '確認接客' : order.status === 'picked_up' ? '開始行駛' : order.status === 'in_transit' ? '標記抵達' : '下一步' }}
            </button>
            <button
              class="ta__action-btn ta__action-btn--outline-red"
              @click="cancelOrder(order)"
              aria-label="取消訂單"
            >
              取消
            </button>
          </div>
          <div v-else-if="order.status === 'completed'" class="ta__status-msg ta__status-msg--success">
            🎉 行程完成
          </div>
          <div v-else class="ta__status-msg ta__status-msg--warn">
            🚫 訂單已取消
          </div>
        </div>
      </section>

      <!-- ═══ Tab 3：車隊狀態 ═══ -->
      <section v-show="activeTab === 2" id="panel-2" role="tabpanel" aria-label="車隊即時狀態">
        <div v-for="driver in drivers" :key="driver.id" class="ta__card">
          <div class="ta__card-row">
            <span class="ta__card-title" style="margin:0">{{ driver.name }}</span>
            <span
              class="ta__badge"
              :class="{
                'ta__badge--green': driver.status === 'idle',
                'ta__badge--blue': driver.status === 'on_trip',
                'ta__badge--gray': driver.status === 'offline',
              }"
            >
              {{ getDriverStatusLabel(driver.status) }}
            </span>
          </div>
          <div class="ta__card-details">
            <span>🚗 {{ driver.vehicleType }}</span>
            <span>🔢 {{ driver.plate }}</span>
          </div>
          <div class="ta__card-details">
            <span>⭐ {{ driver.rating }}</span>
            <span>📍 {{ driver.currentLocation }}</span>
            <span>📊 今日 {{ driver.completedToday }} 趟</span>
          </div>
          <button
            v-if="driver.status !== 'on_trip'"
            class="ta__action-btn"
            :class="driver.status === 'idle' ? 'ta__action-btn--outline-red' : 'ta__action-btn--outline'"
            @click="toggleDriverStatus(driver)"
            :aria-label="driver.status === 'idle' ? '設為離線' : '設為上線'"
          >
            {{ driver.status === 'idle' ? '⏸️ 設為離線' : '▶️ 設為上線' }}
          </button>
          <div v-else class="ta__status-msg ta__status-msg--info">
            🚗 服務中 — 無法變更狀態
          </div>
        </div>
      </section>

    </main>

    <!-- ═══ Toast ═══ -->
    <Transition name="toast-fade">
      <div v-if="toastMessage" class="ta__toast">
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- ═══ Demo 控制 ═══ -->
    <div class="ta__demo-panel">
      <button class="ta__demo-btn" @click="resetDemo">🔄 重設</button>
    </div>

  </div>
</template>

<style scoped>
/* ═══ 主內容區 ═══ */
.ta__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
  flex: 1;
}

/* ═══ 頂部統計 ═══ */
.ta__stats {
  display: flex;
  justify-content: center;
  gap: var(--space-2, 8px);
}

.ta__stat-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  white-space: nowrap;
}

.ta__stat-badge--red {
  background: #ffe4e6;
  color: #e11d48;
}

.ta__stat-badge--green {
  background: #dcfce7;
  color: #16a34a;
}

.ta__stat-badge--blue {
  background: #e0f2fe;
  color: #0369a1;
}

/* ═══ Tab 選擇器 ═══ */
.ta__tabs {
  display: flex;
  gap: 0;
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.ta__tab {
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

.ta__tab:not(:last-child) {
  border-right: 1px solid var(--color-border, #e2e8f0);
}

.ta__tab:focus {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

.ta__tab--active {
  background: #2563eb;
  color: #ffffff;
}

/* ═══ 卡片 ═══ */
.ta__card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--color-border, #e2e8f0);
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-3, 12px);
}

.ta__card:last-child {
  margin-bottom: 0;
}

/* ═══ 卡片內部元素 ═══ */
.ta__card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2, 8px);
}

.ta__card-title {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ta__card-feedbackno,
.ta__card-orderno {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  color: #2563eb;
  font-family: monospace;
}

.ta__customer-info {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
}

.ta__customer-name {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ta__customer-phone {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.ta__card-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 8px);
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.ta__card-details--small {
  font-size: var(--text-xs, 11px);
}

.ta__card-ai-note {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md, 12px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  line-height: 1.5;
}

.ta__driver-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-md, 12px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
}

/* ═══ 路線視覺化 ═══ */
.ta__route-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: #f8fafc;
  border-radius: var(--radius-md, 12px);
}

.ta__route-row {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
}

.ta__route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ta__route-dot--green {
  background: #16a34a;
}

.ta__route-dot--red {
  background: #e11d48;
}

.ta__route-line {
  width: 2px;
  height: 12px;
  margin-left: 4px;
  background: #cbd5e1;
}

.ta__route-text {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
}

/* ═══ Badge ═══ */
.ta__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
  white-space: nowrap;
}

.ta__badge--green {
  background: #dcfce7;
  color: #16a34a;
}

.ta__badge--blue {
  background: #e0f2fe;
  color: #0369a1;
}

.ta__badge--amber {
  background: #fef3c7;
  color: #d97706;
}

.ta__badge--gray {
  background: #f1f5f9;
  color: #64748b;
}

/* ═══ 操作按鈕 ═══ */
.ta__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.ta__action-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.ta__action-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.ta__action-btn:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.ta__action-btn--outline {
  background: transparent;
  border: 1.5px solid #2563eb;
  color: #2563eb;
}

.ta__action-btn--outline-red {
  background: transparent;
  border: 1.5px solid #e11d48;
  color: #e11d48;
}

.ta__btn-group {
  display: flex;
  gap: var(--space-2, 8px);
}

.ta__btn-group .ta__action-btn {
  flex: 1;
}

/* ═══ 狀態訊息 ═══ */
.ta__status-msg {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-md, 12px);
  text-align: center;
}

.ta__status-msg--success {
  background: #dcfce7;
  color: #16a34a;
}

.ta__status-msg--info {
  background: #e0f2fe;
  color: #0369a1;
}

.ta__status-msg--warn {
  background: #fef3c7;
  color: #d97706;
}

/* ═══ 空狀態 ═══ */
.ta__empty {
  text-align: center;
  padding: var(--space-8, 32px) var(--space-4, 16px);
  color: var(--color-text-secondary, #78716c);
  font-size: var(--text-base, 15px);
}

/* ═══ Toast ═══ */
.ta__toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 12px 20px;
  background: #1e293b;
  color: #ffffff;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

/* ═══ Demo 面板 ═══ */
.ta__demo-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
}

.ta__demo-btn {
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

.ta__demo-btn:active {
  transform: scale(0.95);
}

/* ═══ Toast 動畫 ═══ */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
