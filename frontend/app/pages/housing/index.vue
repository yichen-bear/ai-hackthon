<script setup lang="ts">
// 設定頁面 lang 屬性
useHead({
  htmlAttrs: {
    lang: 'zh-TW',
  },
})

// ─── Tab 狀態 ───
const activeTab = ref<'notice' | 'parcel' | 'trash' | 'repair' | 'housework'>('notice')

// 支援 ?tab=xxx 直接跳轉
const housingRoute = useRoute()
onMounted(() => {
  const tab = housingRoute.query.tab as string
  if (tab && tabs.some(t => t.key === tab)) activeTab.value = tab as any
})

const tabs = [
  { key: 'notice', label: '社區' },
  { key: 'parcel', label: '包裹' },
  { key: 'trash', label: '垃圾' },
  { key: 'repair', label: '水電' },
  { key: 'housework', label: '家事服務' },
] as const

// ─── Mock 資料：社區公告 ───
const announcements = ref([
  { id: 'ann-1', title: '電梯保養通知', date: '2024-01-15', summary: 'B1-1F 電梯將於本週六 09:00-12:00 進行年度保養，届時請改搭另一部電梯。' },
  { id: 'ann-2', title: '水塔清洗公告', date: '2024-01-10', summary: '本週日凌晨 2:00-5:00 進行水塔清洗作業，届時將暫停供水，請提前儲水備用。' },
  { id: 'ann-3', title: '消防設備檢測通知', date: '2024-01-05', summary: '將於下週二進行發電機與警報器測試，届時可能會有短暫警報聲響，請住戶勿驚慌。' },
])

// ─── 社區公告 Carousel 狀態 ───
const carouselRef = ref<HTMLElement | null>(null)
const currentDot = ref(0)
const totalDots = computed(() => Math.ceil(announcements.value.length / 2))

function onCarouselScroll() {
  if (!carouselRef.value) return
  const el = carouselRef.value
  const scrollRatio = el.scrollLeft / (el.scrollWidth - el.clientWidth)
  currentDot.value = Math.round(scrollRatio * (totalDots.value - 1))
}

function scrollToDot(index: number) {
  if (!carouselRef.value) return
  const el = carouselRef.value
  const maxScroll = el.scrollWidth - el.clientWidth
  el.scrollTo({ left: (maxScroll / (totalDots.value - 1)) * index, behavior: 'smooth' })
}

// ─── 公設故障回報表單狀態 ───
const repairArea = ref('')
const repairDescription = ref('')
const repairUrgency = ref<'normal' | 'urgent'>('normal')
const repairPhotos = ref<string[]>([])
const repairFileInput = ref<HTMLInputElement | null>(null)
const showSuccessToast = ref(false)

const quickPills = [
  '照明故障',
  '漏水積水',
  '電梯異常',
  '門禁感應失效',
]

function selectPill(pill: string) {
  repairDescription.value = repairDescription.value
    ? `${repairDescription.value}，${pill}`
    : pill
}

function triggerPhotoUpload() {
  repairFileInput.value?.click()
}

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        repairPhotos.value.push(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }
  // Reset input so the same file can be uploaded again
  input.value = ''
}

function removePhoto(index: number) {
  repairPhotos.value.splice(index, 1)
}

function submitRepairReport() {
  // Show success toast
  showSuccessToast.value = true
  setTimeout(() => { showSuccessToast.value = false }, 3000)
  // Reset form
  repairArea.value = ''
  repairDescription.value = ''
  repairUrgency.value = 'normal'
  repairPhotos.value = []
}

// ─── Mock 資料：包裹（多配送地點 + 溫層） ───
interface Parcel {
  id: string
  carrier: string
  trackingNo?: string
  pickupCode?: string
  signedBy?: string
  location: 'community' | 'seven-eleven' | 'home'
  locationLabel: string
  tempZone: 'normal' | 'refrigerated' | 'frozen'
  status: 'pending' | 'in-transit' | 'delivered'
  arrivedAt?: string
  storageNote?: string
}

const parcels = ref<Parcel[]>([
  {
    id: 'pkg-1',
    carrier: '黑貓宅急便',
    trackingNo: '#8839201',
    location: 'community',
    locationLabel: '🏢 社區管理室',
    tempZone: 'frozen',
    status: 'pending',
    arrivedAt: '2026/07/31 15:30 抵達',
    storageNote: '管理室 1 號冰箱',
  },
  {
    id: 'pkg-2',
    carrier: '蝦皮購物',
    pickupCode: '8821',
    location: 'seven-eleven',
    locationLabel: '🏪 7-11 鑫信義門市',
    tempZone: 'normal',
    status: 'in-transit',
  },
  {
    id: 'pkg-3',
    carrier: '新竹物流',
    signedBy: '管理員代簽',
    location: 'home',
    locationLabel: '🏠 宅配到家',
    tempZone: 'normal',
    status: 'delivered',
  },
])

// ─── 包裹篩選狀態 ───
const parcelFilter = ref<'all' | 'normal' | 'refrigerated' | 'frozen'>('all')

const parcelCounts = computed(() => ({
  all: parcels.value.length,
  normal: parcels.value.filter(p => p.tempZone === 'normal').length,
  refrigerated: parcels.value.filter(p => p.tempZone === 'refrigerated').length,
  frozen: parcels.value.filter(p => p.tempZone === 'frozen').length,
}))

const filteredParcels = computed(() => {
  if (parcelFilter.value === 'all') return parcels.value
  return parcels.value.filter(p => p.tempZone === parcelFilter.value)
})

// ─── 冷藏/冷凍催領警告 ───
const coldParcelsInCommunity = computed(() =>
  parcels.value.filter(p =>
    p.location === 'community'
    && (p.tempZone === 'refrigerated' || p.tempZone === 'frozen')
    && p.status === 'pending'
  )
)
const showColdAlert = computed(() => coldParcelsInCommunity.value.length > 0)

// ─── 包裹事件處理 ───
function handleShowQRCode() { console.log('顯示取件 QR Code / 條碼') }
function handleOpenStoreMap() { console.log('開啟 7-11 門市地圖') }

// ─── 包裹子 Tab：收件與領取 / 退貨代發 ───
const activeParcelTab = ref<'receive' | 'ship'>('receive')

// ─── 退貨代發表單狀態 ───
const showShipForm = ref(false)
const shipCarrier = ref('')
const shipTrackingNo = ref('')
const shipNote = ref('')
const shipPlacement = ref<'management' | 'door'>('management')
const shipPhotos = ref<string[]>([])
const shipFileInput = ref<HTMLInputElement | null>(null)
const showShipSuccessToast = ref(false)

function triggerShipPhotoUpload() {
  shipFileInput.value?.click()
}

function handleShipPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        shipPhotos.value.push(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removeShipPhoto(index: number) {
  shipPhotos.value.splice(index, 1)
}

// ─── 退貨/寄件進度清單 ───
interface Shipment {
  id: string
  carrier: string
  platform: string
  trackingNo: string
  status: 'waiting' | 'picked-up'
  statusLabel: string
  statusNote: string
}

const shipments = ref<Shipment[]>([
  {
    id: 'ship-1',
    carrier: '黑貓宅急便',
    platform: '蝦皮退貨',
    trackingNo: '#98210381',
    status: 'waiting',
    statusLabel: '待管理員收件',
    statusNote: '🟡 請將包裹貼上單號後放置於管理室代寄區',
  },
  {
    id: 'ship-2',
    carrier: '新竹物流',
    platform: 'MOMO 換貨',
    trackingNo: '#7720193',
    status: 'picked-up',
    statusLabel: '🟢 物流已取件',
    statusNote: '✅ 管理員已於 14:20 移交物流人員',
  },
])

function submitShipRequest() {
  // Add to shipments list
  shipments.value.unshift({
    id: `ship-${Date.now()}`,
    carrier: shipCarrier.value,
    platform: shipNote.value,
    trackingNo: shipTrackingNo.value,
    status: 'waiting',
    statusLabel: '待管理員收件',
    statusNote: '🟡 請將包裹貼上單號後放置於管理室代寄區',
  })
  // Show toast
  showShipSuccessToast.value = true
  setTimeout(() => { showShipSuccessToast.value = false }, 3000)
  // Reset form
  shipCarrier.value = ''
  shipTrackingNo.value = ''
  shipNote.value = ''
  shipPlacement.value = 'management'
  shipPhotos.value = []
  showShipForm.value = false
}

function handleEditShipment(id: string) { console.log('編輯寄件單號:', id) }
function handleCancelShipment(id: string) {
  shipments.value = shipments.value.filter(s => s.id !== id)
}
function handleTrackShipment(id: string) { console.log('查看物流追蹤:', id) }

// ─── 垃圾分類 AI 助手 ───
// 已移至獨立元件 HousingWasteClassificationCard，串接真實 API

// ─── 即時垃圾車定位與倒數 ───
// 已移至獨立元件 HousingTruckNavigationCard，串接真實 API

// ─── 大型家具回收預約 ───
const showBulkyForm = ref(false)
const bulkyItems = ref<string[]>([])
const bulkyDate = ref('')
const bulkyLocation = ref('')
const showBulkySuccessToast = ref(false)

const bulkyItemOptions = ['床墊', '沙發', '櫃子', '桌椅', '家電', '其他大型物品']

function toggleBulkyItem(item: string) {
  const idx = bulkyItems.value.indexOf(item)
  if (idx >= 0) bulkyItems.value.splice(idx, 1)
  else bulkyItems.value.push(item)
}

function submitBulkyPickup() {
  showBulkySuccessToast.value = true
  setTimeout(() => { showBulkySuccessToast.value = false }, 3000)
  bulkyItems.value = []
  bulkyDate.value = ''
  bulkyLocation.value = ''
  showBulkyForm.value = false
}

// ─── 水電修繕：多步驟流程 ───
const repairStep = ref<'input' | 'engineers' | 'tracking'>('input')

// 問題描述
const plumbingDesc = ref('')
const plumbingPhotos = ref<string[]>([])
const plumbingPhotoInput = ref<HTMLInputElement | null>(null)

const plumbingQuickPills = [
  '水管爆裂/大漏水',
  '全家總開關跳電',
  '馬桶嚴重阻塞',
  '換燈具/開關',
]

function selectPlumbingPill(pill: string) {
  plumbingDesc.value = pill
}

function triggerPlumbingPhoto() {
  plumbingPhotoInput.value?.click()
}

function handlePlumbingPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        plumbingPhotos.value.push(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removePlumbingPhoto(index: number) {
  plumbingPhotos.value.splice(index, 1)
}

// AI 緊急度評估
const plumbingSeverity = ref<'none' | 'urgent' | 'normal'>('none')
const plumbingSeverityText = ref('')
const plumbingSeverityTip = ref('')

function analyzeSeverity() {
  const desc = plumbingDesc.value
  if (desc.includes('爆裂') || desc.includes('漏水') || desc.includes('爆開')) {
    plumbingSeverity.value = 'urgent'
    plumbingSeverityText.value = '🔴 緊急狀況：建議立即優先派單'
    plumbingSeverityTip.value = '⚠️ AI 緊急應變提示：請先關閉家中的水管總閥門！'
  } else if (desc.includes('跳電') || desc.includes('總開關')) {
    plumbingSeverity.value = 'urgent'
    plumbingSeverityText.value = '🔴 緊急狀況：建議立即優先派單'
    plumbingSeverityTip.value = '⚠️ AI 緊急應變提示：請先確認總開關是否可復位，勿強行推回跳脫的無熔絲開關！'
  } else if (desc.includes('阻塞')) {
    plumbingSeverity.value = 'urgent'
    plumbingSeverityText.value = '🔴 緊急狀況：建議立即優先派單'
    plumbingSeverityTip.value = '⚠️ AI 緊急應變提示：請勿反覆沖水，避免汙水溢出！'
  } else {
    plumbingSeverity.value = 'normal'
    plumbingSeverityText.value = '🟢 一般修繕：可預約近 3 日彈性時段'
    plumbingSeverityTip.value = ''
  }
}

function submitPlumbingIssue() {
  if (!plumbingDesc.value.trim()) return
  analyzeSeverity()
}

function goToEngineers() {
  repairStep.value = 'engineers'
}

// 附近師傅清單
interface Engineer {
  id: string
  name: string
  area: string
  company: string
  eta: string
  rating: number
  serviceCount: number
  fee: string
  recommended: boolean
}

const engineers = ref<Engineer[]>([
  {
    id: 'eng-1',
    name: '張師傅',
    area: '信義區',
    company: '達人水電工程',
    eta: '20 分鐘內可抵達',
    rating: 4.9,
    serviceCount: 210,
    fee: '出勤檢測費 $300',
    recommended: true,
  },
  {
    id: 'eng-2',
    name: '李師傅',
    area: '松山區',
    company: '全能水電行',
    eta: '35 分鐘內可抵達',
    rating: 4.7,
    serviceCount: 156,
    fee: '出勤檢測費 $350',
    recommended: false,
  },
])

function dispatchEngineer(engId: string) {
  const eng = engineers.value.find(e => e.id === engId)
  if (eng) {
    trackingEngineer.value = {
      name: `${eng.name}`,
      fullName: `${eng.area} - ${eng.company} (${eng.name})`,
      plate: 'ABC-1234',
      etaMinutes: parseInt(eng.eta) || 20,
      distance: '1.2 km',
    }
    trackingSteps.value[0].done = true
    trackingSteps.value[1].done = true
    repairStep.value = 'tracking'
  }
}

// 即時追蹤
interface TrackingStep {
  label: string
  icon: string
  done: boolean
}

const trackingEngineer = ref({
  name: '張先生',
  fullName: '信義區 - 達人水電工程 (張師傅)',
  plate: 'ABC-1234',
  etaMinutes: 15,
  distance: '1.2 km',
})

const trackingSteps = ref<TrackingStep[]>([
  { label: '水電廠商已接單', icon: '✅', done: true },
  { label: '師傅已出發，前往您的地點中 (距離 1.2km)', icon: '🛵', done: true },
  { label: '抵達現場，開始檢測修繕', icon: '⚪', done: false },
  { label: '修繕完成，線上確認與付款', icon: '⚪', done: false },
])

function handleCallEngineer() { console.log('撥打電話給師傅') }
function handleMessageEngineer() { console.log('傳送訊息給師傅') }
function resetRepairFlow() {
  repairStep.value = 'input'
  plumbingDesc.value = ''
  plumbingPhotos.value = []
  plumbingSeverity.value = 'none'
  trackingSteps.value.forEach((s, i) => { s.done = i < 1 })
}

// ─── Mock 資料：家事服務 ───
const houseworkServices = ref([
  { id: 'hw-1', name: '鐘點清潔', icon: '🧹', price: 'NT$400/hr' },
  { id: 'hw-2', name: '冷氣清洗', icon: '❄️', price: 'NT$1,800/台' },
  { id: 'hw-3', name: '除塵蟎', icon: '🛏️', price: 'NT$2,500/次' },
])
const selectedService = ref('')
const selectedDate = ref('')
const selectedTime = ref('')

// ─── 事件處理 ───
function handleSubmitHousework() { console.log('家事服務預約：', selectedService.value, selectedDate.value, selectedTime.value) }
</script>

<template>
  <div class="housing-module">
    <main class="housing-page" role="main">

      <!-- ═══ 頂部功能切換 Bar ═══ -->
      <nav class="tab-bar" role="tablist" aria-label="住模組功能切換">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          :aria-selected="activeTab === tab.key"
          :class="['tab-item', { 'tab-item--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- ═══ Tab 1：社區 ═══ -->
      <section v-if="activeTab === 'notice'" class="tab-content" aria-label="社區公告">

        <!-- ─ 社區公告橫滑大卡片 ─ -->
        <div class="announce-card">
          <h3 class="announce-card__title">📢 社區重要公告</h3>
          <div
            ref="carouselRef"
            class="carousel"
            @scroll="onCarouselScroll"
          >
            <div
              v-for="ann in announcements"
              :key="ann.id"
              class="carousel__item"
            >
              <p class="carousel__item-title">{{ ann.title }}</p>
              <p class="carousel__item-date">{{ ann.date }}</p>
              <p class="carousel__item-summary">{{ ann.summary }}</p>
            </div>
          </div>
          <!-- Carousel Dots -->
          <div class="carousel-dots">
            <button
              v-for="(_, idx) in totalDots"
              :key="idx"
              :class="['carousel-dot', { 'carousel-dot--active': currentDot === idx }]"
              :aria-label="`前往第 ${idx + 1} 頁`"
              @click="scrollToDot(idx)"
            />
          </div>
        </div>

        <!-- ─ 嵌入式公設故障回報表單卡片 ─ -->
        <div class="repair-form-card">
          <h3 class="repair-form-card__title">🛠️ 公設故障快速回報</h3>
          <p class="repair-form-card__subtitle">發現社區公設損壞？請填寫下方資訊通知管委會</p>

          <!-- 故障區域 -->
          <label class="form-label">
            故障區域
            <select v-model="repairArea" class="form-input">
              <option value="" disabled>請選擇故障區域</option>
              <option value="lobby">一樓大廳</option>
              <option value="parking">B1 停車場</option>
              <option value="elevator">電梯</option>
              <option value="gym">健身房</option>
              <option value="rooftop">頂樓花園</option>
              <option value="other">其他公設</option>
            </select>
          </label>

          <!-- 快速標籤 Quick Pills -->
          <div class="quick-pills">
            <button
              v-for="pill in quickPills"
              :key="pill"
              class="quick-pill"
              type="button"
              @click="selectPill(pill)"
            >
              {{ pill }}
            </button>
          </div>

          <!-- 詳細描述 -->
          <label class="form-label">
            詳細描述
            <textarea
              v-model="repairDescription"
              class="form-input form-textarea"
              placeholder="請詳細說明故障狀況或具體位置..."
              rows="3"
            />
          </label>

          <!-- 照片上傳 -->
          <div class="photo-upload" @click="triggerPhotoUpload">
            <input
              ref="repairFileInput"
              type="file"
              accept="image/*"
              multiple
              class="sr-only"
              @change="handlePhotoChange"
            >
            <div v-if="repairPhotos.length === 0" class="photo-upload__placeholder">
              <span class="photo-upload__icon">📷</span>
              <span class="photo-upload__text">上傳現場照片</span>
            </div>
            <div v-else class="photo-upload__previews" @click.stop>
              <div v-for="(photo, idx) in repairPhotos" :key="idx" class="photo-thumb">
                <img :src="photo" alt="上傳預覽" class="photo-thumb__img">
                <button class="photo-thumb__remove" type="button" @click="removePhoto(idx)">✕</button>
              </div>
              <button class="photo-upload__add" type="button" @click="triggerPhotoUpload">＋</button>
            </div>
          </div>

          <!-- 緊急程度 -->
          <div class="urgency-row">
            <label class="urgency-option">
              <input v-model="repairUrgency" type="radio" value="normal" name="urgency" class="sr-only">
              <span :class="['urgency-badge', { 'urgency-badge--active': repairUrgency === 'normal' }]">🟢 一般報修</span>
            </label>
            <label class="urgency-option">
              <input v-model="repairUrgency" type="radio" value="urgent" name="urgency" class="sr-only">
              <span :class="['urgency-badge', 'urgency-badge--urgent', { 'urgency-badge--active': repairUrgency === 'urgent' }]">🔴 緊急安全問題</span>
            </label>
          </div>

          <!-- 提交按鈕 -->
          <button class="btn btn--green btn--wide btn--submit" type="button" @click="submitRepairReport">
            📝 送出公設故障回報
          </button>
        </div>

        <!-- Success Toast -->
        <Transition name="toast">
          <div v-if="showSuccessToast" class="toast toast--success">
            ✅ 回報成功！已通知社區物業管委會
          </div>
        </Transition>
      </section>

      <!-- ═══ Tab 2：包裹 ═══ -->
      <section v-if="activeTab === 'parcel'" class="tab-content" aria-label="包裹管理">

        <!-- � Segmented Control 子 Tab -->
        <div class="segmented-control">
          <button
            :class="['segmented-control__btn', { 'segmented-control__btn--active': activeParcelTab === 'receive' }]"
            @click="activeParcelTab = 'receive'"
          >
            📥 收件與領取
          </button>
          <button
            :class="['segmented-control__btn', { 'segmented-control__btn--active': activeParcelTab === 'ship' }]"
            @click="activeParcelTab = 'ship'"
          >
            📤 退貨代發 / 寄件
          </button>
        </div>

        <!-- ═══ 收件與領取 ═══ -->
        <template v-if="activeParcelTab === 'receive'">
          <!-- �🚨 冷凍/冷藏催領警告卡片 -->
          <div v-if="showColdAlert" class="cold-alert-card">
            <h3 class="cold-alert-card__title">❄️ 冰櫃空間有限，請盡速領取！</h3>
            <p class="cold-alert-card__desc">
              管理室冰櫃空間較緊湊，您有 {{ coldParcelsInCommunity.length }} 件冷藏/冷凍包裹已抵達，請撥空至管理室領取。
            </p>
            <button class="btn btn--green btn--wide" type="button" @click="handleShowQRCode">
              📱 立即顯示領取 QR Code
            </button>
          </div>

          <!-- 🔍 分類快篩 Bar -->
          <div class="filter-pills">
            <button
              :class="['filter-pill', { 'filter-pill--active': parcelFilter === 'all' }]"
              @click="parcelFilter = 'all'"
            >
              全部 ({{ parcelCounts.all }})
            </button>
            <button
              :class="['filter-pill', { 'filter-pill--active': parcelFilter === 'normal' }]"
              @click="parcelFilter = 'normal'"
            >
              📦 常溫 ({{ parcelCounts.normal }})
            </button>
            <button
              :class="['filter-pill', { 'filter-pill--active': parcelFilter === 'refrigerated' }]"
              @click="parcelFilter = 'refrigerated'"
            >
              🧊 冷藏 ({{ parcelCounts.refrigerated }})
            </button>
            <button
              :class="['filter-pill', { 'filter-pill--active': parcelFilter === 'frozen' }]"
              @click="parcelFilter = 'frozen'"
            >
              ❄️ 冷凍 ({{ parcelCounts.frozen }})
            </button>
          </div>

          <!-- 📦 包裹卡片清單 -->
          <div v-for="parcel in filteredParcels" :key="parcel.id" class="parcel-card">
            <!-- 標籤區 -->
            <div class="parcel-card__badges">
              <span class="parcel-badge parcel-badge--location">{{ parcel.locationLabel }}</span>
              <span
                :class="[
                  'parcel-badge',
                  parcel.tempZone === 'frozen' ? 'parcel-badge--frozen' :
                  parcel.tempZone === 'refrigerated' ? 'parcel-badge--cold' :
                  'parcel-badge--normal'
                ]"
              >
                {{ parcel.tempZone === 'frozen' ? '❄️ 冷凍 (需冰藏)' : parcel.tempZone === 'refrigerated' ? '🧊 冷藏' : '📦 常溫' }}
              </span>
              <span
                :class="[
                  'parcel-badge',
                  parcel.status === 'pending' ? 'parcel-badge--pending' :
                  parcel.status === 'in-transit' ? 'parcel-badge--transit' :
                  'parcel-badge--delivered'
                ]"
              >
                {{ parcel.status === 'pending' ? '🔴 待領取' : parcel.status === 'in-transit' ? '🟡 運輸中/已到店' : '🟢 已送達/簽收' }}
              </span>
            </div>

            <!-- 包裹資訊 -->
            <div class="parcel-card__info">
              <p class="parcel-card__carrier">{{ parcel.carrier }}</p>
              <p v-if="parcel.trackingNo" class="parcel-card__detail">物流單號：{{ parcel.trackingNo }}</p>
              <p v-if="parcel.pickupCode" class="parcel-card__detail">取件密碼：<strong>{{ parcel.pickupCode }}</strong></p>
              <p v-if="parcel.signedBy" class="parcel-card__detail">簽收人：{{ parcel.signedBy }}</p>
            </div>

            <!-- 抵達時間與存放位置 -->
            <div v-if="parcel.arrivedAt || parcel.storageNote" class="parcel-card__meta">
              <span v-if="parcel.arrivedAt">⏱️ {{ parcel.arrivedAt }}</span>
              <span v-if="parcel.storageNote">📍 存放位置：{{ parcel.storageNote }}</span>
            </div>

            <!-- 操作按鈕 -->
            <div class="parcel-card__actions">
              <button
                v-if="parcel.location === 'community' && parcel.status === 'pending'"
                class="btn btn--green btn--wide"
                type="button"
                @click="handleShowQRCode"
              >
                📱 出示取件條碼
              </button>
              <button
                v-if="parcel.location === 'seven-eleven'"
                class="btn btn--outline btn--wide"
                type="button"
                @click="handleOpenStoreMap"
              >
                🗺️ 開啟門市地圖
              </button>
            </div>
          </div>
        </template>

        <!-- ═══ 退貨代發 / 寄件 ═══ -->
        <template v-if="activeParcelTab === 'ship'">

          <!-- 建立退貨/代寄申請按鈕 -->
          <button
            v-if="!showShipForm"
            class="btn btn--green btn--wide"
            type="button"
            @click="showShipForm = true"
          >
            📤 建立退貨/代寄申請
          </button>

          <!-- 退貨代發表單卡片 -->
          <div v-if="showShipForm" class="ship-form-card">
            <h3 class="ship-form-card__title">📤 退貨 / 代寄申請</h3>

            <!-- 物流業者 -->
            <label class="form-label">
              物流業者
              <select v-model="shipCarrier" class="form-input">
                <option value="" disabled>請選擇物流業者</option>
                <option value="黑貓宅急便">黑貓宅急便</option>
                <option value="新竹物流">新竹物流</option>
                <option value="宅配通">宅配通</option>
                <option value="便利帶">便利帶</option>
                <option value="其他">其他</option>
              </select>
            </label>

            <!-- 退貨/寄件單號 -->
            <label class="form-label">
              退貨/寄件單號
              <input v-model="shipTrackingNo" type="text" class="form-input" placeholder="請輸入物流退貨單號 / 寄件編號">
            </label>

            <!-- 退貨平台/備註 -->
            <label class="form-label">
              退貨平台/備註
              <input v-model="shipNote" type="text" class="form-input" placeholder="例如：蝦皮購物退貨 / MOMO 換貨">
            </label>

            <!-- 放置地點 -->
            <div class="urgency-row">
              <label class="urgency-option">
                <input v-model="shipPlacement" type="radio" value="management" name="ship-placement" class="sr-only">
                <span :class="['urgency-badge', { 'urgency-badge--active': shipPlacement === 'management' }]">🏢 已寄放至社區管理室</span>
              </label>
              <label class="urgency-option">
                <input v-model="shipPlacement" type="radio" value="door" name="ship-placement" class="sr-only">
                <span :class="['urgency-badge', { 'urgency-badge--active': shipPlacement === 'door' }]">🚪 預計放在自家門口</span>
              </label>
            </div>

            <!-- 包裹照片上傳 -->
            <div class="photo-upload" @click="triggerShipPhotoUpload">
              <input
                ref="shipFileInput"
                type="file"
                accept="image/*"
                multiple
                class="sr-only"
                @change="handleShipPhotoChange"
              >
              <div v-if="shipPhotos.length === 0" class="photo-upload__placeholder">
                <span class="photo-upload__icon">📷</span>
                <span class="photo-upload__text">上傳包裹外觀照片</span>
              </div>
              <div v-else class="photo-upload__previews" @click.stop>
                <div v-for="(photo, idx) in shipPhotos" :key="idx" class="photo-thumb">
                  <img :src="photo" alt="包裹照片預覽" class="photo-thumb__img">
                  <button class="photo-thumb__remove" type="button" @click="removeShipPhoto(idx)">✕</button>
                </div>
                <button class="photo-upload__add" type="button" @click="triggerShipPhotoUpload">＋</button>
              </div>
            </div>

            <!-- 送出 / 取消 -->
            <button class="btn btn--green btn--wide btn--submit" type="button" @click="submitShipRequest">
              📤 提交代寄申請
            </button>
            <button class="btn btn--outline btn--wide" type="button" @click="showShipForm = false">
              取消
            </button>
          </div>

          <!-- 我的退貨與寄件進度卡片 -->
          <div v-for="ship in shipments" :key="ship.id" class="shipment-card">
            <div class="shipment-card__badges">
              <span :class="['parcel-badge', ship.status === 'waiting' ? 'parcel-badge--transit' : 'parcel-badge--delivered']">
                {{ ship.statusLabel }}
              </span>
              <span class="parcel-badge parcel-badge--location">{{ ship.carrier }}</span>
            </div>
            <p class="shipment-card__content">{{ ship.platform }} (單號：{{ ship.trackingNo }})</p>
            <p class="shipment-card__status">{{ ship.statusNote }}</p>
            <div class="shipment-card__actions">
              <template v-if="ship.status === 'waiting'">
                <button class="btn btn--outline" type="button" @click="handleEditShipment(ship.id)">✏️ 編輯單號</button>
                <button class="btn btn--outline btn--danger" type="button" @click="handleCancelShipment(ship.id)">🗑️ 取消申請</button>
              </template>
              <template v-else>
                <button class="btn btn--green" type="button" @click="handleTrackShipment(ship.id)">🔍 查看物流追蹤</button>
              </template>
            </div>
          </div>
        </template>

        <!-- Success Toast (寄件) -->
        <Transition name="toast">
          <div v-if="showShipSuccessToast" class="toast toast--success">
            ✅ 代寄申請已送出！管理員將協助處理
          </div>
        </Transition>

      </section>

      <!-- ═══ Tab 3：垃圾 ═══ -->
      <section v-if="activeTab === 'trash'" class="tab-content" aria-label="垃圾分類">

        <!-- ♻️ AI 垃圾分類助手（串接真實 API） -->
        <HousingWasteClassificationCard />

        <!-- 🚚 即時垃圾車定位與導航（串接真實 API） -->
        <HousingTruckNavigationCard />

        <!-- 🛋️ 大型家具與廢棄物回收預約 -->
        <button
          v-if="!showBulkyForm"
          class="btn btn--brown btn--wide"
          type="button"
          @click="showBulkyForm = true"
        >
          🛋️ 預約大型家具/廢棄物清運
        </button>

        <div v-if="showBulkyForm" class="bulky-form-card">
          <h3 class="bulky-form-card__title">🛋️ 大型家具 / 廢棄物清運預約</h3>

          <!-- 項目勾選 -->
          <div class="bulky-form-card__items">
            <label
              v-for="item in bulkyItemOptions"
              :key="item"
              :class="['bulky-item-chip', { 'bulky-item-chip--active': bulkyItems.includes(item) }]"
            >
              <input
                type="checkbox"
                :checked="bulkyItems.includes(item)"
                class="sr-only"
                @change="toggleBulkyItem(item)"
              >
              {{ item }}
            </label>
          </div>

          <!-- 清運日期 -->
          <label class="form-label">
            清運日期
            <input v-model="bulkyDate" type="date" class="form-input">
          </label>

          <!-- 放置地點 -->
          <label class="form-label">
            放置地點
            <input v-model="bulkyLocation" type="text" class="form-input" placeholder="例如：社區大樓指定回收區">
          </label>

          <!-- 送出 / 取消 -->
          <button class="btn btn--brown btn--wide" type="button" @click="submitBulkyPickup">
            📦 送出清運預約
          </button>
          <button class="btn btn--outline btn--wide" type="button" @click="showBulkyForm = false">
            取消
          </button>
        </div>

        <!-- Success Toast (大型家具) -->
        <Transition name="toast">
          <div v-if="showBulkySuccessToast" class="toast toast--success">
            ✅ 清運預約已送出！將安排清運日期
          </div>
        </Transition>
      </section>

      <!-- ═══ Tab 4：水電 ═══ -->
      <section v-if="activeTab === 'repair'" class="tab-content" aria-label="水電修繕">

        <!-- 🔧 第一步：問題描述與 AI 緊急度評估 -->
        <template v-if="repairStep === 'input'">
          <div class="plumbing-input-card">
            <h3 class="plumbing-input-card__title">🔧 水電問題描述</h3>

            <!-- 快速情境 Pills -->
            <div class="quick-pills">
              <button
                v-for="pill in plumbingQuickPills"
                :key="pill"
                class="quick-pill"
                type="button"
                @click="selectPlumbingPill(pill)"
              >
                {{ pill }}
              </button>
            </div>

            <!-- 文字描述 -->
            <textarea
              v-model="plumbingDesc"
              class="form-input form-textarea"
              placeholder="請說明水電狀況（如：浴室水管爆開大量漏水、客廳突然跳電、換水龍頭...）"
              rows="3"
            />

            <!-- 拍照上傳 -->
            <div class="photo-upload" @click="triggerPlumbingPhoto">
              <input
                ref="plumbingPhotoInput"
                type="file"
                accept="image/*"
                multiple
                class="sr-only"
                @change="handlePlumbingPhotoChange"
              >
              <div v-if="plumbingPhotos.length === 0" class="photo-upload__placeholder">
                <span class="photo-upload__icon">📷</span>
                <span class="photo-upload__text">上傳故障照片</span>
              </div>
              <div v-else class="photo-upload__previews" @click.stop>
                <div v-for="(photo, idx) in plumbingPhotos" :key="idx" class="photo-thumb">
                  <img :src="photo" alt="故障照片預覽" class="photo-thumb__img">
                  <button class="photo-thumb__remove" type="button" @click="removePlumbingPhoto(idx)">✕</button>
                </div>
                <button class="photo-upload__add" type="button" @click="triggerPlumbingPhoto">＋</button>
              </div>
            </div>

            <!-- 送出分析按鈕 -->
            <button class="btn btn--green btn--wide" type="button" @click="submitPlumbingIssue">
              🔍 智慧分析緊急度
            </button>
          </div>

          <!-- AI 緊急度評估結果 -->
          <div v-if="plumbingSeverity === 'urgent'" class="severity-card severity-card--urgent">
            <p class="severity-card__title">{{ plumbingSeverityText }}</p>
            <p class="severity-card__tip">{{ plumbingSeverityTip }}</p>
          </div>
          <div v-else-if="plumbingSeverity === 'normal'" class="severity-card severity-card--normal">
            <p class="severity-card__title">{{ plumbingSeverityText }}</p>
          </div>

          <!-- 匹配師傅按鈕 -->
          <button
            v-if="plumbingSeverity !== 'none'"
            class="btn btn--green btn--wide btn--submit"
            type="button"
            @click="goToEngineers"
          >
            ⚡ 智慧匹配附近最快到達水電師傅
          </button>
        </template>

        <!-- 👨‍🔧 第二步：附近師傅清單 -->
        <template v-if="repairStep === 'engineers'">
          <div class="plumbing-section-header">
            <h3 class="plumbing-section-header__title">👨‍🔧 附近可最快趕到的水電師傅</h3>
            <button class="btn btn--outline" type="button" @click="repairStep = 'input'">← 返回</button>
          </div>

          <div v-for="eng in engineers" :key="eng.id" class="engineer-card">
            <div class="engineer-card__badges">
              <span v-if="eng.recommended" class="parcel-badge parcel-badge--delivered">⚡ 最快 {{ eng.eta }}</span>
              <span class="parcel-badge parcel-badge--location">⭐ {{ eng.rating }} ({{ eng.serviceCount }} 次服務)</span>
            </div>
            <div class="engineer-card__info">
              <p class="engineer-card__name">{{ eng.area }} - {{ eng.company }} ({{ eng.name }})</p>
              <p class="engineer-card__fee">預算參考：{{ eng.fee }}</p>
            </div>
            <button class="btn btn--green btn--wide" type="button" @click="dispatchEngineer(eng.id)">
              📞 立即呼叫派單
            </button>
          </div>
        </template>

        <!-- ⏱️ 第三步：即時動態追蹤 -->
        <template v-if="repairStep === 'tracking'">
          <div class="tracking-eta-card">
            <h3 class="tracking-eta-card__title">預計 {{ trackingEngineer.etaMinutes }} 分鐘後抵達</h3>
            <p class="tracking-eta-card__distance">📍 距離您 {{ trackingEngineer.distance }}</p>
          </div>

          <div class="tracking-contact-card">
            <p class="tracking-contact-card__name">{{ trackingEngineer.name }} (車牌: {{ trackingEngineer.plate }})</p>
            <div class="tracking-contact-card__actions">
              <button class="btn btn--green" type="button" @click="handleCallEngineer">📞 電話聯絡</button>
              <button class="btn btn--outline" type="button" @click="handleMessageEngineer">💬 傳送訊息</button>
            </div>
          </div>

          <!-- 四階段進度時間軸 -->
          <div class="tracking-timeline">
            <div
              v-for="(step, idx) in trackingSteps"
              :key="idx"
              :class="['timeline-step', { 'timeline-step--done': step.done }]"
            >
              <span class="timeline-step__icon">{{ step.done ? step.icon : '⚪' }}</span>
              <span class="timeline-step__label">{{ step.label }}</span>
            </div>
          </div>

          <button class="btn btn--outline btn--wide" type="button" @click="resetRepairFlow">
            返回水電報修
          </button>
        </template>

      </section>

      <!-- ═══ Tab 5：家事服務 ═══ -->
      <section v-if="activeTab === 'housework'" class="tab-content" aria-label="家事服務">
        <!-- 熱門服務卡片 -->
        <div class="housework-grid">
          <label
            v-for="svc in houseworkServices"
            :key="svc.id"
            :class="['housework-card', { 'housework-card--selected': selectedService === svc.id }]"
          >
            <input
              v-model="selectedService"
              type="radio"
              :value="svc.id"
              class="sr-only"
              name="housework-service"
            >
            <span class="housework-card__icon">{{ svc.icon }}</span>
            <span class="housework-card__name">{{ svc.name }}</span>
            <span class="housework-card__price">{{ svc.price }}</span>
          </label>
        </div>

        <!-- 日期與時段 -->
        <div class="form-row">
          <label class="form-label">
            預約日期
            <input v-model="selectedDate" type="date" class="form-input">
          </label>
          <label class="form-label">
            時段
            <select v-model="selectedTime" class="form-input">
              <option value="" disabled>請選擇</option>
              <option value="morning">上午 (09:00-12:00)</option>
              <option value="afternoon">下午 (13:00-17:00)</option>
              <option value="evening">晚間 (18:00-21:00)</option>
            </select>
          </label>
        </div>

        <button class="btn btn--green btn--wide" @click="handleSubmitHousework">
          🟢 送出家事服務預約
        </button>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* ─── 模組 Token ─── */
.housing-module {
  --color-green: #3b7a70;
  --color-brown: #c67d33;
  --color-red: #d93838;
  --color-green-light: #e8f5f0;
  --color-brown-light: #fdf3e7;
  --radius: 12px;
}

.housing-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

/* ─── Tab Bar ─── */
.tab-bar {
  display: flex;
  overflow-x: auto;
  gap: 0;
  background: #f5f5f5;
  border-radius: var(--radius);
  padding: 4px;
  -webkit-overflow-scrolling: touch;
}

.tab-item {
  flex: 1 0 auto;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.tab-item--active {
  background: #fff;
  color: var(--color-green);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ─── Tab Content ─── */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ─── Cards ─── */
.card {
  background: #fff;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.card__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 6px;
}

.card__subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #888;
}

.card__date {
  font-size: 12px;
  color: #999;
  margin: 0 0 8px;
}

.card__summary {
  font-size: 14px;
  color: #444;
  margin: 0;
  line-height: 1.5;
}

/* ─── Buttons ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.btn:active {
  transform: scale(0.97);
}

.btn--green {
  background: var(--color-green);
  color: #fff;
}

.btn--brown {
  background: var(--color-brown);
  color: #fff;
}

.btn--outline {
  background: #fff;
  border: 1.5px solid var(--color-green);
  color: var(--color-green);
}

.btn--wide {
  width: 100%;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* ─── Parcel Zones (legacy - kept for reference) ─── */
.parcel-zones {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parcel-zone {
  border-radius: var(--radius);
  padding: 14px;
}

.parcel-zone h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.parcel-zone ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.parcel-zone li {
  font-size: 14px;
  padding: 4px 0;
}

.parcel-zone--frozen {
  background: #e0f2fe;
}

.parcel-zone--refrigerated {
  background: #e0f7fa;
}

.parcel-zone--normal {
  background: #f5f5f5;
}

.badge--urgent {
  display: inline-block;
  background: var(--color-red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
}

/* ─── Cold Storage Alert Card ─── */
.cold-alert-card {
  background: #fff7ed;
  border: 1.5px solid #fed7aa;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cold-alert-card__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: #c2410c;
}

.cold-alert-card__desc {
  font-size: 13px;
  color: #9a3412;
  margin: 0;
  line-height: 1.5;
}

/* ─── Filter Pills ─── */
.filter-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 2px 0;
}

.filter-pills::-webkit-scrollbar {
  display: none;
}

.filter-pill {
  flex: 0 0 auto;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid #e5e5e5;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.filter-pill--active {
  background: var(--color-green);
  border-color: var(--color-green);
  color: #fff;
  font-weight: 600;
}

.filter-pill:not(.filter-pill--active):hover {
  border-color: var(--color-green);
  color: var(--color-green);
}

/* ─── Parcel Card ─── */
.parcel-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parcel-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.parcel-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.parcel-badge--location {
  background: #f3f4f6;
  color: #374151;
}

.parcel-badge--normal {
  background: #f5f5f5;
  color: #6b7280;
}

.parcel-badge--cold {
  background: #e0f7fa;
  color: #0e7490;
}

.parcel-badge--frozen {
  background: #e0f2fe;
  color: #1d4ed8;
}

.parcel-badge--pending {
  background: #fee2e2;
  color: #dc2626;
}

.parcel-badge--transit {
  background: #fef9c3;
  color: #a16207;
}

.parcel-badge--delivered {
  background: var(--color-green-light);
  color: var(--color-green);
}

.parcel-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.parcel-card__carrier {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.parcel-card__detail {
  font-size: 13px;
  color: #555;
  margin: 0;
}

.parcel-card__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #777;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 10px;
}

.parcel-card__actions {
  display: flex;
  gap: 8px;
}

/* ─── Truck ETA (legacy) ─── */
.truck-eta {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-brown-light);
  border-radius: var(--radius);
  padding: 14px;
}

.truck-eta__icon {
  font-size: 24px;
}

.truck-eta__text {
  font-size: 14px;
  color: #5a3e1b;
}

/* ─── AI 垃圾分類助手卡片 ─── */
.trash-ai-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trash-ai-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

/* ─── AI Chat Bubbles ─── */
.trash-chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  padding: 8px 0;
}

.trash-chat__bubble {
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trash-chat__bubble--user {
  align-self: flex-end;
  background: var(--color-green);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.trash-chat__bubble--ai {
  align-self: flex-start;
  background: #f3f4f6;
  color: #333;
  border-bottom-left-radius: 4px;
}

.trash-chat__text {
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.trash-chat__thinking {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.trash-chat__quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

/* ─── AI Input Area ─── */
.trash-ai-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.trash-ai-input__photo-btn {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1.5px solid #ddd;
  background: #fafafa;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.trash-ai-input__photo-btn:hover {
  border-color: var(--color-green);
}

.trash-ai-input__text {
  flex: 1;
  padding: 10px 12px;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.trash-ai-input__text:focus {
  border-color: var(--color-green);
}

.trash-ai-input__submit {
  flex: 0 0 auto;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: var(--color-green);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.trash-ai-input__submit:active {
  opacity: 0.85;
}

/* ─── Truck Location Status ─── */
.truck-location-card {
  background: var(--color-brown-light);
  border-radius: 12px;
  padding: 12px 16px;
}

.truck-location-card__status {
  font-size: 13px;
  color: #7c4a15;
  margin: 0;
  font-weight: 500;
}

/* ─── Truck Countdown Card ─── */
.truck-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1.5px solid #e5e5e5;
  transition: border-color 0.2s;
}

.truck-card--urgent {
  border-color: #fbbf24;
  background: #fffbeb;
}

.truck-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.truck-card__name {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.truck-card__distance {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}

.truck-card__time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #555;
}

.truck-card__countdown {
  font-weight: 700;
  color: var(--color-green);
}

.truck-card__countdown--urgent {
  color: var(--color-red);
}

.truck-card__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.truck-card__category-badge {
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--color-green-light);
  color: var(--color-green);
  font-size: 12px;
  font-weight: 600;
}

.truck-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

/* ─── Bulky Item Form Card ─── */
.bulky-form-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bulky-form-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.bulky-form-card__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bulky-item-chip {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid #e5e5e5;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.bulky-item-chip--active {
  background: var(--color-brown-light);
  border-color: var(--color-brown);
  color: #7c4a15;
  font-weight: 600;
}

/* ─── Repair (legacy) ─── */
.repair-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin: 8px 0;
}

.repair-tag--urgent {
  background: #fee2e2;
  color: var(--color-red);
}

.repair-eta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-top: 8px;
}

.repair-eta__icon {
  font-size: 18px;
}

/* ─── Plumbing Input Card ─── */
.plumbing-input-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.plumbing-input-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

/* ─── Severity Card ─── */
.severity-card {
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.severity-card--urgent {
  background: #fef2f2;
  border: 1.5px solid #fca5a5;
}

.severity-card--normal {
  background: var(--color-green-light);
  border: 1.5px solid #a7d7cb;
}

.severity-card__title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #b91c1c;
}

.severity-card--normal .severity-card__title {
  color: var(--color-green);
}

.severity-card__tip {
  font-size: 13px;
  color: #991b1b;
  margin: 0;
  line-height: 1.5;
  font-weight: 500;
}

/* ─── Plumbing Section Header ─── */
.plumbing-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.plumbing-section-header__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

/* ─── Engineer Card ─── */
.engineer-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.engineer-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.engineer-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.engineer-card__name {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.engineer-card__fee {
  font-size: 13px;
  color: #666;
  margin: 0;
}

/* ─── Tracking ETA Card ─── */
.tracking-eta-card {
  background: var(--color-green-light);
  border: 1.5px solid #a7d7cb;
  border-radius: 16px;
  padding: 18px;
  text-align: center;
}

.tracking-eta-card__title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px;
  color: var(--color-green);
}

.tracking-eta-card__distance {
  font-size: 14px;
  color: #555;
  margin: 0;
}

/* ─── Tracking Contact Card ─── */
.tracking-contact-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tracking-contact-card__name {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.tracking-contact-card__actions {
  display: flex;
  gap: 8px;
}

/* ─── Tracking Timeline ─── */
.tracking-timeline {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-left: 3px solid #e5e5e5;
  margin-left: 10px;
  padding-left: 16px;
  position: relative;
}

.timeline-step:first-child {
  padding-top: 0;
}

.timeline-step:last-child {
  padding-bottom: 0;
  border-left-color: transparent;
}

.timeline-step--done {
  border-left-color: var(--color-green);
}

.timeline-step__icon {
  position: absolute;
  left: -13px;
  top: 12px;
  font-size: 16px;
  background: #fff;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-step:first-child .timeline-step__icon {
  top: 0;
}

.timeline-step__label {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

.timeline-step--done .timeline-step__label {
  color: #2d2d2d;
  font-weight: 600;
}

/* ─── Housework Grid ─── */
.housework-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.housework-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: var(--radius);
  background: #fff;
  border: 2px solid #e5e5e5;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  text-align: center;
}

.housework-card--selected {
  border-color: var(--color-green);
  background: var(--color-green-light);
}

.housework-card__icon {
  font-size: 28px;
}

.housework-card__name {
  font-size: 13px;
  font-weight: 600;
}

.housework-card__price {
  font-size: 12px;
  color: #888;
}

/* ─── Form ─── */
.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-label {
  flex: 1;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.form-input {
  padding: 10px 12px;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-green);
}

/* ─── 社區公告大卡片 ─── */
.announce-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}

.announce-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #2d2d2d;
}

/* ─── Carousel ─── */
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 12px;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.carousel__item {
  flex: 0 0 calc(50% - 6px);
  min-width: calc(50% - 6px);
  scroll-snap-align: start;
  background: var(--color-green-light);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid #d4ece5;
}

.carousel__item-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-green);
  margin: 0 0 4px;
}

.carousel__item-date {
  font-size: 11px;
  color: #888;
  margin: 0 0 8px;
}

.carousel__item-summary {
  font-size: 13px;
  color: #444;
  margin: 0;
  line-height: 1.5;
}

/* ─── Carousel Dots ─── */
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: #d4d4d4;
  padding: 0;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.carousel-dot--active {
  background: var(--color-green);
  transform: scale(1.3);
}

/* ─── 公設故障回報表單卡片 ─── */
.repair-form-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.repair-form-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.repair-form-card__subtitle {
  font-size: 13px;
  color: #888;
  margin: -8px 0 0;
}

/* ─── Quick Pills ─── */
.quick-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-pill {
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid #d4ece5;
  background: var(--color-green-light);
  color: var(--color-green);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.quick-pill:hover {
  background: #cce8df;
  border-color: var(--color-green);
}

.quick-pill:active {
  transform: scale(0.95);
}

/* ─── Textarea ─── */
.form-textarea {
  resize: vertical;
  min-height: 72px;
  font-family: inherit;
  line-height: 1.5;
}

/* ─── Photo Upload ─── */
.photo-upload {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.photo-upload:hover {
  border-color: var(--color-green);
}

.photo-upload__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.photo-upload__icon {
  font-size: 28px;
}

.photo-upload__text {
  font-size: 13px;
  color: #888;
}

.photo-upload__previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.photo-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
}

.photo-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-thumb__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-upload__add {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 2px dashed #ccc;
  background: #fafafa;
  font-size: 22px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── Urgency Radio ─── */
.urgency-row {
  display: flex;
  gap: 10px;
}

.urgency-option {
  flex: 1;
  cursor: pointer;
}

.urgency-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 10px;
  border-radius: 10px;
  border: 2px solid #e5e5e5;
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.2s, background 0.2s;
  text-align: center;
}

.urgency-badge--active {
  border-color: var(--color-green);
  background: var(--color-green-light);
}

.urgency-badge--urgent.urgency-badge--active {
  border-color: var(--color-red);
  background: #fee2e2;
}

/* ─── Submit Button ─── */
.btn--submit {
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  margin-top: 4px;
}

.btn--danger {
  border-color: var(--color-red);
  color: var(--color-red);
}

/* ─── Segmented Control ─── */
.segmented-control {
  display: flex;
  background: #f0f0f0;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.segmented-control__btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.segmented-control__btn--active {
  background: #fff;
  color: var(--color-green);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* ─── Ship Form Card ─── */
.ship-form-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ship-form-card__title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

/* ─── Shipment Progress Card ─── */
.shipment-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shipment-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.shipment-card__content {
  font-size: 14px;
  font-weight: 600;
  color: #2d2d2d;
  margin: 0;
}

.shipment-card__status {
  font-size: 13px;
  color: #555;
  margin: 0;
  line-height: 1.5;
}

.shipment-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

/* ─── Toast ─── */
.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  white-space: nowrap;
}

.toast--success {
  background: #fff;
  color: var(--color-green);
  border: 1.5px solid var(--color-green);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

/* ─── Accessibility: Screen reader only ─── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
