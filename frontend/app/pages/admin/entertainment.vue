<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ htmlAttrs: { lang: 'zh-TW' } })

// ─── Types（對齊客戶端 CommunityEvent / CommunityCourse） ───
type RegistrationStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'
type SpecialNeed = 'elderly_companion' | 'wheelchair' | 'vegetarian' | 'vegan' | 'halal' | 'other'
type ActivityStatus = 'open' | 'almost_full' | 'full' | 'closed' | 'completed'
type CourseStatus = 'open' | 'almost-full' | 'full'
type NotifyTemplate = 'reminder' | 'location_change' | 'cancel' | 'waitlist_promoted' | 'custom'

interface SpecialNeedItem {
  type: SpecialNeed
  note?: string
  resolved: boolean
}

interface Registration {
  id: string
  contactName: string
  contactPhone: string
  registeredAt: string
  status: RegistrationStatus
  specialNeeds: SpecialNeedItem[]
  paymentMethod: string
  amount: number
}

interface ManagedActivity {
  id: string
  name: string
  date: string
  time: string
  location: string
  organizer: string
  fee: number
  maxParticipants: number
  currentParticipants: number
  waitlistCount: number
  status: ActivityStatus
  registrations: Registration[]
  description?: string
}

interface ManagedCourse {
  id: string
  name: string
  instructor: string
  schedule: string
  credits: number
  sessions: number
  fee: number
  location: string
  maxStudents: number
  currentStudents: number
  waitlistCount: number
  status: CourseStatus
  registrations: Registration[]
}

interface NotifyRecord {
  id: string
  template: NotifyTemplate
  targetName: string
  targetId: string
  message: string
  sentAt: string
  recipientCount: number
}

// ─── 子模組切換 ───
type SubModule = 'activity' | 'course'
const subModule = ref<SubModule>('activity')

// ─── Tab 狀態 ───
const activeTab = ref(0)
const tabs = computed(() => {
  if (subModule.value === 'activity') return ['報名管理', '活動管理', '通知中心']
  return ['報名管理', '課程管理', '通知中心']
})

// ─── Toast ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ─── 工具函數 ───
function getStatusLabel(s: ActivityStatus | CourseStatus): string {
  const map: Record<string, string> = { open: '招生中', 'almost-full': '即將額滿', almost_full: '即將額滿', full: '已額滿', closed: '已截止', completed: '已結束' }
  return map[s] || s
}
function getSpecialNeedLabel(type: SpecialNeed): string {
  return { elderly_companion: '👴 長者陪伴', wheelchair: '♿ 輪椅需求', vegetarian: '🥬 素食', vegan: '🌱 全素', halal: '🕌 清真', other: '📝 其他' }[type]
}
function getRegStatusLabel(s: RegistrationStatus): string {
  return { pending: '待審核', confirmed: '已確認', checked_in: '已報到', completed: '已完成', cancelled: '已取消' }[s]
}
function getNotifyTemplateLabel(t: NotifyTemplate): string {
  return { reminder: '📢 活動提醒', location_change: '📍 地點變更', cancel: '❌ 取消通知', waitlist_promoted: '🎉 候補遞補', custom: '✏️ 自訂訊息' }[t]
}
function getCapacityPercent(current: number, max: number): number {
  return Math.min((current / max) * 100, 100)
}
function getCapacityClass(current: number, max: number): string {
  const pct = current / max
  if (pct >= 1) return 'ent__progress-fill--full'
  if (pct >= 0.8) return 'ent__progress-fill--warn'
  return ''
}

// ─── Mock：社區活動 ───
const activities = ref<ManagedActivity[]>([
  {
    id: 'act-1', name: '中秋社區聯歡晚會', date: '2024-09-17', time: '18:00-21:00', location: '信義里活動中心', organizer: '信義里辦公處',
    fee: 0, maxParticipants: 80, currentParticipants: 62, waitlistCount: 3, status: 'open',
    registrations: [
      { id: 'reg-1', contactName: '王奶奶', contactPhone: '0912-111-222', registeredAt: '07/25 10:00', status: 'pending', specialNeeds: [{ type: 'elderly_companion', note: '需要志工陪伴入座', resolved: false }, { type: 'vegetarian', resolved: false }], paymentMethod: '免費', amount: 0 },
      { id: 'reg-2', contactName: '林先生', contactPhone: '0933-222-333', registeredAt: '07/26 14:30', status: 'confirmed', specialNeeds: [], paymentMethod: '免費', amount: 0 },
      { id: 'reg-3', contactName: '張媽媽', contactPhone: '0922-333-444', registeredAt: '07/27 09:00', status: 'pending', specialNeeds: [{ type: 'wheelchair', note: '電動輪椅，需無障礙通道', resolved: false }], paymentMethod: '免費', amount: 0 },
      { id: 'reg-4', contactName: '陳伯伯', contactPhone: '0955-444-555', registeredAt: '07/28 11:00', status: 'confirmed', specialNeeds: [{ type: 'elderly_companion', resolved: true }], paymentMethod: '免費', amount: 0 },
      { id: 'reg-5', contactName: '趙小姐', contactPhone: '0966-555-666', registeredAt: '07/29 16:00', status: 'pending', specialNeeds: [{ type: 'halal', note: '清真飲食', resolved: false }], paymentMethod: '免費', amount: 0 },
    ],
  },
  {
    id: 'act-2', name: '社區健走日', date: '2024-08-10', time: '06:30-08:30', location: '象山步道入口', organizer: '信義里健康促進委員會',
    fee: 50, maxParticipants: 40, currentParticipants: 38, waitlistCount: 5, status: 'almost_full',
    registrations: [
      { id: 'reg-6', contactName: '李太太', contactPhone: '0977-666-777', registeredAt: '07/20 08:00', status: 'confirmed', specialNeeds: [], paymentMethod: '💳 線上付款', amount: 50 },
      { id: 'reg-7', contactName: '吳爺爺', contactPhone: '0988-777-888', registeredAt: '07/22 10:00', status: 'pending', specialNeeds: [{ type: 'elderly_companion', note: '行動較緩慢，需有人同行', resolved: false }], paymentMethod: '現場付款', amount: 50 },
    ],
  },
  {
    id: 'act-3', name: '親子手作 DIY 工作坊', date: '2024-08-18', time: '14:00-16:00', location: '里民活動室 2F', organizer: '信義里辦公處',
    fee: 200, maxParticipants: 20, currentParticipants: 20, waitlistCount: 4, status: 'full',
    registrations: [
      { id: 'reg-8', contactName: '黃媽媽', contactPhone: '0911-888-999', registeredAt: '07/15 09:00', status: 'confirmed', specialNeeds: [{ type: 'other', note: '小孩 3 歲，需準備兒童用具', resolved: true }], paymentMethod: '💳 線上付款', amount: 200 },
    ],
  },
])

// ─── Mock：社大課程 ───
const courses = ref<ManagedCourse[]>([
  {
    id: 'crs-1', name: '銀髮族手機攝影班', instructor: '陳老師', schedule: '每週三 09:00-11:00', credits: 2, sessions: 12, fee: 2000, location: '社區大學 A201', maxStudents: 30, currentStudents: 24, waitlistCount: 2, status: 'open',
    registrations: [
      { id: 'creg-1', contactName: '劉奶奶', contactPhone: '0912-001-002', registeredAt: '07/10 10:00', status: 'confirmed', specialNeeds: [{ type: 'elderly_companion', note: '聽力稍弱，需坐前排', resolved: true }], paymentMethod: '💳 線上付款', amount: 2000 },
      { id: 'creg-2', contactName: '許伯伯', contactPhone: '0933-002-003', registeredAt: '07/12 14:00', status: 'pending', specialNeeds: [{ type: 'wheelchair', resolved: false }], paymentMethod: '現場付款', amount: 2000 },
    ],
  },
  {
    id: 'crs-2', name: '社區園藝療癒課', instructor: '林老師', schedule: '每週六 14:00-16:00', credits: 1, sessions: 8, fee: 1500, location: '里民花園', maxStudents: 15, currentStudents: 14, waitlistCount: 3, status: 'almost-full',
    registrations: [
      { id: 'creg-3', contactName: '蔡小姐', contactPhone: '0955-003-004', registeredAt: '07/08 09:00', status: 'confirmed', specialNeeds: [], paymentMethod: '💳 線上付款', amount: 1500 },
    ],
  },
  {
    id: 'crs-3', name: '太極拳入門', instructor: '王師傅', schedule: '每週一、四 07:00-08:00', credits: 2, sessions: 24, fee: 1800, location: '社區公園', maxStudents: 25, currentStudents: 25, waitlistCount: 6, status: 'full',
    registrations: [
      { id: 'creg-4', contactName: '周先生', contactPhone: '0966-004-005', registeredAt: '07/01 06:00', status: 'confirmed', specialNeeds: [], paymentMethod: '💳 線上付款', amount: 1800 },
    ],
  },
])

// ─── Mock：通知紀錄 ───
const notifications = ref<NotifyRecord[]>([
  { id: 'noti-1', template: 'reminder', targetName: '中秋社區聯歡晚會', targetId: 'act-1', message: '提醒您：中秋聯歡晚會將於 9/17（二）18:00 於信義里活動中心舉行，請準時出席！', sentAt: '07/30 10:00', recipientCount: 62 },
  { id: 'noti-2', template: 'waitlist_promoted', targetName: '親子手作 DIY 工作坊', targetId: 'act-3', message: '恭喜！您已從候補名單遞補成功，請於活動前完成繳費。', sentAt: '07/29 14:00', recipientCount: 1 },
])

// ─── 通知模板 ───
const notifyTemplates: { key: NotifyTemplate; label: string; defaultMsg: string }[] = [
  { key: 'reminder', label: '📢 活動提醒', defaultMsg: '提醒您：{活動名稱} 將於 {日期} {時間} 於 {地點} 舉行，請準時出席！' },
  { key: 'location_change', label: '📍 地點變更', defaultMsg: '通知：{活動名稱} 地點已變更為 {新地點}，造成不便敬請見諒。' },
  { key: 'cancel', label: '❌ 取消通知', defaultMsg: '抱歉通知：{活動名稱} 因故取消，已繳費用將於 3 個工作天內退回。' },
  { key: 'waitlist_promoted', label: '🎉 候補遞補', defaultMsg: '恭喜！您已從候補名單遞補成功，請於活動前完成報名確認。' },
  { key: 'custom', label: '✏️ 自訂訊息', defaultMsg: '' },
]
const selectedTemplate = ref<NotifyTemplate>('reminder')
const customMessage = ref('')
const sendTargetId = ref('')

// ─── Actions：報名管理 ───
function confirmRegistration(item: ManagedActivity | ManagedCourse, reg: Registration) {
  reg.status = 'confirmed'
  showToast(`✅ 已確認：${reg.contactName} 報名 ${item.name}`)
}

function cancelRegistration(item: ManagedActivity | ManagedCourse, reg: Registration) {
  reg.status = 'cancelled'
  // 候補遞補
  if ('waitlistCount' in item && item.waitlistCount > 0) {
    item.waitlistCount--
    item.currentParticipants = Math.min(item.currentParticipants, 'maxParticipants' in item ? item.maxParticipants : (item as ManagedCourse).maxStudents)
    showToast(`❌ 已取消 ${reg.contactName}，候補已自動遞補 1 位`)
  } else {
    if ('currentParticipants' in item) item.currentParticipants--
    else (item as ManagedCourse).currentStudents--
    showToast(`❌ 已取消：${reg.contactName}`)
  }
}

function checkinRegistration(reg: Registration) {
  reg.status = 'checked_in'
  showToast(`📱 報到成功：${reg.contactName}`)
}

function resolveSpecialNeed(reg: Registration, need: SpecialNeedItem) {
  need.resolved = true
  showToast(`✅ 已安排：${reg.contactName} — ${getSpecialNeedLabel(need.type)}`)
}

// ─── Actions：活動/課程管理 ───
function closeActivity(item: ManagedActivity) {
  item.status = 'closed'
  showToast(`🔒 已截止報名：${item.name}`)
}

function completeActivity(item: ManagedActivity) {
  item.status = 'completed'
  item.registrations.forEach(r => { if (r.status === 'confirmed' || r.status === 'checked_in') r.status = 'completed' })
  showToast(`🎉 活動已完成：${item.name}`)
}

// ─── Actions：發送通知 ───
function sendNotification() {
  const target = subModule.value === 'activity'
    ? activities.value.find(a => a.id === sendTargetId.value)
    : courses.value.find(c => c.id === sendTargetId.value)
  if (!target) { showToast('⚠️ 請選擇通知對象'); return }

  const tpl = notifyTemplates.find(t => t.key === selectedTemplate.value)
  const msg = selectedTemplate.value === 'custom' ? customMessage.value : (tpl?.defaultMsg || '').replace('{活動名稱}', target.name)
  const recipientCount = target.registrations.filter(r => r.status !== 'cancelled').length

  notifications.value.unshift({
    id: `noti-${Date.now()}`,
    template: selectedTemplate.value,
    targetName: target.name,
    targetId: target.id,
    message: msg,
    sentAt: new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    recipientCount,
  })
  customMessage.value = ''
  showToast(`📤 已發送通知給 ${recipientCount} 位報名者`)
}

// ─── Computed ───
const currentItems = computed(() => subModule.value === 'activity' ? activities.value : courses.value)
const pendingReviewCount = computed(() => {
  const items = subModule.value === 'activity' ? activities.value : courses.value
  return items.reduce((sum, item) => sum + item.registrations.filter(r => r.status === 'pending').length, 0)
})
const unresolvedNeedsCount = computed(() => {
  const items = subModule.value === 'activity' ? activities.value : courses.value
  return items.reduce((sum, item) => sum + item.registrations.reduce((s, r) => s + r.specialNeeds.filter(n => !n.resolved).length, 0), 0)
})

// ─── Demo ───
function resetDemo() { location.reload() }
</script>

<template>
  <div class="w-full max-w-[430px] mx-auto min-h-screen bg-[#fafaf9] relative flex flex-col pb-20 shadow-xl border-x border-[#e2e8f0]">

    <!-- Header -->
    <header class="ent__header">
      <span class="ent__header-title">🎉 社區活動 / 社大管理</span>
      <NuxtLink class="ent__header-link" to="/entertainment">📱 用戶端</NuxtLink>
    </header>

    <!-- 子模組切換 -->
    <div class="ent__module-switch">
      <button class="ent__module-btn" :class="{ 'ent__module-btn--active': subModule === 'activity' }" @click="subModule = 'activity'; activeTab = 0">🎉 社區活動</button>
      <button class="ent__module-btn" :class="{ 'ent__module-btn--active': subModule === 'course' }" @click="subModule = 'course'; activeTab = 0">📚 社大課程</button>
    </div>

    <main class="ent__content" role="main">

      <!-- 頂部統計 -->
      <section class="ent__stats">
        <div class="ent__stat ent__stat--red">🔴 待審核 {{ pendingReviewCount }}</div>
        <div class="ent__stat ent__stat--amber">⚠️ 特殊需求 {{ unresolvedNeedsCount }}</div>
      </section>

      <!-- Tab -->
      <nav class="ent__tabs" role="tablist">
        <button v-for="(tab, idx) in tabs" :key="tab" class="ent__tab" :class="{ 'ent__tab--active': activeTab === idx }" @click="activeTab = idx">
          {{ ['📋', '🎯', '📢'][idx] }} {{ tab }}
        </button>
      </nav>

      <!-- ═══ Tab 1：報名管理 ═══ -->
      <section v-show="activeTab === 0" aria-label="報名管理">
        <div v-for="item in currentItems" :key="item.id" class="ent__card">
          <div class="ent__card-top">
            <h4 class="ent__card-title">{{ item.name }}</h4>
            <span class="ent__badge" :class="{ 'ent__badge--green': item.status === 'open', 'ent__badge--amber': item.status === 'almost_full' || item.status === 'almost-full', 'ent__badge--gray': item.status === 'full' || item.status === 'closed' }">
              {{ getStatusLabel(item.status) }}
            </span>
          </div>

          <!-- 人數進度 -->
          <div class="ent__capacity">
            <div class="ent__progress-bar">
              <div class="ent__progress-fill" :class="getCapacityClass('currentParticipants' in item ? item.currentParticipants : item.currentStudents, 'maxParticipants' in item ? item.maxParticipants : item.maxStudents)" :style="{ width: `${getCapacityPercent('currentParticipants' in item ? item.currentParticipants : item.currentStudents, 'maxParticipants' in item ? item.maxParticipants : item.maxStudents)}%` }"></div>
            </div>
            <span class="ent__capacity-text">👥 {{ 'currentParticipants' in item ? item.currentParticipants : item.currentStudents }} / {{ 'maxParticipants' in item ? item.maxParticipants : item.maxStudents }} 人 <span v-if="item.waitlistCount > 0" class="ent__waitlist">（候補 {{ item.waitlistCount }}）</span></span>
          </div>

          <!-- 報名列表 -->
          <div v-for="reg in item.registrations.filter(r => r.status !== 'cancelled')" :key="reg.id" class="ent__reg-row">
            <div class="ent__reg-info">
              <span class="ent__reg-name">{{ reg.contactName }}</span>
              <span class="ent__reg-phone">{{ reg.contactPhone }}</span>
              <span class="ent__reg-status" :class="{ 'ent__reg-status--pending': reg.status === 'pending', 'ent__reg-status--confirmed': reg.status === 'confirmed', 'ent__reg-status--checkin': reg.status === 'checked_in' }">{{ getRegStatusLabel(reg.status) }}</span>
            </div>
            <!-- 特殊需求標示 -->
            <div v-if="reg.specialNeeds.length > 0" class="ent__needs">
              <div v-for="need in reg.specialNeeds" :key="need.type" class="ent__need-item" :class="{ 'ent__need-item--resolved': need.resolved }">
                <span>{{ getSpecialNeedLabel(need.type) }}</span>
                <span v-if="need.note" class="ent__need-note">{{ need.note }}</span>
                <button v-if="!need.resolved" class="ent__need-btn" @click="resolveSpecialNeed(reg, need)">✅ 已安排</button>
                <span v-else class="ent__need-done">已處理</span>
              </div>
            </div>
            <!-- 操作 -->
            <div class="ent__reg-actions">
              <button v-if="reg.status === 'pending'" class="ent__btn-sm ent__btn-sm--green" @click="confirmRegistration(item, reg)">✅ 確認</button>
              <button v-if="reg.status === 'confirmed'" class="ent__btn-sm ent__btn-sm--blue" @click="checkinRegistration(reg)">📱 報到</button>
              <button v-if="reg.status !== 'cancelled' && reg.status !== 'completed'" class="ent__btn-sm ent__btn-sm--red" @click="cancelRegistration(item, reg)">取消</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ Tab 2：活動/課程管理 ═══ -->
      <section v-show="activeTab === 1" aria-label="活動課程管理">
        <div v-for="item in currentItems" :key="item.id" class="ent__card">
          <div class="ent__card-top">
            <h4 class="ent__card-title">{{ item.name }}</h4>
            <span class="ent__badge" :class="{ 'ent__badge--green': item.status === 'open', 'ent__badge--amber': item.status === 'almost_full' || item.status === 'almost-full', 'ent__badge--gray': item.status === 'full' || item.status === 'closed' }">
              {{ getStatusLabel(item.status) }}
            </span>
          </div>
          <div class="ent__card-details">
            <template v-if="'date' in item">
              <span>📅 {{ (item as ManagedActivity).date }} {{ (item as ManagedActivity).time }}</span>
              <span>📍 {{ (item as ManagedActivity).location }}</span>
              <span>🏢 {{ (item as ManagedActivity).organizer }}</span>
              <span>💰 {{ (item as ManagedActivity).fee === 0 ? '免費' : `$${(item as ManagedActivity).fee}` }}</span>
            </template>
            <template v-else>
              <span>👨‍🏫 {{ (item as ManagedCourse).instructor }}</span>
              <span>🕐 {{ (item as ManagedCourse).schedule }}</span>
              <span>📖 {{ (item as ManagedCourse).credits }} 學分 / {{ (item as ManagedCourse).sessions }} 堂</span>
              <span>📍 {{ (item as ManagedCourse).location }}</span>
              <span>💰 ${{ (item as ManagedCourse).fee.toLocaleString() }}</span>
            </template>
          </div>
          <!-- 人數控管 -->
          <div class="ent__capacity">
            <div class="ent__progress-bar">
              <div class="ent__progress-fill" :class="getCapacityClass('currentParticipants' in item ? item.currentParticipants : item.currentStudents, 'maxParticipants' in item ? item.maxParticipants : item.maxStudents)" :style="{ width: `${getCapacityPercent('currentParticipants' in item ? item.currentParticipants : item.currentStudents, 'maxParticipants' in item ? item.maxParticipants : item.maxStudents)}%` }"></div>
            </div>
            <span class="ent__capacity-text">👥 {{ 'currentParticipants' in item ? item.currentParticipants : item.currentStudents }} / {{ 'maxParticipants' in item ? item.maxParticipants : item.maxStudents }} 人</span>
            <span v-if="item.waitlistCount > 0" class="ent__waitlist">候補 {{ item.waitlistCount }} 人</span>
          </div>
          <!-- 活動操作 -->
          <div v-if="'date' in item && item.status !== 'completed'" class="ent__manage-actions">
            <button v-if="item.status === 'open' || item.status === 'almost_full'" class="ent__btn ent__btn--outline" @click="closeActivity(item as ManagedActivity)">🔒 截止報名</button>
            <button v-if="item.status !== 'open'" class="ent__btn ent__btn--primary" @click="completeActivity(item as ManagedActivity)">🎉 標記完成</button>
          </div>
        </div>
      </section>

      <!-- ═══ Tab 3：通知中心 ═══ -->
      <section v-show="activeTab === 2" aria-label="通知中心">
        <!-- 發送新通知 -->
        <div class="ent__card">
          <h4 class="ent__card-title">📤 發送通知</h4>
          <div class="ent__notify-form">
            <select v-model="sendTargetId" class="ent__select" aria-label="選擇通知對象">
              <option value="">-- 選擇活動/課程 --</option>
              <option v-for="item in currentItems" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <select v-model="selectedTemplate" class="ent__select" aria-label="選擇通知模板">
              <option v-for="tpl in notifyTemplates" :key="tpl.key" :value="tpl.key">{{ tpl.label }}</option>
            </select>
            <textarea v-if="selectedTemplate === 'custom'" v-model="customMessage" class="ent__textarea" placeholder="輸入自訂通知內容..." rows="3"></textarea>
            <button class="ent__btn ent__btn--primary" @click="sendNotification">📤 發送通知</button>
          </div>
        </div>

        <!-- 通知紀錄 -->
        <div class="ent__card" v-for="noti in notifications" :key="noti.id">
          <div class="ent__card-top">
            <span class="ent__notify-template">{{ getNotifyTemplateLabel(noti.template) }}</span>
            <span class="ent__card-meta">{{ noti.sentAt }}</span>
          </div>
          <p class="ent__card-meta">📍 {{ noti.targetName }} · 👥 {{ noti.recipientCount }} 人收到</p>
          <p class="ent__notify-msg">{{ noti.message }}</p>
        </div>
      </section>

    </main>

    <!-- Toast -->
    <Transition name="toast-fade">
      <div v-if="toastMessage" class="ent__toast">{{ toastMessage }}</div>
    </Transition>

    <!-- Demo -->
    <div class="ent__demo-panel">
      <button class="ent__demo-btn" @click="resetDemo">🔄 重設</button>
    </div>
  </div>
</template>

<style scoped>
.ent__header { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 16px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.ent__header-title { font-size: 13px; font-weight: 600; color: #1c1917; }
.ent__header-link { padding: 4px 10px; font-size: 11px; font-weight: 700; color: #ec4899; background: #fdf2f8; border: 1px solid rgba(236,72,153,.2); border-radius: 9999px; text-decoration: none; }

.ent__module-switch { display: flex; gap: 0; padding: 12px 16px 0; }
.ent__module-btn { flex: 1; padding: 10px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .15s ease; }
.ent__module-btn:first-child { border-radius: 10px 0 0 10px; }
.ent__module-btn:last-child { border-radius: 0 10px 10px 0; border-left: none; }
.ent__module-btn--active { background: #ec4899; color: #fff; border-color: #ec4899; }

.ent__content { display: flex; flex-direction: column; gap: 16px; padding: 16px; flex: 1; }

.ent__stats { display: flex; justify-content: center; gap: 8px; }
.ent__stat { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.ent__stat--red { background: #ffe4e6; color: #e11d48; }
.ent__stat--amber { background: #fef3c7; color: #d97706; }

.ent__tabs { display: flex; gap: 0; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.ent__tab { flex: 1; padding: 10px 4px; border: none; background: transparent; font-size: 11px; font-weight: 600; font-family: inherit; color: #78716c; cursor: pointer; text-align: center; white-space: nowrap; transition: all .15s; }
.ent__tab:not(:last-child) { border-right: 1px solid #e2e8f0; }
.ent__tab--active { background: #ec4899; color: #fff; }

.ent__card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.ent__card:last-child { margin-bottom: 0; }
.ent__card-top { display: flex; align-items: center; justify-content: space-between; }
.ent__card-title { margin: 0; font-size: 15px; font-weight: 700; color: #1c1917; }
.ent__card-meta { margin: 0; font-size: 12px; color: #78716c; }
.ent__card-details { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #78716c; }

.ent__badge { display: inline-flex; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.ent__badge--green { background: #dcfce7; color: #16a34a; }
.ent__badge--amber { background: #fef3c7; color: #d97706; }
.ent__badge--gray { background: #f1f5f9; color: #64748b; }

.ent__capacity { display: flex; flex-direction: column; gap: 4px; }
.ent__progress-bar { height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
.ent__progress-fill { height: 100%; background: #ec4899; border-radius: 9999px; transition: width .3s; }
.ent__progress-fill--warn { background: #d97706; }
.ent__progress-fill--full { background: #e11d48; }
.ent__capacity-text { font-size: 11px; color: #78716c; }
.ent__waitlist { color: #d97706; font-weight: 600; }

.ent__reg-row { padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 6px; }
.ent__reg-row:last-child { border-bottom: none; }
.ent__reg-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ent__reg-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.ent__reg-phone { font-size: 11px; color: #78716c; }
.ent__reg-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 6px; }
.ent__reg-status--pending { background: #fef3c7; color: #d97706; }
.ent__reg-status--confirmed { background: #dcfce7; color: #16a34a; }
.ent__reg-status--checkin { background: #e0f2fe; color: #0369a1; }

.ent__needs { display: flex; flex-direction: column; gap: 4px; }
.ent__need-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.ent__need-item--resolved { background: #dcfce7; border-color: #86efac; opacity: .7; }
.ent__need-note { color: #92400e; font-style: italic; }
.ent__need-btn { padding: 2px 8px; border: none; border-radius: 6px; background: #16a34a; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer; }
.ent__need-done { font-size: 10px; color: #16a34a; font-weight: 600; }

.ent__reg-actions { display: flex; gap: 6px; }
.ent__btn-sm { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; font-family: inherit; cursor: pointer; border: none; }
.ent__btn-sm--green { background: #16a34a; color: #fff; }
.ent__btn-sm--blue { background: #2563eb; color: #fff; }
.ent__btn-sm--red { background: transparent; border: 1px solid #e11d48; color: #e11d48; }

.ent__manage-actions { display: flex; gap: 8px; }
.ent__btn { display: flex; align-items: center; justify-content: center; flex: 1; padding: 12px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity .15s; }
.ent__btn:hover { opacity: .85; }
.ent__btn--primary { background: #ec4899; color: #fff; }
.ent__btn--outline { background: transparent; border: 1.5px solid #ec4899; color: #ec4899; }

.ent__notify-form { display: flex; flex-direction: column; gap: 10px; }
.ent__select { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; }
.ent__textarea { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; resize: none; }
.ent__notify-template { font-size: 12px; font-weight: 600; color: #7c3aed; background: #f3e8ff; padding: 2px 8px; border-radius: 9999px; }
.ent__notify-msg { margin: 0; font-size: 12px; color: #1c1917; line-height: 1.5; background: #f8fafc; padding: 8px 12px; border-radius: 8px; }

.ent__toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; background: #1e293b; color: #fff; font-size: 13px; font-weight: 600; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.15); white-space: nowrap; }
.ent__demo-panel { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
.ent__demo-btn { padding: 8px 14px; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); background: #78716c; color: #fff; }
.ent__demo-btn:active { transform: scale(.95); }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
