<script setup lang="ts">
/**
 * 停車助手元件（升級版）
 * - 搜尋周邊停車場 + Google Maps 導航連動
 * - 點擊「開始導航」→ 顯示導航狀態 → 點「我已停妥」→ 自動填入表單
 * - 確認記錄 → POST /api/orders 寫入 Neon DB
 */

export type ParkingStatus = 'open' | 'full' | 'closed'
export interface GeoLocation { lat: number; lng: number }

export interface ParkingLot {
  id: string; name: string; distance: number
  availableSpaces: number; totalSpaces: number
  rate: number; status: ParkingStatus; location: GeoLocation
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

// ─── 狀態 ───
type ViewState = 'idle' | 'navigating' | 'has-record'
const viewState = ref<ViewState>('idle')
const parkedRecord = ref<ParkedRecord | null>(null)
const liveMessage = ref('')

// 搜尋
const searchKeyword = ref('')
const filteredLots = computed(() => {
  if (!searchKeyword.value.trim()) return parkingLots.value
  const kw = searchKeyword.value.trim().toLowerCase()
  return parkingLots.value.filter(l => l.name.toLowerCase().includes(kw))
})

// 導航狀態
const navigatingLot = ref<ParkingLot | null>(null)
const estimatedTime = ref('')
const estimatedDistance = ref('')

// 表單
const recordLotName = ref('')
const recordFloor = ref('')
const showRecordForm = ref(false)
const isSaving = ref(false)
const saveSuccess = ref(false)

// 計時
const elapsedTime = ref('')
let timerInterval: ReturnType<typeof setInterval> | null = null

// ─── Mock 停車場資料 ───
const parkingLots = ref<ParkingLot[]>([
  { id: 'lot-1', name: '台北101停車場', distance: 200, availableSpaces: 12, totalSpaces: 150, rate: 60, status: 'open', location: { lat: 25.0340, lng: 121.5645 } },
  { id: 'lot-2', name: '信義威秀停車場', distance: 350, availableSpaces: 3, totalSpaces: 80, rate: 50, status: 'open', location: { lat: 25.0355, lng: 121.5670 } },
  { id: 'lot-3', name: '市府轉運站停車場', distance: 500, availableSpaces: 45, totalSpaces: 200, rate: 40, status: 'open', location: { lat: 25.0380, lng: 121.5680 } },
  { id: 'lot-4', name: '新光三越A11停車場', distance: 280, availableSpaces: 0, totalSpaces: 120, rate: 60, status: 'full', location: { lat: 25.0360, lng: 121.5660 } },
  { id: 'lot-5', name: '統一時代停車場', distance: 420, availableSpaces: 2, totalSpaces: 100, rate: 50, status: 'open', location: { lat: 25.0370, lng: 121.5640 } },
])

// ─── 導航地圖 URL ───
const navMapUrl = computed(() => {
  if (!navigatingLot.value) return ''
  const origin = props.location || { lat: 25.033, lng: 121.565 }
  return `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${origin.lat},${origin.lng}&destination=${navigatingLot.value.location.lat},${navigatingLot.value.location.lng}&mode=driving`
})

// ─── Actions ───
function startNavigation(lot: ParkingLot) {
  navigatingLot.value = lot
  viewState.value = 'navigating'
  // 模擬預估時間（根據距離）
  const minutes = Math.max(1, Math.round(lot.distance / 100))
  estimatedTime.value = `${minutes} 分鐘`
  estimatedDistance.value = lot.distance >= 1000 ? `${(lot.distance / 1000).toFixed(1)} km` : `${lot.distance} m`
  liveMessage.value = `正在導航前往 ${lot.name}`
}

function handleParked() {
  // 自動填入表單
  recordLotName.value = navigatingLot.value?.name || ''
  showRecordForm.value = true
  viewState.value = 'idle'
  navigatingLot.value = null

  // 平滑捲動到表單 + 聚焦樓層欄位
  nextTick(() => {
    formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { floorInputRef.value?.focus() }, 400)
  })
  liveMessage.value = '已自動填入停車場名稱，請輸入樓層/區域'
}

function cancelNavigation() {
  navigatingLot.value = null
  viewState.value = 'idle'
}

async function handleConfirmRecord() {
  if (!recordLotName.value) return

  isSaving.value = true
  const record: ParkedRecord = {
    lotName: recordLotName.value,
    floor: recordFloor.value || '未指定',
    location: navigatingLot.value?.location || props.location || { lat: 25.033, lng: 121.565 },
    parkedAt: new Date().toISOString(),
  }

  // POST to Neon DB
  try {
    const lot = parkingLots.value.find(l => l.name === recordLotName.value)
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
  } catch (e) {
    // 離線模式仍可記錄
    console.warn('DB 寫入失敗（離線模式）', e)
  }

  parkedRecord.value = record
  viewState.value = 'has-record'
  showRecordForm.value = false
  recordLotName.value = ''
  recordFloor.value = ''
  isSaving.value = false

  startTimer(record.parkedAt)
  liveMessage.value = '已記錄您的停車位置'
  emit('park-recorded', record)
}

function handleCancelRecord() {
  showRecordForm.value = false
  recordLotName.value = ''
  recordFloor.value = ''
}

function handleClearRecord() {
  stopTimer()
  parkedRecord.value = null
  viewState.value = 'idle'
  elapsedTime.value = ''
  emit('park-cleared')
}

function handleNavigateToParked() {
  if (!parkedRecord.value) return
  const url = `https://www.google.com/maps/dir/?api=1&destination=${parkedRecord.value.location.lat},${parkedRecord.value.location.lng}&travelmode=walking`
  window.open(url, '_blank')
}

// ─── 工具 ───
function startTimer(parkedAt: string) {
  updateElapsed(parkedAt)
  timerInterval = setInterval(() => updateElapsed(parkedAt), 60000)
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null } }
function updateElapsed(parkedAt: string) {
  const diff = Date.now() - new Date(parkedAt).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  elapsedTime.value = h > 0 ? `${h}h ${m}min` : `${m}min`
}
function getUsagePercent(lot: ParkingLot): number {
  return lot.totalSpaces === 0 ? 0 : Math.round(((lot.totalSpaces - lot.availableSpaces) / lot.totalSpaces) * 100)
}
function isNearlyFull(lot: ParkingLot): boolean { return lot.availableSpaces <= 5 && lot.availableSpaces > 0 }
const statusLabels: Record<ParkingStatus, string> = { open: '營業中', full: '已滿', closed: '休息中' }

onUnmounted(() => { stopTimer() })
</script>

<template>
  <section class="pf" aria-label="停車助手">
    <div class="pf__card" ref="formRef">
      <h3 class="pf__title">🅿️ 停車助手</h3>
      <div aria-live="polite" aria-atomic="true" class="sr-only">{{ liveMessage }}</div>

      <!-- ═══ 已記錄停車位 ═══ -->
      <div v-if="viewState === 'has-record' && parkedRecord" class="pf__record">
        <div class="pf__record-header"><span>🅿️</span><span class="pf__record-label">我的停車位</span></div>
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

      <!-- ═══ 記錄停車表單 ═══ -->
      <div v-if="showRecordForm" class="pf__form">
        <div class="pf__field">
          <label class="pf__label">停車場名稱</label>
          <input v-model="recordLotName" type="text" class="pf__input" placeholder="自動帶入或手動輸入" />
        </div>
        <div class="pf__field">
          <label class="pf__label">樓層/區域</label>
          <input ref="floorInputRef" v-model="recordFloor" type="text" class="pf__input" placeholder="例如：B2、A區" />
        </div>
        <div class="pf__form-actions">
          <button class="pf__btn pf__btn--confirm" :disabled="!recordLotName || isSaving" @click="handleConfirmRecord">
            {{ isSaving ? '儲存中...' : '確認記錄' }}
          </button>
          <button class="pf__btn pf__btn--cancel" @click="handleCancelRecord">取消</button>
        </div>
      </div>

      <!-- ═══ 記錄按鈕（idle 無表單） ═══ -->
      <button v-if="viewState === 'idle' && !showRecordForm" class="pf__start-btn" @click="showRecordForm = true">
        📍 記錄停車位置
      </button>

      <!-- ═══ 導航中面板 ═══ -->
      <div v-if="viewState === 'navigating' && navigatingLot" class="pf__nav-panel">
        <div class="pf__nav-header">
          <span class="pf__nav-status">🧭 導航中</span>
          <button class="pf__nav-close" @click="cancelNavigation">✕</button>
        </div>
        <p class="pf__nav-dest">前往：{{ navigatingLot.name }}</p>
        <div class="pf__nav-eta">
          <span>⏱ {{ estimatedTime }}</span>
          <span>📏 {{ estimatedDistance }}</span>
        </div>
        <!-- Google Maps 導航路線 -->
        <iframe
          v-if="GOOGLE_MAPS_KEY"
          class="pf__nav-map"
          :src="navMapUrl"
          frameborder="0"
          allowfullscreen
          loading="lazy"
          title="導航路線"
        ></iframe>
        <div v-else class="pf__nav-map-placeholder">地圖金鑰未設定</div>
        <button class="pf__btn pf__btn--parked" @click="handleParked">🅿️ 我已停妥</button>
      </div>

      <!-- ═══ 搜尋 + 停車場列表 ═══ -->
      <div v-if="viewState === 'idle'" class="pf__lots">
        <h4 class="pf__lots-title">周邊停車場</h4>
        <input v-model="searchKeyword" type="text" class="pf__search" placeholder="🔍 搜尋停車場..." />

        <div v-for="lot in filteredLots" :key="lot.id" class="pf__lot">
          <div class="pf__lot-header">
            <span class="pf__lot-name">{{ lot.name }}</span>
            <span class="pf__lot-status" :class="`pf__lot-status--${lot.status}`">{{ statusLabels[lot.status] }}</span>
          </div>
          <div class="pf__lot-meta">
            <span>{{ lot.distance }}m</span>
            <span>剩餘 {{ lot.availableSpaces }} 位 <span v-if="isNearlyFull(lot)" class="pf__nearly-full">即將額滿</span></span>
            <span>${{ lot.rate }}/hr</span>
          </div>
          <div class="pf__lot-progress">
            <div class="pf__progress-bg">
              <div class="pf__progress-fill" :class="{ 'pf__progress-fill--danger': isNearlyFull(lot) || lot.status === 'full' }" :style="{ width: `${getUsagePercent(lot)}%` }"></div>
            </div>
            <span class="pf__progress-label">{{ getUsagePercent(lot) }}%</span>
          </div>
          <button v-if="lot.status !== 'full'" class="pf__btn pf__btn--navigate" @click="startNavigation(lot)">
            🧭 開始導航
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pf { width: 100%; }
.pf__card { background: #fff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 16px; }
.pf__title { font-size: 15px; font-weight: 700; margin: 0 0 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

/* Record */
.pf__record { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.pf__record-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #f59e0b; }
.pf__record-info { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.pf__record-row { display: flex; justify-content: space-between; font-size: 12px; }
.pf__record-row span:first-child { color: #78716c; }
.pf__record-row span:last-child { font-weight: 500; color: #1c1917; }
.pf__elapsed { color: #f59e0b !important; font-weight: 600 !important; }
.pf__record-actions { display: flex; gap: 8px; }
.pf__save-ok { margin-top: 8px; font-size: 11px; color: #16a34a; text-align: center; }

/* Form */
.pf__form { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.pf__field { margin-bottom: 8px; }
.pf__label { display: block; font-size: 11px; color: #78716c; margin-bottom: 4px; }
.pf__input { width: 100%; min-height: 44px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
.pf__input:focus { border-color: #f59e0b; }
.pf__form-actions { display: flex; gap: 8px; }

/* Buttons */
.pf__btn { min-height: 44px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; padding: 10px 16px; transition: opacity .15s; }
.pf__btn:active { opacity: .7; }
.pf__btn--confirm { flex: 1; background: #f59e0b; color: #fff; }
.pf__btn--confirm:disabled { opacity: .5; cursor: not-allowed; }
.pf__btn--cancel { background: #f1f5f9; color: #78716c; }
.pf__btn--nav { flex: 1; background: #0ea5e9; color: #fff; }
.pf__btn--clear { flex: 1; background: #f1f5f9; color: #78716c; }
.pf__btn--navigate { width: 100%; background: #0ea5e9; color: #fff; margin-top: 8px; }
.pf__btn--parked { width: 100%; background: #16a34a; color: #fff; font-size: 15px; }

.pf__start-btn { width: 100%; min-height: 44px; margin-bottom: 12px; border: 1px dashed #f59e0b; border-radius: 12px; background: #fffbeb; font-size: 13px; font-weight: 500; color: #f59e0b; cursor: pointer; }

/* Navigation Panel */
.pf__nav-panel { border: 2px solid #0ea5e9; border-radius: 12px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }
.pf__nav-header { display: flex; align-items: center; justify-content: space-between; }
.pf__nav-status { font-size: 13px; font-weight: 700; color: #0ea5e9; }
.pf__nav-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #78716c; }
.pf__nav-dest { margin: 0; font-size: 14px; font-weight: 600; color: #1c1917; }
.pf__nav-eta { display: flex; gap: 16px; font-size: 13px; color: #78716c; }
.pf__nav-map { width: 100%; height: 180px; border-radius: 10px; }
.pf__nav-map-placeholder { height: 60px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 10px; font-size: 12px; color: #9ca3af; }

/* Search */
.pf__lots { display: flex; flex-direction: column; gap: 10px; }
.pf__lots-title { font-size: 13px; font-weight: 600; margin: 0; }
.pf__search { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; }
.pf__search:focus { border-color: #f59e0b; }

/* Lot card */
.pf__lot { padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; }
.pf__lot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.pf__lot-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.pf__lot-status { font-size: 10px; padding: 1px 6px; border-radius: 9999px; }
.pf__lot-status--open { background: #dcfce7; color: #15803d; }
.pf__lot-status--full { background: #ffe4e6; color: #e11d48; }
.pf__lot-status--closed { background: #f1f5f9; color: #9ca3af; }
.pf__lot-meta { display: flex; gap: 12px; font-size: 11px; color: #78716c; margin-bottom: 8px; }
.pf__nearly-full { color: #e11d48; font-weight: 600; }
.pf__lot-progress { display: flex; align-items: center; gap: 8px; }
.pf__progress-bg { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.pf__progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #f59e0b, #d97706); transition: width .3s; }
.pf__progress-fill--danger { background: linear-gradient(90deg, #e11d48, #be123c); }
.pf__progress-label { font-size: 11px; color: #78716c; min-width: 30px; text-align: right; }
</style>
