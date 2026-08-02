<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { apiFetch } = useApi()

// --- State ---
const currentRole = ref<'clinic' | 'pharmacy' | 'delivery'>('clinic')
const roleBarCollapsed = ref(false)
const activeFeature = ref('calling')

// Watch for role query parameter from side nav
const route = useRoute()
watch(() => route.query.role, (newRole) => {
  if (newRole && ['clinic', 'pharmacy', 'delivery'].includes(newRole as string)) {
    currentRole.value = newRole as 'clinic' | 'pharmacy' | 'delivery'
  }
}, { immediate: true })

// --- Role / Feature Definitions ---
const roleFeatures = {
  clinic: [
    { key: 'calling', label: ' 現場叫號' },
    { key: 'ai-triage', label: ' 診前問診' },
    { key: 'appointment', label: ' 預約掛號管理' },
  ],
  pharmacy: [
    { key: 'rx-review', label: ' 處方審核與調劑' },
    { key: 'fulfillment', label: ' 出貨配送管理' },
    { key: 'stock', label: ' 藥品庫存管理' },
  ],
  delivery: [
    { key: 'active-deliveries', label: ' 派單與配送' },
  ],
}

const currentFeatures = computed(() => roleFeatures[currentRole.value])

watch(currentRole, (newRole) => {
  activeFeature.value = roleFeatures[newRole][0].key
})

// --- Appointment Management State ---
const appointmentFilter = ref<'pending' | 'today' | 'completed'>('pending')

interface AdminAppointment {
  id: number
  name: string
  age: string
  phone: string
  nationalId: string
  date: string
  session: string
  clinicName: string
  status: 'pending' | 'approved' | 'completed'
  createdAt: string
}

const appointments = ref<AdminAppointment[]>([])
const appointmentsLoading = ref(false)
const appointmentsError = ref('')

// 狀態映射
function mapStatus(rawStatus: string): 'pending' | 'approved' | 'completed' {
  if (rawStatus === '02') return 'approved'
  if (rawStatus === '03') return 'completed'
  return 'pending'
}

async function fetchAppointments() {
  appointmentsLoading.value = true
  appointmentsError.value = ''
  try {
    const res = await apiFetch<{ success: boolean; data: any[] }>('/api/diagnosis/appointments')
    if (res.success) {
      appointments.value = res.data.map(item => ({
        ...item,
        status: mapStatus(item.status),
      }))
    }
  } catch (err: any) {
    appointmentsError.value = '載入預約資料失敗，請重試'
  } finally {
    appointmentsLoading.value = false
  }
}

onMounted(() => {
  fetchAppointments()
})

const appointmentCounts = computed(() => ({
  pending: appointments.value.filter((a) => a.status === 'pending').length,
  today: appointments.value.filter((a) => a.status === 'approved').length,
  completed: appointments.value.filter((a) => a.status === 'completed').length,
}))

const filteredAppointments = computed(() => {
  if (appointmentFilter.value === 'pending') return appointments.value.filter((a) => a.status === 'pending')
  if (appointmentFilter.value === 'today') return appointments.value.filter((a) => a.status === 'approved')
  return appointments.value.filter((a) => a.status === 'completed')
})

function approveAppointment(id: number) {
  const item = appointments.value.find((a) => a.id === id)
  if (item) item.status = 'approved'
}

function contactPatient(_id: number) {
  // placeholder: open contact / reschedule modal
}

// --- Calling Feature State ---
const currentNumber = ref(15)
const waitingCount = ref(4)

const estimatedWait = computed(() => waitingCount.value * 5)

function callNext() {
  if (waitingCount.value > 0) {
    currentNumber.value++
    waitingCount.value--
  }
}

// --- Mock Data ---
const mockPatients = [
  { id: 1, name: '王小明', age: 32, aiSummary: 'AI 預判：發燒 38.5℃ / 疑似流感', time: '09:30' },
  { id: 2, name: '李美麗', age: 45, aiSummary: 'AI 預判：頭痛 / 血壓偏高 150/95', time: '09:45' },
  { id: 3, name: '張大偉', age: 28, aiSummary: 'AI 預判：咳嗽兩週 / 建議 X光檢查', time: '10:00' },
]

const mockPrescriptions = ref([
  {
    id: 1,
    patientName: '陳志明',
    phone: '0911-222-333',
    doctor: '林醫師',
    prescriptionType: '慢箋',
    refillInfo: '2/3 次',
    aiDrugList: ['Amlodipine 5mg x30', 'Omeprazole 20mg x14'],
    status: 'pending',
  },
  {
    id: 2,
    patientName: '黃美玲',
    phone: '0922-333-444',
    doctor: '王醫師',
    prescriptionType: '一般處方',
    refillInfo: '1/1 次',
    aiDrugList: ['Amoxicillin 500mg x21', 'Dextromethorphan 15mg x10', '止咳糖漿 120ml x1'],
    status: 'pending',
  },
  {
    id: 3,
    patientName: '張小花',
    phone: '0933-444-555',
    doctor: '陳醫師',
    prescriptionType: '慢箋',
    refillInfo: '1/3 次',
    aiDrugList: ['Metformin 500mg x60', 'Glimepiride 2mg x30'],
    status: 'pending',
  },
])

// --- Pharmacy: Fulfillment State ---
const mockFulfillmentOrders = ref([
  {
    id: 1,
    patientName: '趙小芳',
    phone: '0944-555-666',
    type: 'pickup',
    medications: ['降血壓藥 Amlodipine 5mg', '胃藥 Omeprazole 20mg'],
    status: 'ready',
  },
  {
    id: 2,
    patientName: '周大力',
    phone: '0955-666-777',
    type: 'delivery',
    address: '台北市大安區忠孝東路四段200號 5F',
    medications: ['感冒藥 Amoxicillin 500mg', '止咳糖漿 120ml'],
    status: 'ready',
  },
  {
    id: 3,
    patientName: '吳明哲',
    phone: '0966-777-888',
    type: 'delivery',
    address: '台北市信義區松仁路100號 12F',
    medications: ['降血糖藥 Metformin 500mg', 'Glimepiride 2mg'],
    status: 'ready',
  },
])

// --- Pharmacy: Stock Management State ---
type StockLevel = 'sufficient' | 'low' | 'out'

const mockStockItems = ref([
  { id: 1, name: 'Acetaminophen 500mg', category: '解熱鎮痛', stock: 1200, level: 'sufficient' as StockLevel },
  { id: 2, name: 'Amoxicillin 250mg', category: '抗生素', stock: 85, level: 'low' as StockLevel },
  { id: 3, name: 'Metformin 500mg', category: '降血糖', stock: 0, level: 'out' as StockLevel },
  { id: 4, name: 'Amlodipine 5mg', category: '降血壓', stock: 540, level: 'sufficient' as StockLevel },
  { id: 5, name: 'Omeprazole 20mg', category: '胃藥', stock: 32, level: 'low' as StockLevel },
])

function cycleStockLevel(id: number) {
  const item = mockStockItems.value.find((s) => s.id === id)
  if (!item) return
  const order: StockLevel[] = ['sufficient', 'low', 'out']
  const idx = order.indexOf(item.level)
  item.level = order[(idx + 1) % order.length]
}

// --- Delivery State ---
type DeliveryStage = 'waiting' | 'picked-up' | 'delivering' | 'delivered'

const mockDeliveryOrders = ref([
  {
    id: 1,
    pharmacy: '大樹藥局 信義店',
    address: '台北市信義區忠孝東路五段68號 3F',
    recipient: '王小明',
    phone: '0912-345-678',
    alert: '需要冷藏保存',
    medications: ['胰島素注射液', '血糖試紙'],
    stage: 'waiting' as DeliveryStage,
  },
  {
    id: 2,
    pharmacy: '康是美藥局 大安店',
    address: '台北市大安區復興南路一段200號',
    recipient: '李美麗',
    phone: '0923-456-789',
    alert: '',
    medications: ['降血壓藥 Amlodipine 5mg', '胃藥 Omeprazole 20mg'],
    stage: 'waiting' as DeliveryStage,
  },
  {
    id: 3,
    pharmacy: '丁丁藥局 松山店',
    address: '台北市松山區民生東路五段120號 8F',
    recipient: '陳大明',
    phone: '0934-567-890',
    alert: '患者行動不便，請送至門口',
    medications: ['感冒藥 x7', '止咳糖漿 x1', '退燒藥 x5'],
    stage: 'picked-up' as DeliveryStage,
  },
])

// --- Actions ---
function approvePrescription(id: number) {
  const item = mockPrescriptions.value.find((p) => p.id === id)
  if (item) item.status = 'approved'
}

function rejectPrescription(id: number) {
  const item = mockPrescriptions.value.find((p) => p.id === id)
  if (item) item.status = 'rejected'
}

function notifyPickup(id: number) {
  const order = mockFulfillmentOrders.value.find((o) => o.id === id)
  if (order) order.status = 'notified'
}

function callDeliveryDriver(id: number) {
  const order = mockFulfillmentOrders.value.find((o) => o.id === id)
  if (order) order.status = 'dispatched'
}

function advanceDeliveryStage(id: number) {
  const order = mockDeliveryOrders.value.find((o) => o.id === id)
  if (!order) return
  const stages: DeliveryStage[] = ['waiting', 'picked-up', 'delivering', 'delivered']
  const idx = stages.indexOf(order.stage)
  if (idx < stages.length - 1) order.stage = stages[idx + 1]
}


</script>

<template>
  <div class="admin-page pb-10">
    <!-- Bar 2: Feature Bar -->
    <div class="overflow-x-auto flex gap-2 p-2 border-b border-gray-100 bg-white">
      <button
        v-for="feature in currentFeatures"
        :key="feature.key"
        class="whitespace-nowrap py-2 px-4 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        :class="activeFeature === feature.key ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        @click="activeFeature = feature.key"
      >
        {{ feature.label }}
      </button>
    </div>

    <!-- Feature Content -->
    <div class="p-4">
      <!-- Clinic: Calling -->
      <div v-if="currentRole === 'clinic' && activeFeature === 'calling'">
        <div class="rounded-xl shadow-md border border-teal-100 p-6 text-center">
          <h2 class="text-lg font-semibold text-teal-700 mb-4">📢 現場叫號系統</h2>
          <div class="text-6xl font-bold text-teal-600 mb-2">{{ currentNumber }}</div>
          <p class="text-sm text-gray-500 mb-1">目前號碼</p>
          <div class="flex justify-center gap-6 my-4 text-sm">
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-500">{{ waitingCount }}</div>
              <div class="text-gray-500">等候人數</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-teal-500">~{{ estimatedWait }} 分鐘</div>
              <div class="text-gray-500">預估等候</div>
            </div>
          </div>
          <button
            class="w-full mt-4 py-3 bg-teal-500 hover:bg-teal-600 text-white text-lg font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="waitingCount <= 0"
            @click="callNext"
          >
             叫號下一位
          </button>
        </div>
      </div>

      <!-- Clinic: AI Triage -->
      <div v-if="currentRole === 'clinic' && activeFeature === 'ai-triage'">
        <h2 class="text-lg font-semibold text-teal-700 mb-3">🤖 診前問診（AI 摘要）</h2>
        <div class="space-y-3">
          <div
            v-for="patient in mockPatients"
            :key="patient.id"
            class="rounded-xl shadow-md border border-teal-100 p-4"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="font-semibold text-gray-800">{{ patient.name }}</span>
              <span class="text-xs text-gray-400">{{ patient.time }}</span>
            </div>
            <div class="text-xs text-gray-500 mb-1">年齡：{{ patient.age }} 歲</div>
            <div class="text-sm text-teal-700 bg-teal-50 rounded-lg p-2 mt-1">
              {{ patient.aiSummary }}
            </div>
          </div>
        </div>
      </div>

      <!-- Clinic: Appointment Management -->
      <div v-if="currentRole === 'clinic' && activeFeature === 'appointment'">
        <!-- Header with Refresh Button -->
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-blue-700">📋 預約掛號管理</h2>
          <button
            class="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            :disabled="appointmentsLoading"
            @click="fetchAppointments"
          >
            {{ appointmentsLoading ? '載入中...' : '🔄 重新整理' }}
          </button>
        </div>

        <!-- Status Filter Bar -->
        <div class="flex gap-2 mb-4">
          <button
            class="flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all"
            :class="appointmentFilter === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
            @click="appointmentFilter = 'pending'"
          >
            待確認預約 ({{ appointmentCounts.pending }})
          </button>
          <button
            class="flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all"
            :class="appointmentFilter === 'today' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
            @click="appointmentFilter = 'today'"
          >
            今日預約名單 ({{ appointmentCounts.today }})
          </button>
          <button
            class="flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all"
            :class="appointmentFilter === 'completed' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
            @click="appointmentFilter = 'completed'"
          >
            已完成看診 ({{ appointmentCounts.completed }})
          </button>
        </div>

        <!-- Error State -->
        <div v-if="appointmentsError" class="text-center py-8 text-red-500 text-sm">
          <p>{{ appointmentsError }}</p>
          <button class="mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium" @click="fetchAppointments">重試</button>
        </div>

        <!-- Appointment Cards -->
        <div v-else class="space-y-4">
          <div
            v-for="appt in filteredAppointments"
            :key="appt.id"
            class="rounded-2xl shadow-lg border border-blue-100 bg-white overflow-hidden"
          >
            <!-- Patient Info Header -->
            <div class="bg-gradient-to-r from-blue-50 to-white px-4 py-3 border-b border-blue-50">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-gray-800">
                  {{ appt.name }}
                  <span class="text-sm font-normal text-gray-500 ml-1">({{ appt.age }}歲)</span>
                </h3>
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-700': appt.status === 'pending',
                    'bg-green-100 text-green-700': appt.status === 'approved',
                    'bg-gray-100 text-gray-600': appt.status === 'completed',
                  }"
                >
                  {{ appt.status === 'pending' ? '⏳ 待確認' : appt.status === 'approved' ? '✅ 已確認' : '🏁 已完成' }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1 flex items-center gap-3">
                <span>📞 {{ appt.phone }}</span>
                <span>🪪 {{ appt.nationalId }}</span>
              </div>
            </div>

            <!-- Appointment Time -->
            <div class="px-4 py-2 bg-blue-50/40">
              <div class="flex items-center gap-2 text-sm text-blue-800 font-medium">
                <span>📅</span>
                <span>{{ appt.date }} {{ appt.session }}</span>
              </div>
            </div>

            <!-- Clinic Info -->
            <div class="mx-4 my-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">🏥 預約診所</span>
                <span class="text-sm text-indigo-800 font-medium">{{ appt.clinicName }}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div v-if="appt.status === 'pending'" class="px-4 pb-4 space-y-2">
              <button
                class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                @click="approveAppointment(appt.id)"
              >
                ✅ 批准預約
              </button>
              <button
                class="w-full py-2.5 bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-medium transition-colors"
                @click="contactPatient(appt.id)"
              >
                📞 聯繫患者 / 改期
              </button>
            </div>

            <!-- Approved / Completed Badge -->
            <div v-else class="px-4 pb-4">
              <div
                class="w-full py-2.5 text-center rounded-xl text-sm font-semibold"
                :class="appt.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'"
              >
                {{ appt.status === 'approved' ? '✅ 已確認' : '🏁 看診完成' }}
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredAppointments.length === 0" class="text-center py-12 text-gray-400 text-sm">
            目前無{{ appointmentFilter === 'pending' ? '待確認' : appointmentFilter === 'today' ? '今日' : '已完成' }}預約
          </div>
        </div>
      </div>

      <!-- ========== PHARMACY SECTION ========== -->

      <!-- Pharmacy: Prescription Review -->
      <div v-if="currentRole === 'pharmacy' && activeFeature === 'rx-review'">
        <h2 class="text-lg font-semibold text-emerald-700 mb-3"> 處方審核與調劑</h2>
        <div class="space-y-4">
          <div
            v-for="rx in mockPrescriptions"
            :key="rx.id"
            class="rounded-2xl shadow-lg border border-emerald-100 bg-white overflow-hidden"
          >
            <!-- Patient Header -->
            <div class="bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border-b border-emerald-50">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-gray-800">{{ rx.patientName }}</h3>
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-700': rx.status === 'pending',
                    'bg-green-100 text-green-700': rx.status === 'approved',
                    'bg-red-100 text-red-700': rx.status === 'rejected',
                  }"
                >
                  {{ rx.status === 'pending' ? '⏳ 待審核' : rx.status === 'approved' ? '✅ 已審核' : '❌ 已退回' }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1 flex items-center gap-3">
                <span> {{ rx.phone }}</span>
                <span> 開立：{{ rx.doctor }}</span>
              </div>
            </div>

            <!-- Prescription Image Placeholder -->
            <div class="mx-4 mt-3">
              <div class="w-full h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                📄 處方箋照片（點擊放大）
              </div>
            </div>

            <!-- AI Drug Identification -->
            <div class="mx-4 my-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">🤖 AI 辨識藥品清單</span>
                <span class="text-xs text-emerald-600 font-medium">{{ rx.prescriptionType }} {{ rx.refillInfo }}</span>
              </div>
              <ul class="space-y-1">
                <li v-for="drug in rx.aiDrugList" :key="drug" class="text-sm text-gray-700 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  {{ drug }}
                </li>
              </ul>
            </div>

            <!-- Action Buttons -->
            <div v-if="rx.status === 'pending'" class="px-4 pb-4 space-y-2">
              <button
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                @click="approvePrescription(rx.id)"
              >
                ✅ 處方審核通過，開始調劑
              </button>
              <button
                class="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium transition-colors"
                @click="rejectPrescription(rx.id)"
              >
                ❌ 審核不通過（處方過期/照片模糊）
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pharmacy: Fulfillment -->
      <div v-if="currentRole === 'pharmacy' && activeFeature === 'fulfillment'">
        <h2 class="text-lg font-semibold text-emerald-700 mb-3">� 出貨與配送管理</h2>
        <div class="space-y-4">
          <div
            v-for="order in mockFulfillmentOrders"
            :key="order.id"
            class="rounded-2xl shadow-lg border border-emerald-100 bg-white overflow-hidden"
          >
            <!-- Order Header -->
            <div class="bg-gradient-to-r from-emerald-50 to-white px-4 py-3 border-b border-emerald-50">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-gray-800">{{ order.patientName }}</h3>
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="order.type === 'pickup' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'"
                >
                  {{ order.type === 'pickup' ? ' 現場自取' : ' 申請宅配' }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1">📞 {{ order.phone }}</div>
              <div v-if="order.type === 'delivery' && order.address" class="text-xs text-gray-500 mt-0.5">
                📍 {{ order.address }}
              </div>
            </div>

            <!-- Medication List -->
            <div class="px-4 py-3">
              <div class="text-xs text-gray-400 mb-1">調劑藥品：</div>
              <ul class="space-y-0.5">
                <li v-for="med in order.medications" :key="med" class="text-sm text-gray-700 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  {{ med }}
                </li>
              </ul>
            </div>

            <!-- Status & Actions -->
            <div class="px-4 pb-4">
              <div v-if="order.status === 'ready' && order.type === 'pickup'">
                <button
                  class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  @click="notifyPickup(order.id)"
                >
                   發送「調劑完成，請至藥局取藥」推播
                </button>
              </div>
              <div v-else-if="order.status === 'ready' && order.type === 'delivery'">
                <button
                  class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  @click="callDeliveryDriver(order.id)"
                >
                   呼叫物流/送藥員接單
                </button>
              </div>
              <div v-else class="w-full py-2.5 text-center rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                {{ order.status === 'notified' ? '✅ 已通知取藥' : '✅ 已派送物流' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pharmacy: Stock Control -->
      <div v-if="currentRole === 'pharmacy' && activeFeature === 'stock'">
        <h2 class="text-lg font-semibold text-emerald-700 mb-3">💊 藥品庫存管理</h2>
        <div class="space-y-3">
          <div
            v-for="item in mockStockItems"
            :key="item.id"
            class="rounded-2xl shadow-md border border-emerald-100 bg-white p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <div>
                <h4 class="text-sm font-bold text-gray-800">{{ item.name }}</h4>
                <span class="text-xs text-gray-400">{{ item.category }}</span>
              </div>
              <span
                class="text-xs px-2.5 py-1 rounded-full font-semibold"
                :class="{
                  'bg-green-100 text-green-700': item.level === 'sufficient',
                  'bg-yellow-100 text-yellow-700': item.level === 'low',
                  'bg-red-100 text-red-700': item.level === 'out',
                }"
              >
                {{ item.level === 'sufficient' ? '🟢 庫存充裕' : item.level === 'low' ? '🟡 剩餘少量' : '🔴 目前缺貨' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">庫存數量：{{ item.stock }} 顆/瓶</span>
              <button
                class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-gray-100 hover:bg-gray-200 text-gray-600"
                @click="cycleStockLevel(item.id)"
              >
                切換狀態
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== DELIVERY SECTION ========== -->

      <!-- Delivery: Active Deliveries -->
      <div v-if="currentRole === 'delivery' && activeFeature === 'active-deliveries'">
        <h2 class="text-lg font-semibold text-sky-700 mb-3"> 派單與配送列表</h2>
        <div class="space-y-4">
          <div
            v-for="order in mockDeliveryOrders"
            :key="order.id"
            class="rounded-2xl shadow-lg border border-sky-100 bg-white overflow-hidden"
          >
            <!-- Order Info -->
            <div class="bg-gradient-to-r from-sky-50 to-white px-4 py-3 border-b border-sky-50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  {{ order.stage === 'waiting' ? '⏳ 待取藥' : order.stage === 'picked-up' ? '📦 已取藥' : order.stage === 'delivering' ? '🛵 配送中' : '✅ 已送達' }}
                </span>
              </div>
              <div class="space-y-1 text-sm text-gray-700 mt-2">
                <div class="flex items-start gap-2">
                  <span class="text-gray-400 flex-shrink-0">🏪</span>
                  <span>取藥藥局：<span class="font-medium">{{ order.pharmacy }}</span></span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-gray-400 flex-shrink-0">📍</span>
                  <span>送藥地址：{{ order.address }}</span>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-gray-400 flex-shrink-0">👤</span>
                  <span>收件人：{{ order.recipient }}（{{ order.phone }}）</span>
                </div>
              </div>
              <!-- Alert Banner -->
              <div v-if="order.alert" class="mt-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
                <span class="text-xs text-red-600 font-medium">⚠️ {{ order.alert }}</span>
              </div>
            </div>

            <!-- Medications -->
            <div class="px-4 py-2 border-b border-sky-50">
              <div class="text-xs text-gray-400 mb-1">配送藥品：</div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="med in order.medications"
                  :key="med"
                  class="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full"
                >
                  {{ med }}
                </span>
              </div>
            </div>

            <!-- Stage Progress Actions -->
            <div class="px-4 py-3 space-y-2">
              <!-- Stage 1: Arrive at pharmacy -->
              <button
                v-if="order.stage === 'waiting'"
                class="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                @click="advanceDeliveryStage(order.id)"
              >
                 已到達藥局取藥核對
              </button>
              <!-- Stage 2: Start delivery -->
              <button
                v-else-if="order.stage === 'picked-up'"
                class="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                @click="advanceDeliveryStage(order.id)"
              >
                 開始配送（開啟導航）
              </button>
              <!-- Stage 3: Delivered -->
              <button
                v-else-if="order.stage === 'delivering'"
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                @click="advanceDeliveryStage(order.id)"
              >
                 已送達，身分核對完成
              </button>
              <!-- Completed -->
              <div
                v-else
                class="w-full py-2.5 text-center rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200"
              >
                 配送完成
              </div>

              <!-- Progress Indicator -->
              <div class="flex items-center gap-1 pt-1">
                <div
                  class="h-1.5 flex-1 rounded-full transition-colors"
                  :class="['picked-up', 'delivering', 'delivered'].includes(order.stage) ? 'bg-sky-500' : 'bg-gray-200'"
                ></div>
                <div
                  class="h-1.5 flex-1 rounded-full transition-colors"
                  :class="['delivering', 'delivered'].includes(order.stage) ? 'bg-sky-500' : 'bg-gray-200'"
                ></div>
                <div
                  class="h-1.5 flex-1 rounded-full transition-colors"
                  :class="order.stage === 'delivered' ? 'bg-emerald-500' : 'bg-gray-200'"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
