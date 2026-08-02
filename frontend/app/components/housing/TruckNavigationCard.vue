<script setup lang="ts">
/**
 * 垃圾車清運點查詢與導航元件
 * 串接 /api/garbage/nearby (台北市公開資料 API)
 * 以及 /api/truck-schedule/set-reminder, /navigate
 * 含 Geolocation 定位、台北市回收規則顯示、Google Maps 導航地圖
 * 前端卡片資料連動 form_id = 1030 (Topics 4039, 4040, 4042)
 */

// ─── Types ───
interface TruckStop {
  id: string
  name: string
  lat: number
  lng: number
  district?: string
  route?: string
  vehicleNo?: string
  trip?: string
  distanceMeters: number
  walkMinutes: number
  arriveTime: string
  leaveTime?: string
  minutesLeft: number
  urgent: boolean
  categories: string[]
}

interface TodaySchedule {
  dayLabel: string
  categories: string[]
  isRestDay: boolean
}

interface NextAvailable {
  dayLabel: string
  categories: string[]
  daysUntil: number
}

// ─── State ───
const { apiFetch } = useApi()

const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)
const locationStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const locationError = ref('')

const stops = ref<TruckStop[]>([])
const todaySchedule = ref<TodaySchedule | null>(null)
const nextAvailable = ref<NextAvailable | null>(null)
const isLoading = ref(false)
const dataSource = ref<'taipei-opendata' | 'fallback' | ''>('')

// 卡片資料（Topic 4039, 4040, 4042）
interface CardData {
  '4039'?: { topicId: number; value: string }
  '4040'?: { topicId: number; value: string }
  '4042'?: { topicId: number; value: { stopName: string; stopLat: number; stopLng: number; userLat: number; userLng: number } }
}
const cards = ref<CardData | null>(null)

// 導航地圖 Drawer
const showMapDrawer = ref(false)
const mapEmbedUrl = ref('')
const externalNavUrl = ref('')
const selectedStopName = ref('')

// 提醒狀態
const reminderSet = ref<Record<string, boolean>>({})
const reminderToast = ref('')

// ─── Geolocation ───
function requestLocation() {
  if (!navigator.geolocation) {
    locationStatus.value = 'error'
    locationError.value = '您的瀏覽器不支援地理定位功能'
    return
  }

  locationStatus.value = 'loading'

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat.value = position.coords.latitude
      userLng.value = position.coords.longitude
      locationStatus.value = 'success'
      fetchNearbyStops()
    },
    (err) => {
      locationStatus.value = 'error'
      switch (err.code) {
        case err.PERMISSION_DENIED:
          locationError.value = '請允許定位權限以查詢附近清運點'
          break
        case err.POSITION_UNAVAILABLE:
          locationError.value = '無法取得您的位置資訊'
          break
        case err.TIMEOUT:
          locationError.value = '定位逾時，請重試'
          break
        default:
          locationError.value = '定位失敗，請重試'
      }
      // 使用預設位置（台北市信義區）作為 fallback
      userLat.value = 25.0330
      userLng.value = 121.5560
      fetchNearbyStops()
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  )
}

// ─── API 呼叫 ───
async function fetchNearbyStops() {
  if (userLat.value === null || userLng.value === null) return

  isLoading.value = true
  try {
    const result = await apiFetch<{
      success: boolean
      data: {
        todaySchedule: TodaySchedule
        nextAvailable: NextAvailable | null
        stops: TruckStop[]
        source: 'taipei-opendata' | 'fallback'
        cards: CardData | null
      }
    }>(`/api/garbage/nearby`, {
      method: 'GET',
      params: { lat: userLat.value, lng: userLng.value },
    })

    if (result.success) {
      todaySchedule.value = result.data.todaySchedule
      nextAvailable.value = result.data.nextAvailable
      stops.value = result.data.stops
      dataSource.value = result.data.source
      cards.value = result.data.cards
    }
  } catch (err) {
    console.error('取得清運點失敗:', err)
    // 如果新 API 失敗，嘗試 fallback 到舊 API
    try {
      const fallbackResult = await apiFetch<{
        success: boolean
        data: {
          todaySchedule: TodaySchedule
          nextAvailable: NextAvailable | null
          stops: TruckStop[]
        }
      }>(`/api/truck-schedule/nearby`, {
        method: 'POST',
        body: { lat: userLat.value, lng: userLng.value },
      })
      if (fallbackResult.success) {
        todaySchedule.value = fallbackResult.data.todaySchedule
        nextAvailable.value = fallbackResult.data.nextAvailable
        stops.value = fallbackResult.data.stops
        dataSource.value = 'fallback'
      }
    } catch (fallbackErr) {
      console.error('Fallback API 也失敗:', fallbackErr)
    }
  } finally {
    isLoading.value = false
  }
}

async function handleSetReminder(stop: TruckStop) {
  // 計算提醒時間（到達前 10 分鐘）
  const [h, m] = stop.arriveTime.split(':').map(Number)
  let reminderMinutes = h * 60 + m - 10
  if (reminderMinutes < 0) reminderMinutes = 0
  const reminderH = Math.floor(reminderMinutes / 60)
  const reminderM = reminderMinutes % 60
  const reminderTime = `${String(reminderH).padStart(2, '0')}:${String(reminderM).padStart(2, '0')}`

  try {
    await apiFetch(`/api/truck-schedule/set-reminder`, {
      method: 'POST',
      body: {
        stopId: stop.id,
        stopName: stop.name,
        reminderTime,
        arriveTime: stop.arriveTime,
      },
    })

    reminderSet.value[stop.id] = true
    reminderToast.value = `✅ 已設定 ${reminderTime} 提醒前往 ${stop.name}`

    // 嘗試觸發系統通知
    triggerSystemNotification(stop.name, reminderTime, stop.minutesLeft)

    setTimeout(() => { reminderToast.value = '' }, 4000)
  } catch (err) {
    console.error('設定提醒失敗:', err)
  }
}

async function handleNavigate(stop: TruckStop) {
  if (userLat.value === null || userLng.value === null) return

  // 優先使用 cards['4042'] 的導航點位資料
  const navData = cards.value?.['4042']?.value
  const destLat = navData?.stopLat ?? stop.lat
  const destLng = navData?.stopLng ?? stop.lng
  const destName = navData?.stopName ?? stop.name

  try {
    const result = await apiFetch<{
      success: boolean
      data: {
        stopName: string
        directionsEmbedUrl: string | null
        externalNavUrl: string
      }
    }>(`/api/truck-schedule/navigate`, {
      method: 'POST',
      body: {
        stopId: stop.id,
        stopName: destName,
        stopLat: destLat,
        stopLng: destLng,
        userLat: userLat.value,
        userLng: userLng.value,
      },
    })

    if (result.success) {
      selectedStopName.value = result.data.stopName
      externalNavUrl.value = result.data.externalNavUrl

      if (result.data.directionsEmbedUrl) {
        mapEmbedUrl.value = result.data.directionsEmbedUrl
      } else {
        mapEmbedUrl.value = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${destLng}!3d${destLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768`
      }

      showMapDrawer.value = true
    }
  } catch (err) {
    // Fallback: 直接開啟外部 Google Maps
    const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat.value},${userLng.value}&destination=${destLat},${destLng}&travelmode=walking`
    window.open(navUrl, '_blank')
  }
}

function closeMapDrawer() {
  showMapDrawer.value = false
  mapEmbedUrl.value = ''
}

function openExternalNav() {
  if (externalNavUrl.value) {
    window.open(externalNavUrl.value, '_blank')
  }
}

// ─── 系統通知 ───
function triggerSystemNotification(stopName: string, reminderTime: string, minutesLeft: number) {
  // 使用 Notification API（需使用者授權）
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      scheduleNotification(stopName, reminderTime, minutesLeft)
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          scheduleNotification(stopName, reminderTime, minutesLeft)
        }
      })
    }
  }
}

function scheduleNotification(stopName: string, _reminderTime: string, minutesLeft: number) {
  const delayMs = Math.max(0, (minutesLeft - 10) * 60 * 1000)
  setTimeout(() => {
    new Notification('🚛 垃圾車即將到達！', {
      body: `${stopName} 的垃圾車約 10 分鐘後到達，請準備出門丟垃圾！`,
      icon: '♻️',
    })
  }, delayMs)
}

// ─── 初始化：自動定位 ───
onMounted(() => {
  requestLocation()
})
</script>

<template>
  <div class="truck-nav">
    <!-- ─── 定位狀態 ─── -->
    <div class="truck-nav__status-card">
      <div v-if="locationStatus === 'loading'" class="truck-nav__status">
        <span class="truck-nav__spinner" />
        <span>📍 正在定位您的位置...</span>
      </div>
      <div v-else-if="locationStatus === 'success'" class="truck-nav__status truck-nav__status--success">
        <span>📍 已定位：台北市（{{ userLat?.toFixed(4) }}, {{ userLng?.toFixed(4) }}）</span>
      </div>
      <div v-else-if="locationStatus === 'error'" class="truck-nav__status truck-nav__status--error">
        <span>⚠️ {{ locationError }}</span>
        <button class="truck-nav__retry-btn" type="button" @click="requestLocation">重新定位</button>
      </div>
      <div v-else class="truck-nav__status">
        <button class="btn btn--green btn--wide" type="button" @click="requestLocation">
          📍 定位查詢附近清運點
        </button>
      </div>
    </div>

    <!-- ─── 今日收取規則 ─── -->
    <div v-if="todaySchedule" class="truck-nav__schedule-card">
      <div v-if="todaySchedule.isRestDay" class="truck-nav__rest-day">
        <p class="truck-nav__schedule-title">📅 今天（{{ todaySchedule.dayLabel }}）休息不收垃圾</p>
        <p v-if="nextAvailable" class="truck-nav__schedule-next">
          下次收垃圾：<strong>{{ nextAvailable.dayLabel }}</strong>（{{ nextAvailable.daysUntil }} 天後）
          <br>可收類別：{{ nextAvailable.categories.join('、') }}
        </p>
      </div>
      <div v-else>
        <p class="truck-nav__schedule-title">📅 今天（{{ todaySchedule.dayLabel }}）可收取：</p>
        <div class="truck-nav__category-tags">
          <span
            v-for="cat in todaySchedule.categories"
            :key="cat"
            class="truck-nav__category-tag"
          >
            {{ cat }}
          </span>
        </div>
      </div>
      <p v-if="dataSource" class="truck-nav__source">
        資料來源：{{ dataSource === 'taipei-opendata' ? '台北市政府公開資料' : '預設站點資料' }}
      </p>
    </div>

    <!-- ─── 卡片資料摘要（4039 / 4040） ─── -->
    <div v-if="cards" class="truck-nav__cards-summary">
      <div v-if="cards['4039']" class="truck-nav__card-item">
        <span class="truck-nav__card-label">📍 最近清運點</span>
        <span class="truck-nav__card-value">{{ cards['4039'].value }}</span>
      </div>
      <div v-if="cards['4040']" class="truck-nav__card-item">
        <span class="truck-nav__card-label">🕐 時間與類別</span>
        <span class="truck-nav__card-value">{{ cards['4040'].value }}</span>
      </div>
    </div>

    <!-- ─── Loading ─── -->
    <div v-if="isLoading" class="truck-nav__loading">
      <span class="truck-nav__spinner" />
      <span>查詢附近清運點中...</span>
    </div>

    <!-- ─── 清運點卡片列表 ─── -->
    <div
      v-for="stop in stops"
      :key="stop.id"
      :class="['truck-nav__stop-card', { 'truck-nav__stop-card--urgent': stop.urgent }]"
    >
      <div class="truck-nav__stop-header">
        <h4 class="truck-nav__stop-name">{{ stop.name }}</h4>
        <span class="truck-nav__stop-distance">📍 {{ stop.distanceMeters }}m（步行 {{ stop.walkMinutes }} 分鐘）</span>
      </div>

      <div class="truck-nav__stop-time">
        <span>🚛 預計 {{ stop.arriveTime }}{{ stop.leaveTime ? `~${stop.leaveTime}` : '' }} 停靠</span>
        <span :class="['truck-nav__countdown', { 'truck-nav__countdown--urgent': stop.urgent }]">
          {{ stop.urgent ? '⚡' : '⏱️' }} 還剩 {{ stop.minutesLeft }} 分鐘
        </span>
      </div>

      <div v-if="stop.categories.length > 0" class="truck-nav__stop-categories">
        <span
          v-for="cat in stop.categories"
          :key="cat"
          class="truck-nav__stop-cat-badge"
        >
          {{ cat }}
        </span>
      </div>

      <div class="truck-nav__stop-actions">
        <button
          :class="['btn', 'btn--outline', { 'btn--disabled': reminderSet[stop.id] }]"
          type="button"
          :disabled="reminderSet[stop.id]"
          @click="handleSetReminder(stop)"
        >
          {{ reminderSet[stop.id] ? '✅ 已設定提醒' : '🔔 到達前 10 分鐘提醒' }}
        </button>
        <button
          class="btn btn--green"
          type="button"
          @click="handleNavigate(stop)"
        >
          🧭 開啟導航前往
        </button>
      </div>
    </div>

    <!-- ─── 無清運點提示 ─── -->
    <div v-if="!isLoading && locationStatus === 'success' && stops.length === 0 && todaySchedule" class="truck-nav__empty">
      <p v-if="todaySchedule.isRestDay">📅 今天休息日，無垃圾車清運服務</p>
      <p v-else>🚛 今日附近清運點的垃圾車皆已通過，明天請早！</p>
    </div>

    <!-- ─── 提醒 Toast ─── -->
    <Transition name="toast">
      <div v-if="reminderToast" class="truck-nav__toast">
        {{ reminderToast }}
      </div>
    </Transition>

    <!-- ─── Google Maps 導航 Drawer ─── -->
    <Transition name="drawer">
      <div v-if="showMapDrawer" class="truck-nav__drawer-overlay" @click.self="closeMapDrawer">
        <div class="truck-nav__drawer">
          <div class="truck-nav__drawer-header">
            <h4 class="truck-nav__drawer-title">🧭 步行導航至 {{ selectedStopName }}</h4>
            <button class="truck-nav__drawer-close" type="button" @click="closeMapDrawer">✕</button>
          </div>

          <div class="truck-nav__drawer-map">
            <iframe
              v-if="mapEmbedUrl"
              :src="mapEmbedUrl"
              class="truck-nav__map-iframe"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Google Maps 步行導航"
            />
            <div v-else class="truck-nav__map-placeholder">
              <p>地圖載入中...</p>
            </div>
          </div>

          <div class="truck-nav__drawer-actions">
            <button class="btn btn--green btn--wide" type="button" @click="openExternalNav">
              🗺️ 在 Google Maps 中開啟完整導航
            </button>
            <button class="btn btn--outline btn--wide" type="button" @click="closeMapDrawer">
              關閉
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.truck-nav {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ─── Status Card ─── */
.truck-nav__status-card {
  background: #fff7ed;
  border-radius: 12px;
  padding: 12px 16px;
}

.truck-nav__status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #7c4a15;
  font-weight: 500;
}

.truck-nav__status--success {
  color: #166534;
}

.truck-nav__status--error {
  color: #b91c1c;
  flex-wrap: wrap;
}

.truck-nav__retry-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #b91c1c;
  background: #fff;
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
}

.truck-nav__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #ddd;
  border-top-color: #3b7a70;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Schedule Card ─── */
.truck-nav__schedule-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.truck-nav__schedule-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #2d2d2d;
}

.truck-nav__schedule-next {
  font-size: 13px;
  color: #555;
  margin: 6px 0 0;
  line-height: 1.6;
}

.truck-nav__rest-day {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.truck-nav__source {
  font-size: 11px;
  color: #aaa;
  margin: 8px 0 0;
  text-align: right;
}

.truck-nav__category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.truck-nav__category-tag {
  padding: 4px 10px;
  border-radius: 8px;
  background: #e8f5f0;
  color: #3b7a70;
  font-size: 12px;
  font-weight: 600;
}

/* ─── Cards Summary (4039 / 4040) ─── */
.truck-nav__cards-summary {
  background: #f0faf7;
  border: 1.5px solid #b8e0d4;
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.truck-nav__card-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.truck-nav__card-label {
  font-size: 12px;
  font-weight: 600;
  color: #3b7a70;
}

.truck-nav__card-value {
  font-size: 14px;
  color: #2d2d2d;
  line-height: 1.5;
}

/* ─── Loading ─── */
.truck-nav__loading {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 20px;
  font-size: 14px;
  color: #666;
}

/* ─── Stop Card ─── */
.truck-nav__stop-card {
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

.truck-nav__stop-card--urgent {
  border-color: #fbbf24;
  background: #fffbeb;
}

.truck-nav__stop-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.truck-nav__stop-name {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.truck-nav__stop-distance {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  flex-shrink: 0;
}

.truck-nav__stop-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #555;
}

.truck-nav__countdown {
  font-weight: 700;
  color: #3b7a70;
}

.truck-nav__countdown--urgent {
  color: #d93838;
}

.truck-nav__stop-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.truck-nav__stop-cat-badge {
  padding: 4px 10px;
  border-radius: 8px;
  background: #e8f5f0;
  color: #3b7a70;
  font-size: 12px;
  font-weight: 600;
}

.truck-nav__stop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

/* ─── Empty State ─── */
.truck-nav__empty {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 14px;
}

.truck-nav__empty p {
  margin: 0;
}

/* ─── Toast ─── */
.truck-nav__toast {
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
  background: #fff;
  color: #3b7a70;
  border: 1.5px solid #3b7a70;
  white-space: nowrap;
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

/* ─── Map Drawer ─── */
.truck-nav__drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.truck-nav__drawer {
  background: #fff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.truck-nav__drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #eee;
}

.truck-nav__drawer-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #2d2d2d;
}

.truck-nav__drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.truck-nav__drawer-map {
  flex: 1;
  min-height: 300px;
  background: #f5f5f5;
}

.truck-nav__map-iframe {
  width: 100%;
  height: 300px;
  border: none;
}

.truck-nav__map-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #888;
  font-size: 14px;
}

.truck-nav__drawer-actions {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid #eee;
}

/* ─── Drawer Transition ─── */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .truck-nav__drawer,
.drawer-leave-active .truck-nav__drawer {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .truck-nav__drawer {
  transform: translateY(100%);
}

.drawer-leave-to .truck-nav__drawer {
  transform: translateY(100%);
}

/* ─── Buttons (inherit from parent page) ─── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.btn:active {
  transform: scale(0.97);
}

.btn--green {
  background: #3b7a70;
  color: #fff;
}

.btn--outline {
  background: #fff;
  border: 1.5px solid #3b7a70;
  color: #3b7a70;
}

.btn--wide {
  width: 100%;
}

.btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: #aaa;
  color: #aaa;
}
</style>
