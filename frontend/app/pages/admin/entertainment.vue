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

interface ResidentQuestion {
  id: string; contactName: string; contactPhone: string
  activityName: string; question: string; askedAt: string
  answered: boolean; answer?: string
}

// ─── Tab ───
const activeTab = ref(0)
const tabs = ['報名管理', '活動管理', '通知中心', '居民提問']

// 支援 ?tab=0/1/2/3 跳轉
const adminRoute = useRoute()
onMounted(async () => {
  const t = adminRoute.query.tab; if (t != null) activeTab.value = Number(t)
  // 從 DB 載入活動與提問
  await fetchDbActivities()
  await fetchDbQuestions()
})

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

// ─── 從 DB 載入活動（覆蓋 mock） ───
async function fetchDbActivities() {
  try {
    const data: any[] = await $fetch('/api/activities', { params: { status: 'open' } })
    if (data.length > 0) {
      activities.value = data.map(a => ({
        id: a.id,
        name: a.title || a.name,
        category: mapDbCategory(a.category),
        date: new Date(a.activityDate).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: `${new Date(a.activityDate).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}${a.activityEndDate ? '-' + new Date(a.activityEndDate).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : ''}`,
        location: a.location || '待定',
        organizer: a.organizerName || '信義區里辦公處',
        fee: 0,
        maxParticipants: a.maxParticipants,
        currentParticipants: a.currentParticipants || 0,
        waitlistCount: 0,
        checkedInCount: 0,
        volunteersNeeded: 0,
        volunteersAssigned: 0,
        status: a.isFull ? 'full' : 'open',
        registrations: [],
      }))
      // 載入每個活動的報名名單
      for (const act of activities.value) {
        try {
          const detail: any = await $fetch(`/api/activities/${act.id}`)
          if (detail.registrations) {
            act.registrations = detail.registrations.map((r: any) => ({
              id: r.id,
              contactName: r.userName,
              contactPhone: r.userPhone || '',
              registeredAt: new Date(r.registeredAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
              status: r.status === 'registered' ? 'confirmed' : r.status,
              specialNeeds: [],
              source: 'app',
              paymentMethod: '免費',
              amount: 0,
            }))
            act.currentParticipants = detail.registrations.length
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* use mock fallback */ }
}

function mapDbCategory(cat: string): ActivityCategory {
  const map: Record<string, ActivityCategory> = { health: 'health', culture: 'festival', environment: 'eco', general: 'health', sport: 'health', safety: 'family' }
  return map[cat] || 'health'
}

// ─── 從 DB 載入居民提問（覆蓋 mock） ───
async function fetchDbQuestions() {
  try {
    const data: any[] = await $fetch('/api/activities/questions/list')
    if (data.length > 0) {
      residentQuestions.value = data.map(q => ({
        id: q.id,
        contactName: q.isAnonymous ? '匿名居民' : q.askerName,
        contactPhone: '',
        activityName: '社區提問',
        question: q.content,
        askedAt: new Date(q.creTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        answered: q.status === 'replied',
        answer: q.replyContent || undefined,
      }))
    }
  } catch { /* use mock fallback */ }
}

// ─── 回覆提問（改為呼叫 API） ───
async function answerQuestionDb(q: ResidentQuestion) {
  if (!replyText.value.trim()) return
  try {
    await $fetch(`/api/activities/questions/${q.id}/reply`, {
      method: 'PATCH',
      body: { replyContent: replyText.value.trim(), repliedBy: '里長' },
    })
    q.answered = true
    q.answer = replyText.value.trim()
    replyText.value = ''
    replyingId.value = ''
    showToast(`✅ 已回覆 ${q.contactName} 的提問（已通知居民）`)
  } catch {
    showToast('❌ 回覆失敗')
  }
}

// ─── 發送通知（改為呼叫 API） ───
async function sendNotifyDb() {
  if (!sendTargetId.value) { showToast('⚠️ 請選擇活動'); return }
  const msg = selectedTemplate.value === 'custom' ? customMessage.value.trim() : getTemplateMsg(selectedTemplate.value)
  if (!msg) { showToast('⚠️ 請輸入通知內容'); return }
  try {
    const result: any = await $fetch(`/api/activities/${sendTargetId.value}/notify`, {
      method: 'POST',
      body: { content: msg },
    })
    notifications.value.unshift({
      id: `n-${Date.now()}`,
      template: selectedTemplate.value,
      targetName: activities.value.find(a => a.id === sendTargetId.value)?.name || '',
      targetId: sendTargetId.value,
      message: msg,
      sentAt: new Date().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      recipientCount: result.notifiedCount || 0,
    })
    showToast(`✅ 通知已發送給 ${result.notifiedCount} 位報名者（私訊推播）`)
    customMessage.value = ''
    sendTargetId.value = ''
  } catch {
    showToast('❌ 發送失敗')
  }
}

function getTemplateMsg(tmpl: NotifyTemplate): string {
  const act = activities.value.find(a => a.id === sendTargetId.value)
  if (!act) return ''
  switch (tmpl) {
    case 'reminder': return `提醒您：「${act.name}」將於 ${act.date} ${act.time} 在 ${act.location} 舉行，請準時出席！`
    case 'location_change': return `地點變更通知：「${act.name}」活動地點已更改為 ${act.location}，請留意。`
    case 'cancel': return `很抱歉通知您：「${act.name}」因故取消，造成不便敬請見諒。`
    case 'waitlist_promoted': return `恭喜您！「${act.name}」有名額釋出，您已從候補名單遞補成功！`
    default: return ''
  }
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
// 格式對齊 DB pms_form_feedback.feedback_content (formId=1008)
// contactName/Phone 來自解密後的加密欄位
// 活動選擇來自 feedbackContent.data (topicId 3040)
// 參加人數來自 topicId 3041
const activities = ref<ManagedActivity[]>([
  {
    id: 'act-1', name: '中秋社區聯歡晚會', category: 'festival', date: '2026-09-17', time: '18:00-21:00',
    location: '信義里活動中心', organizer: '信義里辦公處', fee: 0,
    maxParticipants: 80, currentParticipants: 62, waitlistCount: 0, checkedInCount: 0,
    volunteersNeeded: 8, volunteersAssigned: 5, status: 'open',
    registrations: [
      { id: 'r-1', contactName: '王奶奶', contactPhone: '0912-***-222', registeredAt: '08/01 10:00', status: 'pending', specialNeeds: [{ type: 'elderly_companion', note: '需志工陪伴入座', resolved: false }, { type: 'vegetarian', resolved: false }], source: 'delegate', paymentMethod: '免費', amount: 0 },
      { id: 'r-2', contactName: '林先生', contactPhone: '0933-***-333', registeredAt: '08/02 14:30', status: 'confirmed', specialNeeds: [], source: 'app', paymentMethod: '免費', amount: 0 },
      { id: 'r-3', contactName: '張媽媽', contactPhone: '0922-***-444', registeredAt: '08/03 09:00', status: 'pending', specialNeeds: [{ type: 'wheelchair', note: '電動輪椅需無障礙通道', resolved: false }], source: 'delegate', paymentMethod: '免費', amount: 0 },
      { id: 'r-4', contactName: '陳伯伯', contactPhone: '0955-***-555', registeredAt: '08/04 11:00', status: 'confirmed', specialNeeds: [{ type: 'elderly_companion', resolved: true }], source: 'app', paymentMethod: '免費', amount: 0 },
      { id: 'r-5', contactName: '趙小姐', contactPhone: '0966-***-666', registeredAt: '08/05 16:00', status: 'pending', specialNeeds: [{ type: 'halal', note: '清真飲食', resolved: false }], source: 'app', paymentMethod: '免費', amount: 0 },
    ],
  },
  {
    id: 'act-2', name: '社區健走日', category: 'health', date: '2026-08-10', time: '06:30-08:30',
    location: '象山步道入口', organizer: '信義里健康促進委員會', fee: 50,
    maxParticipants: 40, currentParticipants: 40, waitlistCount: 5, checkedInCount: 0,
    volunteersNeeded: 4, volunteersAssigned: 4, status: 'full',
    registrations: [
      { id: 'r-6', contactName: '李太太', contactPhone: '0977-***-777', registeredAt: '08/01 08:00', status: 'confirmed', specialNeeds: [], source: 'app', paymentMethod: '💳 線上付款', amount: 50 },
      { id: 'r-7', contactName: '吳爺爺', contactPhone: '0988-***-888', registeredAt: '08/02 10:00', status: 'pending', specialNeeds: [{ type: 'elderly_companion', note: '行動較緩慢需有人同行', resolved: false }], source: 'delegate', paymentMethod: '現場付款', amount: 50 },
    ],
  },
  {
    id: 'act-3', name: '親子手作 DIY 工作坊', category: 'family', date: '2026-08-18', time: '14:00-16:00',
    location: '里民活動室 2F', organizer: '信義里辦公處', fee: 200,
    maxParticipants: 20, currentParticipants: 20, waitlistCount: 4, checkedInCount: 0,
    volunteersNeeded: 3, volunteersAssigned: 2, status: 'full',
    registrations: [
      { id: 'r-8', contactName: '黃媽媽', contactPhone: '0911-***-999', registeredAt: '08/01 09:00', status: 'confirmed', specialNeeds: [{ type: 'other', note: '小孩 3 歲需兒童用具', resolved: true }], source: 'app', paymentMethod: '💳 線上付款', amount: 200 },
    ],
  },
  {
    id: 'act-4', name: '社區淨灘環保日', category: 'eco', date: '2026-09-01', time: '08:00-11:00',
    location: '基隆河畔步道', organizer: '信義里環保志工隊', fee: 0,
    maxParticipants: 50, currentParticipants: 18, waitlistCount: 0, checkedInCount: 0,
    volunteersNeeded: 6, volunteersAssigned: 3, status: 'open',
    registrations: [
      { id: 'r-9', contactName: '周先生', contactPhone: '0922-***-000', registeredAt: '08/03 14:00', status: 'confirmed', specialNeeds: [], source: 'app', paymentMethod: '免費', amount: 0 },
      { id: 'r-10', contactName: '鄭同學', contactPhone: '0933-***-111', registeredAt: '08/04 10:00', status: 'pending', specialNeeds: [], source: 'onsite', paymentMethod: '免費', amount: 0 },
    ],
  },
  {
    id: 'act-5', name: '長者共餐交流日', category: 'elderly', date: '2026-08-15', time: '11:30-13:30',
    location: '里民活動中心 1F', organizer: '信義里關懷據點', fee: 0,
    maxParticipants: 30, currentParticipants: 28, waitlistCount: 0, checkedInCount: 0,
    volunteersNeeded: 5, volunteersAssigned: 5, status: 'almost_full',
    registrations: [
      { id: 'r-11', contactName: '蔡奶奶', contactPhone: '0955-***-223', registeredAt: '08/01 09:00', status: 'confirmed', specialNeeds: [{ type: 'elderly_companion', resolved: true }, { type: 'vegan', note: '全素飲食', resolved: false }], source: 'delegate', paymentMethod: '免費', amount: 0 },
      { id: 'r-12', contactName: '許伯伯', contactPhone: '0966-***-334', registeredAt: '08/02 08:00', status: 'confirmed', specialNeeds: [{ type: 'wheelchair', resolved: true }], source: 'delegate', paymentMethod: '免費', amount: 0 },
    ],
  },
])

// ─── 通知 ───
const notifications = ref<NotifyRecord[]>([
  { id: 'n-1', template: 'reminder', targetName: '中秋社區聯歡晚會', targetId: 'act-1', message: '提醒：中秋聯歡晚會 9/17（三）18:00 於信義里活動中心，請準時出席！', sentAt: '08/05 10:00', recipientCount: 62 },
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

// ─── 居民提問 ───
const residentQuestions = ref<ResidentQuestion[]>([
  { id: 'q-1', contactName: '王小姐', contactPhone: '0912-***-678', activityName: '中秋社區聯歡晚會', question: '請問活動當天有提供停車位嗎？', askedAt: '08/04 14:00', answered: false },
  { id: 'q-2', contactName: '林先生', contactPhone: '0933-***-333', activityName: '社區健走日', question: '小朋友可以一起參加嗎？有年齡限制嗎？', askedAt: '08/05 09:30', answered: false },
  { id: 'q-3', contactName: '張媽媽', contactPhone: '0922-***-444', activityName: '中秋社區聯歡晚會', question: '我婆婆坐輪椅，活動中心有電梯嗎？', askedAt: '08/03 16:00', answered: true, answer: '有的，活動中心 1F 有無障礙坡道，2F 有電梯可達。' },
])
const replyingId = ref('')
const replyText = ref('')

function answerQuestion(q: ResidentQuestion) {
  answerQuestionDb(q)
}

// ─── 報到模式 ───
const checkinMode = ref(false)
const checkinActId = ref('')

function enterCheckinMode(actId: string) {
  checkinMode.value = true
  checkinActId.value = actId
  showToast('📱 已進入報到模式 — 點名單中的人或掃描 QR Code 即可報到')
}
function exitCheckinMode() {
  checkinMode.value = false
  checkinActId.value = ''
}
function checkinByTap(act: ManagedActivity, reg: Registration) {
  if (reg.status === 'confirmed') {
    reg.status = 'checked_in'
    act.checkedInCount++
    showToast(`✅ ${reg.contactName} 報到成功`)
  }
}

// ─── 批次操作 ───
function confirmAllPending(act: ManagedActivity) {
  const pendings = act.registrations.filter(r => r.status === 'pending')
  pendings.forEach(r => { r.status = 'confirmed' })
  showToast(`✅ 已批次確認 ${pendings.length} 位報名者`)
}
function resolveAllNeeds(act: ManagedActivity) {
  act.registrations.forEach(r => r.specialNeeds.forEach(n => { n.resolved = true }))
  showToast(`✅ 已全部標記為已安排`)
}

// ─── 展開詳情 ───
const expandedRegId = ref('')
function toggleExpand(regId: string) {
  expandedRegId.value = expandedRegId.value === regId ? '' : regId
}
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
  sendNotifyDb()
}
function resetDemo() { location.reload() }
</script>

<template>
  <div class="admin-page pb-20">

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
        <button v-for="(tab, idx) in tabs" :key="tab" class="ea__tab" :class="{ 'ea__tab--active': activeTab === idx }" @click="activeTab = idx">{{ ['📋', '🎯', '📢', '❓'][idx] }} {{ tab }}</button>
      </nav>

      <!-- Tab 1：報名管理（精簡版） -->
      <section v-show="activeTab === 0">
        <div v-for="act in filteredActivities" :key="act.id" class="ea__card">
          <div class="ea__card-top">
            <div>
              <span class="ea__cat-label">{{ getCategoryLabel(act.category) }}</span>
              <h4 class="ea__card-title">{{ act.name }}</h4>
              <p class="ea__card-date">📅 {{ act.date }} {{ act.time }} · 📍 {{ act.location }}</p>
            </div>
            <span class="ea__badge" :class="{ 'ea__badge--green': act.status==='open', 'ea__badge--amber': act.status==='almost_full', 'ea__badge--red': act.status==='full' }">{{ getStatusLabel(act.status) }}</span>
          </div>

          <!-- 人數進度 -->
          <div class="ea__capacity">
            <div class="ea__progress-bar"><div class="ea__progress-fill" :class="getCapacityClass(act.currentParticipants, act.maxParticipants)" :style="{ width: getCapacityPercent(act.currentParticipants, act.maxParticipants) + '%' }"></div></div>
            <span class="ea__capacity-text">👥 {{ act.currentParticipants }}/{{ act.maxParticipants }}<span v-if="act.waitlistCount > 0" class="ea__waitlist">（候補 {{ act.waitlistCount }}）</span></span>
          </div>

          <!-- ═══ 頂部批次操作列 ═══ -->
          <div class="ea__batch-bar">
            <button v-if="act.registrations.filter(r => r.status === 'pending').length > 0" class="ea__batch-btn ea__batch-btn--green" @click="confirmAllPending(act)">
              ✅ 全部確認 ({{ act.registrations.filter(r => r.status === 'pending').length }})
            </button>
            <button v-if="!checkinMode || checkinActId !== act.id" class="ea__batch-btn ea__batch-btn--blue" @click="enterCheckinMode(act.id)">
              📱 報到模式
            </button>
            <button v-else class="ea__batch-btn ea__batch-btn--gray" @click="exitCheckinMode">
              ✕ 退出報到
            </button>
          </div>

          <!-- ═══ 特殊需求待處理面板（僅有未處理時顯示）▸ 可收合 ═══ -->
          <details v-if="act.registrations.some(r => r.specialNeeds.some(n => !n.resolved))" class="ea__needs-panel">
            <summary class="ea__needs-summary">▸ ⚠️ {{ act.registrations.reduce((s, r) => s + r.specialNeeds.filter(n => !n.resolved).length, 0) }} 項特殊需求待安排</summary>
            <div class="ea__needs-list">
              <div v-for="reg in act.registrations.filter(r => r.specialNeeds.some(n => !n.resolved))" :key="reg.id" class="ea__needs-row">
                <span class="ea__reg-name">{{ reg.contactName }}</span>
                <div v-for="need in reg.specialNeeds.filter(n => !n.resolved)" :key="need.type" class="ea__need-inline">
                  <span>{{ getSpecialNeedLabel(need.type) }}</span>
                  <span v-if="need.note" class="ea__need-note">{{ need.note }}</span>
                  <button class="ea__need-btn" @click="resolveNeed(reg, need)">✅</button>
                </div>
              </div>
              <button class="ea__batch-btn ea__batch-btn--green ea__batch-btn--full" @click="resolveAllNeeds(act)">✅ 全部已安排</button>
            </div>
          </details>

          <!-- ═══ 報到模式提示 ═══ -->
          <div v-if="checkinMode && checkinActId === act.id" class="ea__checkin-banner">
            📱 報到模式啟動中 — 點擊名單即報到（QR 掃碼或手動勾選）
          </div>

          <!-- ═══ 精簡報名清單 ═══ -->
          <div class="ea__reg-list">
            <div
              v-for="reg in act.registrations.filter(r => r.status !== 'cancelled')"
              :key="reg.id"
              class="ea__reg-item"
              :class="{ 'ea__reg-item--checkin-mode': checkinMode && checkinActId === act.id && reg.status === 'confirmed' }"
              @click="checkinMode && checkinActId === act.id ? checkinByTap(act, reg) : toggleExpand(reg.id)"
            >
              <div class="ea__reg-main">
                <span class="ea__reg-name">{{ reg.contactName }}</span>
                <span class="ea__reg-phone">{{ reg.contactPhone }}</span>
                <span class="ea__reg-source">{{ getSourceLabel(reg.source) }}</span>
                <span class="ea__reg-status" :class="'ea__reg-status--' + reg.status">{{ getRegStatusLabel(reg.status) }}</span>
                <span v-if="reg.specialNeeds.some(n => !n.resolved)" class="ea__has-needs">⚠️</span>
              </div>
              <!-- 展開詳情（點擊展開，含取消按鈕） -->
              <div v-if="expandedRegId === reg.id && !checkinMode" class="ea__reg-expanded">
                <p class="ea__reg-detail">📅 報名：{{ reg.registeredAt }} · {{ reg.paymentMethod }}</p>
                <button v-if="reg.status !== 'completed'" class="ea__btn-sm ea__btn-sm--red" @click.stop="cancelReg(act, reg)">❌ 取消報名</button>
              </div>
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

      <!-- Tab 4：居民提問 -->
      <section v-show="activeTab === 3">
        <div v-if="residentQuestions.filter(q => !q.answered).length === 0" class="ea__empty">
          <p>🎉 所有提問已回覆</p>
        </div>
        <div v-for="q in residentQuestions" :key="q.id" class="ea__card" :class="{ 'ea__card--answered': q.answered }">
          <div class="ea__card-top">
            <div>
              <span class="ea__reg-name">{{ q.contactName }}</span>
              <span class="ea__reg-phone">{{ q.contactPhone }}</span>
            </div>
            <span class="ea__badge" :class="q.answered ? 'ea__badge--green' : 'ea__badge--amber'">{{ q.answered ? '✅ 已回覆' : '⏳ 待回覆' }}</span>
          </div>
          <p class="ea__card-meta">📍 {{ q.activityName }} · 🕐 {{ q.askedAt }}</p>
          <div class="ea__question-bubble">
            <p class="ea__question-text">❓ {{ q.question }}</p>
          </div>
          <div v-if="q.answered" class="ea__answer-bubble">
            <p class="ea__answer-text">💬 {{ q.answer }}</p>
          </div>
          <div v-if="!q.answered">
            <div v-if="replyingId === q.id" class="ea__reply-form">
              <textarea v-model="replyText" class="ea__textarea" rows="2" placeholder="輸入回覆..."></textarea>
              <div class="ea__reply-actions">
                <button class="ea__btn-sm ea__btn-sm--green" @click="answerQuestion(q)">送出回覆</button>
                <button class="ea__btn-sm ea__btn-sm--red" @click="replyingId = ''">取消</button>
              </div>
            </div>
            <button v-else class="ea__btn ea__btn--outline" @click="replyingId = q.id">💬 回覆</button>
          </div>
        </div>
      </section>
    </main>

    <Transition name="toast-fade"><div v-if="toastMessage" class="ea__toast">{{ toastMessage }}</div></Transition>
    <div class="ea__demo-panel"><button class="ea__demo-btn" @click="resetDemo">🔄 重設</button></div>
  </div>
</template>

<style scoped>
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
.ea__card-date { margin: 4px 0 0; font-size: 11px; color: #78716c; }
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

/* ═══ 批次操作列 ═══ */
.ea__batch-bar { display: flex; gap: 8px; }
.ea__batch-btn { flex: 1; padding: 10px 12px; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; text-align: center; transition: opacity .15s; }
.ea__batch-btn:hover { opacity: .85; }
.ea__batch-btn--green { background: #16a34a; color: #fff; }
.ea__batch-btn--blue { background: #2563eb; color: #fff; }
.ea__batch-btn--gray { background: #78716c; color: #fff; }
.ea__batch-btn--full { width: 100%; margin-top: 8px; }

/* ═══ 特殊需求面板 ═══ */
.ea__needs-panel { border: 1px solid #fde68a; border-radius: 12px; background: #fffbeb; overflow: hidden; }
.ea__needs-summary { padding: 10px 12px; font-size: 13px; font-weight: 600; color: #d97706; cursor: pointer; list-style: none; }
.ea__needs-summary::-webkit-details-marker { display: none; }
.ea__needs-panel[open] .ea__needs-summary { border-bottom: 1px solid #fde68a; }
.ea__needs-panel[open] .ea__needs-summary::first-letter { content: ''; }

/* 箭頭指示：▸ 收合 → ▾ 展開 */
.ea__needs-summary::before { content: ''; display: inline; }
.ea__needs-panel[open] .ea__needs-summary { color: #92400e; }
.ea__needs-list { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.ea__needs-row { display: flex; flex-direction: column; gap: 4px; }
.ea__need-inline { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 4px 8px; background: #fff; border: 1px solid #fde68a; border-radius: 6px; margin-top: 2px; }

/* ═══ 報到模式 ═══ */
.ea__checkin-banner { font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 12px; text-align: center; animation: pulse-blue 2s infinite; }
@keyframes pulse-blue { 0%,100% { opacity: 1; } 50% { opacity: .7; } }

/* ═══ 精簡報名清單 ═══ */
.ea__reg-list { display: flex; flex-direction: column; }
.ea__reg-item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background .1s; }
.ea__reg-item:last-child { border-bottom: none; }
.ea__reg-item:hover { background: #fafafa; }
.ea__reg-item--checkin-mode { cursor: pointer; padding: 10px 8px; border-radius: 8px; border: 1.5px dashed #2563eb; margin-bottom: 4px; }
.ea__reg-item--checkin-mode:hover { background: #eff6ff; }
.ea__reg-main { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ea__has-needs { font-size: 12px; }
.ea__reg-expanded { margin-top: 6px; padding: 8px 10px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
.ea__reg-detail { margin: 0; font-size: 11px; color: #78716c; }
.ea__manage-actions { display: flex; gap: 8px; }
.ea__btn { flex: 1; padding: 12px; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.ea__btn--primary { background: #ec4899; color: #fff; }
.ea__btn--outline { background: transparent; border: 1.5px solid #ec4899; color: #ec4899; }
.ea__notify-form { display: flex; flex-direction: column; gap: 10px; }
.ea__select { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; }
.ea__textarea { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; resize: none; }
.ea__notify-tpl { font-size: 11px; font-weight: 600; color: #7c3aed; background: #f3e8ff; padding: 2px 8px; border-radius: 9999px; }
.ea__notify-msg { margin: 0; font-size: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; line-height: 1.5; }

/* ═══ 居民提問 ═══ */
.ea__card--answered { opacity: .7; }
.ea__question-bubble { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 12px; }
.ea__question-text { margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5; }
.ea__answer-bubble { background: #ecfdf5; border: 1px solid #86efac; border-radius: 10px; padding: 10px 12px; }
.ea__answer-text { margin: 0; font-size: 13px; color: #166534; line-height: 1.5; }
.ea__reply-form { display: flex; flex-direction: column; gap: 8px; }
.ea__reply-actions { display: flex; gap: 8px; }
.ea__empty { text-align: center; padding: 32px 16px; color: #78716c; font-size: 14px; }
.ea__toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; background: #1e293b; color: #fff; font-size: 13px; font-weight: 600; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.ea__demo-panel { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
.ea__demo-btn { padding: 8px 14px; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); background: #78716c; color: #fff; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
