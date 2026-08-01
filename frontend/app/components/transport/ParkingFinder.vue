<script setup lang="ts">
/**
 * 停車助手（v3 重構）
 * 修復：頂部表單永遠常駐、預設自動載入附近停車場、狀態連動
 */

export type ParkingStatus = 'open' | 'full' | 'closed'
export type VehicleType = 'car' | 'motorcycle'
export interface GeoLocation { lat: number; lng: number }

export interface ParkingLot {
  id: string; name: string; distance: number; eta: number
  availableSpaces: number; totalSpaces: number
  rate: number; status: ParkingStatus; location: GeoLocation
  area: string; vehicleType: VehicleType
}

export interface ParkedRecord {
  lotName: string; floor: string; location: GeoLocation; parkedAt: string
}

const props = defineProps<{ location?: GeoLocation }>()
const emit = defineEmits<{ 'park-recorded': [record: ParkedRecord]; 'park-cleared': [] }>()

const runtimeConfig = useRuntimeConfig()
const GOOGLE_MAPS_KEY = runtimeConfig.public.googleMapsKey || ''

// ─── Refs ───
const formRef = ref<HTMLElement | null>(null)
const floorInputRef = ref<HTMLInputElement | null>(null)

// ─── 頂部表單狀態（永遠常駐） ───
const recordLotName = ref('')
const recordFloor = ref('')
const isSaving = ref(false)
const saveSuccess = ref(false)
const parkedRecord = ref<ParkedRecord | null>(null)
const elapsedTime = ref('')
let timerInterval: ReturnType<typeof setInterval> | null = null

// ─── 搜尋 & 篩選 ───
const searchArea = ref('')
const originInput = ref('📍 我的位置')
const vehicleType = ref<VehicleType>('car')

// ─── 導航狀態 ───
const navigatingLot = ref<ParkingLot | null>(null)

// ─── Mock 停車場資料 ───
const allParkingLots: ParkingLot[] = [
  { id: 'lot-1', name: '台北101停車場', distance: 200, eta: 3, availableSpaces: 12, totalSpaces: 150, rate: 60, status: 'open', location: { lat: 25.0340, lng: 121.5645 }, area: '信義區', vehicleType: 'car' },
  { id: 'lot-2', name: '信義威秀停車場', distance: 350, eta: 5, availableSpaces: 3, totalSpaces: 80, rate: 50, status: 'open', location: { lat: 25.0355, lng: 121.5670 }, area: '信義區', vehicleType: 'car' },
  { id: 'lot-3', name: '市府轉運站停車場', distance: 500, eta: 6, availableSpaces: 45, totalSpaces: 200, rate: 40, status: 'open', location: { lat: 25.0380, lng: 121.5680 }, area: '信義區', vehicleType: 'car' },
  { id: 'lot-4', name: '新光三越A11停車場', distance: 280, eta: 4, availableSpaces: 0, totalSpaces: 120, rate: 60, status: 'full', location: { lat: 25.0360, lng: 121.5660 }, area: '信義區', vehicleType: 'car' },
  { id: 'lot-5', name: '統一時代停車場', distance: 420, eta: 5, availableSpaces: 2, totalSpaces: 100, rate: 50, status: 'open', location: { lat: 25.0370, lng: 121.5640 }, area: '信義區', vehicleType: 'car' },
  { id: 'lot-6', name: '大安森林公園地下停車場', distance: 600, eta: 8, availableSpaces: 88, totalSpaces: 500, rate: 30, status: 'open', location: { lat: 25.0300, lng: 121.5356 }, area: '大安區', vehicleType: 'car' },
  { id: 'lot-7', name: '信義區機車停車場', distance: 150, eta: 2, availableSpaces: 30, totalSpaces: 60, rate: 20, status: 'open', location: { lat: 25.0338, lng: 121.5650 }, area: '信義區', vehicleType: 'motorcycle' },
  { id: 'lot-8', name: '市府站機車格', distance: 300, eta: 4, availableSpaces: 15, totalSpaces: 40, rate: 15, status: 'open', location: { lat: 25.0375, lng: 121.5675 }, area: '信義區', vehicleType: 'motorcycle' },
  { id: 'lot-9', name: '大安區機車停車場', distance: 550, eta: 7, availableSpaces: 50, totalSpaces: 80, rate: 15, status: 'open', location: { lat: 25.0295, lng: 121.5360 }, area: '大安區', vehicleType: 'motorcycle' },
  { id: 'lot-10', name: '西門町公有停車場', distance: 1200, eta: 15, availableSpaces: 30, totalSpaces: 180, rate: 40, status: 'open', location: { lat: 25.0420, lng: 121.5080 }, area: '萬華區', vehicleType: 'car' },
  { id: 'lot-11', name: '南京復興站停車場', distance: 900, eta: 11, availableSpaces: 20, totalSpaces: 80, rate: 50, status: 'open', location: { lat: 25.0520, lng: 121.5440 }, area: '松山區', vehicleType: 'car' },
  { id: 'lot-12', name: '松山機車停車場', distance: 850, eta: 10, availableSpaces: 25, totalSpaces: 50, rate: 15, status: 'open', location: { lat: 25.0515, lng: 121.5445 }, area: '松山區', vehicleType: 'motorcycle' },
]

// 預設自動顯示（依 vehicleType 篩選 + 區域搜尋）
const displayLots = computed<ParkingLot[]>(() => {
  let result = allParkingLots.filter(l => l.vehicleType === vehicleType.value)
  if (searchArea.value.trim()) {
    const kw = searchArea.value.trim().toLowerCase()
    result = result.filter(l => l.area.includes(kw) || l.name.toLowerCase().includes(kw))
  }
  return result.sort((a, b) => a.distance - b.distance)
})

// ─── Google Maps URL ───
const navMapUrl = computed(() => {
  if (!navigatingLot.value) return ''
  const orig = originInput.value === '📍 我的位置' ? '25.033,121.565' : encodeURIComponent(originInput.value)
  return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${orig}&destination=${navigatingLot.value.location.lat},${navigatingLot.value.location.lng}&mode=driving`
})

// ─── Actions ───
function startNavigation(lot: ParkingLot) {
  navigatingLot.value = lot
}

function cancelNavigation() {
  navigatingLot.value = null
}

function handleParked(lot?: ParkingLot) {
  const target = lot || navigatingLot.value
  if (target) recordLotName.value = target.name
  navigatingLot.value = null

  nextTick(() => {
    formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { floorInputRef.value?.focus() }, 400)
  })
}

async function handleConfirmRecord() {
  if (!recordLotName.value) return
  isSaving.value = true

  const lot = allParkingLots.find(l => l.name === recordLotName.value)
  const record: ParkedRecord = {
    lotName: recordLotName.value,
    floor: recordFloor.value || '未指定',
    location: lot?.location || props.location || { lat: 25.033, lng: 121.565 },
    parkedAt: new Date().toISOString(),
  }

  try {
    await $fetch('/api/orders', {
      method: 'POST',
      body: {
        category: 'TRANSPORT',
        serviceType: '停車助手記錄',
        source: 'MANUAL',
        customerName: '使用者',
        customerPhone: '',
        storeId: recordLotName.value,
        details: {
          parkingLotName: recordLotName.value,
          floorArea: recordFloor.value || '未指定',
          hourlyRate: lot ? `$${lot.rate}/hr` : '',
          parkedAt: record.parkedAt,
        },
      },
    })
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e) { console.warn('DB 寫入失敗', e) }

  parkedRecord.value = record
  recordLotName.value = ''
  recordFloor.value = ''
  isSaving.value = false
  startTimer(record.parkedAt)
  emit('park-recorded', record)
}

function handleClearRecord() {
  stopTimer()
  parkedRecord.value = null
  elapsedTime.value = ''
  emit('park-cleared')
}

function handleNavigateToParked() {
  if (!parkedRecord.value) return
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${parkedRecord.value.location.lat},${parkedRecord.value.location.lng}&travelmode=walking`, '_blank')
}

// ─── Timer ───
function startTimer(t: string) { updateElapsed(t); timerInterval = setInterval(() => updateElapsed(t), 60000) }
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null } }
function updateElapsed(t: string) { const d = Date.now() - new Date(t).getTime(); const h = Math.floor(d/3600000); const m = Math.floor((d%3600000)/60000); elapsedTime.value = h > 0 ? `${h}h ${m}min` : `${m}min` }

// ─── Utils ───
function getUsagePercent(lot: ParkingLot): number { return lot.totalSpaces === 0 ? 0 : Math.round(((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100) }
function isNearlyFull(lot: ParkingLot): boolean { return lot.availableSpaces <= 5 && lot.availableSpaces > 0 }
const statusLabels: Record<ParkingStatus, string> = { open: '營業中', full: '已滿', closed: '休息中' }

onUnmounted(() => { stopTimer() })
</script>

<template>
  <section class="pf" aria-label="停車助手">
    <div class="pf__card">

      <!-- ════════════════════════════════════════════════ -->
      <!-- ═══ 頂部表單（永遠常駐） ═══ -->
      <!-- ════════════════════════════════════════════════ -->
      <div ref="formRef" class="pf__form-section">
        <h3 class="pf__title">🅿️ 停車助手</h3>

        <!-- 已記錄狀態 -->
        <div v-if="parkedRecord" class="pf__record">
          <div class="pf__record-header">🅿️ 我的停車位</div>
          <div class="pf__record-info">
            <div class="pf__record-row"><span>停車場</span><span>{{ parkedRecord.lotName }}</span></div>
            <div class="pf__record-row"><span>樓層</span><span>{{ parkedRecord.floor }}</span></div>
            <div class="pf__record-row"><span>已停放</span><span class="pf__elapsed">{{ elapsedTime }}</span></div>
          </div>
          <div class="pf__record-actions">
            <button class="pf__btn pf__btn--nav" @click="handleNavigateToParked">📍 導航至車位</button>
            <button class="pf__btn pf__btn--clear" @click="handleClearRecord">結束停車</button>
          </div>
          <div v-if="saveSuccess" class="pf__save-ok">✅ 已同步至雲端</div>
        </div>

        <!-- 輸入表單（未記錄時顯示） -->
        <div v-else class="pf__form">
          <div class="pf__field">
            <label class="pf__label">停車場名稱</label>
            <input v-model="recordLotName" type="text" class="pf__input" placeholder="點下方停車場自動帶入，或手動輸入" />
          </div>
          <div class="pf__field">
            <label class="pf__label">樓層/區域</label>
            <input ref="floorInputRef" v-model="recordFloor" type="text" class="pf__input" placeholder="例如：B2、A區" />
          </div>
          <button class="pf__btn pf__btn--confirm" :disabled="!recordLotName || isSaving" @click="handleConfirmRecord">
            {{ isSaving ? '儲存中...' : '確認記錄' }}
          </button>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════ -->
      <!-- ═══ 導航中面板 ═══ -->
      <!-- ════════════════════════════════════════════════ -->
      <div v-if="navigatingLot" class="pf__nav-panel">
        <div class="pf__nav-header">
          <span class="pf__nav-status">🧭 導航中</span>
          <button class="pf__nav-close" @click="cancelNavigation">✕</button>
        </div>
        <p class="pf__nav-dest">{{ navigatingLot.name }}</p>
        <div class="pf__nav-eta">
          <span>⏱ {{ navigatingLot.eta }} 分鐘</span>
          <span>📏 {{ navigatingLot.distance >= 1000 ? `${(navigatingLot.distance/1000).toFixed(1)} km` : `${navigatingLot.distance} m` }}</span>
        </div>
        <iframe v-if="GOOGLE_MAPS_KEY" class="pf__nav-map" :src="navMapUrl" frameborder="0" allowfullscreen loading="lazy" title="導航路線"></iframe>
        <div v-else class="pf__nav-map-placeholder">地圖金鑰未設定</div>
        <button class="pf__btn pf__btn--parked" @click="handleParked()">🅿️ 我已停妥</button>
      </div>

      <!-- ════════════════════════════════════════════════ -->
      <!-- ═══ 搜尋 + 起點 + 運具 + 停車場列表（表單下方） ═══ -->
      <!-- ════════════════════════════════════════════════ -->
      <div class="pf__search-section">
        <div class="pf__search-row">
          <input v-model="searchArea" type="text" class="pf__input pf__input--search" placeholder="🔍 搜尋區域或地標..." />
        </div>
        <div class="pf__origin-row">
          <span class="pf__origin-label">起點</span>
          <input v-model="originInput" type="text" class="pf__input pf__input--sm" placeholder="📍 我的位置" />
        </div>
        <div class="pf__vehicle-row">
          <button class="pf__vehicle" :class="{ 'pf__vehicle--active': vehicleType === 'car' }" @click="vehicleType = 'car'">🚗 汽車</button>
          <button class="pf__vehicle" :class="{ 'pf__vehicle--active': vehicleType === 'motorcycle' }" @click="vehicleType = 'motorcycle'">🛵 機車</button>
        </div>
      </div>

      <!-- 停車場列表（預設自動載入） -->
      <div class="pf__lots">
        <h4 class="pf__lots-title">{{ searchArea || '附近' }}停車場（{{ displayLots.length }}）</h4>
        <div v-if="displayLots.length === 0" class="pf__empty">找不到符合條件的停車場</div>
        <div v-for="lot in displayLots" :key="lot.id" class="pf__lot">
          <div class="pf__lot-header">
            <span class="pf__lot-name">{{ lot.name }}</span>
            <span class="pf__lot-status" :class="`pf__lot-status--${lot.status}`">{{ statusLabels[lot.status] }}</span>
          </div>
          <div class="pf__lot-meta">
            <span>📏 {{ lot.distance >= 1000 ? `${(lot.distance/1000).toFixed(1)}km` : `${lot.distance}m` }}</span>
            <span>⏱ {{ lot.eta }}分</span>
            <span>剩餘 {{ lot.availableSpaces }} 位<span v-if="isNearlyFull(lot)" class="pf__nearly-full"> 即將額滿</span></span>
            <span>${{ lot.rate }}/hr</span>
          </div>
          <div class="pf__lot-progress">
            <div class="pf__progress-bg"><div class="pf__progress-fill" :class="{ 'pf__progress-fill--danger': isNearlyFull(lot) || lot.status === 'full' }" :style="{ width: `${getUsagePercent(lot)}%` }"></div></div>
            <span class="pf__progress-label">{{ getUsagePercent(lot) }}%</span>
          </div>
          <div v-if="lot.status !== 'full'" class="pf__lot-actions">
            <button class="pf__btn pf__btn--navigate" @click="startNavigation(lot)">🧭 路線導航</button>
            <button class="pf__btn pf__btn--parked-sm" @click="handleParked(lot)">🅿️ 我已停妥</button>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.pf { width: 100%; }
.pf__card { background: #fff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.pf__title { font-size: 15px; font-weight: 700; margin: 0 0 12px; }

/* Form Section (常駐) */
.pf__form-section { border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
.pf__form { display: flex; flex-direction: column; gap: 8px; }
.pf__field { display: flex; flex-direction: column; gap: 4px; }
.pf__label { font-size: 11px; color: #78716c; }
.pf__input { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
.pf__input:focus { border-color: #f59e0b; }
.pf__input--search { flex: 1; }
.pf__input--sm { flex: 1; min-height: 38px; font-size: 12px; }

/* Record */
.pf__record { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 12px; padding: 12px; }
.pf__record-header { font-size: 13px; font-weight: 600; color: #f59e0b; margin-bottom: 8px; }
.pf__record-info { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.pf__record-row { display: flex; justify-content: space-between; font-size: 12px; }
.pf__record-row span:first-child { color: #78716c; }
.pf__record-row span:last-child { font-weight: 500; color: #1c1917; }
.pf__elapsed { color: #f59e0b !important; font-weight: 600 !important; }
.pf__record-actions { display: flex; gap: 8px; }
.pf__save-ok { margin-top: 8px; font-size: 11px; color: #16a34a; text-align: center; }

/* Buttons */
.pf__btn { min-height: 44px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; padding: 10px 16px; transition: opacity .15s; }
.pf__btn:active { opacity: .7; }
.pf__btn--confirm { background: #f59e0b; color: #fff; }
.pf__btn--confirm:disabled { opacity: .5; cursor: not-allowed; }
.pf__btn--nav { flex: 1; background: #0ea5e9; color: #fff; }
.pf__btn--clear { flex: 1; background: #f1f5f9; color: #78716c; }
.pf__btn--navigate { flex: 1; background: #0ea5e9; color: #fff; }
.pf__btn--parked { width: 100%; background: #16a34a; color: #fff; font-size: 15px; }
.pf__btn--parked-sm { flex: 1; background: #16a34a; color: #fff; }

/* Navigation Panel */
.pf__nav-panel { border: 2px solid #0ea5e9; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.pf__nav-header { display: flex; align-items: center; justify-content: space-between; }
.pf__nav-status { font-size: 13px; font-weight: 700; color: #0ea5e9; }
.pf__nav-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #78716c; }
.pf__nav-dest { margin: 0; font-size: 14px; font-weight: 600; color: #1c1917; }
.pf__nav-eta { display: flex; gap: 16px; font-size: 13px; color: #78716c; }
.pf__nav-map { width: 100%; height: 200px; border-radius: 10px; }
.pf__nav-map-placeholder { height: 60px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 10px; font-size: 12px; color: #9ca3af; }

/* Search Section */
.pf__search-section { display: flex; flex-direction: column; gap: 8px; }
.pf__search-row { display: flex; gap: 8px; }
.pf__origin-row { display: flex; align-items: center; gap: 8px; }
.pf__origin-label { font-size: 12px; font-weight: 600; color: #78716c; white-space: nowrap; }
.pf__vehicle-row { display: flex; gap: 8px; }
.pf__vehicle { flex: 1; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center; transition: all .15s; }
.pf__vehicle--active { border-color: #f59e0b; background: #fffbeb; color: #f59e0b; }

/* Lots */
.pf__lots { display: flex; flex-direction: column; gap: 10px; }
.pf__lots-title { font-size: 13px; font-weight: 600; margin: 0; }
.pf__empty { text-align: center; padding: 20px; font-size: 13px; color: #78716c; }
.pf__lot { padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
.pf__lot-header { display: flex; justify-content: space-between; align-items: center; }
.pf__lot-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.pf__lot-status { font-size: 10px; padding: 1px 6px; border-radius: 9999px; }
.pf__lot-status--open { background: #dcfce7; color: #15803d; }
.pf__lot-status--full { background: #ffe4e6; color: #e11d48; }
.pf__lot-status--closed { background: #f1f5f9; color: #9ca3af; }
.pf__lot-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #78716c; }
.pf__nearly-full { color: #e11d48; font-weight: 600; }
.pf__lot-progress { display: flex; align-items: center; gap: 8px; }
.pf__progress-bg { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.pf__progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #f59e0b, #d97706); transition: width .3s; }
.pf__progress-fill--danger { background: linear-gradient(90deg, #e11d48, #be123c); }
.pf__progress-label { font-size: 11px; color: #78716c; min-width: 30px; text-align: right; }
.pf__lot-actions { display: flex; gap: 8px; }
</style>
