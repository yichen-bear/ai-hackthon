<script setup lang="ts">
definePageMeta({ layout: false })

// --- State ---
const menuOpen = ref(false)
const currentRole = ref<'clinic' | 'pharmacy' | 'delivery'>('clinic')
const roleBarCollapsed = ref(false)
const activeFeature = ref('calling')

// --- Role / Feature Definitions ---
const roleFeatures = {
  clinic: [
    { key: 'calling', label: '📢 現場叫號' },
    { key: 'ai-triage', label: '🤖 診前問診' },
  ],
  pharmacy: [
    { key: 'prescription', label: '📋 處方審核' },
    { key: 'drug-id', label: '🔍 藥物辨識' },
  ],
  delivery: [
    { key: 'delivery', label: '🚚 送藥派送' },
  ],
}

const currentFeatures = computed(() => roleFeatures[currentRole.value])

watch(currentRole, (newRole) => {
  activeFeature.value = roleFeatures[newRole][0].key
})

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
  { id: 1, patientName: '陳志明', doctor: '林醫師', items: ['降血壓藥 x30', '胃藥 x14'], status: 'pending' },
  { id: 2, patientName: '黃美玲', doctor: '王醫師', items: ['感冒藥 x7', '止咳糖漿 x1'], status: 'pending' },
])

const mockDrugs = ref([
  { id: 1, name: 'Acetaminophen 500mg', appearance: '白色錠劑 / 刻字 A500', inStock: true },
  { id: 2, name: 'Amoxicillin 250mg', appearance: '紅黃膠囊 / 刻字 AMX250', inStock: true },
  { id: 3, name: 'Metformin 500mg', appearance: '白色圓錠 / 刻字 MET500', inStock: false },
])

const mockDeliveryOrders = ref([
  { id: 1, patientName: '趙小芳', address: '台北市信義區松仁路100號', medications: ['降血壓藥', '胃藥'], status: 'pending' },
  { id: 2, patientName: '周大力', address: '台北市大安區忠孝東路200號', medications: ['感冒藥', '止咳糖漿'], status: 'pending' },
])

// --- Actions ---
function approvePrescription(id: number) {
  const item = mockPrescriptions.value.find((p) => p.id === id)
  if (item) item.status = 'approved'
}

function toggleStock(id: number) {
  const drug = mockDrugs.value.find((d) => d.id === id)
  if (drug) drug.inStock = !drug.inStock
}

function startDelivery(id: number) {
  const order = mockDeliveryOrders.value.find((o) => o.id === id)
  if (order) order.status = 'delivering'
}

// --- Menu Modules ---
const menuModules = [
  { icon: '🍽️', label: '食' },
  { icon: '👗', label: '衣' },
  { icon: '🏠', label: '住' },
  { icon: '🚗', label: '行' },
  { icon: '📚', label: '育' },
  { icon: '🏥', label: '醫' },
]
</script>

<template>
  <div class="w-full max-w-[430px] min-h-screen bg-white shadow-xl relative pb-10 mx-auto">
    <!-- Top Header -->
    <header class="h-[50px] bg-teal-600 text-white flex items-center justify-between px-4 sticky top-0 z-50">
      <div class="flex items-center gap-2 text-sm">
        <span>📍 台北市</span>
        <span class="opacity-60">|</span>
        <span>👤 醫護後台</span>
      </div>
      <button
        class="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
        @click="menuOpen = !menuOpen"
      >
        ⚙️ 選單 🔽
      </button>
    </header>

    <!-- Menu Dropdown -->
    <div
      v-if="menuOpen"
      class="absolute top-[50px] right-2 z-50 w-56 bg-white rounded-xl shadow-lg border border-teal-100 p-3 transition-all"
    >
      <div class="grid grid-cols-3 gap-2 mb-3">
        <button
          v-for="mod in menuModules"
          :key="mod.label"
          class="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-teal-50 transition-colors"
        >
          <span class="text-2xl">{{ mod.icon }}</span>
          <span class="text-xs text-gray-600">{{ mod.label }}</span>
        </button>
      </div>
      <button class="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-lg transition-colors">
        跳轉用戶端
      </button>
    </div>

    <!-- Bar 1: Vendor Role Bar -->
    <div class="bg-teal-50 border-b border-teal-100">
      <div v-if="!roleBarCollapsed" class="flex items-center gap-2 p-2">
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          :class="currentRole === 'clinic' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="currentRole = 'clinic'"
        >
          🏥 診所身分
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          :class="currentRole === 'pharmacy' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="currentRole = 'pharmacy'"
        >
          💊 藥局身分
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          :class="currentRole === 'delivery' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="currentRole = 'delivery'"
        >
          🛵 送藥身分
        </button>
      </div>
      <div class="flex justify-center">
        <button
          class="text-xs text-teal-600 py-1 hover:text-teal-800 transition-colors"
          @click="roleBarCollapsed = !roleBarCollapsed"
        >
          {{ roleBarCollapsed ? '🔻 展開角色' : '🔺 收合' }}
        </button>
      </div>
    </div>

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
            📢 叫號下一位
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

      <!-- Pharmacy: Prescription -->
      <div v-if="currentRole === 'pharmacy' && activeFeature === 'prescription'">
        <h2 class="text-lg font-semibold text-teal-700 mb-3">📋 處方審核</h2>
        <div class="space-y-3">
          <div
            v-for="rx in mockPrescriptions"
            :key="rx.id"
            class="rounded-xl shadow-md border border-teal-100 p-4"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="font-semibold text-gray-800">{{ rx.patientName }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="rx.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ rx.status === 'approved' ? '✅ 已審核' : '⏳ 待審核' }}
              </span>
            </div>
            <div class="text-xs text-gray-500 mb-2">開立醫師：{{ rx.doctor }}</div>
            <!-- Placeholder prescription image -->
            <div class="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-3">
              處方箋圖片預覽區
            </div>
            <ul class="text-sm text-gray-700 mb-3 list-disc list-inside">
              <li v-for="item in rx.items" :key="item">{{ item }}</li>
            </ul>
            <button
              v-if="rx.status === 'pending'"
              class="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
              @click="approvePrescription(rx.id)"
            >
              💊 審核通過 (完成調劑)
            </button>
          </div>
        </div>
      </div>

      <!-- Pharmacy: Drug ID -->
      <div v-if="currentRole === 'pharmacy' && activeFeature === 'drug-id'">
        <h2 class="text-lg font-semibold text-teal-700 mb-3">🔍 藥物辨識</h2>
        <div class="space-y-3">
          <div
            v-for="drug in mockDrugs"
            :key="drug.id"
            class="rounded-xl shadow-md border border-teal-100 p-4"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="font-semibold text-gray-800">{{ drug.name }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="drug.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ drug.inStock ? '有庫存' : '缺貨中' }}
              </span>
            </div>
            <div class="text-sm text-gray-600 mb-2">外觀：{{ drug.appearance }}</div>
            <!-- Placeholder drug image -->
            <div class="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-3">
              藥物圖片
            </div>
            <button
              class="w-full py-2 rounded-lg text-sm font-medium transition-colors"
              :class="drug.inStock ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
              @click="toggleStock(drug.id)"
            >
              🟢 庫存切換
            </button>
          </div>
        </div>
      </div>

      <!-- Delivery -->
      <div v-if="currentRole === 'delivery' && activeFeature === 'delivery'">
        <h2 class="text-lg font-semibold text-teal-700 mb-3">🚚 送藥派送</h2>
        <div class="space-y-3">
          <div
            v-for="order in mockDeliveryOrders"
            :key="order.id"
            class="rounded-xl shadow-md border border-teal-100 p-4"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="font-semibold text-gray-800">{{ order.patientName }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="order.status === 'delivering' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ order.status === 'delivering' ? '🛵 配送中' : '⏳ 待出發' }}
              </span>
            </div>
            <div class="text-sm text-gray-600 mb-1">📍 {{ order.address }}</div>
            <div class="text-sm text-gray-500 mb-3">
              💊 {{ order.medications.join('、') }}
            </div>
            <button
              v-if="order.status === 'pending'"
              class="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
              @click="startDelivery(order.id)"
            >
              🛵 出發送藥 (推播 ETA 給客戶)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
