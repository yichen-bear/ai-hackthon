<script setup lang="ts">
/**
 * 樂模組主頁面
 * 路由: /entertainment
 * 作用域 Token 覆寫：粉紅主色 + 紫色次色
 * 組裝所有樂模組元件並串接資料流
 */

import type {
  EntertainmentTicket, EntertainmentRecommendation, EventItem, StoreExperience, EventType,
  TicketCoupon, PointTask, EntertainmentBadge, CommunityEvent, CommunityCourse,
  MatchedGroup, BoardPost, PrizeType
} from '~/types/entertainment'

const { purchasedTickets, crossModuleTicket, aiRecommendation, dismissRecommendation, triggerCrossModule, userPoints, userInterests } = useEntertainmentState()
const { matchIntent } = useEntertainmentAgent()

// ─── 功能區塊導航列 ───
const navTabs = [
  { key: 'ticket', label: '活動' },
  { key: 'recommend', label: '推薦' },
  { key: 'points', label: '點數' },
  { key: 'community', label: '社區' },
  { key: 'board', label: '社群' },
  { key: 'badge', label: '獎章' },
] as const

type NavKey = typeof navTabs[number]['key']
const activeNav = ref<NavKey>('ticket')

function handleNavClick(key: NavKey) {
  activeNav.value = key
}

// ─── Mock Data（暫時放置，Wave 5 會整理） ───
const mockEvents: EventItem[] = [
  {
    id: 'evt-1', type: 'baseball', title: '中信兄弟 vs 統一獅',
    date: '2026-08-02', time: '18:35', venue: '台南亞太國際棒球訓練中心',
    venueAddress: '台南市安南區安中路六段 505 號', priceRange: '$300 ~ $1,200',
    prices: [
      { id: 'p1', name: '外野自由座', price: 300, remaining: 220 },
      { id: 'p2', name: '內野B區', price: 600, remaining: 85 },
      { id: 'p3', name: '內野A區', price: 900, remaining: 32 },
      { id: 'p4', name: 'VIP 包廂', price: 1200, remaining: 8 },
    ],
    remainingTickets: 345, coverImage: 'linear-gradient(135deg, #f59e0b, #ea580c)', opponent: '中信兄弟',
  },
  {
    id: 'evt-2', type: 'baseball', title: '樂天桃猿 vs 統一獅',
    date: '2026-08-09', time: '17:05', venue: '台南亞太國際棒球訓練中心',
    venueAddress: '台南市安南區安中路六段 505 號', priceRange: '$300 ~ $1,200',
    prices: [
      { id: 'p5', name: '外野自由座', price: 300, remaining: 180 },
      { id: 'p6', name: '內野B區', price: 600, remaining: 120 },
      { id: 'p7', name: '內野A區', price: 900, remaining: 55 },
      { id: 'p8', name: 'VIP 包廂', price: 1200, remaining: 12 },
    ],
    remainingTickets: 367, coverImage: 'linear-gradient(135deg, #ec4899, #be185d)', opponent: '樂天桃猿',
  },
  {
    id: 'evt-3', type: 'exhibition', title: 'teamLab 未來遊樂園＆與花共生的動物們',
    date: '2026-08-01', time: '10:00~18:00', venue: '國立臺灣科學教育館',
    venueAddress: '台北市士林區士商路 189 號', priceRange: '$380 ~ $450',
    prices: [
      { id: 'p9', name: '全票', price: 450, remaining: 60 },
      { id: 'p10', name: '優待票', price: 380, remaining: 45 },
    ],
    remainingTickets: 105, coverImage: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', tags: ['展覽', '互動藝術'],
  },
  {
    id: 'evt-4', type: 'concert', title: '告五人【帶你飛】巡迴演唱會',
    date: '2026-08-23', time: '19:30', venue: '台北小巨蛋',
    venueAddress: '台北市松山區南京東路四段 2 號', priceRange: '$1,200 ~ $3,800',
    prices: [
      { id: 'p11', name: '搖滾區', price: 3800, remaining: 0 },
      { id: 'p12', name: '特A區', price: 2800, remaining: 15 },
      { id: 'p13', name: 'A區', price: 2200, remaining: 42 },
      { id: 'p14', name: 'B區', price: 1200, remaining: 88 },
    ],
    remainingTickets: 145, coverImage: 'linear-gradient(135deg, #06b6d4, #0891b2)', tags: ['演唱會', '華語音樂'],
  },
  {
    id: 'evt-5', type: 'theater', title: '《小王子》音樂劇台北場',
    date: '2026-09-06', time: '14:30', venue: '國家兩廳院 戲劇院',
    venueAddress: '台北市中正區中山南路 21-1 號', priceRange: '$800 ~ $2,500',
    prices: [
      { id: 'p15', name: '特等席', price: 2500, remaining: 20 },
      { id: 'p16', name: '甲等席', price: 1800, remaining: 55 },
      { id: 'p17', name: '乙等席', price: 800, remaining: 90 },
    ],
    remainingTickets: 165, coverImage: 'linear-gradient(135deg, #f472b6, #ec4899)', tags: ['音樂劇', '親子'],
  },
]

const mockExperiences: StoreExperience[] = [
  {
    id: 'exp-1', name: '星巴克咖啡拉花教室', type: 'coffee',
    storeName: '星巴克典藏門市（信義店）', storeAddress: '台北市信義區松高路 11 號',
    timeSlot: '2026/08/10 14:00~16:00', fee: 450, maxParticipants: 12, currentParticipants: 9,
    description: '由專業咖啡師指導，學習拿鐵拉花技巧，含材料費與一杯手作飲品',
  },
  {
    id: 'exp-2', name: '7-11 手作甜點體驗', type: 'baking',
    storeName: '7-11 信義旗艦店', storeAddress: '台北市信義區信義路五段 7 號',
    timeSlot: '2026/08/17 10:00~12:00', fee: 350, maxParticipants: 8, currentParticipants: 5,
    description: '製作法式馬卡龍與可麗露，含材料費與成品帶回',
  },
]

// ─── Mock: OPEN POINT ───
const dailyFreeUsed = ref(false)
const mockTasks = ref<PointTask[]>([
  { id: 'task-1', name: '首次購票', description: '在樂模組完成首次購票', reward: 100, completed: true, icon: '🎫' },
  { id: 'task-2', name: '分享活動', description: '將活動分享給朋友', reward: 50, completed: true, icon: '🔗' },
  { id: 'task-3', name: '完成週末提案', description: '透過 AI 推薦購票或報名活動', reward: 30, completed: false, icon: '🤖' },
  { id: 'task-4', name: '留言板首次發文', description: '在社群留言板發表第一篇貼文', reward: 20, completed: false, icon: '📝' },
])

// ─── Mock: 成就徽章 ───
const mockBadges: EntertainmentBadge[] = [
  { id: 'badge-1', icon: '🏟️', name: '球場初心者', description: '參加首場統一獅球賽', unlocked: true, unlockedAt: '2026-07-28' },
  { id: 'badge-2', icon: '🎨', name: '藝文愛好者', description: '累計看 3 場展覽', unlocked: true, unlockedAt: '2026-07-20' },
  { id: 'badge-3', icon: '🎯', name: '點數高手', description: '累計獲得 1000 點獎勵', unlocked: true, unlockedAt: '2026-07-25' },
  { id: 'badge-4', icon: '🎵', name: '音樂狂熱', description: '參加 2 場演唱會', unlocked: false },
  { id: 'badge-5', icon: '☕', name: '體驗玩家', description: '參加 3 次門市體驗', unlocked: false },
  { id: 'badge-6', icon: '🤝', name: '社交蝴蝶', description: '揪團成功 3 次', unlocked: false },
  { id: 'badge-7', icon: '📝', name: '分享達人', description: '留言板發文 10 則', unlocked: false },
  { id: 'badge-8', icon: '🎓', name: '終身學習', description: '報名 2 堂社大課程', unlocked: false },
]

// ─── Mock: 社區活動 ───
const mockCommunityEvents: CommunityEvent[] = [
  { id: 'ce-1', name: '中秋社區烤肉大會', date: '2026-09-21', time: '17:00~21:00', location: '信義區仁愛里活動中心中庭', organizer: '仁愛里辦公室', fee: 200, currentParticipants: 32, maxParticipants: 50 },
  { id: 'ce-2', name: '假日健走活動：象山步道', date: '2026-08-10', time: '07:00~09:00', location: '象山步道入口（信義路五段 150 巷）', organizer: '信義區體育會', fee: 0, currentParticipants: 18, maxParticipants: 30 },
]
const mockCourses: CommunityCourse[] = [
  { id: 'course-1', name: '生活攝影入門', instructor: '林老師', schedule: '每週三 19:00~21:00', credits: 2, sessions: 18, fee: 2000, status: 'open', location: '信義社區大學 201 教室' },
  { id: 'course-2', name: '手沖咖啡實作', instructor: '陳老師', schedule: '每週六 10:00~12:00', credits: 1, sessions: 12, fee: 2500, status: 'almost-full', location: '信義社區大學 生活教室' },
  { id: 'course-3', name: '瑜伽與正念冥想', instructor: '張老師', schedule: '每週一、四 07:00~08:30', credits: 2, sessions: 36, fee: 3000, status: 'open', location: '信義社區大學 瑜伽教室' },
]

// ─── Mock: 興趣媒合 ───
const mockMatchedGroups: MatchedGroup[] = [
  { id: 'mg-1', name: '週六攝影散步團', matchScore: 92, date: '2026-08-09', time: '09:00~12:00', location: '大稻埕迪化街', participants: 8, tags: ['攝影', '旅行'], type: 'activity' },
  { id: 'mg-2', name: '桌遊之夜 - 信義場', matchScore: 85, date: '2026-08-08', time: '19:00~22:00', location: '骰子人桌遊店（信義店）', participants: 5, tags: ['桌遊'], type: 'activity' },
  { id: 'mg-3', name: '假日登山社', matchScore: 78, date: '2026-08-16', time: '06:00~14:00', location: '陽明山國家公園', participants: 12, tags: ['登山', '運動'], type: 'community' },
]

// ─── Mock: 留言板 ───
const mockPosts = ref<BoardPost[]>([
  { id: 'post-1', author: '小明', avatar: 'linear-gradient(135deg, #60a5fa, #3b82f6)', content: '有人這週六要一起去看統一獅比賽嗎？內野 A 區還有位子，想揪 3 個人一起！', tags: ['揪團'], createdAt: '2026-07-28T10:30:00', likes: 12, comments: 5, type: 'team-up', teamInfo: { eventName: '中信兄弟 vs 統一獅', date: '2026-08-02', current: 3, target: 6 } },
  { id: 'post-2', author: '阿花', avatar: 'linear-gradient(135deg, #f472b6, #ec4899)', content: '昨天去看 teamLab 超美的！推薦大家平日去比較不用排隊，互動區小朋友玩得很開心。', tags: ['心得'], createdAt: '2026-07-27T18:45:00', likes: 28, comments: 8, type: 'review' },
  { id: 'post-3', author: '咖啡控', avatar: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', content: '星巴克拉花教室有人去過嗎？想問一下需要自己帶圍裙嗎？', tags: ['討論'], createdAt: '2026-07-27T14:20:00', likes: 5, comments: 3, type: 'discussion' },
  { id: 'post-4', author: '運動咖', avatar: 'linear-gradient(135deg, #34d399, #10b981)', content: '信義社大的瑜伽課真的很讚，張老師教得很仔細，初學者也不用擔心。', tags: ['心得'], createdAt: '2026-07-26T09:15:00', likes: 15, comments: 4, type: 'review' },
])

// ─── 事件處理 ───
function handleTicketPurchased(payload: {
  eventId: string; eventType: EventType | 'experience'; ticketType: string;
  quantity: number; totalAmount: number; venue: string; venueAddress: string;
  date: string; time: string
}) {
  const event = mockEvents.find(e => e.id === payload.eventId)
    || mockExperiences.find(e => e.id === payload.eventId)

  const newTicket: EntertainmentTicket = {
    id: `tkt-${Date.now()}`,
    eventType: payload.eventType,
    eventName: event ? ('title' in event ? event.title : event.name) : '活動',
    date: payload.date,
    time: payload.time,
    venue: payload.venue,
    venueAddress: payload.venueAddress,
    seatInfo: payload.ticketType,
    ticketType: payload.ticketType,
    quantity: payload.quantity,
    qrCode: `qr-${Date.now()}`,
    status: 'unused',
    purchaseDate: new Date().toISOString().split('T')[0],
    totalAmount: payload.totalAmount,
  }

  purchasedTickets.value.unshift(newTicket)
  triggerCrossModule(newTicket)
}

// Mock 憑票優惠券
const mockCoupons: TicketCoupon[] = [
  {
    id: 'cpn-1', ticketId: '', description: '持票至 7-11 享大杯咖啡第二杯半價',
    discount: '第二杯半價', storeName: '7-ELEVEN', validUntil: '2026-08-02', couponType: 'drink',
  },
  {
    id: 'cpn-2', ticketId: '', description: '持票至星巴克消費折 $30',
    discount: '折 $30', storeName: '星巴克', validUntil: '2026-08-09', couponType: 'discount',
  },
]

// AI 推薦相關
function handleAiGoPurchase(payload: { eventId: string; eventType: string }) {
  activeNav.value = 'ticket'
}

function handleAiRefresh() {
  const result = matchIntent('週末想出去玩')
  aiRecommendation.value = result
}

// Points 事件
function handlePrizeWon(payload: { prizeId: string; prizeName: string; prizeType: PrizeType }) {
  // 中獎加點
  if (payload.prizeType === 'points') {
    const prize = mockTasks.value ? undefined : undefined // 從 prizes 找 value
    // 簡易處理
  }
}
function handlePointsSpent(amount: number) {
  userPoints.value -= amount
}

// 社區報名
function handleRegister(payload: { eventId: string; type: 'community' | 'course' }) {
  // mock toast
}

// 興趣更新
function handleUpdateInterests(interests: string[]) {
  userInterests.value = interests
}

// 留言板
function handlePostCreated(payload: { content: string; tags: string[] }) {
  const newPost: BoardPost = {
    id: `post-${Date.now()}`,
    author: '我',
    avatar: 'linear-gradient(135deg, #ec4899, #be185d)',
    content: payload.content,
    tags: payload.tags,
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: 0,
    type: (payload.tags[0] as any) || 'discussion',
  }
  mockPosts.value.unshift(newPost)
}

function handleJoinTeam(postId: string) {
  const post = mockPosts.value.find(p => p.id === postId)
  if (post?.teamInfo && post.teamInfo.current < post.teamInfo.target) {
    post.teamInfo.current++
  }
}

function handleLikePost(postId: string) {
  const post = mockPosts.value.find(p => p.id === postId)
  if (post) post.likes++
}

// ─── Demo 控制面板 ───
const showDemo = ref(true)

function demoAiRecommend() {
  const result = matchIntent('這週末想出去玩')
  aiRecommendation.value = result
}

function demoSimulatePurchase() {
  handleTicketPurchased({
    eventId: 'evt-1',
    eventType: 'baseball',
    ticketType: '內野A區',
    quantity: 2,
    totalAmount: 1800,
    venue: '台南亞太國際棒球訓練中心',
    venueAddress: '台南市安南區安中路六段 505 號',
    date: '2026-08-02',
    time: '18:35',
  })
}

function demoSimulateSpin() {
  // 觸發轉盤（透過 ref 呼叫子元件不易，這裡直接扣點模擬）
  if (userPoints.value >= 50) {
    userPoints.value -= 50
    userPoints.value += 10 // 模擬中了 10 點
  }
}

function demoReset() {
  purchasedTickets.value = []
  crossModuleTicket.value = null
  aiRecommendation.value = null
  userPoints.value = 2450
  userInterests.value = ['攝影', '登山', '桌遊']
  mockPosts.value = mockPosts.value.filter(p => !p.id.startsWith('post-'))
  // 恢復預設貼文
  mockPosts.value = [
    { id: 'post-1', author: '小明', avatar: 'linear-gradient(135deg, #60a5fa, #3b82f6)', content: '有人這週六要一起去看統一獅比賽嗎？內野 A 區還有位子，想揪 3 個人一起！', tags: ['揪團'], createdAt: '2026-07-28T10:30:00', likes: 12, comments: 5, type: 'team-up', teamInfo: { eventName: '中信兄弟 vs 統一獅', date: '2026-08-02', current: 3, target: 6 } },
    { id: 'post-2', author: '阿花', avatar: 'linear-gradient(135deg, #f472b6, #ec4899)', content: '昨天去看 teamLab 超美的！推薦大家平日去比較不用排隊。', tags: ['心得'], createdAt: '2026-07-27T18:45:00', likes: 28, comments: 8, type: 'review' },
    { id: 'post-3', author: '咖啡控', avatar: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', content: '星巴克拉花教室有人去過嗎？', tags: ['討論'], createdAt: '2026-07-27T14:20:00', likes: 5, comments: 3, type: 'discussion' },
    { id: 'post-4', author: '運動咖', avatar: 'linear-gradient(135deg, #34d399, #10b981)', content: '信義社大的瑜伽課真的很讚。', tags: ['心得'], createdAt: '2026-07-26T09:15:00', likes: 15, comments: 4, type: 'review' },
  ]
}
</script>

<template>
  <div class="entertainment-module">
    <!-- 功能區塊快捷導航列 -->
    <nav class="entertainment-nav" aria-label="功能區塊導航">
      <div class="entertainment-nav-scroll">
        <button
          v-for="tab in navTabs"
          :key="tab.key"
          class="entertainment-nav-btn"
          :class="{ active: activeNav === tab.key }"
          :aria-current="activeNav === tab.key ? 'true' : undefined"
          @click="handleNavClick(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <main class="entertainment-page" role="main" aria-label="樂模組">
      <!-- AI 週末/休閒提案（所有頁面都顯示） -->
      <EntertainmentAiSuggestion
        :recommendation="aiRecommendation"
        @go-purchase="handleAiGoPurchase"
        @dismiss="dismissRecommendation"
        @refresh="handleAiRefresh"
      />

      <!-- 活動（原票務） -->
      <template v-if="activeNav === 'ticket'">
        <EntertainmentTicketCenter
          :events="mockEvents"
          :experiences="mockExperiences"
          @ticket-purchased="handleTicketPurchased"
        />
        <EntertainmentCrossModuleLink
          v-if="crossModuleTicket && crossModuleTicket.status === 'unused'"
          :ticket="crossModuleTicket"
          :coupons="mockCoupons"
        />
        <section v-if="purchasedTickets.length > 0" class="my-tickets">
          <div class="section-header">
            <h2 class="section-title">我的票券</h2>
            <span class="section-count">{{ purchasedTickets.length }} 張</span>
          </div>
          <div class="ticket-list">
            <EntertainmentTicketCard
              v-for="ticket in purchasedTickets"
              :key="ticket.id"
              :ticket="ticket"
            />
          </div>
        </section>
      </template>

      <!-- 推薦 -->
      <template v-if="activeNav === 'recommend'">
        <EntertainmentInterestMatch
          :user-interests="userInterests"
          :matched-groups="mockMatchedGroups"
          @join-group="() => {}"
          @update-interests="handleUpdateInterests"
        />
      </template>

      <!-- 點數 -->
      <template v-if="activeNav === 'points'">
        <EntertainmentPointsGame
          :user-points="userPoints"
          :daily-free-used="dailyFreeUsed"
          :tasks="mockTasks"
          @prize-won="handlePrizeWon"
          @points-spent="handlePointsSpent"
        />
      </template>

      <!-- 社區 -->
      <template v-if="activeNav === 'community'">
        <EntertainmentCommunityEvents
          :community-events="mockCommunityEvents"
          :courses="mockCourses"
          @register="handleRegister"
        />
      </template>

      <!-- 社群 -->
      <template v-if="activeNav === 'board'">
        <EntertainmentCommunityBoard
          :posts="mockPosts"
          @post-created="handlePostCreated"
          @join-team="handleJoinTeam"
          @like-post="handleLikePost"
        />
      </template>

      <!-- 獎章 -->
      <template v-if="activeNav === 'badge'">
        <EntertainmentAchievementWall :badges="mockBadges" />
      </template>
    </main>

    <!-- Demo 控制面板 -->
    <div v-if="showDemo" class="demo-panel">
      <button class="demo-btn" @click="demoAiRecommend">🤖 AI 推薦</button>
      <button class="demo-btn" @click="demoSimulatePurchase">🎫 模擬購票</button>
      <button class="demo-btn" @click="demoSimulateSpin">🎰 模擬抽獎</button>
      <button class="demo-btn reset" @click="demoReset">🔄 重設</button>
    </div>
  </div>
</template>

<style scoped>
/* 樂模組作用域 Token 覆寫 */
.entertainment-module {
  --color-primary: #ec4899;
  --color-primary-light: #fdf2f8;
  --color-secondary: #8b5cf6;
  --color-secondary-light: #f5f3ff;
}

.entertainment-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* 功能區塊快捷導航列 */
.entertainment-nav {
  position: sticky;
  top: 50px;
  z-index: 50;
  background: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  padding: var(--space-2, 8px) var(--space-4, 16px);
}

.entertainment-nav-scroll {
  display: flex;
  gap: var(--space-2, 8px);
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.entertainment-nav-scroll::-webkit-scrollbar { display: none; }

.entertainment-nav-btn {
  flex-shrink: 0;
  padding: var(--space-2, 8px) var(--space-4, 16px);
  min-height: 40px;
  border: 1.5px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  background: var(--color-bg-card, #ffffff);
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.15s ease;
}

.entertainment-nav-btn.active {
  color: #ffffff;
  background-color: var(--color-primary, #ec4899);
  border-color: var(--color-primary, #ec4899);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
}

.entertainment-nav-btn:not(.active):hover {
  border-color: var(--color-primary, #ec4899);
  color: var(--color-primary, #ec4899);
}

.entertainment-nav-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* 我的票券 */
.my-tickets {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3, 12px);
}

.section-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin: 0;
}

.section-count {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
  background: var(--color-primary-light, #fdf2f8);
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

.ticket-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

/* Demo 控制面板 */
.demo-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-bg-card, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-3, 12px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.demo-btn {
  padding: 8px 12px;
  min-height: 36px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  background: #ffffff;
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.demo-btn:hover { background: var(--color-primary-light, #fdf2f8); }
.demo-btn.reset { color: #ef4444; border-color: #fecaca; }
.demo-btn.reset:hover { background: #fef2f2; }
</style>
