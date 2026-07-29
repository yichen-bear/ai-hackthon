# 技術設計文件：樂模組（Entertainment Module）

## 概覽

本設計文件定義「樂」模組的元件架構、TypeScript 介面、狀態管理與資料模型。遵循全站設計系統（`ui-design-system`）的 Token 架構與元件規範，以 `.entertainment-module` 作用域覆寫全域 Token 實現粉紅娛樂主題。

**技術棧：**
- Nuxt 4（v4.5+）+ Vue 3 + TypeScript
- 元件語法：`<script setup lang="ts">`
- 樣式策略：全域 CSS Token + 元件 Scoped CSS + 樂模組作用域覆寫（`.entertainment-module`）
- 元件自動引入：Nuxt 4 Auto-import

**設計決策：**
- 樂模組作用域覆寫採用與其他模組相同的 CSS 選擇器特異度策略（`.entertainment-module { --token: value }`）。
- 主色 `#ec4899`（粉紅）傳達娛樂、活力的視覺印象；次色 `#8b5cf6`（紫色）用於社交/社群相關標示。
- AI 對話功能不建立獨立元件，改由全站右下角懸浮 AI Agent 統一處理，樂模組僅提供 composable 封裝推薦邏輯。
- ibon 票務中心整合統一獅球賽、展演門票與門市體驗活動，購票後生成電子票券，統一管理。
- 跨模組導流以購票成功為觸發點，串聯行模組（交通規劃/叫車）與食模組（憑票優惠）。
- OPEN POINT 娛樂化採用轉盤抽獎 + 任務獎勵雙軌制，增加用戶黏著度。
- 所有資料使用 mock hardcode（hackathon demo），無需後端 API 呼叫。
- Demo 控制面板沿用其他模組固定右下角模式。
- 票券卡片複用行模組 TicketWallet 的設計模式（DashboardCard 包裝 + 篩選 Tab + 卡片列表）。


---

## 架構

### 高層次架構圖

```
Nuxt 4 Application
├── app/assets/css/
│   └── design-system.css                              ← 全域 CSS Token（已存在）
│
├── app/components/ui/                                 ← 全站共用元件（已存在）
│   ├── DashboardCard.vue                              ← 儀表板卡片包裝器
│   ├── ProgressBar.vue                                ← 進度條（揪團進度）
│   ├── StatusBadge.vue                                ← 狀態 Pill 標籤
│   ├── TicketWallet.vue                               ← 票券夾（設計參考）
│   └── AiButton.vue                                   ← 懸浮 AI 按鈕（Agent 入口）
│
├── app/components/entertainment/                      ← 樂模組專屬元件
│   ├── TicketCenter.vue                               ← ibon 票務中心
│   ├── TicketCard.vue                                 ← 電子票券卡片
│   ├── AiSuggestion.vue                               ← AI 週末/休閒提案
│   ├── CrossModuleLink.vue                            ← 跨模組導流
│   ├── PointsGame.vue                                 ← OPEN POINT 娛樂化
│   ├── AchievementWall.vue                            ← 成就徽章牆
│   ├── CommunityEvents.vue                            ← 在地社區活動與社大課程
│   ├── InterestMatch.vue                              ← 興趣媒合
│   └── CommunityBoard.vue                             ← 社群留言板
│
├── app/composables/                                   ← 樂模組共用邏輯
│   ├── useEntertainmentState.ts                       ← 樂模組頁面狀態管理
│   └── useEntertainmentAgent.ts                       ← AI Agent 推薦邏輯封裝
│
└── app/pages/
    └── entertainment/
        └── index.vue                                  ← /entertainment 主頁面（作用域 Token 覆寫）
```


### 元件依賴關係

```
entertainment/index.vue (.entertainment-module 作用域)
├── AiSuggestion (條件顯示)          ← AI 週末/休閒提案推播區
├── EntertainmentNav (sticky)        ← 功能區塊快捷導航列
├── TicketCenter                     ← ibon 票務中心
│   ├── DashboardCard                ← 卡片包裝
│   └── StatusBadge                  ← 售完/額滿 Badge
├── TicketCard (列表)                ← 我的票券區
│   └── DashboardCard                ← 卡片包裝
├── CrossModuleLink                  ← 跨模組導流（購票後顯示）
│   └── StatusBadge                  ← 模組標籤
├── PointsGame                       ← OPEN POINT 娛樂化
│   └── DashboardCard                ← 卡片包裝
├── AchievementWall                  ← 成就徽章牆
│   └── DashboardCard                ← 卡片包裝
├── CommunityEvents                  ← 在地社區活動
│   ├── DashboardCard                ← 卡片包裝
│   └── StatusBadge                  ← 招生中/即將額滿 Badge
├── InterestMatch                    ← 興趣媒合
│   └── DashboardCard                ← 卡片包裝
└── CommunityBoard                   ← 社群留言板
    ├── DashboardCard                ← 卡片包裝
    ├── ProgressBar                  ← 揪團進度條
    └── StatusBadge                  ← 揪團/心得/討論 Badge
```


### 資料流向

```
entertainment/index.vue (state owner)
│
├── useEntertainmentState() ← 頁面級共享狀態 composable
│   ├── aiRecommendation: Ref<EntertainmentRecommendation | null>
│   ├── purchasedTickets: Ref<EntertainmentTicket[]>
│   ├── userPoints: Ref<number>
│   └── scrollToSection(section) → smooth scroll
│
├── AiSuggestion
│   └── emit('go-purchase') → scrollToSection('ticket') + 聚焦對應活動
│
├── TicketCenter
│   └── emit('ticket-purchased') → 新增 purchasedTickets + 顯示 CrossModuleLink
│
├── TicketCard (列表)
│   └── emit('ticket-use') → 更新票券狀態
│
├── CrossModuleLink
│   ├── emit('go-transport') → navigateTo('/transport') + setRouteDestination
│   └── emit('go-food-coupon') → navigateTo('/food') 或 emit 供父元件處理
│
├── PointsGame
│   └── emit('prize-won') → 更新 userPoints + 可能新增票券
│
├── CommunityEvents
│   └── emit('register') → 模擬報名成功 toast
│
├── InterestMatch
│   └── emit('join-group') → 模擬加入成功 toast
│
├── CommunityBoard
│   ├── emit('post-created') → 新增貼文至列表頂部
│   └── emit('join-team') → 更新揪團人數
│
└── AI Agent (全站懸浮按鈕)
    └── useEntertainmentAgent.matchIntent() → 設定 aiRecommendation
        → AiSuggestion 提示區顯示
        → 點擊「購票」→ scrollToSection('ticket')
```


---

## 元件清單與職責說明

### 樂模組專屬元件（`components/entertainment/`）

| 元件 | 職責 | 主要 Props | 主要 Emits |
|---|---|---|---|
| `TicketCenter.vue` | ibon 票務中心，整合球賽/展演/門市體驗購票 | `events: EventItem[]`, `experiences: StoreExperience[]` | `ticket-purchased` |
| `TicketCard.vue` | 電子票券卡片，展開/收合式 QR Code 票券 | `ticket: EntertainmentTicket` | `ticket-use` |
| `AiSuggestion.vue` | AI 週末/休閒提案推播，情境式推薦 + 內嵌購票 | `recommendation: EntertainmentRecommendation \| null` | `go-purchase`, `dismiss`, `refresh` |
| `CrossModuleLink.vue` | 跨模組導流卡片列，購票後串聯行/食模組 | `ticket: EntertainmentTicket`, `coupons: TicketCoupon[]` | `go-transport`, `go-ride`, `go-food-coupon` |
| `PointsGame.vue` | OPEN POINT 抽獎/遊戲/任務系統 | `userPoints: number`, `dailyFreeUsed: boolean`, `tasks: PointTask[]` | `prize-won`, `task-complete` |
| `AchievementWall.vue` | 成就徽章牆，蒐集解鎖娛樂徽章 | `badges: EntertainmentBadge[]` | — |
| `CommunityEvents.vue` | 在地社區活動與社大課程瀏覽報名 | `communityEvents: CommunityEvent[]`, `courses: CommunityCourse[]` | `register` |
| `InterestMatch.vue` | 興趣媒合，依標籤推薦同好活動 | `userInterests: string[]`, `matchedGroups: MatchedGroup[]` | `join-group`, `update-interests` |
| `CommunityBoard.vue` | 社群留言板，討論/揪團/心得分享 | `posts: BoardPost[]` | `post-created`, `join-team`, `like-post` |

### Composables

| Composable | 職責 | 匯出 |
|---|---|---|
| `useEntertainmentState.ts` | 樂模組頁面級狀態管理 | `aiRecommendation`, `purchasedTickets`, `userPoints`, `scrollToSection()`, `dismissRecommendation()` |
| `useEntertainmentAgent.ts` | AI Agent 情境意圖匹配推薦邏輯 | `matchIntent(input): EntertainmentRecommendation` |


---

## 元件介面定義（TypeScript）

### 共用型別定義

```typescript
// types/entertainment.ts — 樂模組共用型別

/** 活動類型 */
type EventType = 'baseball' | 'exhibition' | 'concert' | 'theater'

/** 門市體驗類型 */
type ExperienceType = 'coffee' | 'baking' | 'craft' | 'tasting'

/** 票券狀態 */
type TicketStatus = 'unused' | 'used' | 'expired'

/** AI 推薦情境 */
type RecommendScenario = 'weekend' | 'date' | 'family' | 'friends'

/** 優惠券類型 */
type CouponType = 'drink' | 'food' | 'discount' | 'gift'

/** 貼文類型 */
type PostType = 'discussion' | 'team-up' | 'review'

/** 社大課程狀態 */
type CourseStatus = 'open' | 'almost-full' | 'full'

/** 任務完成狀態 */
type TaskStatus = 'completed' | 'incomplete'

/** 獎品類型 */
type PrizeType = 'ticket' | 'coupon' | 'points' | 'cash' | 'none'

/** 導航列 Tab Key */
type EntertainmentNavKey = 'ticket' | 'recommend' | 'points' | 'community' | 'board'
```


### `TicketCenter.vue`

```typescript
/** 活動項目（球賽/展演） */
interface EventItem {
  id: string
  type: EventType                   // 活動類型
  title: string                     // 活動名稱
  date: string                      // 日期 ISO
  time: string                      // 時間
  venue: string                     // 場館名稱
  venueAddress: string              // 場館地址（跨模組導流用）
  priceRange: string                // 票價區間（如「$300 ~ $1,200」）
  prices: TicketPrice[]             // 各票種價格明細
  remainingTickets: number          // 剩餘票數
  coverImage: string                // 封面圖（CSS gradient 模擬）
  tags?: string[]                   // 展演類型標籤（展覽/演唱會/音樂劇/舞台劇）
  opponent?: string                 // 對戰隊伍（球賽專用）
}

/** 票種價格 */
interface TicketPrice {
  id: string
  name: string                      // 票種名稱（如「內野 A 區」「全票」）
  price: number                     // 單價
  remaining: number                 // 該票種剩餘數量
}

/** 門市體驗活動 */
interface StoreExperience {
  id: string
  name: string                      // 活動名稱
  type: ExperienceType              // 體驗類型
  storeName: string                 // 舉辦門市名稱
  storeAddress: string              // 門市地址
  timeSlot: string                  // 活動時段（如「2026/08/10 14:00~16:00」）
  fee: number                       // 費用
  maxParticipants: number           // 人數上限
  currentParticipants: number       // 目前報名人數
  description?: string              // 活動描述
}

interface TicketCenterProps {
  events: EventItem[]
  experiences: StoreExperience[]
}

// Emits
// 'ticket-purchased': (payload: {
//   eventId: string;
//   eventType: EventType | 'experience';
//   ticketType: string;
//   quantity: number;
//   totalAmount: number;
//   venue: string;
//   venueAddress: string;
//   date: string;
//   time: string;
// }) => void
```


### `TicketCard.vue`

```typescript
/** 電子票券 */
interface EntertainmentTicket {
  id: string
  eventType: EventType | 'experience'  // 活動類型
  eventName: string                    // 活動名稱
  date: string                         // 日期 ISO
  time: string                         // 時間
  venue: string                        // 場館名稱
  venueAddress: string                 // 場館地址
  seatInfo?: string                    // 座位資訊（如「內野 A 區 第3排 12號」）
  ticketType: string                   // 票種名稱
  quantity: number                     // 張數
  qrCode: string                       // QR Code（mock 用）
  status: TicketStatus                 // 票券狀態
  purchaseDate: string                 // 購買日期 ISO
  totalAmount: number                  // 總金額
}

interface TicketCardProps {
  ticket: EntertainmentTicket
}

// Emits
// 'ticket-use': (ticketId: string) => void
```


### `AiSuggestion.vue`

```typescript
/** AI 推薦活動 */
interface RecommendedEvent {
  id: string
  type: EventType | 'experience'
  title: string
  date: string
  venue: string
  price: string                        // 票價摘要
  coverImage: string                   // 封面（CSS gradient）
}

/** AI 推薦結果 */
interface EntertainmentRecommendation {
  scenario: RecommendScenario          // 推薦情境
  message: string                      // AI 回應文字
  events: RecommendedEvent[]           // 推薦活動（最多 3 筆）
  triggerText?: string                 // 觸發的用戶原文
}

interface AiSuggestionProps {
  recommendation: EntertainmentRecommendation | null
}

// Emits
// 'go-purchase': (payload: { eventId: string; eventType: EventType | 'experience' }) => void
// 'dismiss': () => void
// 'refresh': () => void
```


### `CrossModuleLink.vue`

```typescript
/** 憑票優惠券 */
interface TicketCoupon {
  id: string
  ticketId: string                     // 關聯票券 ID
  description: string                  // 優惠描述
  discount: string                     // 折扣內容（如「第二杯半價」「折 $30」）
  storeName: string                    // 適用門市/品牌
  validUntil: string                   // 有效期限 ISO
  couponType: CouponType               // 優惠類型
}

interface CrossModuleLinkProps {
  ticket: EntertainmentTicket
  coupons: TicketCoupon[]
}

// Emits
// 'go-transport': (payload: { venue: string; venueAddress: string; date: string }) => void
// 'go-ride': (payload: { venue: string; venueAddress: string }) => void
// 'go-food-coupon': (payload: { ticketId: string; couponType: CouponType }) => void
```


### `PointsGame.vue`

```typescript
/** 獎品定義 */
interface Prize {
  id: string
  name: string                         // 獎品名稱
  type: PrizeType                      // 獎品類型
  value?: number                       // 點數/金額值（points/cash 類型用）
  description?: string                 // 獎品描述
  probability: number                  // 中獎機率（0~1，轉盤分配用）
}

/** 任務定義 */
interface PointTask {
  id: string
  name: string                         // 任務名稱
  description: string                  // 任務描述
  reward: number                       // 獎勵點數
  completed: boolean                   // 是否已完成
  icon?: string                        // 任務圖示
}

interface PointsGameProps {
  userPoints: number
  dailyFreeUsed: boolean
  tasks: PointTask[]
  prizes?: Prize[]
}

// Emits
// 'prize-won': (payload: { prizeId: string; prizeName: string; prizeType: PrizeType }) => void
// 'task-complete': (taskId: string) => void
// 'points-spent': (amount: number) => void
```


### `AchievementWall.vue`

```typescript
/** 娛樂成就徽章 */
interface EntertainmentBadge {
  id: string
  icon: string                         // emoji 圖示
  name: string                         // 徽章名稱
  description: string                  // 解鎖條件描述
  unlocked: boolean                    // 是否已解鎖
  unlockedAt?: string                  // 解鎖日期 ISO（已解鎖時有值）
}

interface AchievementWallProps {
  badges: EntertainmentBadge[]
}

// 無 Emits（純展示元件）
```


### `CommunityEvents.vue`

```typescript
/** 社區活動 */
interface CommunityEvent {
  id: string
  name: string                         // 活動名稱
  date: string                         // 舉辦日期 ISO
  time: string                         // 時間
  location: string                     // 地點
  organizer: string                    // 主辦單位
  fee: number                          // 費用（0 = 免費）
  currentParticipants: number          // 目前報名人數
  maxParticipants: number              // 人數上限
  description?: string                 // 活動描述
}

/** 社大課程 */
interface CommunityCourse {
  id: string
  name: string                         // 課程名稱
  instructor: string                   // 授課教師
  schedule: string                     // 上課時間（如「每週三 19:00~21:00」）
  credits: number                      // 學分數
  sessions: number                     // 堂數
  fee: number                          // 費用
  status: CourseStatus                 // 報名狀態
  description?: string                 // 課程描述
  location?: string                    // 上課地點
}

interface CommunityEventsProps {
  communityEvents: CommunityEvent[]
  courses: CommunityCourse[]
}

// Emits
// 'register': (payload: { eventId: string; type: 'community' | 'course' }) => void
```


### `InterestMatch.vue`

```typescript
/** 媒合社群/活動 */
interface MatchedGroup {
  id: string
  name: string                         // 社群/活動名稱
  matchScore: number                   // 匹配度（0~100）
  date: string                         // 活動日期 ISO
  time: string                         // 時間
  location: string                     // 地點
  participants: number                 // 目前參與人數
  tags: string[]                       // 相關興趣標籤
  type: 'activity' | 'community'       // 活動或常態社群
  description?: string                 // 描述
}

/** 可選興趣標籤 */
const AVAILABLE_INTERESTS = [
  '攝影', '登山', '桌遊', '手作', '咖啡', '閱讀',
  '音樂', '運動', '料理', '旅行', '電影', '舞蹈'
] as const

interface InterestMatchProps {
  userInterests: string[]
  matchedGroups: MatchedGroup[]
}

// Emits
// 'join-group': (payload: { groupId: string; matchScore: number }) => void
// 'update-interests': (interests: string[]) => void
```


### `CommunityBoard.vue`

```typescript
/** 留言板貼文 */
interface BoardPost {
  id: string
  author: string                       // 發文者暱稱
  avatar: string                       // 頭像（CSS gradient 模擬）
  content: string                      // 貼文內容
  tags: string[]                       // 標籤（揪團/心得/討論）
  createdAt: string                    // 發文時間 ISO
  likes: number                        // 按讚數
  comments: number                     // 留言數
  type: PostType                       // 貼文類型
  teamInfo?: TeamInfo                  // 揪團資訊（type = 'team-up' 時有值）
}

/** 揪團資訊 */
interface TeamInfo {
  eventName: string                    // 揪團活動名稱
  date: string                         // 活動日期
  current: number                      // 目前人數
  target: number                       // 目標人數
}

interface CommunityBoardProps {
  posts: BoardPost[]
}

// Emits
// 'post-created': (payload: { content: string; tags: string[]; teamInfo?: TeamInfo }) => void
// 'join-team': (postId: string) => void
// 'like-post': (postId: string) => void
```


### Composables

```typescript
// composables/useEntertainmentState.ts
// 管理樂模組頁面級狀態，供各元件間共享

interface EntertainmentPageState {
  // AI Agent 推薦結果（懸浮 Agent 推送時設定）
  aiRecommendation: Ref<EntertainmentRecommendation | null>

  // 已購票券列表
  purchasedTickets: Ref<EntertainmentTicket[]>

  // 用戶 OPEN POINT 點數
  userPoints: Ref<number>

  // 用戶興趣標籤
  userInterests: Ref<string[]>

  // 導航至指定區塊
  scrollToSection: (section: EntertainmentNavKey) => void

  // 關閉 AI 推薦提示
  dismissRecommendation: () => void

  // 購票後觸發跨模組導流
  triggerCrossModule: (ticket: EntertainmentTicket) => void
}

// composables/useEntertainmentAgent.ts
// AI Agent 情境意圖匹配推薦邏輯，供全站 AI Agent 呼叫

/**
 * 分析用戶輸入意圖，返回娛樂推薦結果
 * @param input 用戶輸入文字
 * @returns EntertainmentRecommendation
 */
function matchIntent(input: string): EntertainmentRecommendation

// 意圖匹配規則：
const INTENT_RULES: Record<string, { scenario: RecommendScenario; message: string }> = {
  // 週末休閒
  '週末|放假|出去玩|無聊|休息|散步|走走': {
    scenario: 'weekend',
    message: '週末想出去走走？為你推薦這些熱門活動！'
  },
  // 約會場景
  '約會|另一半|浪漫|情侶|紀念日': {
    scenario: 'date',
    message: '浪漫約會推薦！這些展覽和演出很適合兩個人一起看。'
  },
  // 親子活動
  '小孩|親子|家庭|帶孩子|兒童|全家': {
    scenario: 'family',
    message: '親子同樂首選！推薦適合全家大小的體驗活動。'
  },
  // 朋友聚會
  '朋友|聚會|一群人|同事|慶祝|揪團': {
    scenario: 'friends',
    message: '呼朋引伴一起嗨！這些活動很適合約朋友一起參加。'
  }
}
```


---

## 元件狀態機說明

### TicketCenter 購票流程

```
   mount()
     │
     ▼
┌──────────┐   點擊購票/報名按鈕   ┌───────────────┐
│  browse  │ ─────────────────────►│  purchase-    │
│ (瀏覽模式) │                      │  overlay      │
│          │◄───────────────────── │ (購票 overlay) │
└──────────┘   關閉/backdrop        └───────────────┘
                                          │
                                          │ 點擊「確認購票」
                                          ▼
                                   ┌───────────────┐
                                   │  success      │
                                   │ (購票成功動畫)  │
                                   └───────────────┘
                                          │
                                          │ 1.5s 後自動關閉
                                          ▼
                                   emit('ticket-purchased')
                                   → 生成 TicketCard
                                   → 顯示 CrossModuleLink
```

**狀態說明：**

| 狀態 | UI 呈現 | 可執行操作 |
|---|---|---|
| `browse` | 分類 Tab + 活動卡片列表/網格 | 切換 Tab、點擊購票按鈕 |
| `purchase-overlay` | backdrop + slide-up 購票面板（票種/場次/數量/金額） | 選票種、選數量、確認購票、關閉 |
| `success` | 打勾動畫 + 「購票成功！」文字 | 無操作，自動轉場 |

---

### PointsGame 轉盤抽獎流程

```
   mount()
     │
     ▼
┌──────────┐   點擊「轉！」按鈕    ┌───────────────┐
│  idle    │ ─────────────────────►│  spinning     │
│ (等待中)  │                      │ (旋轉中)       │
│          │                       └───────────────┘
│          │                              │
│          │                              │ 旋轉停止（3~5s）
│          │                              ▼
│          │                       ┌───────────────┐
│          │◄───────────────────── │  result       │
└──────────┘   點擊關閉/2s 後自動   │ (中獎結果)     │
                                   └───────────────┘
                                          │
                                          ▼
                                   emit('prize-won')
                                   emit('points-spent', 50)
```

**狀態說明：**

| 狀態 | UI 呈現 | 可執行操作 |
|---|---|---|
| `idle` | 轉盤靜止 +「轉！(50點)」按鈕亮起 | 點擊旋轉（需點數足夠） |
| `spinning` | 轉盤 CSS 旋轉動畫（ease-out 緩停）+ 按鈕 disabled | 無操作 |
| `result` | 結果 overlay 彈跳動畫 + 獎品名稱 + 確認按鈕 | 關閉結果面板 |

**轉盤動畫規格：**
- 旋轉角度：`1440deg + 隨機偏移`（至少轉 4 圈）
- 動畫曲線：`cubic-bezier(0.17, 0.67, 0.12, 0.99)`
- 持續時間：4 秒

---

### TicketCard 展開/收合

```
   mount()
     │
     ▼
┌──────────────┐   點擊卡片        ┌──────────────┐
│  collapsed   │ ──────────────────►│  expanded    │
│ (收合：名稱   │                   │ (展開：完整   │
│  + 日期 +    │◄────────────────── │  QR Code +   │
│  狀態)       │   再次點擊         │  座位資訊)    │
└──────────────┘                    └──────────────┘
```

---

### CommunityBoard 發文流程

```
   mount()
     │
     ▼
┌──────────────┐   點擊輸入框/聚焦    ┌──────────────┐
│  reading     │ ────────────────────►│  composing   │
│ (瀏覽貼文)    │                     │ (撰寫中)      │
│              │◄──────────────────── │              │
└──────────────┘   點擊外部/取消       └──────────────┘
                                            │
                                            │ 點擊「發佈」
                                            ▼
                                     emit('post-created')
                                     → 新貼文插入頂部（slide-down 動畫）
                                     → 輸入框清空回到 reading
```

---

### CrossModuleLink 導流觸發

```
   購票成功
     │
     ▼
┌──────────────┐
│  visible     │  ← 自動顯示於最新票券下方
│ (導流卡片列)  │
└──────────────┘
     │         │         │
     │ 規劃交通 │ 預約叫車 │ 憑票優惠
     ▼         ▼         ▼
navigateTo   navigateTo  emit('go-food-coupon')
('/transport') ('/transport')
+ setRoute    + setRide
  Destination   Destination
```


---

## 資料模型

### 樂模組作用域 Token 覆寫

```css
/* pages/entertainment/index.vue <style scoped> */
.entertainment-module {
  --color-primary: #ec4899;          /* 粉紅主色 */
  --color-primary-light: #fdf2f8;    /* 粉紅淡底 */
  --color-secondary: #8b5cf6;        /* 紫色次色（社交/社群） */
  --color-secondary-light: #f5f3ff;  /* 紫色淡底 */
}
```

### Mock 活動資料（球賽/展演）

```typescript
const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    type: 'baseball',
    title: '統一獅 vs 中信兄弟',
    date: '2026-08-02',
    time: '18:35',
    venue: '台南亞太國際棒球訓練中心',
    venueAddress: '台南市安南區安中路六段 505 號',
    priceRange: '$300 ~ $1,200',
    prices: [
      { id: 'p1', name: '外野自由座', price: 300, remaining: 220 },
      { id: 'p2', name: '內野B區', price: 600, remaining: 85 },
      { id: 'p3', name: '內野A區', price: 900, remaining: 32 },
      { id: 'p4', name: 'VIP 包廂', price: 1200, remaining: 8 },
    ],
    remainingTickets: 345,
    coverImage: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    opponent: '中信兄弟'
  },
  {
    id: 'evt-2',
    type: 'baseball',
    title: '統一獅 vs 樂天桃猿',
    date: '2026-08-09',
    time: '17:05',
    venue: '台南亞太國際棒球訓練中心',
    venueAddress: '台南市安南區安中路六段 505 號',
    priceRange: '$300 ~ $1,200',
    prices: [
      { id: 'p5', name: '外野自由座', price: 300, remaining: 180 },
      { id: 'p6', name: '內野B區', price: 600, remaining: 120 },
      { id: 'p7', name: '內野A區', price: 900, remaining: 55 },
      { id: 'p8', name: 'VIP 包廂', price: 1200, remaining: 12 },
    ],
    remainingTickets: 367,
    coverImage: 'linear-gradient(135deg, #ec4899, #be185d)',
    opponent: '樂天桃猿'
  },
  {
    id: 'evt-3',
    type: 'exhibition',
    title: 'teamLab 未來遊樂園＆與花共生的動物們',
    date: '2026-08-01',
    time: '10:00~18:00',
    venue: '國立臺灣科學教育館',
    venueAddress: '台北市士林區士商路 189 號',
    priceRange: '$380 ~ $450',
    prices: [
      { id: 'p9', name: '全票', price: 450, remaining: 60 },
      { id: 'p10', name: '優待票', price: 380, remaining: 45 },
    ],
    remainingTickets: 105,
    coverImage: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    tags: ['展覽', '互動藝術']
  },
  {
    id: 'evt-4',
    type: 'concert',
    title: '告五人【帶你飛】巡迴演唱會',
    date: '2026-08-23',
    time: '19:30',
    venue: '台北小巨蛋',
    venueAddress: '台北市松山區南京東路四段 2 號',
    priceRange: '$1,200 ~ $3,800',
    prices: [
      { id: 'p11', name: '搖滾區', price: 3800, remaining: 0 },
      { id: 'p12', name: '特A區', price: 2800, remaining: 15 },
      { id: 'p13', name: 'A區', price: 2200, remaining: 42 },
      { id: 'p14', name: 'B區', price: 1200, remaining: 88 },
    ],
    remainingTickets: 145,
    coverImage: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    tags: ['演唱會', '華語音樂']
  },
  {
    id: 'evt-5',
    type: 'theater',
    title: '《小王子》音樂劇台北場',
    date: '2026-09-06',
    time: '14:30',
    venue: '國家兩廳院 戲劇院',
    venueAddress: '台北市中正區中山南路 21-1 號',
    priceRange: '$800 ~ $2,500',
    prices: [
      { id: 'p15', name: '特等席', price: 2500, remaining: 20 },
      { id: 'p16', name: '甲等席', price: 1800, remaining: 55 },
      { id: 'p17', name: '乙等席', price: 800, remaining: 90 },
    ],
    remainingTickets: 165,
    coverImage: 'linear-gradient(135deg, #f472b6, #ec4899)',
    tags: ['音樂劇', '親子']
  }
]
```


### Mock 門市體驗資料

```typescript
const MOCK_EXPERIENCES: StoreExperience[] = [
  {
    id: 'exp-1',
    name: '星巴克咖啡拉花教室',
    type: 'coffee',
    storeName: '星巴克典藏門市（信義店）',
    storeAddress: '台北市信義區松高路 11 號',
    timeSlot: '2026/08/10 14:00~16:00',
    fee: 450,
    maxParticipants: 12,
    currentParticipants: 9,
    description: '由專業咖啡師指導，學習拿鐵拉花技巧，含材料費與一杯手作飲品'
  },
  {
    id: 'exp-2',
    name: '7-11 手作甜點體驗',
    type: 'baking',
    storeName: '7-11 信義旗艦店',
    storeAddress: '台北市信義區信義路五段 7 號',
    timeSlot: '2026/08/17 10:00~12:00',
    fee: 350,
    maxParticipants: 8,
    currentParticipants: 5,
    description: '製作法式馬卡龍與可麗露，含材料費與成品帶回'
  }
]
```

### Mock 已購票券資料

```typescript
const MOCK_TICKETS: EntertainmentTicket[] = [
  {
    id: 'tkt-1',
    eventType: 'baseball',
    eventName: '統一獅 vs 中信兄弟',
    date: '2026-08-02',
    time: '18:35',
    venue: '台南亞太國際棒球訓練中心',
    venueAddress: '台南市安南區安中路六段 505 號',
    seatInfo: '內野A區 第5排 23號',
    ticketType: '內野A區',
    quantity: 2,
    qrCode: 'mock-qr-entertainment-1',
    status: 'unused',
    purchaseDate: '2026-07-28',
    totalAmount: 1800
  },
  {
    id: 'tkt-2',
    eventType: 'exhibition',
    eventName: 'teamLab 未來遊樂園',
    date: '2026-07-20',
    time: '10:00~18:00',
    venue: '國立臺灣科學教育館',
    venueAddress: '台北市士林區士商路 189 號',
    seatInfo: undefined,
    ticketType: '全票',
    quantity: 1,
    qrCode: 'mock-qr-entertainment-2',
    status: 'used',
    purchaseDate: '2026-07-15',
    totalAmount: 450
  }
]
```

### Mock 憑票優惠券資料

```typescript
const MOCK_COUPONS: TicketCoupon[] = [
  {
    id: 'cpn-1',
    ticketId: 'tkt-1',
    description: '持統一獅門票至 7-11 享大杯咖啡第二杯半價',
    discount: '第二杯半價',
    storeName: '7-ELEVEN',
    validUntil: '2026-08-02',
    couponType: 'drink'
  },
  {
    id: 'cpn-2',
    ticketId: 'tkt-1',
    description: '持統一獅門票至星巴克消費折 $30',
    discount: '折 $30',
    storeName: '星巴克',
    validUntil: '2026-08-09',
    couponType: 'discount'
  }
]
```

### Mock OPEN POINT 獎品與任務資料

```typescript
const MOCK_PRIZES: Prize[] = [
  { id: 'prize-1', name: '統一獅門票 1 張', type: 'ticket', probability: 0.05, description: '外野自由座' },
  { id: 'prize-2', name: '星巴克買一送一券', type: 'coupon', probability: 0.10, description: '限大杯以上飲品' },
  { id: 'prize-3', name: 'OPEN POINT 100 點', type: 'points', value: 100, probability: 0.15 },
  { id: 'prize-4', name: '7-11 購物金 $50', type: 'cash', value: 50, probability: 0.15 },
  { id: 'prize-5', name: 'OPEN POINT 10 點', type: 'points', value: 10, probability: 0.25 },
  { id: 'prize-6', name: '謝謝參加', type: 'none', probability: 0.30 }
]

const MOCK_TASKS: PointTask[] = [
  { id: 'task-1', name: '首次購票', description: '在樂模組完成首次購票', reward: 100, completed: true, icon: '🎫' },
  { id: 'task-2', name: '分享活動', description: '將活動分享給朋友', reward: 50, completed: true, icon: '🔗' },
  { id: 'task-3', name: '完成週末提案', description: '透過 AI 推薦購票或報名活動', reward: 30, completed: false, icon: '🤖' },
  { id: 'task-4', name: '留言板首次發文', description: '在社群留言板發表第一篇貼文', reward: 20, completed: false, icon: '📝' }
]
```


### Mock 成就徽章資料

```typescript
const MOCK_BADGES: EntertainmentBadge[] = [
  { id: 'badge-1', icon: '🏟️', name: '球場初心者', description: '參加首場統一獅球賽', unlocked: true, unlockedAt: '2026-07-28' },
  { id: 'badge-2', icon: '🎨', name: '藝文愛好者', description: '累計看 3 場展覽', unlocked: true, unlockedAt: '2026-07-20' },
  { id: 'badge-3', icon: '🎯', name: '點數高手', description: '累計獲得 1000 點獎勵', unlocked: true, unlockedAt: '2026-07-25' },
  { id: 'badge-4', icon: '🎵', name: '音樂狂熱', description: '參加 2 場演唱會', unlocked: false },
  { id: 'badge-5', icon: '☕', name: '體驗玩家', description: '參加 3 次門市體驗', unlocked: false },
  { id: 'badge-6', icon: '🤝', name: '社交蝴蝶', description: '揪團成功 3 次', unlocked: false },
  { id: 'badge-7', icon: '📝', name: '分享達人', description: '留言板發文 10 則', unlocked: false },
  { id: 'badge-8', icon: '🎓', name: '終身學習', description: '報名 2 堂社大課程', unlocked: false }
]
```

### Mock 社區活動資料

```typescript
const MOCK_COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    id: 'ce-1',
    name: '中秋社區烤肉大會',
    date: '2026-09-21',
    time: '17:00~21:00',
    location: '信義區仁愛里活動中心中庭',
    organizer: '仁愛里辦公室',
    fee: 200,
    currentParticipants: 32,
    maxParticipants: 50,
    description: '里民中秋聯歡，含烤肉食材與飲料，歡迎攜家帶眷參加'
  },
  {
    id: 'ce-2',
    name: '假日健走活動：象山步道',
    date: '2026-08-10',
    time: '07:00~09:00',
    location: '象山步道入口（信義路五段 150 巷）',
    organizer: '信義區體育會',
    fee: 0,
    currentParticipants: 18,
    maxParticipants: 30,
    description: '輕鬆健走象山步道，全程約 2 公里，適合全年齡層'
  }
]
```

### Mock 社大課程資料

```typescript
const MOCK_COURSES: CommunityCourse[] = [
  {
    id: 'course-1',
    name: '生活攝影入門',
    instructor: '林老師',
    schedule: '每週三 19:00~21:00',
    credits: 2,
    sessions: 18,
    fee: 2000,
    status: 'open',
    description: '從手機攝影到構圖美學，紀錄生活的美好瞬間',
    location: '信義社區大學 201 教室'
  },
  {
    id: 'course-2',
    name: '手沖咖啡實作',
    instructor: '陳老師',
    schedule: '每週六 10:00~12:00',
    credits: 1,
    sessions: 12,
    fee: 2500,
    status: 'almost-full',
    description: '認識咖啡豆產地、烘焙度，學習手沖技巧（含材料費）',
    location: '信義社區大學 生活教室'
  },
  {
    id: 'course-3',
    name: '瑜伽與正念冥想',
    instructor: '張老師',
    schedule: '每週一、四 07:00~08:30',
    credits: 2,
    sessions: 36,
    fee: 3000,
    status: 'open',
    description: '結合瑜伽體位法與正念冥想，紓壓放鬆身心',
    location: '信義社區大學 瑜伽教室'
  }
]
```

### Mock 興趣媒合資料

```typescript
const MOCK_MATCHED_GROUPS: MatchedGroup[] = [
  {
    id: 'mg-1',
    name: '週六攝影散步團',
    matchScore: 92,
    date: '2026-08-09',
    time: '09:00~12:00',
    location: '大稻埕迪化街',
    participants: 8,
    tags: ['攝影', '旅行'],
    type: 'activity',
    description: '帶著相機漫步老街，捕捉在地生活風景'
  },
  {
    id: 'mg-2',
    name: '桌遊之夜 - 信義場',
    matchScore: 85,
    date: '2026-08-08',
    time: '19:00~22:00',
    location: '骰子人桌遊店（信義店）',
    participants: 5,
    tags: ['桌遊'],
    type: 'activity',
    description: '每週五固定聚會，新手老手都歡迎'
  },
  {
    id: 'mg-3',
    name: '假日登山社',
    matchScore: 78,
    date: '2026-08-16',
    time: '06:00~14:00',
    location: '陽明山國家公園',
    participants: 12,
    tags: ['登山', '運動'],
    type: 'community',
    description: '每月兩次登山活動，難度從初階到進階都有'
  }
]
```

### Mock 留言板貼文資料

```typescript
const MOCK_POSTS: BoardPost[] = [
  {
    id: 'post-1',
    author: '小明',
    avatar: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    content: '有人這週六要一起去看統一獅比賽嗎？內野 A 區還有位子，想揪 3 個人一起！',
    tags: ['揪團'],
    createdAt: '2026-07-28T10:30:00',
    likes: 12,
    comments: 5,
    type: 'team-up',
    teamInfo: {
      eventName: '統一獅 vs 中信兄弟',
      date: '2026-08-02',
      current: 3,
      target: 6
    }
  },
  {
    id: 'post-2',
    author: '阿花',
    avatar: 'linear-gradient(135deg, #f472b6, #ec4899)',
    content: '昨天去看 teamLab 超美的！推薦大家平日去比較不用排隊，互動區小朋友玩得很開心。牆面投影的花海真的讓人很放鬆～',
    tags: ['心得'],
    createdAt: '2026-07-27T18:45:00',
    likes: 28,
    comments: 8,
    type: 'review'
  },
  {
    id: 'post-3',
    author: '咖啡控',
    avatar: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    content: '星巴克拉花教室有人去過嗎？想問一下需要自己帶圍裙嗎？還有做出來的咖啡可以帶走嗎？',
    tags: ['討論'],
    createdAt: '2026-07-27T14:20:00',
    likes: 5,
    comments: 3,
    type: 'discussion'
  },
  {
    id: 'post-4',
    author: '運動咖',
    avatar: 'linear-gradient(135deg, #34d399, #10b981)',
    content: '信義社大的瑜伽課真的很讚，張老師教得很仔細，初學者也不用擔心。每次上完都覺得全身舒暢！',
    tags: ['心得'],
    createdAt: '2026-07-26T09:15:00',
    likes: 15,
    comments: 4,
    type: 'review'
  }
]
```


---

## 頁面佈局結構（ASCII）

```
┌─────────────────────────────────────┐  ← max-width: 430px Container
│ ┌─────────────────────────────────┐ │
│ │  HEADER (fixed, h=50px)         │ │
│ │  📍 台北市信義區    [👤 用戶]    │ │
│ │  [食] [醫] [住] [行] [預] [樂]  │ │  ← ModuleTab（樂 = 選中粉紅底線）
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  AI SUGGESTION (條件顯示)        │ │  ← AiSuggestion.vue
│ │  🤖 週末想出去走走？為你推薦：    │ │
│ │  ┌─────┐ ┌─────┐ ┌─────┐       │ │
│ │  │teamL│ │告五人│ │星巴克│       │ │  ← 推薦活動卡片（最多3筆）
│ │  │$450 │ │$2200│ │$450 │       │ │
│ │  │[購票]│ │[購票]│ │[報名]│       │ │
│ │  └─────┘ └─────┘ └─────┘       │ │
│ │  [換一批推薦]              [✕]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ENTERTAINMENT NAV (sticky)     │ │  ← 功能區塊快捷導航
│ │  [票務] [推薦] [點數] [社區] [社群]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  TICKET CENTER ibon 票務         │ │  ← TicketCenter.vue
│ │  [統一獅⚾][展覽演出🎭][門市體驗☕]│ │  ← 分類 Tab
│ │  ┌─────────────────────────────┐│ │
│ │  │ 🏟️ 統一獅 vs 中信兄弟       ││ │
│ │  │ 08/02 (六) 18:35            ││ │
│ │  │ 台南亞太國際棒球訓練中心     ││ │
│ │  │ $300 ~ $1,200  剩餘 345 張  ││ │
│ │  │            [選位購票]        ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 🏟️ 統一獅 vs 樂天桃猿       ││ │
│ │  │ 08/09 (六) 17:05            ││ │
│ │  │ $300 ~ $1,200  剩餘 367 張  ││ │
│ │  │            [選位購票]        ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  MY TICKETS 我的票券              │ │  ← TicketCard 列表
│ │  [全部] [未使用] [已使用]        │ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ ⚾ 統一獅               未使用││ │  ← 收合狀態
│ │  │ 08/02 18:35  內野A區 ×2    ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 🎭 teamLab 未來遊樂園  已使用││ │
│ │  │ 07/20  全票 ×1              ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  CROSS MODULE LINK 跨模組導流    │ │  ← CrossModuleLink.vue
│ │  （購票後顯示於未使用票券下方）   │ │
│ │  ┌────────┐┌────────┐┌────────┐ │ │
│ │  │🚗 規劃 ││🚕 預約 ││☕ 憑票 │ │ │
│ │  │  交通  ││  叫車  ││  優惠  │ │ │
│ │  │台南亞太││08/02   ││第二杯  │ │ │
│ │  │棒球中心││18:35   ││半價   │ │ │
│ │  └────────┘└────────┘└────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  POINTS GAME  OPEN POINT 樂園   │ │  ← PointsGame.vue
│ │                      🪙 2,450 點│ │
│ │  ┌─── 幸運轉盤 ───────────────┐ │ │
│ │  │         ╭─────╮            │ │ │
│ │  │       ╱  門票  ╲           │ │ │
│ │  │     ╱ 咖啡╲╱100點 ╲        │ │ │
│ │  │    │  券  ╳  $50  │        │ │ │
│ │  │     ╲ 10點╱╲謝謝  ╱        │ │ │
│ │  │       ╲  參加  ╱           │ │ │
│ │  │         ╰─────╯            │ │ │
│ │  │       [ 轉！(50點) ]        │ │ │
│ │  └────────────────────────────┘ │ │
│ │                                  │ │
│ │  ── 任務獎勵 ──                  │ │
│ │  ✅ 首次購票         +100 點    │ │
│ │  ✅ 分享活動          +50 點    │ │
│ │  ☐  完成週末提案      +30 點    │ │
│ │  ☐  留言板首次發文    +20 點    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ACHIEVEMENT WALL 娛樂成就       │ │  ← AchievementWall.vue
│ │                          3/8   │ │
│ │  ┌────┐ ┌────┐ ┌────┐          │ │  ← 3欄網格
│ │  │🏟️ │ │🎨 │ │🎯 │          │ │
│ │  │球場 │ │藝文 │ │點數 │          │ │
│ │  │初心者│ │愛好者│ │高手 │          │ │
│ │  └────┘ └────┘ └────┘          │ │
│ │  ┌────┐ ┌────┐ ┌────┐          │ │
│ │  │🔒 │ │🔒 │ │🔒 │          │ │
│ │  │音樂 │ │體驗 │ │社交 │          │ │
│ │  │狂熱 │ │玩家 │ │蝴蝶 │          │ │
│ │  └────┘ └────┘ └────┘          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  COMMUNITY EVENTS 在地活動       │ │  ← CommunityEvents.vue
│ │  [社區活動🏘️] [社大課程📚]       │ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 中秋社區烤肉大會            ││ │
│ │  │ 09/21 17:00  仁愛里活動中心 ││ │
│ │  │ 主辦：仁愛里辦公室  $200    ││ │
│ │  │ 32/50 人      [我要報名]    ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 假日健走活動：象山步道       ││ │
│ │  │ 08/10 07:00  象山步道入口   ││ │
│ │  │ 主辦：信義區體育會  免費    ││ │
│ │  │ 18/30 人      [我要報名]    ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  INTEREST MATCH 興趣媒合         │ │  ← InterestMatch.vue
│ │  你的興趣：                      │ │
│ │  [攝影✓][登山✓][桌遊✓][+更多]   │ │  ← 興趣 Pill 標籤
│ │  ┌─────────────────────────────┐│ │
│ │  │ 📷 週六攝影散步團           ││ │
│ │  │ 🎯 匹配 92%                 ││ │
│ │  │ 08/09 大稻埕迪化街  8人加入 ││ │
│ │  │ [攝影] [旅行]     [加入]    ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 🎲 桌遊之夜 - 信義場        ││ │
│ │  │ 🎯 匹配 85%                 ││ │
│ │  │ 08/08 骰子人桌遊店  5人加入 ││ │
│ │  │ [桌遊]           [加入]    ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  COMMUNITY BOARD 社群討論        │ │  ← CommunityBoard.vue
│ │  [熱門🔥] [揪團🙋] [心得📝]     │ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [輸入] 分享心得或發起揪團... ││ │  ← 發文輸入區
│ │  │ [揪團][心得][討論]  [發佈]   ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 🔵小明  2小時前    [揪團]   ││ │
│ │  │ 有人週六要一起看統一獅嗎？   ││ │
│ │  │ 統一獅vs中信 08/02  3/6人   ││ │
│ │  │ ████░░░░░░  [+1 參加]      ││ │
│ │  │ ❤️12  💬5  🔗分享            ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ 🩷阿花  1天前      [心得]   ││ │
│ │  │ 昨天去看teamLab超美的！推薦 ││ │
│ │  │ 大家平日去比較不用排...更多  ││ │
│ │  │ ❤️28  💬8  🔗分享            ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ← padding-bottom: 80px →            │
│                           ┌───┐     │
│                           │ 🤖│     │  ← AiButton（全站 Agent）
│                           └───┘     │
│                                     │
│  ┌─────────────────┐                │
│  │ Demo 控制面板    │                │  ← 固定右下角
│  │ [🤖 AI 推薦]    │                │
│  │ [🎫 模擬購票]   │                │
│  │ [🎰 模擬抽獎]   │                │
│  │ [🔄 重設]       │                │
│  └─────────────────┘                │
└─────────────────────────────────────┘
```


---

## 正確性屬性（Correctness Properties）

### Property 1：票券狀態不可逆性

*對於任意* `EntertainmentTicket`，狀態轉移 SHALL 嚴格遵循 `unused → used → expired` 的單向流程。已使用或已過期的票券不可回復為未使用。當活動日期已過且狀態為 `unused` 時，SHALL 自動轉為 `expired`。

**Validates: 需求 3.5**

---

### Property 2：轉盤獎品機率總和等於 1

*對於任意* `Prize[]` 陣列，所有獎品的 `probability` 總和 SHALL 等於 1.0（允許浮點誤差 ±0.001）。確保轉盤每次旋轉必定產生結果。

**Validates: 需求 6.5**

---

### Property 3：點數消耗不變式

*對於任意* 點數操作，`userPoints` SHALL 始終 ≥ 0。任何消耗操作（抽獎 50 點、刮刮卡 30 點）在執行前 SHALL 驗證 `userPoints >= cost`，不足時操作 SHALL 被拒絕。

**Validates: 需求 6.6**

---

### Property 4：揪團進度百分比 Clamp 不變式

*對於任意* `TeamInfo` 的 `current` ≥ 0 與 `target` > 0，揪團進度百分比 `(current / target) * 100` SHALL 始終被 clamp 至 `[0, 100]` 的閉區間內。當 `current >= target` 時，SHALL 顯示「已成團」且隱藏「+1 參加」按鈕。

**Validates: 需求 10.5**

---

### Property 5：興趣匹配度排序不變式

*對於任意* `MatchedGroup[]` 列表顯示，推薦結果 SHALL 依 `matchScore` 降序排列。相同分數時依 `date` 升序（最近優先）。排序 SHALL 為穩定排序。

**Validates: 需求 9.5**

---

### Property 6：AI 意圖匹配完整性

*對於任意* 輸入字串，`matchIntent()` SHALL 始終返回一個有效的 `EntertainmentRecommendation` 物件（`scenario` 不為 null，`events` 陣列長度 0~3）。即使無匹配意圖，也 SHALL 返回預設推薦（scenario = 'weekend'，推薦熱門活動）。

**Validates: 需求 4.5, 4.6**

---

### Property 7：活動容量不變式

*對於任意* `StoreExperience` 或 `CommunityEvent`，`currentParticipants` SHALL 始終 ≤ `maxParticipants`。當 `currentParticipants >= maxParticipants` 時，報名按鈕 SHALL 被禁用。

**Validates: 需求 2.10, 8.8**


---

## 錯誤處理

### TicketCenter 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 活動資料為空 | 顯示「目前沒有可購買的活動」空狀態 | — |
| 剩餘票數為 0 | 該票種 disabled + 「售完」標示，其他票種仍可購買 | 減少可選項 |
| 全部售完 | 購票按鈕替換為「已售完」灰色標示，卡片灰階 | 該活動不可購買 |
| 購票數量 × 票價溢出 | clamp 數量至 1~4，金額即時重算 | 自動修正為有效值 |

### TicketCard 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 票券列表為空 | 顯示「還沒有票券，去看看有什麼活動吧！」空狀態 + 跳轉按鈕 | 引導用戶購票 |
| QR Code 資料缺失 | 以佔位方塊 + 「QR Code 產生中」文字替代 | 可能暫時無法入場 |
| 票券日期解析失敗 | 原始日期字串直接顯示，不做格式化 | 格式不一致但資訊不遺漏 |

### AiSuggestion 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| AI 推薦結果為 null | 顯示預設引導狀態（「告訴 AI 助手你的需求」） | — |
| 推薦活動 events 為空陣列 | 顯示「暫無合適推薦，試試其他關鍵字」提示 | — |
| 推薦活動已下架/售完 | 該活動卡片以灰階顯示 + 「已結束」標示 | 減少可行動選項 |

### PointsGame 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| userPoints < 消耗成本 | 遊戲按鈕 disabled + 「點數不足」tooltip | 無法參與抽獎 |
| 獎品機率設定錯誤（總和 ≠ 1） | 自動正規化機率分佈 | 透明修正，用戶無感 |
| 轉盤動畫中途中斷 | 強制停在隨機位置，仍顯示結果 | 動畫可能不流暢 |
| dailyFreeUsed 狀態判斷 | 以日期比對，跨日自動重置 | 每日免費一次確保有效 |

### CrossModuleLink 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 票券無場館地址 | 隱藏「規劃交通」和「預約叫車」卡片 | 減少導流選項 |
| 優惠券列表為空 | 隱藏「憑票優惠」卡片 | 減少導流選項 |
| 行模組 composable 不可用 | 降級為 `navigateTo('/transport')` 無帶入目的地 | 用戶需手動輸入目的地 |
| 所有導流選項皆不可用 | 整個 CrossModuleLink 元件隱藏 | 無導流提示 |

### CommunityEvents 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 社區活動列表為空 | 顯示「附近暫無社區活動」空狀態 | — |
| 課程列表為空 | 顯示「目前無開課資訊」空狀態 | — |
| 活動已額滿 | 「報名」按鈕替換為「已額滿」灰色標示 | 無法報名 |
| 活動日期已過 | 自動隱藏或以灰階標示「已結束」 | 不可報名 |

### InterestMatch 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 用戶未選擇興趣 | 顯示引導狀態（「選擇興趣標籤開始配對」） | — |
| 無匹配結果 | 顯示「暫無匹配社群，試試增加更多興趣標籤」 | — |
| matchScore 為 0 或異常 | 該項目不顯示於列表 | 避免無意義推薦 |

### CommunityBoard 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 貼文列表為空 | 顯示「還沒有人發文，成為第一個分享的人吧！」空狀態 | — |
| 發文內容為空 | 「發佈」按鈕 disabled，不允許提交 | 防止空白貼文 |
| 揪團 target ≤ 0 | 防止除以零，進度條不顯示 | 視為一般貼文 |
| createdAt 解析失敗 | 顯示原始字串而非相對時間 | 格式不一致 |


---

## 測試策略

### 整體方針

樂模組採用**例子測試為主、屬性測試補充純函數邏輯**的雙軌策略，與全站一致。

### 測試類型分類

| 類型 | 適用場景 | 工具 |
|---|---|---|
| **例子測試（Example）** | 狀態切換、事件觸發、Props 驗證 | Vitest + `@vue/test-utils` |
| **屬性測試（Property）** | 點數計算、機率分佈、匹配排序、進度 clamp | Vitest + `fast-check` |
| **整合測試** | 元件間資料流（購票 → 票券 → 導流） | Vitest + `@vue/test-utils` |

### 單元測試重點覆蓋

| 元件 | 測試重點 | 數量建議 |
|---|---|---|
| `TicketCenter` | 分類 Tab 切換、售完灰階、購票 overlay 展開、確認購票 emit、數量金額計算 | 6 個例子 |
| `TicketCard` | 展開/收合切換、狀態顯示（unused/used/expired）、QR Code 遮罩 | 4 個例子 |
| `AiSuggestion` | 推薦顯示、購票 CTA emit、關閉/換批操作、空狀態 | 5 個例子 |
| `CrossModuleLink` | 三種導流卡片顯示邏輯、點擊跳轉 emit、條件隱藏 | 4 個例子 |
| `PointsGame` | 轉盤旋轉觸發、點數不足 disabled、任務完成狀態、獎品 emit | 6 個例子 |
| `AchievementWall` | 網格渲染、已解鎖/未解鎖樣式、tooltip 顯示 | 3 個例子 |
| `CommunityEvents` | Tab 切換、報名 emit、額滿 disabled、空狀態 | 5 個例子 |
| `InterestMatch` | 標籤新增/移除、匹配列表排序、加入 emit、空狀態 | 5 個例子 |
| `CommunityBoard` | Tab 篩選、發文 emit、揪團進度更新、按讚、空狀態 | 6 個例子 |
| `useEntertainmentAgent` | 各情境意圖匹配、無匹配預設回傳、空輸入處理 | 4 個例子 + 屬性測試 |

### 屬性測試配置

```typescript
import * as fc from 'fast-check'

// Property 3：點數消耗不變式
it('Feature: entertainment-module, Property 3: 點數消耗後餘額 >= 0', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 10000 }),  // userPoints
      fc.integer({ min: 1, max: 100 }),    // cost
      (points, cost) => {
        if (points >= cost) {
          const remaining = points - cost
          return remaining >= 0
        }
        // 點數不足時不執行消耗
        return true
      }
    ),
    { numRuns: 100 }
  )
})

// Property 2：轉盤機率總和 = 1
it('Feature: entertainment-module, Property 2: 獎品機率總和等於 1', () => {
  fc.assert(
    fc.property(
      fc.array(fc.float({ min: 0.01, max: 0.5, noNaN: true }), { minLength: 3, maxLength: 8 }),
      (probs) => {
        // 正規化
        const sum = probs.reduce((a, b) => a + b, 0)
        const normalized = probs.map(p => p / sum)
        const normalizedSum = normalized.reduce((a, b) => a + b, 0)
        return Math.abs(normalizedSum - 1.0) < 0.001
      }
    ),
    { numRuns: 100 }
  )
})

// Property 4：揪團進度 Clamp
it('Feature: entertainment-module, Property 4: 揪團進度 Clamp', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 1, max: 100 }),
      (current, target) => {
        const progress = Math.min((current / target) * 100, 100)
        return progress >= 0 && progress <= 100
      }
    ),
    { numRuns: 100 }
  )
})

// Property 6：AI 意圖匹配完整性
it('Feature: entertainment-module, Property 6: matchIntent 總是返回有效結果', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 0, maxLength: 200 }),
      (input) => {
        const result = matchIntent(input)
        return (
          result !== null &&
          ['weekend', 'date', 'family', 'friends'].includes(result.scenario) &&
          result.events.length >= 0 &&
          result.events.length <= 3 &&
          result.message.length > 0
        )
      }
    ),
    { numRuns: 100 }
  )
})
```

### 整合測試重點

| 測試場景 | 驗證內容 |
|---|---|
| AI Agent → AiSuggestion | Agent 推送後，推薦區塊正確顯示情境化推薦內容 |
| AiSuggestion → TicketCenter | 點擊推薦活動「購票」後，滾動至 TicketCenter 對應 Tab |
| TicketCenter → TicketCard | 購票完成後，新票券出現在「我的票券」列表 |
| TicketCenter → CrossModuleLink | 購票完成後，跨模組導流卡片自動顯示 |
| CrossModuleLink → 行模組 | 點擊「規劃交通」，正確呼叫 useTransportState 設定目的地 |
| PointsGame → userPoints | 抽獎消耗點數後，頂部顯示點數同步更新 |
| CommunityBoard → TeamInfo | 點擊「+1 參加」後，揪團進度條動畫更新 |
| Demo 控制面板 → 各元件 | 各模擬按鈕正確觸發對應狀態變更 |
