<script setup lang="ts">
/**
 * 會員中心主頁
 * 標籤：點數、條碼/錢包、活動票券、獎章
 */

const activeTab = ref<'points' | 'barcode' | 'tickets' | 'badges' | 'groups' | 'messages'>('points')

// ─── 私訊系統 ───
const currentUserId = '00000000-0000-0000-0000-000000000001'
const currentUserName = '沈小姐'

interface ChatConversation {
  peerId: string
  peerName: string
  lastMessage: string
  lastTime: string
  unreadCount: number
  listingName?: string
}

const conversations = ref<ChatConversation[]>([])
const chatMessages = ref<{ id: string; senderId: string; senderName: string; content: string; messageType: string; creTime: string }[]>([])
const activePeer = ref<ChatConversation | null>(null)
const showChatRoom = ref(false)
const newChatMsg = ref('')
const msgUnreadTotal = ref(0)

async function fetchConversations() {
  try {
    const msgs: any[] = await $fetch('/api/messages', { params: { userId: currentUserId } })
    // 聚合為對話列表
    const peers = new Map<string, ChatConversation>()
    msgs.forEach((m: any) => {
      const peerId = m.senderId === currentUserId ? m.receiverId : m.senderId
      const peerName = m.senderId === currentUserId ? m.receiverName : m.senderName
      if (!peers.has(peerId)) {
        peers.set(peerId, { peerId, peerName, lastMessage: m.content, lastTime: m.creTime, unreadCount: 0 })
      } else {
        const p = peers.get(peerId)!
        if (new Date(m.creTime) > new Date(p.lastTime)) { p.lastMessage = m.content; p.lastTime = m.creTime }
      }
      if (m.receiverId === currentUserId && !m.isRead) {
        const p = peers.get(peerId)!
        p.unreadCount++
      }
    })
    conversations.value = [...peers.values()].sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())
    msgUnreadTotal.value = conversations.value.reduce((s, c) => s + c.unreadCount, 0)
  } catch {
    // mock fallback
    conversations.value = [
      { peerId: 'user-002', peerName: '王媽媽', lastMessage: '好的，那我們約週六下午 2 點在信義門市面交？', lastTime: new Date(Date.now() - 3600000).toISOString(), unreadCount: 2, listingName: '嬰兒推車' },
      { peerId: 'user-003', peerName: '李先生', lastMessage: '🤝 沈小姐 已預約面交！', lastTime: new Date(Date.now() - 7200000).toISOString(), unreadCount: 1, listingName: '小米空氣清淨機' },
    ]
    msgUnreadTotal.value = 3
  }
}

async function openChat(conv: ChatConversation) {
  activePeer.value = conv
  showChatRoom.value = true
  conv.unreadCount = 0
  msgUnreadTotal.value = conversations.value.reduce((s, c) => s + c.unreadCount, 0)

  try {
    const msgs: any[] = await $fetch('/api/messages', { params: { userId: currentUserId, peerId: conv.peerId } })
    chatMessages.value = msgs
    // 標記已讀
    await $fetch('/api/messages/read', { method: 'PATCH', body: { userId: currentUserId, peerId: conv.peerId } })
  } catch {
    chatMessages.value = [
      { id: '1', senderId: conv.peerId, senderName: conv.peerName, content: '你好！我對你的商品有興趣', messageType: 'text', creTime: new Date(Date.now() - 7200000).toISOString() },
      { id: '2', senderId: currentUserId, senderName: currentUserName, content: '好的，什麼時候方便面交呢？', messageType: 'text', creTime: new Date(Date.now() - 3600000).toISOString() },
      { id: '3', senderId: conv.peerId, senderName: conv.peerName, content: conv.lastMessage, messageType: 'text', creTime: conv.lastTime },
    ]
  }
}

async function sendChatMessage() {
  if (!newChatMsg.value.trim() || !activePeer.value) return
  const content = newChatMsg.value.trim()
  newChatMsg.value = ''

  chatMessages.value.push({ id: `msg-${Date.now()}`, senderId: currentUserId, senderName: currentUserName, content, messageType: 'text', creTime: new Date().toISOString() })

  try {
    await $fetch('/api/messages', { method: 'POST', body: { senderId: currentUserId, senderName: currentUserName, receiverId: activePeer.value.peerId, receiverName: activePeer.value.peerName, content } })
  } catch { /* silent */ }
}

function closeChatRoom() { showChatRoom.value = false; activePeer.value = null }

function formatMsgTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

// ─── 預約卡片輔助 ───
function isJsonContent(content: string): boolean {
  try { const p = JSON.parse(content); return p && p.type === 'reservation_card' } catch { return false }
}
function parseReservation(content: string): any {
  try { return JSON.parse(content) } catch { return {} }
}
function formatScheduled(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function getReservationStatusLabel(status: string): string {
  const map: Record<string, string> = { PENDING_SELLER_APPROVAL: '⏳ 等待賣家確認', APPROVED_MEETUP: '✅ 已同意面交', ITEM_STORED_IN_711: '📦 已到店待取貨', COMPLETED: '🎉 交易完成', EXPIRED_RETURNED: '⚠️ 逾期退回', REJECTED: '❌ 已拒絕' }
  return map[status] || status
}
async function confirmReservation(reservationId: string, newStatus: string) {
  if (!reservationId) return
  try {
    await $fetch(`/api/reservations/${reservationId}`, { method: 'PATCH', body: { status: newStatus } })
    alert(newStatus === 'APPROVED_MEETUP' ? '✅ 已同意面交！' : '❌ 已拒絕交易')
    // 重新載入對話
    if (activePeer.value) openChat(activePeer.value)
  } catch (e: any) {
    alert('操作失敗：' + (e?.data?.error || e?.message || ''))
  }
}
interface ChatMsg { author: string; content: string; time: string; isPinned?: boolean }
interface MyGroup {
  id: string; name: string; type: 'interest' | 'course'
  icon: string; memberCount: number; unreadCount: number
  lastMessage?: string; lastMessageTime?: string
  activityDate?: string; activityTime?: string; activityLocation?: string
}
const myGroups = ref<MyGroup[]>([
  { id: 'mg-1', name: '登山同好會', type: 'interest', icon: '🏔️', memberCount: 23, unreadCount: 3, lastMessage: '本週六改在象山集合', lastMessageTime: '14:30', activityDate: '2024-08-03', activityTime: '07:00-10:00', activityLocation: '象山步道入口' },
  { id: 'mg-2', name: '手機攝影班', type: 'course', icon: '📷', memberCount: 24, unreadCount: 0, lastMessage: '下週三帶自己的作品來分享', lastMessageTime: '昨天', activityDate: '每週三', activityTime: '09:00-11:00', activityLocation: '社大 A201' },
  { id: 'mg-3', name: '桌遊揪團', type: 'interest', icon: '🎲', memberCount: 12, unreadCount: 1, lastMessage: '有人週末要來嗎？', lastMessageTime: '11:00', activityDate: '2024-08-04', activityTime: '14:00-17:00', activityLocation: '里民活動室' },
])

const showGroupChat = ref(false)
const activeGroupChat = ref<MyGroup | null>(null)
const groupChatMessages = ref<ChatMsg[]>([])
const newGroupMsg = ref('')

function enterGroupChat(group: MyGroup) {
  activeGroupChat.value = group
  group.unreadCount = 0
  groupChatMessages.value = [
    { author: '📌 公告', content: `歡迎來到【${group.name}】！請遵守社群規範，友善交流。`, time: '', isPinned: true },
    { author: '小美', content: '大家好！新人報到～', time: '09:30' },
    { author: '阿傑', content: '歡迎歡迎！', time: '09:45' },
    { author: '團長', content: group.lastMessage || '活動細節稍後公布', time: group.lastMessageTime || '10:00' },
  ]
  showGroupChat.value = true
}

function sendGroupMsg() {
  if (!newGroupMsg.value.trim()) return
  groupChatMessages.value.push({ author: '我', content: newGroupMsg.value.trim(), time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) })
  newGroupMsg.value = ''
}

function leaveGroup(group: MyGroup) {
  myGroups.value = myGroups.value.filter(g => g.id !== group.id)
  if (activeGroupChat.value?.id === group.id) {
    showGroupChat.value = false
    activeGroupChat.value = null
  }
}

function closeGroupChatOverlay() {
  showGroupChat.value = false
  activeGroupChat.value = null
}

// ─── OPEN POINT 資料 ───
const userPoints = ref(2450)
const walletBalance = ref(1200)
const showPointsHistory = ref(false)

const pointsHistory = ref([
  { id: 'ph1', date: '2026-07-29', desc: '每日簽到', amount: 5 },
  { id: 'ph2', date: '2026-07-28', desc: '購買高鐵票', amount: 10 },
  { id: 'ph3', date: '2026-07-28', desc: '轉盤抽獎消耗', amount: -10 },
  { id: 'ph4', date: '2026-07-27', desc: '預購中秋禮盒', amount: 5 },
  { id: 'ph5', date: '2026-07-27', desc: '兌換咖啡券', amount: -100 },
  { id: 'ph6', date: '2026-07-26', desc: '報名社區活動', amount: 10 },
  { id: 'ph7', date: '2026-07-25', desc: '叫車服務', amount: 5 },
  { id: 'ph8', date: '2026-07-24', desc: '每日簽到', amount: 5 },
  { id: 'ph9', date: '2026-07-23', desc: '棒球賽購票', amount: 20 },
  { id: 'ph10', date: '2026-07-22', desc: '完成任務：首次預訂活動', amount: 50 },
])

// 每日簽到
const dailyCheckedIn = ref(false)
function handleDailyCheckIn() {
  if (dailyCheckedIn.value) return
  dailyCheckedIn.value = true
  userPoints.value += 5
}

// 轉盤抽獎（每日限定一次）
const spinResult = ref<string | null>(null)
const isSpinning = ref(false)
const dailySpinUsed = ref(false)
function handleSpin() {
  if (isSpinning.value || dailySpinUsed.value || userPoints.value < 10) return
  isSpinning.value = true
  userPoints.value -= 10
  setTimeout(() => {
    const prizes = ['5 點', '10 點', '20 點', '50 點', '謝謝參與']
    const idx = Math.floor(Math.random() * prizes.length)
    spinResult.value = prizes[idx]
    if (prizes[idx] !== '謝謝參與') {
      userPoints.value += parseInt(prizes[idx])
    }
    isSpinning.value = false
    dailySpinUsed.value = true
  }, 1500)
}

// 任務列表
const tasks = ref([
  { id: 't1', name: '首次預訂活動', reward: 50, done: true },
  { id: 't2', name: '累計 3 個獎章', reward: 100, done: false },
  { id: 't3', name: '完成每日簽到 7 天', reward: 30, done: false },
  { id: 't4', name: '使用叫車服務', reward: 20, done: true },
  { id: 't5', name: '預購商品一次', reward: 15, done: false },
])

// 兌換專區
const coupons = [
  { id: 'c1', name: '咖啡第二杯半價', cost: 100 },
  { id: 'c2', name: '全家 50 元折價券', cost: 200 },
  { id: 'c3', name: '高鐵 9 折券', cost: 500 },
  { id: 'c4', name: '抽獎券 ×1', cost: 50 },
]
function redeemCoupon(cost: number) {
  if (userPoints.value >= cost) {
    userPoints.value -= cost
    alert('兌換成功！')
  }
}

// ─── 活動票券 ───
const mockTickets = ref([
  { id: 'tk1', type: '高鐵', name: '台北→桃園 1309車次', date: '2026-08-02', time: '19:00', venue: '台北車站', status: 'unused', points: 10, link: '/transport', linkLabel: '前往購票', linkQuery: { tab: 'ticket' } },
  { id: 'tk2', type: '棒球', name: '中信兄弟 vs 統一獅', date: '2026-08-02', time: '18:35', venue: '台南亞太棒球場', status: 'unused', points: 20, link: '/entertainment', linkLabel: '前往活動', linkQuery: { tab: 'ticket' } },
  { id: 'tk3', type: '預購', name: '中秋鳳梨酥禮盒', date: '2026-09-15', time: '', venue: '7-11 信義門市', status: 'pending', points: 5, link: '/booking', linkLabel: '前往取貨', linkQuery: { tab: 'pickup' } },
  { id: 'tk4', type: '社區', name: '中秋社區烤肉大會', date: '2026-09-21', time: '17:00', venue: '仁愛里活動中心', status: 'unused', points: 10, link: '/entertainment', linkLabel: '前往活動', linkQuery: { tab: 'community' } },
  { id: 'tk5', type: '叫車', name: 'yoxi 叫車紀錄', date: '2026-07-28', time: '14:30', venue: '信義區→公司', status: 'used', points: 5, link: '/transport', linkLabel: '前往叫車', linkQuery: { tab: 'ride' } },
])

// QR 碼展開狀態
const expandedQrId = ref<string | null>(null)
function toggleQr(ticketId: string) {
  expandedQrId.value = expandedQrId.value === ticketId ? null : ticketId
}

// ─── 票券取消 + 退款 ───
const cancellingTicketId = ref<string | null>(null)
const refundComplete = ref(false)

function cancelTicket(ticket: typeof mockTickets.value[0]) {
  cancellingTicketId.value = ticket.id
}
function confirmCancelTicket(ticket: typeof mockTickets.value[0]) {
  ticket.status = 'cancelled'
  // 模擬退款
  if (ticket.type !== '叫車') {
    refundComplete.value = true
    setTimeout(() => { refundComplete.value = false }, 3000)
  }
  cancellingTicketId.value = null
}

// ─── 向里長提問（社區活動票券） ───
const askingTicketId = ref<string | null>(null)
const ticketQuestion = ref('')
const questionSent = ref(false)

function askQuestion(ticketId: string) {
  askingTicketId.value = ticketId
  ticketQuestion.value = ''
  questionSent.value = false
}
function submitTicketQuestion() {
  if (!ticketQuestion.value.trim()) return
  questionSent.value = true
  setTimeout(() => { askingTicketId.value = null; questionSent.value = false }, 2000)
}

// 獎章詳情彈窗
const selectedBadge = ref<typeof allBadges.value[0] | null>(null)
function openBadgeDetail(badge: typeof allBadges.value[0]) {
  selectedBadge.value = badge
}
function closeBadgeDetail() {
  selectedBadge.value = null
}

// ─── 獎章 ───
const allBadges = ref([
  { id: 'b1', icon: '🌱', name: '綠色通勤', desc: '連續7天使用大眾運輸', module: '行', unlocked: true },
  { id: 'b2', icon: '🚴', name: '單車達人', desc: '累計騎乘50km', module: '行', unlocked: true },
  { id: 'b3', icon: '🌍', name: '減碳先鋒', desc: '本月碳排低於目標20%', module: '行', unlocked: false },
  { id: 'b4', icon: '🏟️', name: '球場初心者', desc: '參加首場統一獅球賽', module: '樂', unlocked: true },
  { id: 'b5', icon: '🎨', name: '藝文愛好者', desc: '累計看3場展覽', module: '樂', unlocked: true },
  { id: 'b6', icon: '🎵', name: '音樂狂熱', desc: '參加2場演唱會', module: '樂', unlocked: false },
  { id: 'b7', icon: '☕', name: '體驗玩家', desc: '參加3次門市體驗', module: '樂', unlocked: false },
  { id: 'b8', icon: '🍜', name: '美食探險家', desc: '訂位5間不同餐廳', module: '食', unlocked: true },
  { id: 'b9', icon: '🏥', name: '健康達人', desc: '完成3次線上問診', module: '醫', unlocked: false },
  { id: 'b10', icon: '🏠', name: '智慧生活家', desc: '使用智能家居控制30天', module: '住', unlocked: true },
  { id: 'b11', icon: '🛒', name: '團購高手', desc: '參加5次團購', module: '預', unlocked: false },
  { id: 'b12', icon: '📦', name: '預購達人', desc: '完成3次預購', module: '預', unlocked: true },
])
</script>

<template>
  <div class="member-center">
    <!-- 頂部資訊 -->
    <div class="member-header">
      <h1 class="member-title">會員中心</h1>
      <div class="points-badge">🪙 {{ userPoints.toLocaleString() }} 點</div>
    </div>

    <!-- 功能標籤 -->
    <nav class="member-tabs" aria-label="會員中心功能">
      <button class="tab-btn" :class="{ active: activeTab === 'points' }" @click="activeTab = 'points'">點數</button>
      <button class="tab-btn" :class="{ active: activeTab === 'barcode' }" @click="activeTab = 'barcode'">條碼/錢包</button>
      <button class="tab-btn" :class="{ active: activeTab === 'tickets' }" @click="activeTab = 'tickets'">活動票券</button>
      <button class="tab-btn" :class="{ active: activeTab === 'badges' }" @click="activeTab = 'badges'">獎章</button>
      <button class="tab-btn" :class="{ active: activeTab === 'messages' }" @click="activeTab = 'messages'; fetchConversations()">
        私訊
        <span v-if="msgUnreadTotal > 0" class="unread-dot"></span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'groups' }" @click="activeTab = 'groups'">
        社群
        <span v-if="myGroups.reduce((s, g) => s + g.unreadCount, 0) > 0" class="unread-dot"></span>
      </button>
    </nav>

    <!-- ═══ 點數專區 ═══ -->
    <div v-if="activeTab === 'points'" class="tab-content">
      <!-- 點數總覽（可點擊查看歷史） -->
      <button class="card points-overview" @click="showPointsHistory = true">
        <div class="points-big">{{ userPoints.toLocaleString() }}</div>
        <div class="points-label">OPEN POINT</div>
        <div class="points-history-hint">點擊查看歷史紀錄 ›</div>
      </button>

      <!-- 每日簽到 -->
      <div class="card">
        <h3 class="card-title">📅 每日簽到</h3>
        <button class="action-btn" :class="{ done: dailyCheckedIn }" :disabled="dailyCheckedIn" @click="handleDailyCheckIn">
          {{ dailyCheckedIn ? '✓ 已簽到 (+5點)' : '立即簽到 +5點' }}
        </button>
      </div>

      <!-- 轉盤小遊戲 -->
      <div class="card">
        <h3 class="card-title">🎰 幸運轉盤 <span class="daily-limit">每日限定 1 次</span></h3>
        <p class="card-desc">消耗 10 點抽獎，有機會獲得更多點數！</p>
        <button class="action-btn spin" :disabled="isSpinning || dailySpinUsed || userPoints < 10" @click="handleSpin">
          {{ dailySpinUsed ? '✓ 今日已抽過' : isSpinning ? '轉動中...' : '花 10 點轉一次' }}
        </button>
        <p v-if="spinResult" class="spin-result">🎉 結果：{{ spinResult }}</p>
      </div>

      <!-- 兌換專區 -->
      <div class="card">
        <h3 class="card-title">🎁 兌換專區</h3>
        <div class="coupon-grid">
          <div v-for="c in coupons" :key="c.id" class="coupon-item">
            <span class="coupon-name">{{ c.name }}</span>
            <button class="coupon-btn" :disabled="userPoints < c.cost" @click="redeemCoupon(c.cost)">
              {{ c.cost }} 點兌換
            </button>
          </div>
        </div>
      </div>

      <!-- 任務獲點 -->
      <div class="card">
        <h3 class="card-title">📋 任務獲點</h3>
        <div class="task-list">
          <div v-for="t in tasks" :key="t.id" class="task-item" :class="{ done: t.done }">
            <span class="task-name">{{ t.name }}</span>
            <span class="task-reward">{{ t.done ? '✓ 已完成' : `+${t.reward} 點` }}</span>
          </div>
        </div>
      </div>

      <!-- 點數說明 -->
      <div class="card">
        <h3 class="card-title">💡 點數功用說明</h3>
        <ul class="info-list">
          <li>🔄 兌換優惠券、折價券</li>
          <li>💳 付款時可折抵金額（1點 = 1元）</li>
          <li>🎰 參加抽獎活動</li>
          <li>📅 每日簽到可獲得 5 點</li>
          <li>🎫 透過平台預定活動可獲得點數</li>
          <li>🏆 完成任務和集獎章可獲得額外點數</li>
        </ul>
      </div>
    </div>

    <!-- ═══ 條碼/錢包 ═══ -->
    <div v-if="activeTab === 'barcode'" class="tab-content">
      <!-- 會員條碼 -->
      <div class="card barcode-card">
        <h3 class="card-title">🏪 會員條碼</h3>
        <p class="card-desc">出示條碼購物賺取 OPEN POINT</p>
        <div class="barcode-display">
          <div class="barcode-pattern"></div>
          <p class="barcode-number">2895 0012 3456 7890</p>
        </div>
      </div>

      <!-- OPEN 錢包 -->
      <div class="card wallet-card">
        <h3 class="card-title">👛 OPEN 錢包</h3>
        <div class="wallet-balance">
          <span class="wallet-amount">${{ walletBalance.toLocaleString() }}</span>
          <span class="wallet-label">可用餘額</span>
        </div>
        <div class="wallet-actions">
          <button class="wallet-btn" @click="walletBalance += 500">儲值 $500</button>
          <button class="wallet-btn" @click="walletBalance += 1000">儲值 $1000</button>
        </div>
        <p class="card-desc">可在付款時選擇 OPEN 錢包支付</p>
      </div>
    </div>

    <!-- ═══ 活動票券 ═══ -->
    <div v-if="activeTab === 'tickets'" class="tab-content">
      <div class="card" v-for="tk in mockTickets" :key="tk.id">
        <div class="ticket-card" :class="{ used: tk.status === 'used' }">
          <div class="ticket-header">
            <span class="ticket-type-badge">{{ tk.type }}</span>
            <span class="ticket-status" :class="tk.status">
              {{ tk.status === 'unused' ? '待使用' : tk.status === 'pending' ? '待取貨' : tk.status === 'cancelled' ? '已取消' : '已使用' }}
            </span>
          </div>
          <h4 class="ticket-name">{{ tk.name }}</h4>
          <div class="ticket-details">
            <p v-if="tk.date">📅 {{ tk.date }} {{ tk.time }}</p>
            <p v-if="tk.venue">📍 {{ tk.venue }}</p>
            <p class="ticket-points">🪙 獲得 {{ tk.points }} 點</p>
          </div>
          <!-- QR 按鈕（收合狀態） -->
          <button class="qr-toggle-btn" @click="toggleQr(tk.id)">
            📱 {{ expandedQrId === tk.id ? '收合 QR Code' : '顯示 QR Code' }}
          </button>
          <div class="ticket-actions">
            <NuxtLink :to="{ path: tk.link, query: tk.linkQuery }" class="ticket-link-btn">{{ tk.linkLabel || '前往' }}</NuxtLink>
            <!-- 社區活動：向里長提問 -->
            <button v-if="tk.type === '社區'" class="ticket-ask-btn" @click="askQuestion(tk.id)">❓ 向里長提問</button>
            <!-- 取消票券（未使用才能取消） -->
            <button v-if="tk.status === 'unused' || tk.status === 'pending'" class="ticket-cancel-btn" @click="cancelTicket(tk)">取消</button>
          </div>
          <!-- 取消確認 -->
          <div v-if="cancellingTicketId === tk.id" class="ticket-cancel-confirm">
            <p class="cancel-warn">確定要取消「{{ tk.name }}」嗎？{{ tk.type !== '叫車' ? '已付款金額將退回原付款方式。' : '' }}</p>
            <div class="cancel-actions">
              <button class="cancel-yes" @click="confirmCancelTicket(tk)">確認取消{{ tk.type !== '叫車' ? '並退款' : '' }}</button>
              <button class="cancel-no" @click="cancellingTicketId = null">不取消</button>
            </div>
          </div>
          <!-- 向里長提問表單 -->
          <div v-if="askingTicketId === tk.id" class="ticket-question-form">
            <div v-if="!questionSent">
              <textarea v-model="ticketQuestion" class="ticket-question-input" placeholder="請輸入您的問題..." rows="2"></textarea>
              <div class="ticket-question-actions">
                <button class="ticket-question-send" @click="submitTicketQuestion">送出提問</button>
                <button class="ticket-question-cancel" @click="askingTicketId = null">取消</button>
              </div>
            </div>
            <div v-else class="ticket-question-sent">✅ 提問已送出，里長會盡快回覆您！</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 退款成功提示 -->
    <Transition name="toast-fade">
      <div v-if="refundComplete" class="refund-toast">💰 退款處理中，預計 3-5 個工作天退回原付款方式</div>
    </Transition>

    <!-- 點數歷史紀錄懸浮視窗 -->
    <Teleport to="body">
      <div v-if="showPointsHistory" class="qr-overlay" @click.self="showPointsHistory = false">
        <div class="history-modal">
          <div class="history-header">
            <h3 class="history-title">點數歷史紀錄</h3>
            <button class="qr-modal-close" @click="showPointsHistory = false">✕</button>
          </div>
          <div class="history-list">
            <div v-for="h in pointsHistory" :key="h.id" class="history-item">
              <div class="history-left">
                <span class="history-desc">{{ h.desc }}</span>
                <span class="history-date">{{ h.date }}</span>
              </div>
              <span class="history-amount" :class="h.amount > 0 ? 'positive' : 'negative'">
                {{ h.amount > 0 ? '+' : '' }}{{ h.amount }} 點
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- QR Code 懸浮視窗 -->
    <Teleport to="body">
      <div v-if="expandedQrId" class="qr-overlay" @click.self="expandedQrId = null">
        <div class="qr-modal">
          <button class="qr-modal-close" @click="expandedQrId = null">✕</button>
          <div class="qr-modal-content">
            <div class="qr-large-box">
              <div class="qr-pattern-large"></div>
            </div>
            <p class="qr-modal-label">掃描此 QR Code</p>
            <p class="qr-modal-id">{{ expandedQrId }}</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ 獎章 ═══ -->
    <div v-if="activeTab === 'badges'" class="tab-content">
      <div class="badges-grid">
        <button
          v-for="b in allBadges"
          :key="b.id"
          class="badge-item"
          :class="{ locked: !b.unlocked }"
          @click="openBadgeDetail(b)"
        >
          <span class="badge-icon">{{ b.icon }}</span>
          <span class="badge-name">{{ b.name }}</span>
          <span v-if="!b.unlocked" class="badge-lock">🔒</span>
        </button>
      </div>
    </div>

    <!-- ═══ 私訊 ═══ -->
    <div v-if="activeTab === 'messages'" class="tab-content">
      <div v-if="conversations.length === 0" class="empty-state">
        <p>尚無私訊對話</p>
        <p class="empty-hint">前往 i二手 私訊賣家開始對話！</p>
      </div>
      <div v-for="conv in conversations" :key="conv.peerId" class="msg-conv" @click="openChat(conv)">
        <div class="msg-conv-left">
          <div class="msg-conv-avatar">👤</div>
          <div class="msg-conv-info">
            <div class="msg-conv-name-row">
              <span class="msg-conv-name">{{ conv.peerName }}</span>
              <span v-if="conv.listingName" class="msg-conv-listing">{{ conv.listingName }}</span>
            </div>
            <p class="msg-conv-last">{{ conv.lastMessage }}</p>
          </div>
        </div>
        <div class="msg-conv-right">
          <span v-if="conv.unreadCount > 0" class="msg-unread-badge">{{ conv.unreadCount }}</span>
          <span class="msg-conv-time">{{ formatMsgTime(conv.lastTime) }}</span>
        </div>
      </div>
    </div>

    <!-- 私訊聊天室 Overlay -->
    <Teleport to="body">
      <div v-if="showChatRoom && activePeer" class="msg-overlay" @click.self="closeChatRoom">
        <div class="msg-panel">
          <header class="msg-header">
            <button class="msg-back" @click="closeChatRoom">← 返回</button>
            <span class="msg-header-name">{{ activePeer.peerName }}</span>
            <span class="msg-header-hint">{{ activePeer.listingName || '私訊' }}</span>
          </header>
          <div class="msg-body">
            <div v-for="m in chatMessages" :key="m.id" class="msg-bubble" :class="{ 'msg-bubble--mine': m.senderId === currentUserId, 'msg-bubble--system': m.messageType === 'system' || m.messageType === 'reservation_notice' }">
              <span v-if="m.senderId !== currentUserId && m.messageType === 'text'" class="msg-author">{{ m.senderName }}</span>
              <!-- 預約卡片 -->
              <div v-if="m.messageType === 'reservation_notice' && isJsonContent(m.content)" class="msg-reservation-card">
                <p class="msg-reservation-title">🤝 面交預約</p>
                <p class="msg-reservation-detail">📍 {{ parseReservation(m.content).pickupStore }}</p>
                <p v-if="parseReservation(m.content).scheduledAt" class="msg-reservation-detail">⏰ {{ formatScheduled(parseReservation(m.content).scheduledAt) }}</p>
                <p class="msg-reservation-status">{{ getReservationStatusLabel(parseReservation(m.content).status) }}</p>
                <div v-if="parseReservation(m.content).status === 'PENDING_SELLER_APPROVAL' && m.receiverId === currentUserId" class="msg-reservation-actions">
                  <button class="msg-confirm-btn" @click="confirmReservation(parseReservation(m.content).reservationId, 'APPROVED_MEETUP')">✅ 同意面交</button>
                  <button class="msg-reject-btn" @click="confirmReservation(parseReservation(m.content).reservationId, 'REJECTED')">❌ 拒絕</button>
                </div>
              </div>
              <!-- 普通文字 -->
              <p v-else class="msg-text">{{ m.content }}</p>
              <span class="msg-time">{{ formatMsgTime(m.creTime) }}</span>
            </div>
          </div>
          <div class="msg-input-bar">
            <input v-model="newChatMsg" class="msg-input" placeholder="輸入訊息..." @keydown.enter="sendChatMessage" />
            <button class="msg-send" @click="sendChatMessage">送出</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ 我的社群 ═══ -->
    <div v-if="activeTab === 'groups'" class="tab-content">
      <div v-if="myGroups.length === 0" class="empty-state">
        <p>尚未加入任何社群</p>
        <p class="empty-hint">前往「樂」模組的興趣媒合加入社群吧！</p>
      </div>
      <div v-for="group in myGroups" :key="group.id" class="group-card">
        <div class="group-card-left" @click="enterGroupChat(group)">
          <span class="group-icon">{{ group.icon }}</span>
          <div class="group-info">
            <div class="group-name-row">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-type" :class="group.type === 'course' ? 'group-type--course' : 'group-type--interest'">{{ group.type === 'course' ? '📚 課程' : '💡 興趣' }}</span>
            </div>
            <p class="group-last-msg">{{ group.lastMessage || '暫無訊息' }}</p>
          </div>
        </div>
        <div class="group-card-right">
          <span v-if="group.unreadCount > 0" class="group-unread">{{ group.unreadCount }}</span>
          <span class="group-time">{{ group.lastMessageTime }}</span>
          <button class="group-leave-btn" @click="leaveGroup(group)">退出</button>
        </div>
      </div>
    </div>

    <!-- 社群聊天室 Overlay -->
    <Teleport to="body">
      <div v-if="showGroupChat && activeGroupChat" class="chat-overlay" @click.self="closeGroupChatOverlay">
        <div class="chat-panel">
          <header class="chat-header">
            <button class="chat-back" @click="closeGroupChatOverlay">← 返回</button>
            <span class="chat-title">{{ activeGroupChat.name }}</span>
            <span class="chat-members">👥 {{ activeGroupChat.memberCount }}</span>
          </header>
          <!-- 置頂活動資訊卡 -->
          <div class="chat-activity-card">
            <div class="chat-activity-icon">{{ activeGroupChat.icon }}</div>
            <div class="chat-activity-info">
              <span class="chat-activity-name">{{ activeGroupChat.name }}</span>
              <span class="chat-activity-detail">📅 {{ activeGroupChat.activityDate }} {{ activeGroupChat.activityTime }}</span>
              <span class="chat-activity-detail">📍 {{ activeGroupChat.activityLocation }}</span>
            </div>
          </div>
          <div class="chat-messages">
            <div v-for="(msg, idx) in groupChatMessages" :key="idx" class="chat-msg" :class="{ 'chat-msg--mine': msg.author === '我', 'chat-msg--pinned': msg.isPinned }">
              <span v-if="!msg.isPinned && msg.author !== '我'" class="chat-author">{{ msg.author }}</span>
              <p class="chat-text">{{ msg.content }}</p>
              <span v-if="msg.time" class="chat-time">{{ msg.time }}</span>
            </div>
          </div>
          <div class="chat-input-bar">
            <input v-model="newGroupMsg" class="chat-input" placeholder="輸入訊息..." @keydown.enter="sendGroupMsg" />
            <button class="chat-send" @click="sendGroupMsg">送出</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 獎章詳情懸浮視窗 -->
    <Teleport to="body">
      <div v-if="selectedBadge" class="badge-overlay" @click.self="closeBadgeDetail">
        <div class="badge-modal">
          <button class="badge-modal-close" @click="closeBadgeDetail">✕</button>
          <div class="badge-modal-icon">{{ selectedBadge.icon }}</div>
          <h3 class="badge-modal-name">{{ selectedBadge.name }}</h3>
          <span class="badge-modal-module">{{ selectedBadge.module }}模組</span>
          <p class="badge-modal-desc">{{ selectedBadge.desc }}</p>
          <span class="badge-modal-status" :class="{ unlocked: selectedBadge.unlocked }">
            {{ selectedBadge.unlocked ? '✓ 已解鎖' : '🔒 未解鎖' }}
          </span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.member-center {
  padding: 16px;
  max-width: 430px;
  margin: 0 auto;
}

.member-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.member-title { font-size: 20px; font-weight: 700; margin: 0; }

.points-badge {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

/* 標籤 */
.member-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.member-tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #78716c;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.tab-content { display: flex; flex-direction: column; gap: 12px; }

/* 卡片 */
.card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.card-title { font-size: 15px; font-weight: 600; margin: 0 0 8px; }
.card-desc { font-size: 12px; color: #78716c; margin: 4px 0; }

/* 點數 */
.points-overview { text-align: center; background: linear-gradient(135deg, #fffbeb, #fef3c7); cursor: pointer; border: none; width: 100%; transition: transform 0.15s; }
.points-overview:hover { transform: scale(1.02); }
.points-big { font-size: 36px; font-weight: 800; color: #f59e0b; }
.points-label { font-size: 12px; color: #92400e; font-weight: 600; }
.points-history-hint { font-size: 11px; color: #b45309; margin-top: 4px; }

/* 點數歷史 */
.history-modal { background: #fff; border-radius: 16px; padding: 20px; width: 320px; max-height: 70vh; overflow-y: auto; position: relative; animation: scale-in 0.2s ease; }
.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.history-title { font-size: 16px; font-weight: 700; margin: 0; }
.history-list { display: flex; flex-direction: column; gap: 0; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.history-item:last-child { border-bottom: none; }
.history-left { display: flex; flex-direction: column; }
.history-desc { font-size: 13px; font-weight: 500; color: #1e293b; }
.history-date { font-size: 11px; color: #94a3b8; }
.history-amount { font-size: 14px; font-weight: 700; }
.history-amount.positive { color: #10b981; }
.history-amount.negative { color: #ef4444; }

.action-btn {
  width: 100%; padding: 12px; min-height: 44px;
  border: none; border-radius: 10px;
  background: #f59e0b; color: #fff;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.action-btn:hover { opacity: 0.9; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.done { background: #10b981; }
.action-btn.spin { background: #8b5cf6; }
.spin-result { font-size: 14px; font-weight: 600; color: #8b5cf6; text-align: center; margin: 8px 0 0; }

.coupon-grid { display: flex; flex-direction: column; gap: 8px; }
.coupon-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.coupon-name { font-size: 13px; }
.coupon-btn { padding: 4px 10px; border: 1px solid #f59e0b; border-radius: 6px; background: transparent; color: #f59e0b; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 32px; }
.coupon-btn:disabled { opacity: 0.4; }

.task-list { display: flex; flex-direction: column; gap: 6px; }
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-radius: 8px; background: #f8fafc; }
.task-item.done { opacity: 0.6; }
.task-name { font-size: 13px; }
.task-reward { font-size: 12px; font-weight: 600; color: #f59e0b; }
.task-item.done .task-reward { color: #10b981; }

.info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.info-list li { font-size: 13px; color: #64748b; }

/* 條碼/錢包 */
.barcode-display { text-align: center; padding: 16px; background: #f8fafc; border-radius: 10px; margin-top: 8px; }
.barcode-pattern { height: 60px; background: repeating-linear-gradient(90deg, #1e293b 0, #1e293b 2px, transparent 2px, transparent 4px); border-radius: 4px; margin-bottom: 8px; }
.barcode-number { font-family: monospace; font-size: 14px; color: #1e293b; letter-spacing: 2px; margin: 0; }

.wallet-balance { text-align: center; padding: 16px 0; }
.wallet-amount { font-size: 28px; font-weight: 800; color: #10b981; display: block; }
.wallet-label { font-size: 12px; color: #78716c; }
.wallet-actions { display: flex; gap: 8px; margin: 8px 0; }
.wallet-btn { flex: 1; padding: 10px; border: 1.5px solid #10b981; border-radius: 10px; background: transparent; color: #10b981; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 40px; }
.wallet-btn:hover { background: #ecfdf5; }

/* 票券 */
.ticket-card { position: relative; }
.ticket-card.used { opacity: 0.5; }
.ticket-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.ticket-type-badge { font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 10px; }
.ticket-status { font-size: 11px; font-weight: 600; }
.ticket-status.unused { color: #10b981; }
.ticket-status.pending { color: #f59e0b; }
.ticket-status.used { color: #94a3b8; }
.ticket-name { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
.ticket-details p { font-size: 12px; color: #64748b; margin: 2px 0; }
.ticket-points { color: #f59e0b !important; font-weight: 600; }
.qr-toggle-btn { width: 100%; padding: 8px; margin: 8px 0; border: 1px dashed #e2e8f0; border-radius: 8px; background: transparent; font-size: 12px; color: #64748b; cursor: pointer; min-height: 36px; transition: all 0.15s; }
.qr-toggle-btn:hover { border-color: #f59e0b; color: #f59e0b; }
.ticket-actions { display: flex; gap: 8px; }
.ticket-link-btn { flex: 1; text-align: center; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 500; color: #64748b; text-decoration: none; min-height: 36px; display: flex; align-items: center; justify-content: center; }
.ticket-link-btn:hover { border-color: #f59e0b; color: #f59e0b; }

/* QR 懸浮視窗 */
.qr-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1200; display: flex; align-items: center; justify-content: center; }
.qr-modal { background: #fff; border-radius: 16px; padding: 24px; width: 280px; text-align: center; position: relative; animation: scale-in 0.2s ease; }
@keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.qr-modal-close { position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; width: 32px; height: 32px; }
.qr-modal-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.qr-large-box { width: 180px; height: 180px; border: 3px solid #f59e0b; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #fff; }
.qr-pattern-large { width: 140px; height: 140px; background: repeating-conic-gradient(#1e293b 0% 25%, transparent 0% 50%) 0 0 / 14px 14px; border-radius: 4px; }
.qr-modal-label { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0; }
.qr-modal-id { font-size: 11px; color: #94a3b8; font-family: monospace; margin: 0; }

.daily-limit { font-size: 11px; color: #94a3b8; font-weight: 400; }

/* 獎章 */
.badges-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.badge-item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); position: relative; text-align: center; border: none; cursor: pointer; transition: transform 0.15s; }
.badge-item:hover { transform: scale(1.03); }
.badge-item.locked { opacity: 0.4; filter: grayscale(0.8); }
.badge-icon { font-size: 32px; }
.badge-name { font-size: 11px; font-weight: 600; color: #1e293b; }
.badge-lock { position: absolute; top: 4px; right: 4px; font-size: 12px; }

/* 獎章懸浮視窗 */
.badge-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1200; display: flex; align-items: center; justify-content: center; }
.badge-modal { background: #fff; border-radius: 16px; padding: 28px 24px; width: 280px; text-align: center; position: relative; animation: scale-in 0.2s ease; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.badge-modal-close { position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; width: 32px; height: 32px; }
.badge-modal-icon { font-size: 48px; }
.badge-modal-name { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
.badge-modal-module { font-size: 12px; color: #94a3b8; background: #f1f5f9; padding: 2px 10px; border-radius: 10px; }
.badge-modal-desc { font-size: 14px; color: #64748b; margin: 4px 0 0; line-height: 1.5; }
.badge-modal-status { font-size: 13px; font-weight: 600; margin-top: 8px; }
.badge-modal-status.unlocked { color: #10b981; }

/* ═══ 我的社群 ═══ */
.group-card { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; }
.group-card-left { display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; }
.group-icon { font-size: 24px; }
.group-info { flex: 1; min-width: 0; }
.group-name-row { display: flex; align-items: center; gap: 6px; }
.group-name { font-size: 14px; font-weight: 600; color: #1c1917; }
.group-type { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 6px; }
.group-type--interest { background: #fdf2f8; color: #ec4899; }
.group-type--course { background: #f5f3ff; color: #8b5cf6; }
.group-last-msg { margin: 2px 0 0; font-size: 12px; color: #78716c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.group-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.group-unread { background: #ec4899; color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
.group-time { font-size: 10px; color: #78716c; }
.group-leave-btn { font-size: 10px; color: #e11d48; background: none; border: 1px solid #e11d48; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #ec4899; display: inline-block; margin-left: 4px; }
.empty-hint { font-size: 12px; color: #78716c; margin: 4px 0 0; }

/* ═══ 社群聊天室 ═══ */
.chat-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
.chat-panel { background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 430px; height: 80vh; display: flex; flex-direction: column; animation: slideUp .3s ease; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.chat-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
.chat-back { background: none; border: none; font-size: 14px; cursor: pointer; color: #78716c; }
.chat-title { font-size: 14px; font-weight: 700; color: #1c1917; }
.chat-members { font-size: 11px; color: #78716c; }
.chat-activity-card { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #fdf2f8; border-bottom: 1px solid #fce7f3; }
.chat-activity-icon { font-size: 24px; }
.chat-activity-info { display: flex; flex-direction: column; gap: 2px; }
.chat-activity-name { font-size: 13px; font-weight: 700; color: #1c1917; }
.chat-activity-detail { font-size: 11px; color: #78716c; }
.chat-messages { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.chat-msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; background: #f1f5f9; }
.chat-msg--mine { align-self: flex-end; background: #ec4899; color: #fff; }
.chat-msg--mine .chat-time { color: rgba(255,255,255,.7); }
.chat-msg--pinned { max-width: 100%; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; }
.chat-author { font-size: 10px; font-weight: 600; color: #8b5cf6; display: block; margin-bottom: 2px; }
.chat-text { margin: 0; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
.chat-time { font-size: 10px; color: #78716c; display: block; margin-top: 2px; text-align: right; }
.chat-input-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0; }
.chat-input { flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 13px; outline: none; }
.chat-input:focus { border-color: #ec4899; }
.chat-send { padding: 10px 16px; background: #ec4899; color: #fff; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; }

/* ═══ 票券取消 + 提問 ═══ */
.ticket-ask-btn { padding: 6px 12px; border: 1px solid #ec4899; border-radius: 8px; background: transparent; color: #ec4899; font-size: 11px; font-weight: 600; cursor: pointer; }
.ticket-cancel-btn { padding: 6px 12px; border: 1px solid #e11d48; border-radius: 8px; background: transparent; color: #e11d48; font-size: 11px; cursor: pointer; }
.ticket-cancel-confirm { background: #ffe4e6; border: 1px solid #fca5a5; border-radius: 10px; padding: 10px 12px; margin-top: 8px; }
.cancel-warn { margin: 0 0 8px; font-size: 12px; color: #991b1b; }
.cancel-actions { display: flex; gap: 8px; }
.cancel-yes { padding: 8px 16px; background: #e11d48; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.cancel-no { padding: 8px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; cursor: pointer; }
.ticket-question-form { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.ticket-question-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; resize: none; }
.ticket-question-input:focus { border-color: #ec4899; outline: none; }
.ticket-question-actions { display: flex; gap: 8px; }
.ticket-question-send { padding: 6px 14px; background: #ec4899; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.ticket-question-cancel { padding: 6px 14px; background: transparent; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; cursor: pointer; }
.ticket-question-sent { font-size: 12px; color: #16a34a; font-weight: 600; padding: 8px; background: #dcfce7; border-radius: 8px; text-align: center; }
.ticket-status.cancelled { color: #e11d48; }
.refund-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; background: #16a34a; color: #fff; font-size: 13px; font-weight: 600; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.15); white-space: nowrap; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }

/* ═══ 私訊 ═══ */
.msg-conv { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; cursor: pointer; }
.msg-conv:hover { border-color: #f59e0b; }
.msg-conv-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.msg-conv-avatar { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.msg-conv-info { flex: 1; min-width: 0; }
.msg-conv-name-row { display: flex; align-items: center; gap: 6px; }
.msg-conv-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.msg-conv-listing { font-size: 10px; color: #16a34a; background: #dcfce7; padding: 1px 6px; border-radius: 6px; }
.msg-conv-last { margin: 2px 0 0; font-size: 12px; color: #78716c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.msg-conv-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.msg-unread-badge { background: #ec4899; color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
.msg-conv-time { font-size: 10px; color: #9ca3af; }

.msg-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
.msg-panel { background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 430px; height: 80vh; display: flex; flex-direction: column; animation: slideUp .3s ease; }
.msg-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
.msg-back { background: none; border: none; font-size: 14px; cursor: pointer; color: #78716c; }
.msg-header-name { font-size: 14px; font-weight: 700; color: #1c1917; flex: 1; }
.msg-header-hint { font-size: 11px; color: #16a34a; }
.msg-body { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.msg-bubble { max-width: 80%; padding: 8px 12px; border-radius: 12px; background: #f1f5f9; color: #1c1917; }
.msg-bubble--mine { align-self: flex-end; background: #f59e0b; color: #fff; }
.msg-bubble--mine .msg-time { color: rgba(255,255,255,.7); }
.msg-bubble--system { max-width: 100%; background: #ecfdf5; border: 1px solid #86efac; text-align: center; align-self: center; color: #166534; }
.msg-author { font-size: 10px; font-weight: 600; color: #8b5cf6; display: block; margin-bottom: 2px; }
.msg-text { margin: 0; font-size: 13px; line-height: 1.5; color: inherit; }
.msg-time { font-size: 10px; color: #78716c; display: block; margin-top: 2px; text-align: right; }
.msg-input-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0; }
.msg-input { flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 13px; outline: none; }
.msg-input:focus { border-color: #f59e0b; }
.msg-send { padding: 10px 16px; background: #f59e0b; color: #fff; border: none; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; }

/* Reservation Card in Chat */
.msg-reservation-card { display: flex; flex-direction: column; gap: 4px; }
.msg-reservation-title { margin: 0; font-size: 13px; font-weight: 700; color: #1c1917; }
.msg-reservation-detail { margin: 0; font-size: 12px; color: #78716c; }
.msg-reservation-status { margin: 4px 0 0; font-size: 12px; font-weight: 600; color: #0369a1; }
.msg-reservation-actions { display: flex; gap: 8px; margin-top: 8px; }
.msg-confirm-btn { padding: 6px 12px; border: none; border-radius: 8px; background: #16a34a; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.msg-reject-btn { padding: 6px 12px; border: none; border-radius: 8px; background: #e11d48; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
</style>
