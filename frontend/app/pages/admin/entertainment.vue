<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ htmlAttrs: { lang: 'zh-TW' } })

// ─── Types ───
type RegistrationStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'
type SpecialNeed = 'elderly_companion' | 'wheelchair' | 'vegetarian' | 'vegan' | 'halal' | 'other'
type ActivityStatus = 'open' | 'almost_full' | 'full' | 'closed' | 'completed'
type ActivityCategory = 'health' | 'festival' | 'family' | 'elderly' | 'eco'
type RegSource = 'app' | 'delegate' | 'onsite'
type NotifyTemplate = 'reminder' | 'location_change' | 'cancel' | 'waitlist_promoted' | 'custom'

interface SpecialNeedItem { type: SpecialNeed; note?: string; resolved: boolean }

interface Registration {
  id: string; contactName: string; contactPhone: string; registeredAt: string
  status: RegistrationStatus; specialNeeds: SpecialNeedItem[]
  source: RegSource; paymentMethod: string; amount: number
}

interface ManagedActivity {
  id: string; name: string; category: ActivityCategory; date: string; time: string
  location: string; organizer: string; fee: number
  maxParticipants: number; currentParticipants: number; waitlistCount: number
  volunteersNeeded: number; volunteersAssigned: number
  checkedInCount: number; status: ActivityStatus
  registrations: Registration[]; description?: string
}

interface NotifyRecord {
  id: string; template: NotifyTemplate; targetName: string; targetId: string
  message: string; sentAt: string; recipientCount: number
}

// ─── Tab ───
const activeTab = ref(0)
const tabs = ['報名管理', '活動管理', '通知中心']

// ─── 分類篩選 ───
type FilterCategory = 'all' | ActivityCategory
const selectedCategory = ref<FilterCategory>('all')
const categories: { key: FilterCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'health', label: '🏃 健康促進' },
  { key: 'festival', label: '🎊 節慶慶典' },
  { key: 'family', label: '👨‍👩‍👧 親子教育' },
  { key: 'elderly', label: '👴 長者關懷' },
  { key: 'eco', label: '🌿 環保生態' },
]

// ─── Toast ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ─── 工具函數 ───
function getStatusLabel(s: ActivityStatus): string {
  return { open: '招生中', almost_full: '即將額滿', full: '已額滿', closed: '已截止', completed: '已結束' }[s]
}
function getCategoryLabel(c: ActivityCategory): string {
  return { health: '🏃 健康促進', festival: '🎊 節慶慶典', family: '👨‍👩‍👧 親子教育', elderly: '👴 長者關懷', eco: '🌿 環保生態' }[c]
}
function getSpecialNeedLabel(type: SpecialNeed): string {
  return { elderly_companion: '👴 長者陪伴', wheelchair: '♿ 輪椅需求', vegetarian: '🥬 素食', vegan: '🌱 全素', halal: '🕌 清真', other: '📝 其他' }[type]
}
function getRegStatusLabel(s: RegistrationStatus): string {
  return { pending: '待審核', confirmed: '已確認', checked_in: '已報到', completed: '已完成', cancelled: '已取消' }[s]
}
function getSourceLabel(s: RegSource): string {
  return { app: '📱 APP', delegate: '👤 里長代報', onsite: '🏠 現場報名' }[s]
}
function getCapacityPercent(c: number, m: number): number { return Math.min((c / m) * 100, 100) }
function getCapacityClass(c: number, m: number): string {
  const pct = c / m
  if (pct >= 1) return 'ea__progress--full'
  if (pct >= 0.8) return 'ea__progress--warn'
  return ''
}
function getCheckInRate(act: ManagedActivity): string {
  if (act.currentParticipants === 0) return '0%'
  return `${Math.round((act.checkedInCount / act.currentParticipants) * 100)}%`
}

// ─── Mock 資料 ───
const activities = ref<ManagedActivity[]>([
  {
    id: 'act-1', name: '中秋社區聯歡晚會', category: 'festival', date: '2024-09-17', time: '18:00-21:00',
    location: '信義里活動中心', organizer: '信義里辦公處', fee: 0,
    maxParticipants: 80, currentParticipants: 62, waitlistCount: 0, checkedInCount: 0,
    volunteersNeeded: 8, volunteersAssigned: 5, status: 'open',
    registrations: [
      { id: 'r-1', contactName: '王奶奶', contactPhone: '0912-111-222', registeredAt: '07/25 10:00', status: 'pending', specialNeeds: [{ type: 'elderly_companion', note: '需志工陪伴入座', resolved: false }, { type: 'vegetarian', resolved: false }], source: 'delegate', paymentMethod: '免費', amount: 0 },
      { id: 'r-2', contactName: '林先生', contactPhone: '0933-222-333', registeredAt: '07/26 14:30', status: 'confirmed', specialNeeds: [], source: 'app', paymentMethod: '免費', amount: 0 },
      { id: 'r-3', contactName: '張媽媽', contactPhone: '0922-333-444', registeredAt: '07/27 09:00', status: 'pending', specialNeeds: [{ type: 'wheelchair', note: '電動輪椅需無障礙通道', resolved: false }], source: 'delegate', paymentMethod: '免費', amount: 0 },
      { id: 'r-4', contactName: '陳伯伯', contactPhone: '0955-444-555', registeredAt: '07/28 11:00', status: 'confirmed', specialNeeds: [{ type: 'elderly_companion', resolved: true }], source: 'app', paymentMethod: '免費', amount: 0 },
      { id: 'r-5', contactName: '趙小姐', contactPhone: '0966-555-666', registeredAt: '07/29 16:00', status: 'pending', specialNeeds: [{ type: 'halal', note: '清真飲食', resolved: false }], source: 'app', paymentMethod: '免費', amount: 0 },
    ],
  },
  {
    id: 'act-2', name: '社區健走日', category: 'health', date: '2024-08-10', time: '06:30-08:30',
    location: '象山步道入口', organizer: '信義里健康促進委員會', fee: 50,
    maxParticipants: 40, currentParticipants: 40, waitlistCount: 5, checkedInCount: 0,
    volunteersNeeded: 4, volunteersAssigned: 4, status: 'full',
    registrations: [
      { id: 'r-6', contactName: '李太太', contactPhone: '0977-666-777', registeredAt: '07/20 08:00', status: 'confirmed', specialNeeds: [], source: 'app', paymentMethod: '💳 線上付款', amount: 50 },
      { id: 'r-7', contactName: '吳爺爺', contactPhone: '0988-777-888', registeredAt: '07/22 10:00', status: 'pending', specialNeeds: [{ type: 'elderly_companion', note: '行動較緩慢需有人同行', resolved: false }], source: 'delegate', paymentMethod: '現場付款', amount: 50 },
    ],
  },
  {
    id: 'act-3', name: '親子手作 DIY 工作坊', category: 'family', date: '2024-08-18', time: '14:00-16:00',
    location: '里民活動室 2F', organizer: '信義里辦公處', fee: 200,
    maxParticipants: 20, currentParticipants: 20, waitlistCount: 4, checkedInCount: 0,
    volunteersNeeded: 3, volunteersAssigned: 2, status: 'full',
    registrations: [
      { id: 'r-8', contactName: '黃媽媽', contactPhone: '0911-888-999', registeredAt: '07/15 09:00', status: 'confirmed', specialNeeds: [{ type: 'other', note: '小孩 3 歲需兒童用具', resolved: true }], source: 'app', paymentMethod: '💳 線上付款', amount: 200 },
    ],
  },
  {
    id: 'act-4', name: '社區淨灘環保日', category: 'eco', date: '2024-09-01', time: '08:00-11:00',
    location: '基隆河畔步道', organizer: '信義里環保志工隊', fee: 0,
    maxParticipants: 50, currentParticipants: 18, waitlistCount: 0, checkedInCount: 0,
    volunteersNeeded: 6, volunteersAssigned: 3, status: 'open',
    registrations: [
      { id: 'r-9', contactName: '周先生', contactPhone: '0922-999-000', registeredAt: '07/28 14:00', status: 'confirmed', specialNeeds: [], source: 'app', paymentMethod: '免費', amount: 0 },
      { id: 'r-10', contactName: '鄭同學', contactPhone: '0933-000-111', registeredAt: '07/29 10:00', status: 'pending', specialNeeds: [], source: 'onsite', paymentMethod: '免費', amount: 0 },
    ],
  },
  {
    id: 'act-5', name: '長者共餐交流日', category: 'elderly', date: '2024-08-15', time: '11:30-13:30',
    location: '里民活動中心 1F', organizer: '信義里關懷據點', fee: 0,
    maxParticipants: 30, currentParticipants: 28, waitlistCount: 0, checkedInCount: 0,
    volunteersNeeded: 5, volunteersAssigned: 5, status: 'almost_full',
    registrations: [
      { id: 'r-11', contactName: '蔡奶奶', contactPhone: '0955-112-223', registeredAt: '07/25 09:00', status: 'confirmed', specialNeeds: [{ type: 'elderly_companion', resolved: true }, { type: 'vegan', note: '全素飲食', resolved: false }], source: 'delegate', paymentMethod: '免費', amount: 0 },
      { id: 'r-12', contactName: '許伯伯', contactPhone: '0966-223-334', registeredAt: '07/26 08:00', status: 'confirmed', specialNeeds: [{ type: 'wheelchair', resolved: true }], source: 'delegate', paymentMethod: '免費', amount: 0 },
    ],
  },
])

// ─── 通知 ───
const notifications = ref<NotifyRecord[]>([
  { id: 'n-1', template: 'reminder', targetName: '中秋社區聯歡晚會', targetId: 'act-1', message: '提醒：中秋聯歡晚會 9/17（二）18:00 於信義里活動中心，請準時出席！', sentAt: '07/30 10:00', recipientCount: 62 },
])

const notifyTemplates: { key: NotifyTemplate; label: string }[] = [
  { key: 'reminder', label: '📢 活動提醒' },
  { key: 'location_change', label: '📍 地點變更' },
  { key: 'cancel', label: '❌ 取消通知' },
  { key: 'waitlist_promoted', label: '🎉 候補遞補' },
  { key: 'custom', label: '✏️ 自訂訊息' },
]
const selectedTemplate = ref<NotifyTemplate>('reminder')
const customMessage = ref('')
const sendTargetId = ref('')

// ─── Computed ───
const filteredActivities = computed(() => {
  if (selectedCategory.value === 'all') return activities.value
  return activities.value.filter(a => a.category === selectedCategory.value)
})
const pendingCount = computed(() => activities.value.reduce((s, a) => s + a.registrations.filter(r => r.status === 'pending').length, 0))
const unresolvedNeedsCount = computed(() => activities.value.reduce((s, a) => s + a.registrations.reduce((ss, r) => ss + r.specialNeeds.filter(n => !n.resolved).length, 0), 0))

// ─── Actions ───
function confirmReg(act: ManagedActivity, reg: Registration) {
  reg.status = 'confirmed'
  showToast(`✅ 已確認：${reg.contactName}`)
}
function cancelReg(act: ManagedActivity, reg: Registration) {
  reg.status = 'cancelled'
  act.currentParticipants--
  if (act.waitlistCount > 0) {
    act.waitlistCount--
    act.currentParticipants++
    showToast(`❌ 已取消 ${reg.contactName}，候補自動遞補 1 位`)
  } else {
    if (act.status === 'full') act.status = 'open'
    showToast(`❌ 已取消：${reg.contactName}`)
  }
}
function checkinReg(act: ManagedActivity, reg: Registration) {
  reg.status = 'checked_in'
  act.checkedInCount++
  showToast(`📱 報到：${reg.contactName}`)
}
function resolveNeed(reg: Registration, need: SpecialNeedItem) {
  need.resolved = true
  showToast(`✅ 已安排：${reg.contactName} — ${getSpecialNeedLabel(need.type)}`)
}
function closeActivity(act: ManagedActivity) {
  act.status = 'closed'
  showToast(`🔒 已截止：${act.name}`)
}
function completeActivity(act: ManagedActivity) {
  act.status = 'completed'
  act.registrations.forEach(r => { if (r.status === 'confirmed' || r.status === 'checked_in') r.status = 'completed' })
  showToast(`🎉 活動完成：${act.name}`)
}
function sendNotification() {
  const target = activities.value.find(a => a.id === sendTargetId.value)
  if (!target) { showToast('⚠️ 請選擇活動'); return }
  const count = target.registrations.filter(r => r.status !== 'cancelled').length
  notifications.value.unshift({ id: `n-${Date.now()}`, template: selectedTemplate.value, targetName: target.name, targetId: target.id, message: selectedTemplate.value === 'custom' ? customMessage.value : `${target.name} 通知已發送`, sentAt: new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), recipientCount: count })
  customMessage.value = ''
  showToast(`📤 已發送通知給 ${count} 位`)
}
function resetDemo() { location.reload() }
</script>

<template>
  <div class="w-full max-w-[430px] mx-auto min-h-screen bg-[#fafaf9] relative flex flex-col pb-20 shadow-xl border-x border-[#e2e8f0]">
    <header class="ea__header">
      <span class="ea__header-title">🏘️ 社區活動管理（里長端）</span>
      <NuxtLink class="ea__header-link" to="/entertainment">📱 用戶端</NuxtLink>
    </header>

    <main class="ea__content" role="main">
      <!-- 統計 -->
      <section class="ea__stats">
        <div class="ea__stat ea__stat--red">🔴 待審核 {{ pendingCount }}</div>
        <div class="ea__stat ea__stat--amber">⚠️ 特殊需求 {{ unresolvedNeedsCount }}</div>
      </section>

      <!-- 分類篩選 -->
      <div class="ea__category-filter">
        <button v-for="cat in categories" :key="cat.key" class="ea__cat-btn" :class="{ 'ea__cat-btn--active': selectedCategory === cat.key }" @click="selectedCategory = cat.key">{{ cat.label }}</button>
      </div>

      <!-- Tab -->
      <nav class="ea__tabs" role="tablist">
        <button v-for="(tab, idx) in tabs" :key="tab" class="ea__tab" :class="{ 'ea__tab--active': activeTab === idx }" @click="activeTab = idx">{{ ['📋', '🎯', '📢'][idx] }} {{ tab }}</button>
      </nav>

      <!-- Tab 1：報名管理 -->
      <section v-show="activeTab === 0">
        <div v-for="act in filteredActivities" :key="act.id" class="ea__card">
          <div class="ea__card-top">
            <div>
              <span class="ea__cat-label">{{ getCategoryLabel(act.category) }}</span>
              <h4 class="ea__card-title">{{ act.name }}</h4>
            </div>
            <span class="ea__badge" :class="{ 'ea__badge--green': act.status==='open', 'ea__badge--amber': act.status==='almost_full', 'ea__badge--red': act.status==='full' }">{{ getStatusLabel(act.status) }}</span>
          </div>
          <!-- 人數進度 -->
          <div class="ea__capacity">
            <div class="ea__progress-bar"><div class="ea__progress-fill" :class="getCapacityClass(act.currentParticipants, act.maxParticipants)" :style="{ width: getCapacityPercent(act.currentParticipants, act.maxParticipants) + '%' }"></div></div>
            <span class="ea__capacity-text">👥 {{ act.currentParticipants }}/{{ act.maxParticipants }}<span v-if="act.waitlistCount > 0" class="ea__waitlist">（候補 {{ act.waitlistCount }}）</span></span>
          </div>
          <!-- 報名列表 -->
          <div v-for="reg in act.registrations.filter(r => r.status !== 'cancelled')" :key="reg.id" class="ea__reg-row">
            <div class="ea__reg-info">
              <span class="ea__reg-name">{{ reg.contactName }}</span>
              <span class="ea__reg-phone">{{ reg.contactPhone }}</span>
              <span class="ea__reg-source">{{ getSourceLabel(reg.source) }}</span>
              <span class="ea__reg-status" :class="'ea__reg-status--' + reg.status">{{ getRegStatusLabel(reg.status) }}</span>
            </div>
            <div v-if="reg.specialNeeds.length > 0" class="ea__needs">
              <div v-for="need in reg.specialNeeds" :key="need.type" class="ea__need" :class="{ 'ea__need--done': need.resolved }">
                <span>{{ getSpecialNeedLabel(need.type) }}</span>
                <span v-if="need.note" class="ea__need-note">{{ need.note }}</span>
                <button v-if="!need.resolved" class="ea__need-btn" @click="resolveNeed(reg, need)">✅ 已安排</button>
                <span v-else class="ea__need-ok">已處理</span>
              </div>
            </div>
            <div class="ea__reg-actions">
              <button v-if="reg.status==='pending'" class="ea__btn-sm ea__btn-sm--green" @click="confirmReg(act, reg)">✅ 確認</button>
              <button v-if="reg.status==='confirmed'" class="ea__btn-sm ea__btn-sm--blue" @click="checkinReg(act, reg)">📱 報到</button>
              <button v-if="!['cancelled','completed'].includes(reg.status)" class="ea__btn-sm ea__btn-sm--red" @click="cancelReg(act, reg)">取消</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Tab 2：活動管理 -->
      <section v-show="activeTab === 1">
        <div v-for="act in filteredActivities" :key="act.id" class="ea__card">
          <div class="ea__card-top">
            <div>
              <span class="ea__cat-label">{{ getCategoryLabel(act.category) }}</span>
              <h4 class="ea__card-title">{{ act.name }}</h4>
            </div>
            <span class="ea__badge" :class="{ 'ea__badge--green': act.status==='open', 'ea__badge--amber': act.status==='almost_full', 'ea__badge--red': act.status==='full', 'ea__badge--gray': act.status==='closed' || act.status==='completed' }">{{ getStatusLabel(act.status) }}</span>
          </div>
          <div class="ea__card-details">
            <span>📅 {{ act.date }} {{ act.time }}</span>
            <span>📍 {{ act.location }}</span>
            <span>🏢 {{ act.organizer }}</span>
            <span>💰 {{ act.fee === 0 ? '免費' : `$${act.fee}` }}</span>
          </div>
          <!-- 人數 -->
          <div class="ea__capacity">
            <div class="ea__progress-bar"><div class="ea__progress-fill" :class="getCapacityClass(act.currentParticipants, act.maxParticipants)" :style="{ width: getCapacityPercent(act.currentParticipants, act.maxParticipants) + '%' }"></div></div>
            <span class="ea__capacity-text">👥 {{ act.currentParticipants }}/{{ act.maxParticipants }}<span v-if="act.waitlistCount > 0" class="ea__waitlist">（候補 {{ act.waitlistCount }}）</span></span>
          </div>
          <!-- 志工 -->
          <div class="ea__volunteer">
            🙋 志工：{{ act.volunteersAssigned }} / {{ act.volunteersNeeded }} 人已安排
            <span v-if="act.volunteersAssigned < act.volunteersNeeded" class="ea__volunteer-warn">（尚缺 {{ act.volunteersNeeded - act.volunteersAssigned }} 位）</span>
          </div>
          <!-- 簽到率 -->
          <div v-if="act.status === 'completed' || act.checkedInCount > 0" class="ea__checkin-rate">
            📊 簽到率：{{ getCheckInRate(act) }}（{{ act.checkedInCount }}/{{ act.currentParticipants }} 人）
          </div>
          <!-- 操作 -->
          <div v-if="act.status !== 'completed'" class="ea__manage-actions">
            <button v-if="act.status==='open' || act.status==='almost_full'" class="ea__btn ea__btn--outline" @click="closeActivity(act)">🔒 截止報名</button>
            <button class="ea__btn ea__btn--primary" @click="completeActivity(act)">🎉 標記完成</button>
          </div>
        </div>
      </section>

      <!-- Tab 3：通知中心 -->
      <section v-show="activeTab === 2">
        <div class="ea__card">
          <h4 class="ea__card-title">📤 發送通知</h4>
          <div class="ea__notify-form">
            <select v-model="sendTargetId" class="ea__select"><option value="">-- 選擇活動 --</option><option v-for="a in activities" :key="a.id" :value="a.id">{{ a.name }}</option></select>
            <select v-model="selectedTemplate" class="ea__select"><option v-for="t in notifyTemplates" :key="t.key" :value="t.key">{{ t.label }}</option></select>
            <textarea v-if="selectedTemplate==='custom'" v-model="customMessage" class="ea__textarea" rows="3" placeholder="自訂通知內容..."></textarea>
            <button class="ea__btn ea__btn--primary" @click="sendNotification">📤 發送</button>
          </div>
        </div>
        <div v-for="n in notifications" :key="n.id" class="ea__card">
          <div class="ea__card-top"><span class="ea__notify-tpl">{{ notifyTemplates.find(t=>t.key===n.template)?.label }}</span><span class="ea__card-meta">{{ n.sentAt }}</span></div>
          <p class="ea__card-meta">📍 {{ n.targetName }} · 👥 {{ n.recipientCount }} 人</p>
          <p class="ea__notify-msg">{{ n.message }}</p>
        </div>
      </section>
    </main>

    <Transition name="toast-fade"><div v-if="toastMessage" class="ea__toast">{{ toastMessage }}</div></Transition>
    <div class="ea__demo-panel"><button class="ea__demo-btn" @click="resetDemo">🔄 重設</button></div>
  </div>
</template>

<style scoped>
.ea__header { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 16px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.ea__header-title { font-size: 13px; font-weight: 600; color: #1c1917; }
.ea__header-link { padding: 4px 10px; font-size: 11px; font-weight: 700; color: #ec4899; background: #fdf2f8; border: 1px solid rgba(236,72,153,.2); border-radius: 9999px; text-decoration: none; }
.ea__content { display: flex; flex-direction: column; gap: 16px; padding: 16px; flex: 1; }
.ea__stats { display: flex; justify-content: center; gap: 8px; }
.ea__stat { display: inline-flex; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.ea__stat--red { background: #ffe4e6; color: #e11d48; }
.ea__stat--amber { background: #fef3c7; color: #d97706; }
.ea__category-filter { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.ea__category-filter::-webkit-scrollbar { display: none; }
.ea__cat-btn { flex-shrink: 0; padding: 6px 12px; font-size: 11px; border: none; border-radius: 9999px; background: #fff; color: #78716c; cursor: pointer; }
.ea__cat-btn--active { background: #ec4899; color: #fff; font-weight: 600; }
.ea__tabs { display: flex; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
.ea__tab { flex: 1; padding: 10px 4px; border: none; background: transparent; font-size: 11px; font-weight: 600; font-family: inherit; color: #78716c; cursor: pointer; text-align: center; }
.ea__tab:not(:last-child) { border-right: 1px solid #e2e8f0; }
.ea__tab--active { background: #ec4899; color: #fff; }
.ea__card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 16px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.ea__card:last-child { margin-bottom: 0; }
.ea__card-top { display: flex; align-items: flex-start; justify-content: space-between; }
.ea__card-title { margin: 0; font-size: 15px; font-weight: 700; color: #1c1917; }
.ea__card-meta { margin: 0; font-size: 11px; color: #78716c; }
.ea__card-details { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #78716c; }
.ea__cat-label { font-size: 10px; font-weight: 600; color: #7c3aed; background: #f3e8ff; padding: 2px 8px; border-radius: 9999px; margin-bottom: 4px; display: inline-block; }
.ea__badge { padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.ea__badge--green { background: #dcfce7; color: #16a34a; }
.ea__badge--amber { background: #fef3c7; color: #d97706; }
.ea__badge--red { background: #ffe4e6; color: #e11d48; }
.ea__badge--gray { background: #f1f5f9; color: #64748b; }

.ea__capacity { display: flex; flex-direction: column; gap: 4px; }
.ea__progress-bar { height: 8px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
.ea__progress-fill { height: 100%; background: #ec4899; border-radius: 9999px; transition: width .3s; }
.ea__progress--warn { background: #d97706; }
.ea__progress--full { background: #e11d48; }
.ea__capacity-text { font-size: 11px; color: #78716c; }
.ea__waitlist { color: #d97706; font-weight: 600; }
.ea__volunteer { font-size: 12px; color: #78716c; }
.ea__volunteer-warn { color: #e11d48; font-weight: 600; }
.ea__checkin-rate { font-size: 12px; color: #16a34a; font-weight: 600; }
.ea__reg-row { padding: 10px 0; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 6px; }
.ea__reg-row:last-child { border-bottom: none; }
.ea__reg-info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ea__reg-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.ea__reg-phone { font-size: 11px; color: #78716c; }
.ea__reg-source { font-size: 10px; color: #7c3aed; background: #f3e8ff; padding: 1px 6px; border-radius: 6px; }
.ea__reg-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 6px; }
.ea__reg-status--pending { background: #fef3c7; color: #d97706; }
.ea__reg-status--confirmed { background: #dcfce7; color: #16a34a; }
.ea__reg-status--checked_in { background: #e0f2fe; color: #0369a1; }
.ea__needs { display: flex; flex-direction: column; gap: 4px; }
.ea__need { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; flex-wrap: wrap; }
.ea__need--done { background: #dcfce7; border-color: #86efac; opacity: .7; }
.ea__need-note { color: #92400e; font-style: italic; }
.ea__need-btn { padding: 2px 8px; border: none; border-radius: 6px; background: #16a34a; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer; }
.ea__need-ok { font-size: 10px; color: #16a34a; font-weight: 600; }
.ea__reg-actions { display: flex; gap: 6px; }
.ea__btn-sm { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; border: none; }
.ea__btn-sm--green { background: #16a34a; color: #fff; }
.ea__btn-sm--blue { background: #2563eb; color: #fff; }
.ea__btn-sm--red { background: transparent; border: 1px solid #e11d48; color: #e11d48; }
.ea__manage-actions { display: flex; gap: 8px; }
.ea__btn { flex: 1; padding: 12px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.ea__btn--primary { background: #ec4899; color: #fff; }
.ea__btn--outline { background: transparent; border: 1.5px solid #ec4899; color: #ec4899; }
.ea__notify-form { display: flex; flex-direction: column; gap: 10px; }
.ea__select { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; }
.ea__textarea { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; resize: none; }
.ea__notify-tpl { font-size: 11px; font-weight: 600; color: #7c3aed; background: #f3e8ff; padding: 2px 8px; border-radius: 9999px; }
.ea__notify-msg { margin: 0; font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; line-height: 1.5; }
.ea__toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; background: #1e293b; color: #fff; font-size: 13px; font-weight: 600; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.ea__demo-panel { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
.ea__demo-btn { padding: 8px 14px; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); background: #78716c; color: #fff; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
