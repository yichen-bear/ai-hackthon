<script setup lang="ts">
import { ref, computed } from 'vue'
import FoodBookingCard from '~/components/food/BookingCard.vue'
import MidpointMap from '~/components/food/MidpointMap.vue'
import { useFormApi } from '~/composables/useFormApi'
import type { FeedbackAnswer } from '~/composables/useFormApi'
import type { Restaurant } from '~/composables/useRestaurantRecommend'
import { useAiMenu } from '~/composables/useAiMenu'

/* ─── Tab 定義 ─── */
type TabKey = 'eat' | 'group' | 'calorie' | 'passport'

const activeTab = ref<TabKey>('eat')

const tabs: { key: TabKey; label: string }[] = [
  { key: 'eat', label: '想吃什麼' },
  { key: 'group', label: '聚餐企劃' },
  { key: 'calorie', label: '熱量儀表板' },
  { key: 'passport', label: '美食護照' },
]

/* ─── Tab 1: 想吃什麼 ─── */
const eatMode = ref<'dine_in' | 'takeout' | 'delivery'>('dine_in')

/* Sub-view 狀態 */
const currentView = ref<'list' | 'reserve' | 'queue' | 'menu' | 'form'>('list')

const selectedRestaurant = ref<Restaurant | null>(null)

function goBack() {
  currentView.value = 'list'
  selectedRestaurant.value = null
}

function handleGoReserve(restaurant: Restaurant) {
  selectedRestaurant.value = restaurant
  reserveSelectedTime.value = ''
  reservePartySize.value = 2
  currentView.value = 'reserve'
}

function handleGoQueue(restaurant: Restaurant) {
  selectedRestaurant.value = restaurant
  queuePartySize.value = 2
  queueNote.value = ''
  queueTicketResult.value = null
  currentView.value = 'queue'
  fetchQueueStatus(restaurant.id)
}

function handleGoMenu(restaurant: Restaurant) {
  selectedRestaurant.value = restaurant
  resetMenu()
  currentView.value = 'menu'
  // 呼叫 AI 生成菜單
  fetchAiMenu({
    restaurantId: restaurant.id,
    name: restaurant.name,
    tag: restaurant.tag,
    priceAvg: restaurant.priceAvg,
    priceMin: restaurant.priceMin,
    priceMax: restaurant.priceMax,
  })
}

/* ─── 動態表單 Sub-view 狀態 ─── */
const { formData, loading: formLoading, error: formError, submitting: formSubmitting, submitSuccess: formSubmitSuccess, fetchForm, submitFeedback } = useFormApi()
const formAnswers = ref<Record<number, { optionIds: number[]; value: string | null }>>({})
const formContactName = ref(userName)
const formContactPhone = ref(userPhone)

function handleGoForm(restaurant: Restaurant) {
  selectedRestaurant.value = restaurant
  formAnswers.value = {}
  formSubmitSuccess.value = false
  formError.value = null
  currentView.value = 'form'
  fetchForm(1010)
}

// 初始化表單答案
watch(() => formData.value, (form) => {
  if (!form) return
  for (const group of form.groups) {
    for (const topic of group.topics) {
      if (!formAnswers.value[topic.id]) {
        formAnswers.value[topic.id] = { optionIds: [], value: null }
      }
    }
  }
})

function formHandleSingleSelect(topicId: number, optionId: number) {
  formAnswers.value[topicId] = { optionIds: [optionId], value: null }
}

function formHandleMultiSelect(topicId: number, optionId: number, checked: boolean) {
  const current = formAnswers.value[topicId]?.optionIds || []
  if (checked) {
    formAnswers.value[topicId] = { optionIds: [...current, optionId], value: null }
  } else {
    formAnswers.value[topicId] = { optionIds: current.filter(id => id !== optionId), value: null }
  }
}

function formHandleValueInput(topicId: number, value: string) {
  formAnswers.value[topicId] = { optionIds: [], value }
}

function getTopicInputType(type: string): string {
  switch (type) {
    case '01': return 'text'
    case '02': return 'number'
    case '03': return 'radio'
    case '04': return 'checkbox'
    case '05': return 'date'
    case '06': return 'image'
    case '08': return 'contact'
    case '09': return 'datetime'
    case '10': return 'contact-full'
    default: return 'text'
  }
}

async function submitFormFeedback() {
  const feedbackAnswers: FeedbackAnswer[] = Object.entries(formAnswers.value).map(([topicId, ans]) => ({
    topicId: Number(topicId),
    optionIds: ans.optionIds,
    value: ans.value,
  }))

  await submitFeedback(1010, {
    feedbackContent: { answers: feedbackAnswers },
    contactName: formContactName.value || undefined,
    contactMobile: formContactPhone.value || undefined,
    description: selectedRestaurant.value ? `餐廳：${selectedRestaurant.value.name}` : undefined,
  })
}

/* ─── 訂位 Sub-view 狀態 ─── */
const userName = '陳小明'
const userPhone = '0912-345-678'
const reservePartySize = ref(2)
const reserveSelectedTime = ref('')

const reserveEstimatedTotal = computed(() => {
  if (!selectedRestaurant.value) return 0
  return selectedRestaurant.value.priceAvg * reservePartySize.value
})

const canConfirmReserve = computed(() =>
  !!selectedRestaurant.value && !!reserveSelectedTime.value
)

function submitReserve() {
  if (!canConfirmReserve.value || !selectedRestaurant.value) return
  console.log('訂位確認：', {
    userName,
    phone: userPhone,
    restaurantName: selectedRestaurant.value.name,
    time: reserveSelectedTime.value,
    partySize: reservePartySize.value,
  })
  goBack()
}

/* ─── 候位 Sub-view 狀態 ─── */
const queuePartySize = ref(2)
const queueNote = ref('')
const queueLoading = ref(false)
const queueError = ref<string | null>(null)
const queueData = ref({
  waitingGroups: 0,
  estimatedMinutes: 0,
  emptyTables: 0,
})
const queueTicketResult = ref<{ ticketNumber: number; waitingAhead: number; estimatedMinutes: number } | null>(null)

/** 共用的候位連動餐廳 ID（與廠商端同步） */
const LINKED_PLACE_ID = 'linked_restaurant_01'

async function fetchQueueStatus(placeId: string) {
  queueLoading.value = true
  queueError.value = null
  queueTicketResult.value = null
  try {
    // 先嘗試用餐廳自身 placeId 查詢，若無資料則用連動 ID
    let res = await $fetch<{ success: boolean; data: { waitingGroups: number; estimatedMinutes: number; emptyTables: number; notRegistered?: boolean } }>(`http://localhost:3001/api/queue/status/${encodeURIComponent(placeId)}`)
    if (res.success && res.data.notRegistered) {
      // 這間餐廳沒有候位系統，用共用連動的餐廳
      res = await $fetch<{ success: boolean; data: { waitingGroups: number; estimatedMinutes: number; emptyTables: number } }>(`http://localhost:3001/api/queue/status/${LINKED_PLACE_ID}`)
    }
    if (res.success) {
      queueData.value = {
        waitingGroups: res.data.waitingGroups,
        estimatedMinutes: res.data.estimatedMinutes,
        emptyTables: res.data.emptyTables,
      }
    }
  } catch {
    queueError.value = '無法取得候位資訊'
  } finally {
    queueLoading.value = false
  }
}

async function submitQueue() {
  if (!selectedRestaurant.value) return
  queueLoading.value = true
  queueError.value = null
  try {
    const res = await $fetch<{ success: boolean; data: { ticketNumber: number; waitingAhead: number; estimatedMinutes: number }; error?: string }>('http://localhost:3001/api/queue/take-number', {
      method: 'POST',
      body: {
        placeId: LINKED_PLACE_ID,
        partySize: queuePartySize.value,
        customerName: userName,
        customerPhone: userPhone,
        note: queueNote.value || undefined,
      },
    })
    if (res.success) {
      queueTicketResult.value = res.data
      // 刷新看板數據
      await fetchQueueStatus(selectedRestaurant.value.id)
    } else {
      queueError.value = res.error || '抽號失敗'
    }
  } catch {
    queueError.value = '抽號失敗，請稍後再試'
  } finally {
    queueLoading.value = false
  }
}

/* ─── 點餐 Sub-view 狀態 ─── */
const { loading: menuLoading, error: menuError, menuItems, fetchMenu: fetchAiMenu, reset: resetMenu } = useAiMenu()

const deliveryAddress = ref('定位中...')
const isEditingAddress = ref(false)
const deliveryFee = 30

// 進入頁面時用 Geolocation 反查地址
onMounted(async () => {
  if (!navigator.geolocation) {
    deliveryAddress.value = '無法取得定位'
    return
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      try {
        const res = await $fetch<{ results: { formatted_address: string }[]; status: string }>(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=zh-TW&key=AIzaSyBxEaw70I-VNOmc4oEJe2Cgbv2qpmwOLc4`
        )
        if (res.status === 'OK' && res.results.length > 0) {
          deliveryAddress.value = res.results[0].formatted_address
        } else {
          deliveryAddress.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        }
      } catch {
        deliveryAddress.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      }
    },
    () => {
      deliveryAddress.value = '無法取得定位，請手動輸入'
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
})

const menuSubtotal = computed(() =>
  menuItems.value.reduce((sum, item) => sum + item.price * item.qty, 0)
)

const menuTotal = computed(() => {
  if (eatMode.value === 'delivery') return menuSubtotal.value + deliveryFee
  return menuSubtotal.value
})

function submitOrder() {
  console.log('訂單送出：', {
    mode: eatMode.value,
    restaurant: selectedRestaurant.value?.name,
    items: menuItems.value.filter(i => i.qty > 0),
    subtotal: menuSubtotal.value,
    total: menuTotal.value,
    ...(eatMode.value === 'delivery' ? { address: deliveryAddress.value, deliveryFee } : {}),
  })
  goBack()
}

/* ─── Tab 2: 聚餐企劃 ─── */
import { useMidpoint } from '~/composables/useMidpoint'
import type { RecommendedRestaurant } from '~/composables/useMidpoint'

const { loading: midpointLoading, error: midpointError, result: midpointResult, fetchRecommendations, reset: resetMidpoint, carpoolLoading, carpoolError, carpoolResult, fetchCarpool, buildCarpoolNavigationUrl } = useMidpoint()

const groupSize = ref(4)
const groupAddresses = ref<string[]>(['', '', '', ''])
const cuisineType = ref('')
const needPrivateRoom = ref(false)
const specialNote = ref('')
const selectedMidpointRestaurant = ref<RecommendedRestaurant | null>(null)

// 同步人數與地址欄位數量
watch(groupSize, (newSize, oldSize) => {
  if (newSize > oldSize) {
    for (let i = oldSize; i < newSize; i++) {
      groupAddresses.value.push('')
    }
  } else {
    groupAddresses.value.splice(newSize)
  }
})

// 檢查是否可以送出查詢
const canSearch = computed(() => {
  const filledAddresses = groupAddresses.value.filter((a) => a.trim().length > 0)
  return filledAddresses.length >= 2 && !midpointLoading.value
})

// 執行推薦查詢
async function searchMidpoint() {
  const addresses = groupAddresses.value.filter((a) => a.trim().length > 0)
  if (addresses.length < 2) return
  await fetchRecommendations(addresses, cuisineType.value || undefined)
}

// 重置搜尋
function resetSearch() {
  resetMidpoint()
  selectedMidpointRestaurant.value = null
}

// 選取餐廳（地圖聚焦 + 共乘查詢）
function selectRestaurantForMap(restaurant: RecommendedRestaurant) {
  selectedMidpointRestaurant.value = restaurant
  fetchCarpool(restaurant)
}

// 取得價位標籤
function getPriceLevelLabel(level?: number): string {
  if (level === undefined || level === null) return ''
  const labels = ['', '$', '$$', '$$$', '$$$$']
  return labels[level] || ''
}

// 生成 Google Maps 導航連結
function getDirectionsUrl(restaurant: RecommendedRestaurant): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${restaurant.location.lat},${restaurant.location.lng}&destination_place_id=${restaurant.placeId}`
}

/* ─── Tab 3: 熱量儀表板 ─── */

// AI 飲食紀錄輸入狀態
const foodLogInput = ref('')
const foodImageFile = ref<File | null>(null)
const foodImagePreview = ref<string | null>(null)
const isAnalyzing = ref(false)
const showAnalysisResult = ref(false)
const showToast = ref(false)

// 模擬分析結果（假資料）
const analysisResult = ref({
  mealName: '舒肥雞胸肉藜麥餐盒',
  totalCalories: 520,
  protein: 35,
  carbs: 48,
  fiber: 8,
  fat: 12,
})

// 動態熱量數據
const calorieIntake = ref(1450)
const calorieGoal = 2000
const caloriePercent = computed(() => Math.min(100, (calorieIntake.value / calorieGoal) * 100))

const nutrients = ref([
  { name: '蛋白質', value: 65, unit: 'g', color: '#3b82f6', percent: 25 },
  { name: '碳水', value: 180, unit: 'g', color: '#f97316', percent: 40 },
  { name: '膳食纖維', value: 18, unit: 'g', color: '#22c55e', percent: 15 },
  { name: '脂肪', value: 45, unit: 'g', color: '#ef4444', percent: 20 },
])

// Donut chart computed offsets
const donutSegments = computed(() => {
  const circumference = 2 * Math.PI * 50 // ~314.16
  const total = nutrients.value.reduce((s, n) => s + n.percent, 0)
  let offset = 0
  return nutrients.value.map((n) => {
    const dash = (n.percent / total) * circumference
    const gap = circumference - dash
    const seg = { color: n.color, dasharray: `${dash.toFixed(1)} ${gap.toFixed(1)}`, dashoffset: (-offset).toFixed(1) }
    offset += dash
    return seg
  })
})

// 圖片上傳處理
function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    foodImageFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      foodImagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function removeImage() {
  foodImageFile.value = null
  foodImagePreview.value = null
}

// 分析餐點
function analyzeMeal() {
  if (!foodLogInput.value.trim() && !foodImageFile.value) return
  isAnalyzing.value = true
  // 模擬 API 延遲
  setTimeout(() => {
    isAnalyzing.value = false
    showAnalysisResult.value = true
  }, 1200)
}

// 記錄至今日儀表板
function recordToDashboard() {
  calorieIntake.value += analysisResult.value.totalCalories

  // 動態增加營養素
  const nutrientMap: Record<string, number> = {
    '蛋白質': analysisResult.value.protein,
    '碳水': analysisResult.value.carbs,
    '膳食纖維': analysisResult.value.fiber,
    '脂肪': analysisResult.value.fat,
  }
  nutrients.value = nutrients.value.map((n) => ({
    ...n,
    value: n.value + (nutrientMap[n.name] || 0),
  }))

  // 重新計算百分比
  const totalGrams = nutrients.value.reduce((s, n) => s + n.value, 0)
  nutrients.value = nutrients.value.map((n) => ({
    ...n,
    percent: Math.round((n.value / totalGrams) * 100),
  }))

  // 顯示 Toast
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)

  // 重置分析卡片
  showAnalysisResult.value = false
  foodLogInput.value = ''
  removeImage()
}

/* ─── Tab 4: 美食護照 ─── */
type RegionLevel = 'area' | 'city' | 'district'
const regionLevel = ref<RegionLevel>('area')

const areas = [
  { name: '北部', count: 12 },
  { name: '中部', count: 3 },
  { name: '南部', count: 1 },
]

const cities = [
  { name: '台北市', count: 8 },
  { name: '新北市', count: 3 },
  { name: '桃園市', count: 1 },
]

const districts = [
  { name: '信義區', count: 4 },
  { name: '松山區', count: 2 },
  { name: '大安區', count: 2 },
]

const passportCheckins = [
  { restaurant: '鼎泰豐 101店', district: '信義區', date: '2025/07/20', emoji: '🥟' },
  { restaurant: '一蘭拉麵 台北店', district: '信義區', date: '2025/07/18', emoji: '🍜' },
  { restaurant: 'PAUL 仁愛店', district: '大安區', date: '2025/07/15', emoji: '🥐' },
  { restaurant: '添好運 松山店', district: '松山區', date: '2025/07/12', emoji: '🥟' },
]

const passportBadges = [
  { icon: '🏆', name: '信義區美食通', unlocked: true },
  { icon: '🍜', name: '拉麵大師', unlocked: true },
  { icon: '🥐', name: '烘焙鑑賞家', unlocked: true },
  { icon: '🌍', name: '全台走透透', unlocked: false },
  { icon: '⭐', name: '百店達人', unlocked: false },
]
</script>

<template>
  <div class="food-module">
    <main class="food-page" role="main">

      <!-- ═══ 功能切換 Bar ═══ -->
      <nav class="feature-bar" aria-label="功能切換">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="feature-bar__tab"
          :class="{ 'feature-bar__tab--active': activeTab === tab.key }"
          :aria-pressed="activeTab === tab.key ? 'true' : 'false'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- ═══ Tab 1: 想吃什麼 ═══ -->
      <section v-if="activeTab === 'eat'" class="tab-content">
        <!-- 內用 / 外帶 / 外送 切換鈕（僅列表頁顯示） -->
        <div v-if="currentView === 'list'" class="dine-mode-bar">
          <button
            class="dine-mode-btn"
            :class="{ 'dine-mode-btn--active': eatMode === 'dine_in' }"
            @click="eatMode = 'dine_in'"
          >🪑 內用</button>
          <button
            class="dine-mode-btn"
            :class="{ 'dine-mode-btn--active': eatMode === 'takeout' }"
            @click="eatMode = 'takeout'"
          >🥡 外帶</button>
          <button
            class="dine-mode-btn"
            :class="{ 'dine-mode-btn--active': eatMode === 'delivery' }"
            @click="eatMode = 'delivery'"
          >🛵 外送</button>
        </div>

        <!-- ─── 列表頁視圖 ─── -->
        <FoodBookingCard
          v-if="currentView === 'list'"
          :eat-mode="eatMode"
          @go-reserve="handleGoReserve"
          @go-queue="handleGoQueue"
          @go-menu="handleGoMenu"
        />

        <!-- ═══ Sub-view: 訂位表單頁 ═══ -->
        <div v-if="currentView === 'reserve' && selectedRestaurant" class="subview">
          <!-- 頂部導覽 -->
          <div class="subview__header">
            <button class="subview__back-btn" @click="goBack">← 返回</button>
            <div class="subview__title-row">
              <span class="subview__emoji">{{ selectedRestaurant.image }}</span>
              <span class="subview__name">{{ selectedRestaurant.name }}</span>
            </div>
          </div>

          <!-- AI 提示列 -->
          <div class="subview__ai-hint">
            ✨ AI 已為你預填訂位資料
          </div>

          <!-- 個人資訊 -->
          <div class="subview__info-grid">
            <div class="subview__info-item">
              <span class="subview__info-label">👤 姓名</span>
              <span class="subview__info-value">{{ userName }}</span>
            </div>
            <div class="subview__info-item">
              <span class="subview__info-label">📞 電話</span>
              <span class="subview__info-value">{{ userPhone }}</span>
            </div>
          </div>

          <!-- 人數選擇器 + 費用估算 -->
          <div class="subview__party-row">
            <div class="subview__party-controls">
              <span class="subview__info-label">🍴 用餐人數</span>
              <div class="subview__stepper">
                <button class="subview__stepper-btn" :disabled="reservePartySize <= 1" @click="reservePartySize--">−</button>
                <span class="subview__stepper-val">{{ reservePartySize }} 人</span>
                <button class="subview__stepper-btn" :disabled="reservePartySize >= 10" @click="reservePartySize++">＋</button>
              </div>
            </div>
            <div class="subview__price-estimate">
              <span class="subview__price-unit">人均 ${{ selectedRestaurant.priceAvg }}</span>
              <span class="subview__price-total">總計約 ${{ reserveEstimatedTotal.toLocaleString() }}</span>
            </div>
          </div>

          <!-- 時段選擇 -->
          <div class="subview__section">
            <span class="subview__info-label">🕐 選擇時段</span>
            <div class="subview__slots">
              <button
                v-for="slot in selectedRestaurant.timeSlots"
                :key="slot.time"
                class="subview__slot-btn"
                :class="{
                  'subview__slot-btn--selected': slot.time === reserveSelectedTime,
                  'subview__slot-btn--full': !slot.available,
                }"
                :disabled="!slot.available"
                @click="reserveSelectedTime = slot.time"
              >{{ slot.time }}</button>
            </div>
          </div>

          <!-- 底部按鈕 -->
          <button
            class="subview__submit-btn"
            :disabled="!canConfirmReserve"
            @click="submitReserve"
          >確認訂位</button>
          <p v-if="!reserveSelectedTime" class="subview__hint">請先選擇用餐時段</p>
        </div>

        <!-- ═══ Sub-view: 現場候位頁 ═══ -->
        <div v-if="currentView === 'queue' && selectedRestaurant" class="subview">
          <!-- 頂部導覽 -->
          <div class="subview__header">
            <button class="subview__back-btn" @click="goBack">← 返回</button>
            <div class="subview__title-row">
              <span class="subview__emoji">{{ selectedRestaurant.image }}</span>
              <span class="subview__name">{{ selectedRestaurant.name }}</span>
            </div>
          </div>

          <!-- AI 提示列 -->
          <div class="subview__ai-hint">
            ✨ 即時候位資訊由餐廳端同步更新
          </div>

          <!-- Loading -->
          <div v-if="queueLoading && !queueTicketResult" class="subview__form-loading">
            <div class="subview__form-spinner" />
            <span>載入候位資訊...</span>
          </div>

          <!-- Error -->
          <div v-else-if="queueError && !queueTicketResult" class="subview__form-error">
            {{ queueError }}
          </div>

          <!-- 抽號成功結果 -->
          <div v-if="queueTicketResult" class="subview__queue-success">
            <span class="subview__queue-success-icon">🎫</span>
            <p class="subview__queue-success-title">您的號碼牌：#{{ queueTicketResult.ticketNumber }}</p>
            <p class="subview__queue-success-desc">前方還有 {{ queueTicketResult.waitingAhead }} 組，預估等候約 {{ queueTicketResult.estimatedMinutes }} 分鐘</p>
            <button class="subview__submit-btn subview__submit-btn--green" @click="goBack">返回餐廳列表</button>
          </div>

          <!-- 實時候位看板 -->
          <template v-if="!queueTicketResult">
            <div class="subview__queue-board">
              <div class="subview__queue-item">
                <span class="subview__queue-value">{{ queueData.waitingGroups }} 組</span>
                <span class="subview__queue-label">目前候位</span>
              </div>
              <div class="subview__queue-item">
                <span class="subview__queue-value">約 {{ queueData.estimatedMinutes }} 分鐘</span>
                <span class="subview__queue-label">預估等候</span>
              </div>
              <div class="subview__queue-item">
                <span class="subview__queue-value">{{ queueData.emptyTables }} 桌</span>
                <span class="subview__queue-label">現場空桌</span>
              </div>
            </div>

            <!-- 表單區：用餐人數 -->
            <div class="subview__section">
              <span class="subview__info-label">🍴 用餐人數</span>
              <div class="subview__stepper">
                <button class="subview__stepper-btn" :disabled="queuePartySize <= 1" @click="queuePartySize--">−</button>
                <span class="subview__stepper-val">{{ queuePartySize }} 人</span>
                <button class="subview__stepper-btn" :disabled="queuePartySize >= 10" @click="queuePartySize++">＋</button>
              </div>
            </div>

            <!-- 表單區：特殊備註 -->
            <div class="subview__section">
              <span class="subview__info-label">📝 特殊備註</span>
              <textarea
                v-model="queueNote"
                class="subview__textarea"
                placeholder="例如：需要嬰兒椅 / 輪椅空間"
                rows="3"
              />
            </div>

            <!-- 底部按鈕 -->
            <button
              class="subview__submit-btn subview__submit-btn--orange"
              :disabled="queueLoading"
              @click="submitQueue"
            >
              {{ queueLoading ? '處理中...' : '抽取線上候位號碼牌' }}
            </button>
          </template>
        </div>

        <!-- ═══ Sub-view: 外帶/外送點餐頁 ═══ -->
        <div v-if="currentView === 'menu' && selectedRestaurant" class="subview">
          <!-- 頂部導覽 -->
          <div class="subview__header">
            <button class="subview__back-btn" @click="goBack">← 返回</button>
            <div class="subview__title-row">
              <span class="subview__emoji">{{ selectedRestaurant.image }}</span>
              <span class="subview__name">{{ selectedRestaurant.name }}</span>
              <span class="subview__mode-tag">{{ eatMode === 'delivery' ? '外送' : '外帶' }}</span>
            </div>
          </div>

          
          

          <!-- 外送地址（外送模式才顯示） -->
          <div v-if="eatMode === 'delivery'" class="subview__delivery-address">
            <div class="subview__delivery-address-header">
              <span class="subview__delivery-address-label">📍 外送地址</span>
              <button
                class="subview__delivery-edit-btn"
                @click="isEditingAddress = !isEditingAddress"
              >✏️</button>
            </div>
            <input
              v-if="isEditingAddress"
              v-model="deliveryAddress"
              class="subview__delivery-address-input"
              placeholder="請輸入外送地址"
              @keyup.enter="isEditingAddress = false"
            />
            <span v-else class="subview__delivery-address-value">{{ deliveryAddress }}</span>
          </div>

          <!-- 菜單 Loading -->
          <div v-if="menuLoading" class="subview__form-loading">
            <div class="subview__form-spinner" />
            <span>AI 正在生成菜單...</span>
          </div>

          <!-- 菜單 Error -->
          <div v-else-if="menuError" class="subview__form-error">
            {{ menuError }}
          </div>

          <!-- 菜單列表 -->
          <template v-else>
            <div class="subview__menu-list">
              <div v-for="item in menuItems" :key="item.name" class="subview__menu-item">
                <div class="subview__menu-item-info">
                  <span class="subview__menu-item-name">{{ item.name }}</span>
                  <span class="subview__menu-item-meta">${{ item.price }} · {{ item.calories }} kcal</span>
                </div>
                <div class="subview__menu-item-controls">
                  <button class="subview__stepper-btn" :disabled="item.qty <= 0" @click="item.qty--">−</button>
                  <span class="subview__stepper-val">{{ item.qty }}</span>
                  <button class="subview__stepper-btn" @click="item.qty++">＋</button>
                </div>
              </div>
            </div>

            <!-- 金額匯總 -->
            <div class="subview__summary">
              <div class="subview__summary-row">
                <span>小計</span>
                <span>${{ menuSubtotal }}</span>
              </div>
              <div v-if="eatMode === 'delivery'" class="subview__summary-row">
                <span>外送費</span>
                <span>${{ deliveryFee }}</span>
              </div>
              <div class="subview__summary-row subview__summary-row--total">
                <span>總金額</span>
                <strong>${{ menuTotal }}</strong>
              </div>
            </div>

            <!-- 底部按鈕 -->
            <button
              class="subview__submit-btn"
              :disabled="menuSubtotal === 0"
              @click="submitOrder"
            >確認送出訂單</button>
          </template>
        </div>

        <!-- ═══ Sub-view: 動態表單（填寫需求）═══ -->
        <div v-if="currentView === 'form' && selectedRestaurant" class="subview">
          <!-- 頂部導覽 -->
          <div class="subview__header">
            <button class="subview__back-btn" @click="goBack">← 返回</button>
            <div class="subview__title-row">
              <span class="subview__emoji">{{ selectedRestaurant.image }}</span>
              <span class="subview__name">{{ selectedRestaurant.name }}</span>
              <span class="subview__mode-tag">填寫需求</span>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="formLoading" class="subview__form-loading">
            <div class="subview__form-spinner" />
            <span>載入表單中...</span>
          </div>

          <!-- 錯誤 -->
          <div v-else-if="formError && !formData" class="subview__form-error">
            {{ formError }}
          </div>

          <!-- 送出成功 -->
          <div v-else-if="formSubmitSuccess" class="subview__form-success">
            <span class="subview__form-success-icon">✅</span>
            <p class="subview__form-success-title">需求已送出！</p>
            <p class="subview__form-success-desc">我們會盡快為您安排</p>
            <button class="subview__submit-btn subview__submit-btn--green" @click="goBack">返回餐廳列表</button>
          </div>

          <!-- 表單主體 -->
          <template v-else-if="formData">
            <!-- AI 提示列 -->
            <div class="subview__ai-hint">
              ✨ AI 已載入「{{ formData.name }}」動態表單
            </div>

            <!-- 表單說明 -->
            <p v-if="formData.introContent" class="subview__form-intro">{{ formData.introContent }}</p>
            <div v-if="formData.noticeContent" class="subview__form-notice">⚠️ {{ formData.noticeContent }}</div>

            <!-- 群組 → 題目 → 選項 -->
            <div
              v-for="group in formData.groups"
              :key="group.id"
              class="subview__form-group"
            >
              <h3 class="subview__form-group-title">{{ group.name }}</h3>

              <div
                v-for="topic in group.topics"
                :key="topic.id"
                class="subview__form-topic"
              >
                <label class="subview__form-topic-label">
                  {{ topic.title }}
                  <span v-if="topic.isRequired === '1'" class="subview__form-required">*</span>
                </label>
                <p v-if="topic.remark" class="subview__form-topic-remark">{{ topic.remark }}</p>

                <!-- 單選 (radio) — type 03 -->
                <div v-if="getTopicInputType(topic.type) === 'radio'" class="subview__form-options">
                  <label
                    v-for="option in topic.options"
                    :key="option.id"
                    class="subview__form-option"
                    :class="{ 'subview__form-option--selected': formAnswers[topic.id]?.optionIds.includes(option.id) }"
                  >
                    <input
                      type="radio"
                      :name="`topic-${topic.id}`"
                      :value="option.id"
                      :checked="formAnswers[topic.id]?.optionIds.includes(option.id)"
                      class="subview__form-option-input"
                      @change="formHandleSingleSelect(topic.id, option.id)"
                    />
                    <span class="subview__form-option-text">{{ option.optionName }}</span>
                    <span v-if="option.unitPrice != null" class="subview__form-option-price">${{ option.unitPrice }}</span>
                  </label>
                </div>

                <!-- 多選 (checkbox) — type 04 -->
                <div v-else-if="getTopicInputType(topic.type) === 'checkbox'" class="subview__form-options">
                  <label
                    v-for="option in topic.options"
                    :key="option.id"
                    class="subview__form-option"
                    :class="{ 'subview__form-option--selected': formAnswers[topic.id]?.optionIds.includes(option.id) }"
                  >
                    <input
                      type="checkbox"
                      :value="option.id"
                      :checked="formAnswers[topic.id]?.optionIds.includes(option.id)"
                      class="subview__form-option-input"
                      @change="formHandleMultiSelect(topic.id, option.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="subview__form-option-text">{{ option.optionName }}</span>
                    <span v-if="option.unitPrice != null" class="subview__form-option-price">${{ option.unitPrice }}</span>
                  </label>
                </div>

                <!-- 文字輸入 — type 01 -->
                <input
                  v-else-if="getTopicInputType(topic.type) === 'text'"
                  type="text"
                  class="subview__form-text-input"
                  :placeholder="topic.remark || '請輸入'"
                  :value="formAnswers[topic.id]?.value || ''"
                  @input="formHandleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
                />

                <!-- 數字輸入 — type 02 -->
                <input
                  v-else-if="getTopicInputType(topic.type) === 'number'"
                  type="number"
                  class="subview__form-text-input"
                  :placeholder="topic.remark || '請輸入數字'"
                  :value="formAnswers[topic.id]?.value || ''"
                  @input="formHandleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
                />

                <!-- 日期 — type 05 -->
                <input
                  v-else-if="getTopicInputType(topic.type) === 'date'"
                  type="date"
                  class="subview__form-text-input"
                  :value="formAnswers[topic.id]?.value || ''"
                  @input="formHandleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
                />

                <!-- 日期時間 — type 09 -->
                <input
                  v-else-if="getTopicInputType(topic.type) === 'datetime'"
                  type="datetime-local"
                  class="subview__form-text-input"
                  :value="formAnswers[topic.id]?.value || ''"
                  @input="formHandleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
                />

                <!-- 其他（fallback 為文字框） -->
                <input
                  v-else
                  type="text"
                  class="subview__form-text-input"
                  :placeholder="topic.remark || '請輸入'"
                  :value="formAnswers[topic.id]?.value || ''"
                  @input="formHandleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>

            <!-- 聯絡資訊（預填） -->
            <div class="subview__form-group">
              <h3 class="subview__form-group-title">聯絡資訊</h3>
              <div class="subview__form-topic">
                <label class="subview__form-topic-label">聯絡人姓名</label>
                <input v-model="formContactName" type="text" class="subview__form-text-input" placeholder="請輸入姓名" />
              </div>
              <div class="subview__form-topic">
                <label class="subview__form-topic-label">手機號碼</label>
                <input v-model="formContactPhone" type="tel" class="subview__form-text-input" placeholder="0912345678" />
              </div>
            </div>

            <!-- 條款 -->
            <div v-if="formData.termsContent" class="subview__form-terms">
              {{ formData.termsContent }}
            </div>

            <!-- 錯誤提示 -->
            <p v-if="formError" class="subview__form-error-inline">{{ formError }}</p>

            <!-- 送出按鈕 -->
            <button
              class="subview__submit-btn subview__submit-btn--green"
              :disabled="formSubmitting"
              @click="submitFormFeedback"
            >
              {{ formSubmitting ? '送出中...' : '確認送出需求' }}
            </button>
          </template>
        </div>
      </section>

      <!-- ═══ Tab 2: 聚餐企劃 ═══ -->
      <section v-else-if="activeTab === 'group'" class="tab-content">

        <!-- 多人中點距離計算器 -->
        <div class="group-card">
          <h3 class="group-card__title">📍 多人中點餐廳推薦</h3>
          <p class="group-card__desc">輸入每位朋友的出發地址，AI 自動計算最公平的聚餐地點</p>

          <!-- 用餐人數 -->
          <div class="group-booking__row">
            <label class="group-booking__label">👥 聚餐人數</label>
            <div class="group-booking__stepper">
              <button class="stepper-btn" :disabled="groupSize <= 2" @click="groupSize--">−</button>
              <span class="stepper-val">{{ groupSize }} 人</span>
              <button class="stepper-btn" :disabled="groupSize >= 10" @click="groupSize++">＋</button>
            </div>
          </div>

          <!-- 地址輸入欄位 -->
          <div class="group-card__addresses">
            <div
              v-for="(_, idx) in groupAddresses"
              :key="idx"
              class="group-card__address-row"
            >
              <span class="group-card__address-label">👤 第 {{ idx + 1 }} 人</span>
              <input
                v-model="groupAddresses[idx]"
                class="group-card__input"
                :placeholder="`輸入出發地址（如：台北市信義區松仁路100號）`"
              />
            </div>
          </div>

          <!-- 料理類型偏好（可選） -->
          <div class="group-card__cuisine-row">
            <span class="group-card__cuisine-label">🍽️ 料理偏好（可選）</span>
            <input
              v-model="cuisineType"
              class="group-card__input"
              placeholder="例如：日式、火鍋、義大利麵..."
            />
          </div>

          <!-- 搜尋按鈕 -->
          <button
            class="group-card__search-btn"
            :disabled="!canSearch"
            @click="searchMidpoint"
          >
            <span v-if="midpointLoading">⏳ 計算中...</span>
            <span v-else>🔍 搜尋最佳聚餐地點</span>
          </button>

          <!-- 錯誤訊息 -->
          <div v-if="midpointError" class="group-card__error">
            ❌ {{ midpointError }}
          </div>
        </div>

        <!-- 地圖顯示（有結果時） -->
        <div v-if="midpointResult && midpointResult.origins && midpointResult.recommendations.length > 0" class="group-card">
          <h3 class="group-card__title">🗺️ 地圖總覽</h3>
          <MidpointMap
            :origins="midpointResult.origins"
            :restaurant="selectedMidpointRestaurant ? { name: selectedMidpointRestaurant.name, location: selectedMidpointRestaurant.location } : { name: midpointResult.recommendations[0].name, location: midpointResult.recommendations[0].location }"
            :centroid="midpointResult.centroid"
          />
          <p class="group-card__map-hint">
            🔵 藍色 = 各人出發地 &nbsp; 🍽️ = {{ selectedMidpointRestaurant?.name || midpointResult.recommendations[0].name }}
          </p>
        </div>

        <!-- 推薦結果 -->
        <div v-if="midpointResult && midpointResult.recommendations.length > 0" class="group-card">
          <div class="group-card__results-header">
            <h4 class="group-card__results-title">🎯 推薦餐廳（依公平性 + 評分排序）</h4>
            <button class="group-card__reset-btn" @click="resetSearch">重新搜尋</button>
          </div>

          <p v-if="midpointResult.fallbackUsed" class="group-card__fallback-hint">
            💡 指定料理類型的結果不足，已補充其他推薦
          </p>

          <!-- 餐廳卡片列表 -->
          <div
            v-for="(restaurant, rIdx) in midpointResult.recommendations"
            :key="restaurant.placeId"
            class="midpoint-restaurant-card"
            :class="{ 'midpoint-restaurant-card--selected': selectedMidpointRestaurant?.placeId === restaurant.placeId }"
            @click="selectRestaurantForMap(restaurant)"
          >
            <div class="midpoint-restaurant-card__header">
              <span class="midpoint-restaurant-card__rank">#{{ rIdx + 1 }}</span>
              <div class="midpoint-restaurant-card__name-row">
                <span class="midpoint-restaurant-card__name">{{ restaurant.name }}</span>
                <span class="midpoint-restaurant-card__rating">⭐ {{ restaurant.rating }}</span>
              </div>
            </div>

            <div class="midpoint-restaurant-card__meta">
              <span class="midpoint-restaurant-card__address">📍 {{ restaurant.address }}</span>
              <span v-if="getPriceLevelLabel(restaurant.priceLevel)" class="midpoint-restaurant-card__price">
                {{ getPriceLevelLabel(restaurant.priceLevel) }}
              </span>
              <span v-if="restaurant.openNow !== undefined" class="midpoint-restaurant-card__open" :class="{ 'midpoint-restaurant-card__open--closed': !restaurant.openNow }">
                {{ restaurant.openNow ? '🟢 營業中' : '🔴 已休息' }}
              </span>
            </div>

            <!-- 各人交通時間明細 -->
            <div class="midpoint-restaurant-card__travel">
              <span class="midpoint-restaurant-card__travel-title"> 各人交通時間</span>
              <div class="midpoint-restaurant-card__travel-grid">
                <div
                  v-for="(detail, dIdx) in restaurant.travelDetails"
                  :key="dIdx"
                  class="midpoint-restaurant-card__travel-item"
                >
                  <span class="midpoint-restaurant-card__travel-person">第 {{ dIdx + 1 }} 人</span>
                  <span class="midpoint-restaurant-card__travel-time">{{ detail.duration }} 分鐘</span>
                  <span class="midpoint-restaurant-card__travel-mode">{{ detail.modeLabel }}</span>
                </div>
              </div>
              <div class="midpoint-restaurant-card__travel-summary">
                <span>平均 {{ restaurant.avgTime }} 分鐘</span>
                <span>·</span>
                <span>公平性 {{ Math.round(restaurant.fairnessScore * 100) }}%</span>
              </div>
            </div>

            <!-- 導航按鈕 -->
            <div class="midpoint-restaurant-card__actions">
              <a
                :href="getDirectionsUrl(restaurant)"
                target="_blank"
                rel="noopener noreferrer"
                class="midpoint-restaurant-card__nav-btn"
                @click.stop
              >
                 個人導航
              </a>
              <button
                class="midpoint-restaurant-card__carpool-btn"
                @click.stop="selectRestaurantForMap(restaurant)"
              >
                 共乘建議
              </button>
            </div>
          </div>
        </div>

        <!-- 共乘建議卡片 -->
        <div v-if="selectedMidpointRestaurant && (carpoolResult || carpoolLoading || carpoolError)" class="group-card">
          <h3 class="group-card__title"> 共乘路線建議</h3>
          <p class="group-card__desc">開車的人如果順路，可以接其他人一起去（繞路 &lt; 10 分鐘）</p>

          <!-- Loading -->
          <div v-if="carpoolLoading" class="group-card__carpool-loading">
            ⏳ 計算共乘路線中...
          </div>

          <!-- 錯誤 -->
          <div v-else-if="carpoolError" class="group-card__carpool-info">
            {{ carpoolError }}
          </div>

          <!-- 結果 -->
          <template v-else-if="carpoolResult">
            <div v-if="carpoolResult.carpoolGroups.length === 0" class="group-card__carpool-info">
               目前的交通方式組合沒有適合的共乘配對
            </div>

            <div
              v-for="(group, gIdx) in carpoolResult.carpoolGroups"
              :key="gIdx"
              class="carpool-group-card"
            >
              <div class="carpool-group-card__driver">
                <span class="carpool-group-card__driver-icon"></span>
                <span class="carpool-group-card__driver-label">第 {{ group.driverIndex + 1 }} 人開車（直達 {{ group.directDuration }} 分鐘）</span>
              </div>

              <div class="carpool-group-card__pickups">
                <div
                  v-for="pickup in group.pickups"
                  :key="pickup.passengerIndex"
                  class="carpool-group-card__pickup-item"
                >
                  <span class="carpool-group-card__pickup-who">可順路接第 {{ pickup.passengerIndex + 1 }} 人</span>
                  <span class="carpool-group-card__pickup-detour">繞路 +{{ pickup.detourMinutes }} 分鐘</span>
                  <span class="carpool-group-card__pickup-total">總計 {{ pickup.totalTime }} 分鐘到達</span>
                </div>
              </div>

              <!-- 共乘導航連結 -->
              <a
                v-for="pickup in group.pickups"
                :key="`nav-${pickup.passengerIndex}`"
                :href="buildCarpoolNavigationUrl(group.driverOrigin, [pickup.passengerOrigin], selectedMidpointRestaurant!.location)"
                target="_blank"
                rel="noopener noreferrer"
                class="carpool-group-card__nav-link"
              >
                開啟導航：接第 {{ pickup.passengerIndex + 1 }} 人 → {{ selectedMidpointRestaurant!.name }}
              </a>
            </div>
          </template>
        </div>

        <!-- 無結果提示 -->
        <div v-if="midpointResult && midpointResult.recommendations.length === 0" class="group-card">
          <div class="group-card__no-result">
            <p>在此範圍內找不到符合條件的餐廳</p>
            <p class="group-card__no-result-hint">{{ midpointResult.message || '請嘗試調整地址或擴大搜索範圍' }}</p>
          </div>
        </div>

        <!-- 多人預約設定 -->
        <div class="group-card">
          <h3 class="group-card__title">多人預約設定</h3>

          <div class="group-booking__row">
            <label class="group-booking__label"> 包廂需求</label>
            <button
              class="toggle-btn"
              :class="{ 'toggle-btn--on': needPrivateRoom }"
              @click="needPrivateRoom = !needPrivateRoom"
            >
              {{ needPrivateRoom ? '需要包廂' : '不需要' }}
            </button>
          </div>

          <div class="group-booking__note-section">
            <label class="group-booking__label"> AI 特殊備註</label>
            <textarea
              v-model="specialNote"
              class="group-booking__textarea"
              placeholder="例如：慶生桌 / 需要嬰兒椅 / 過敏食材"
              rows="3"
            />
          </div>
        </div>
      </section>

      <!-- ═══ Tab 3: 熱量儀表板 ═══ -->
      <section v-else-if="activeTab === 'calorie'" class="tab-content">

        <!-- Toast 提示 -->
        <Transition name="toast-fade">
          <div v-if="showToast" class="food-toast">
            已將本餐數據累加至今日健康總計！
          </div>
        </Transition>

        <!-- ═══ AI 飲食紀錄輸入卡片 ═══ -->
        <div class="ai-logger-card">
          <div class="ai-logger-card__header">
            <h3 class="ai-logger-card__title">AI 飲食紀錄</h3>
            <p class="ai-logger-card__desc">上傳照片或描述餐點，AI 自動計算熱量</p>
          </div>

          <!-- 輸入框與相機按鈕組合區 -->
          <div class="ai-logger-card__input-row">
            <!-- 相機按鈕 -->
            <label class="ai-logger-card__camera-btn" aria-label="上傳餐點照片">
              <span>📷</span>
              <input
                type="file"
                accept="image/*"
                class="ai-logger-card__file-input"
                @change="handleImageUpload"
              />
            </label>

            <!-- 文字輸入框 -->
            <input
              v-model="foodLogInput"
              type="text"
              class="ai-logger-card__text-input"
              placeholder="例如：中午吃了一碗排骨飯與無糖綠茶..."
              @keyup.enter="analyzeMeal"
            />

            <!-- 分析按鈕 -->
            <button
              class="ai-logger-card__submit-btn"
              :disabled="(!foodLogInput.trim() && !foodImageFile) || isAnalyzing"
              @click="analyzeMeal"
            >
              {{ isAnalyzing ? '分析中...' : '分析' }}
            </button>
          </div>

          <!-- 圖片預覽區 -->
          <div v-if="foodImagePreview" class="ai-logger-card__preview">
            <img :src="foodImagePreview" alt="餐點預覽" class="ai-logger-card__preview-img" />
            <button class="ai-logger-card__remove-btn" @click="removeImage">❌ 移除照片</button>
          </div>
        </div>

        <!-- ═══ 本餐營養分析結果卡片 ═══ -->
        <Transition name="result-slide">
          <div v-if="showAnalysisResult" class="meal-result-card">
            <!-- 餐點摘要與總熱量 -->
            <div class="meal-result-card__header">
              <span class="meal-result-card__meal-name">🍱 {{ analysisResult.mealName }}</span>
              <p class="meal-result-card__calories">
                本餐熱量：<strong>{{ analysisResult.totalCalories }} kcal</strong>
              </p>
            </div>

            <!-- 四大營養素數據網格 -->
            <div class="meal-result-card__nutrients">
              <div class="nutrient-badge nutrient-badge--blue">
                <span class="nutrient-badge__label">蛋白質</span>
                <span class="nutrient-badge__value">{{ analysisResult.protein }} g</span>
              </div>
              <div class="nutrient-badge nutrient-badge--orange">
                <span class="nutrient-badge__label">碳水化合物</span>
                <span class="nutrient-badge__value">{{ analysisResult.carbs }} g</span>
              </div>
              <div class="nutrient-badge nutrient-badge--green">
                <span class="nutrient-badge__label">膳食纖維</span>
                <span class="nutrient-badge__value">{{ analysisResult.fiber }} g</span>
              </div>
              <div class="nutrient-badge nutrient-badge--red">
                <span class="nutrient-badge__label">脂質/脂肪</span>
                <span class="nutrient-badge__value">{{ analysisResult.fat }} g</span>
              </div>
            </div>

            <!-- 確認紀錄按鈕 -->
            <button class="meal-result-card__record-btn" @click="recordToDashboard">
              記錄至今日儀表板
            </button>
          </div>
        </Transition>

        <!-- 區塊 1：總熱量進度條 -->
        <div class="calorie-card">
          <h3 class="calorie-card__title"> 今日熱量攝取</h3>
          <p class="calorie-card__summary">
            今日已攝取 <strong>{{ calorieIntake.toLocaleString() }}</strong> / {{ calorieGoal.toLocaleString() }} kcal
          </p>
          <div class="calorie-bar">
            <div class="calorie-bar__fill" :style="{ width: caloriePercent + '%' }" />
          </div>
          <p class="calorie-bar__percent">{{ Math.round(caloriePercent) }}%</p>
        </div>

        <!-- 區塊 2：環形營養素比例圖 (SVG Donut) -->
        <div class="calorie-card">
          <h3 class="calorie-card__title">🥗 營養素比例</h3>
          <div class="donut-container">
            <svg viewBox="0 0 120 120" class="donut-svg" aria-label="營養素比例環形圖">
              <!-- 背景環 -->
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="16" />
              <!-- 動態營養素環 -->
              <circle
                v-for="(seg, idx) in donutSegments"
                :key="idx"
                cx="60" cy="60" r="50" fill="none"
                :stroke="seg.color"
                stroke-width="16"
                :stroke-dasharray="seg.dasharray"
                :stroke-dashoffset="seg.dashoffset"
                transform="rotate(-90 60 60)"
              />
            </svg>

            <!-- 圖例 -->
            <div class="donut-legend">
              <div v-for="n in nutrients" :key="n.name" class="donut-legend__item">
                <span class="donut-legend__dot" :style="{ background: n.color }" />
                <span class="donut-legend__name">{{ n.name }}</span>
                <span class="donut-legend__val">{{ n.value }}{{ n.unit }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 區塊 3：AI 智慧分析建議 -->
        <div class="ai-advice-card">
          <p class="ai-advice-card__text">
             <strong>AI 建議：</strong>今日膳食纖維尚有缺口，下一餐建議補充高纖蔬菜！
          </p>
        </div>
      </section>

      <!-- ═══ Tab 4: 美食護照 ═══ -->
      <section v-else-if="activeTab === 'passport'" class="tab-content">

        <!-- 三層地圖足跡切換 -->
        <div class="passport-card">
          <h3 class="passport-card__title"> 地圖足跡</h3>

          <!-- 層級切換 -->
          <div class="passport-level-bar">
            <button
              class="passport-level-btn"
              :class="{ 'passport-level-btn--active': regionLevel === 'area' }"
              @click="regionLevel = 'area'"
            >大區</button>
            <button
              class="passport-level-btn"
              :class="{ 'passport-level-btn--active': regionLevel === 'city' }"
              @click="regionLevel = 'city'"
            >縣市</button>
            <button
              class="passport-level-btn"
              :class="{ 'passport-level-btn--active': regionLevel === 'district' }"
              @click="regionLevel = 'district'"
            >行政區</button>
          </div>

          <!-- 區域標籤 -->
          <div class="passport-tags">
            <template v-if="regionLevel === 'area'">
              <span v-for="a in areas" :key="a.name" class="passport-tag">
                {{ a.name }} ({{ a.count }})
              </span>
            </template>
            <template v-else-if="regionLevel === 'city'">
              <span v-for="c in cities" :key="c.name" class="passport-tag">
                {{ c.name }} ({{ c.count }})
              </span>
            </template>
            <template v-else>
              <span v-for="d in districts" :key="d.name" class="passport-tag">
                {{ d.name }} ({{ d.count }})
              </span>
            </template>
          </div>
        </div>

        <!-- 打卡卡片 -->
        <div class="passport-card">
          <h3 class="passport-card__title"> 打卡紀錄</h3>
          <div class="checkin-list">
            <div v-for="c in passportCheckins" :key="c.restaurant" class="checkin-item">
              <span class="checkin-item__emoji">{{ c.emoji }}</span>
              <div class="checkin-item__info">
                <span class="checkin-item__name">{{ c.restaurant }}</span>
                <span class="checkin-item__meta">{{ c.district }} · {{ c.date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 成就徽章 -->
        <div class="passport-card">
          <h3 class="passport-card__title"> 成就徽章</h3>
          <div class="badge-grid">
            <div
              v-for="b in passportBadges"
              :key="b.name"
              class="badge-item"
              :class="{ 'badge-item--locked': !b.unlocked }"
            >
              <span class="badge-item__icon">{{ b.icon }}</span>
              <span class="badge-item__name">{{ b.unlocked ? b.name : '???' }}</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* ─── 模組 Token ─── */
.food-module {
  --color-primary: #ff5252;
  --color-primary-light: #fff1f2;
  --color-secondary: #00a86b;
  --color-secondary-light: #d1fae5;
}

.food-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* ═══ Feature Bar (頂部功能切換) ═══ */
.feature-bar {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.feature-bar::-webkit-scrollbar { display: none; }

.feature-bar__tab {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  text-align: center;
}

.feature-bar__tab--active {
  background: #ffffff;
  color: var(--color-primary, #ff5252);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* ═══ Tab Content ═══ */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
}

/* ═══ Tab 1: 想吃什麼 — 用餐模式 ═══ */
.dine-mode-bar {
  display: flex;
  gap: 8px;
}

.dine-mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.dine-mode-btn--active {
  background: var(--color-primary, #ff5252);
  border-color: var(--color-primary, #ff5252);
  color: #fff;
}

/* ═══ Tab 2: 聚餐企劃 ═══ */
.group-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.group-card__desc {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}

.group-card__locations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.group-card__loc-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.group-card__loc-remove {
  border: none;
  background: none;
  color: #6d28d9;
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  font-family: inherit;
}

.group-card__input-row {
  display: flex;
  gap: 8px;
}

.group-card__input {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.group-card__input:focus {
  border-color: var(--color-primary, #ff5252);
}

.group-card__add-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary, #ff5252);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.group-card__result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.group-card__station {
  margin: 0;
  font-size: 13px;
  color: #1c1917;
}

.group-card__restaurant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-card__restaurant {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fafaf9;
  border-radius: 10px;
}

.group-card__restaurant-emoji {
  font-size: 24px;
}

.group-card__restaurant-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-card__restaurant-name {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

.group-card__restaurant-meta {
  font-size: 11px;
  color: #78716c;
}

/* 多人預約設定 */
.group-booking__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-booking__label {
  font-size: 13px;
  color: #1c1917;
  font-weight: 500;
}

.group-booking__stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stepper-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: border-color 0.15s;
}
.stepper-btn:hover:not(:disabled) {
  border-color: var(--color-primary, #ff5252);
  color: var(--color-primary, #ff5252);
}
.stepper-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.stepper-val {
  font-size: 15px;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
}

/* ─── 地址輸入區 ─── */
.group-card__addresses {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-card__address-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-card__address-label {
  font-size: 12px;
  color: #78716c;
  font-weight: 500;
}

/* ─── 料理類型偏好 ─── */
.group-card__cuisine-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-card__cuisine-label {
  font-size: 12px;
  color: #78716c;
  font-weight: 500;
}

/* ─── 搜尋按鈕 ─── */
.group-card__search-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff5252, #ff8a65);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.04em;
}
.group-card__search-btn:hover:not(:disabled) { opacity: 0.88; }
.group-card__search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ─── 錯誤訊息 ─── */
.group-card__error {
  font-size: 13px;
  color: #dc2626;
  background: #fef2f2;
  border-radius: 10px;
  padding: 10px 12px;
}

/* ─── 推薦結果區 ─── */
.group-card__results {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.group-card__results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-card__results-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
}

.group-card__reset-btn {
  border: none;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.group-card__reset-btn:hover {
  background: #e2e8f0;
}

.group-card__fallback-hint {
  margin: 0;
  font-size: 12px;
  color: #d97706;
  background: #fffbeb;
  border-radius: 8px;
  padding: 8px 12px;
}

/* ─── 推薦餐廳卡片 ─── */
.midpoint-restaurant-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: #fafaf9;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.midpoint-restaurant-card:hover {
  border-color: #e2e8f0;
}

.midpoint-restaurant-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.midpoint-restaurant-card__rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff5252, #ff8a65);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.midpoint-restaurant-card__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.midpoint-restaurant-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.midpoint-restaurant-card__rating {
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
  flex-shrink: 0;
}

.midpoint-restaurant-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.midpoint-restaurant-card__address {
  font-size: 12px;
  color: #78716c;
}

.midpoint-restaurant-card__price {
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
}

.midpoint-restaurant-card__open {
  font-size: 11px;
  font-weight: 500;
}

.midpoint-restaurant-card__open--closed {
  color: #dc2626;
}

/* 交通時間明細 */
.midpoint-restaurant-card__travel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: #fff;
  border-radius: 10px;
}

.midpoint-restaurant-card__travel-title {
  font-size: 12px;
  font-weight: 600;
  color: #1c1917;
}

.midpoint-restaurant-card__travel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.midpoint-restaurant-card__travel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  background: #f8fafc;
  border-radius: 8px;
}

.midpoint-restaurant-card__travel-person {
  font-size: 11px;
  color: #78716c;
}

.midpoint-restaurant-card__travel-time {
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
}

.midpoint-restaurant-card__travel-mode {
  font-size: 10px;
  color: #64748b;
  padding: 2px 6px;
  background: #e0f2fe;
  border-radius: 4px;
}

.midpoint-restaurant-card__travel-summary {
  display: flex;
  gap: 8px;
  justify-content: center;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* 導航按鈕 */
.midpoint-restaurant-card__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 38px;
  border-radius: 10px;
  background: #3b82f6;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}
.midpoint-restaurant-card__nav-btn:hover {
  opacity: 0.88;
}

/* ─── 無結果 ─── */
.group-card__no-result {
  text-align: center;
  padding: 20px 0;
}

.group-card__no-result p {
  margin: 0;
  font-size: 14px;
  color: #78716c;
}

.group-card__no-result-hint {
  font-size: 12px;
  color: #a1a1aa;
  margin-top: 4px;
}

/* ─── 地圖提示 ─── */
.group-card__map-hint {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  text-align: center;
}

/* ─── 餐廳卡片 selected 狀態 ─── */
.midpoint-restaurant-card--selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

/* ─── 操作按鈕列 ─── */
.midpoint-restaurant-card__actions {
  display: flex;
  gap: 8px;
}

.midpoint-restaurant-card__carpool-btn {
  flex: 1;
  height: 38px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #1c1917;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.midpoint-restaurant-card__carpool-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

/* ─── 共乘 Loading / Info ─── */
.group-card__carpool-loading {
  font-size: 13px;
  color: #78716c;
  text-align: center;
  padding: 12px 0;
}

.group-card__carpool-info {
  font-size: 13px;
  color: #78716c;
  text-align: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
}

/* ─── 共乘分組卡片 ─── */
.carpool-group-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 12px;
  border: 1px solid #bbf7d0;
}

.carpool-group-card__driver {
  display: flex;
  align-items: center;
  gap: 8px;
}

.carpool-group-card__driver-icon {
  font-size: 18px;
}

.carpool-group-card__driver-label {
  font-size: 13px;
  font-weight: 600;
  color: #166534;
}

.carpool-group-card__pickups {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.carpool-group-card__pickup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
}

.carpool-group-card__pickup-who {
  font-weight: 600;
  color: #1c1917;
}

.carpool-group-card__pickup-detour {
  color: #d97706;
  font-weight: 500;
}

.carpool-group-card__pickup-total {
  color: #64748b;
  margin-left: auto;
}

.carpool-group-card__nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #16a34a;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
  text-align: center;
  line-height: 1.4;
}
.carpool-group-card__nav-link:hover {
  opacity: 0.88;
}

.stepper-val {
  font-size: 15px;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
}

.toggle-btn {
  padding: 6px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn--on {
  background: var(--color-secondary, #00a86b);
  border-color: var(--color-secondary, #00a86b);
  color: #fff;
}

.group-booking__note-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-booking__textarea {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.group-booking__textarea:focus {
  border-color: var(--color-primary, #ff5252);
}

/* ═══ Tab 3: 熱量儀表板 ═══ */
.calorie-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calorie-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.calorie-card__summary {
  margin: 0;
  font-size: 13px;
  color: #78716c;
}

.calorie-bar {
  height: 14px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.calorie-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #ff5252, #ff8a65);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.calorie-bar__percent {
  margin: 0;
  font-size: 11px;
  color: #78716c;
  text-align: right;
}

/* SVG Donut */
.donut-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.donut-svg {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.donut-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.donut-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.donut-legend__name {
  font-size: 12px;
  color: #1c1917;
}

.donut-legend__val {
  font-size: 12px;
  font-weight: 600;
  color: #78716c;
}

/* AI 建議卡 */
.ai-advice-card {
  background: #fff7ed;
  border-radius: 12px;
  padding: 14px 16px;
}

.ai-advice-card__text {
  margin: 0;
  font-size: 13px;
  color: #9a3412;
  line-height: 1.6;
}

/* ═══ Tab 4: 美食護照 ═══ */
.passport-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.passport-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.passport-level-bar {
  display: flex;
  gap: 6px;
}

.passport-level-btn {
  padding: 6px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.passport-level-btn--active {
  background: #6d28d9;
  border-color: #6d28d9;
  color: #fff;
}

.passport-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.passport-tag {
  padding: 6px 14px;
  background: #f5f3ff;
  color: #6d28d9;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

/* 打卡紀錄 */
.checkin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkin-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fafaf9;
  border-radius: 10px;
}

.checkin-item__emoji {
  font-size: 22px;
}

.checkin-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checkin-item__name {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

.checkin-item__meta {
  font-size: 11px;
  color: #78716c;
}

/* 成就徽章 */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.badge-item__icon {
  font-size: 28px;
}

.badge-item--locked .badge-item__icon {
  filter: grayscale(100%) opacity(0.4);
}

.badge-item__name {
  font-size: 11px;
  color: #1c1917;
  text-align: center;
}

.badge-item--locked .badge-item__name {
  color: #cbd5e1;
}

/* ═══ Sub-view 通用樣式 ═══ */
.subview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.subview__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subview__back-btn {
  align-self: flex-start;
  background: none;
  border: none;
  font-size: 13px;
  color: #78716c;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
}
.subview__back-btn:hover {
  color: var(--color-primary, #ff5252);
}

.subview__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subview__emoji {
  font-size: 22px;
  line-height: 1;
}

.subview__name {
  font-size: 17px;
  font-weight: 700;
  color: #1c1917;
}

.subview__mode-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 9999px;
  background: #e0f2fe;
  color: #0369a1;
}

/* AI 提示列 */
.subview__ai-hint {
  font-size: 12px;
  color: #065f46;
  background: #d1fae5;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 500;
}

/* 個人資訊 */
.subview__info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.subview__info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.subview__info-label {
  font-size: 11px;
  color: #78716c;
}

.subview__info-value {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

/* 人數 + 費用估算 */
.subview__party-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #fafaf9;
  border-radius: 10px;
}

.subview__party-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.subview__stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subview__stepper-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  color: #1c1917;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: border-color 0.15s;
}
.subview__stepper-btn:hover:not(:disabled) {
  border-color: var(--color-primary, #ff5252);
  color: var(--color-primary, #ff5252);
}
.subview__stepper-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.subview__stepper-val {
  font-size: 15px;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
  color: #1c1917;
}

.subview__price-estimate {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.subview__price-unit {
  font-size: 11px;
  color: #78716c;
}

.subview__price-total {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary, #ff5252);
}

/* 區段 */
.subview__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 時段膠囊 */
.subview__slots {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.subview__slots::-webkit-scrollbar { display: none; }

.subview__slot-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  color: #1c1917;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.subview__slot-btn--selected {
  background: var(--color-secondary, #00a86b);
  border-color: var(--color-secondary, #00a86b);
  color: #fff;
}

.subview__slot-btn--full {
  background: #f1f5f9;
  border-color: #f1f5f9;
  color: #cbd5e1;
  cursor: not-allowed;
}

/* 底部送出按鈕 */
.subview__submit-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary, #ff5252);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.04em;
}
.subview__submit-btn:hover:not(:disabled) { opacity: 0.88; }
.subview__submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.subview__submit-btn--orange {
  background: #f97316;
}

.subview__hint {
  margin: -6px 0 0;
  font-size: 11px;
  color: #78716c;
  text-align: center;
}

/* Textarea */
.subview__textarea {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.subview__textarea:focus {
  border-color: var(--color-primary, #ff5252);
}

/* ─── 候位看板 ─── */
.subview__queue-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.subview__queue-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 6px;
  background: #fafaf9;
  border-radius: 12px;
}

.subview__queue-value {
  font-size: 16px;
  font-weight: 700;
  color: #1c1917;
}

.subview__queue-label {
  font-size: 11px;
  color: #78716c;
}

/* ─── 候位抽號成功 ─── */
.subview__queue-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  text-align: center;
}

.subview__queue-success-icon {
  font-size: 44px;
}

.subview__queue-success-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1c1917;
}

.subview__queue-success-desc {
  margin: 0;
  font-size: 13px;
  color: #78716c;
}

/* ─── 點餐菜單列表 ─── */
.subview__menu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subview__menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fafaf9;
  border-radius: 10px;
}

.subview__menu-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.subview__menu-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.subview__menu-item-meta {
  font-size: 12px;
  color: #78716c;
}

.subview__menu-item-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ─── 外送地址 ─── */
.subview__delivery-address {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: #e0f2fe;
  border-radius: 10px;
}

.subview__delivery-address-label {
  font-size: 11px;
  color: #0369a1;
  font-weight: 500;
}

.subview__delivery-address-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subview__delivery-edit-btn {
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.subview__delivery-edit-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.subview__delivery-address-input {
  padding: 8px 10px;
  border: 1.5px solid #7dd3fc;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  color: #0c4a6e;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
}

.subview__delivery-address-input:focus {
  border-color: #0369a1;
}

.subview__delivery-address-value {
  font-size: 14px;
  font-weight: 600;
  color: #0c4a6e;
}

/* ─── 金額匯總 ─── */
.subview__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.subview__summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #78716c;
}

.subview__summary-row--total {
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
  margin-top: 2px;
  color: #1c1917;
  font-size: 15px;
}

/* ═══ AI 飲食紀錄輸入卡片 ═══ */
.ai-logger-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-logger-card__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ai-logger-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.ai-logger-card__desc {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}

.ai-logger-card__input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-logger-card__camera-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 18px;
  transition: background 0.15s;
}
.ai-logger-card__camera-btn:hover {
  background: #e2e8f0;
}

.ai-logger-card__file-input {
  display: none;
}

.ai-logger-card__text-input {
  flex: 1;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.ai-logger-card__text-input:focus {
  border-color: var(--color-primary, #ff5252);
}

.ai-logger-card__submit-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary, #ff5252);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.ai-logger-card__submit-btn:hover:not(:disabled) {
  opacity: 0.88;
}
.ai-logger-card__submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ai-logger-card__preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #fafaf9;
  border-radius: 10px;
}

.ai-logger-card__preview-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.ai-logger-card__remove-btn {
  border: none;
  background: none;
  font-size: 12px;
  color: #ef4444;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.ai-logger-card__remove-btn:hover {
  background: #fef2f2;
}

/* ═══ 本餐營養分析結果卡片 ═══ */
.meal-result-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1.5px solid #e0f2fe;
}

.meal-result-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meal-result-card__meal-name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.meal-result-card__calories {
  margin: 0;
  font-size: 20px;
  color: var(--color-primary, #ff5252);
  font-weight: 700;
}
.meal-result-card__calories strong {
  font-size: 22px;
}

/* 營養素 2x2 網格 */
.meal-result-card__nutrients {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.nutrient-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  background: #f8fafc;
}

.nutrient-badge__label {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
}

.nutrient-badge__value {
  font-size: 16px;
  font-weight: 700;
}

.nutrient-badge--blue {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.nutrient-badge--blue .nutrient-badge__value {
  color: #2563eb;
}

.nutrient-badge--orange {
  background: #fff7ed;
  border: 1px solid #fed7aa;
}
.nutrient-badge--orange .nutrient-badge__value {
  color: #ea580c;
}

.nutrient-badge--green {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.nutrient-badge--green .nutrient-badge__value {
  color: #16a34a;
}

.nutrient-badge--red {
  background: #fef2f2;
  border: 1px solid #fecaca;
}
.nutrient-badge--red .nutrient-badge__value {
  color: #dc2626;
}

.meal-result-card__record-btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.02em;
}
.meal-result-card__record-btn:hover {
  opacity: 0.9;
}

/* ═══ Toast 提示 ═══ */
.food-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #1c1917;
  color: #fff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  z-index: 1000;
  white-space: nowrap;
}

/* Toast 動畫 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* 分析結果卡片動畫 */
.result-slide-enter-active,
.result-slide-leave-active {
  transition: all 0.35s ease;
}
.result-slide-enter-from,
.result-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ═══ 動態表單 Sub-view 樣式 ═══ */
.subview__form-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
  font-size: 13px;
  color: #78716c;
}

.subview__form-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f1f5f9;
  border-top-color: var(--color-secondary, #00a86b);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.subview__form-error {
  font-size: 13px;
  color: #dc2626;
  background: #fef2f2;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.subview__form-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  text-align: center;
}

.subview__form-success-icon {
  font-size: 40px;
}

.subview__form-success-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1c1917;
}

.subview__form-success-desc {
  margin: 0;
  font-size: 13px;
  color: #78716c;
}

.subview__submit-btn--green {
  background: var(--color-secondary, #00a86b);
}

.subview__form-intro {
  margin: 0;
  font-size: 13px;
  color: #78716c;
  line-height: 1.6;
}

.subview__form-notice {
  font-size: 12px;
  color: #9a3412;
  background: #fff7ed;
  border-radius: 8px;
  padding: 8px 12px;
}

.subview__form-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}

.subview__form-group-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
}

.subview__form-topic {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subview__form-topic-label {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

.subview__form-required {
  color: #ef4444;
  margin-left: 2px;
}

.subview__form-topic-remark {
  margin: 0;
  font-size: 11px;
  color: #78716c;
}

.subview__form-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subview__form-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.subview__form-option:hover {
  border-color: var(--color-secondary, #00a86b);
  background: var(--color-secondary-light, #d1fae5);
}

.subview__form-option--selected {
  border-color: var(--color-secondary, #00a86b);
  background: var(--color-secondary-light, #d1fae5);
}

.subview__form-option-input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-secondary, #00a86b);
  flex-shrink: 0;
}

.subview__form-option-text {
  flex: 1;
  font-size: 13px;
  color: #1c1917;
}

.subview__form-option-price {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary, #ff5252);
}

.subview__form-text-input {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  color: #1c1917;
}
.subview__form-text-input:focus {
  border-color: var(--color-secondary, #00a86b);
}

.subview__form-terms {
  font-size: 11px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
  line-height: 1.6;
}

.subview__form-error-inline {
  margin: 0;
  font-size: 12px;
  color: #dc2626;
  text-align: center;
}
</style>
