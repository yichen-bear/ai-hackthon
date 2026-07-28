# 技術設計文件：預模組（Booking Module）

## 概覽

本設計文件定義「預」模組的元件架構、TypeScript 介面、狀態管理與資料模型。遵循全站設計系統（`ui-design-system`）的 Token 架構與元件規範，以 `.booking-module` 作用域覆寫全域 Token 實現翡翠綠預購/團購主題。

**技術棧：**
- Nuxt 4（v4.5+）+ Vue 3 + TypeScript
- 元件語法：`<script setup lang="ts">`
- 樣式策略：全域 CSS Token + 元件 Scoped CSS + 預模組作用域覆寫（`.booking-module`）
- 元件自動引入：Nuxt 4 Auto-import

**設計決策：**
- 預模組作用域覆寫採用與其他模組相同的 CSS 選擇器特異度策略（`.booking-module { --token: value }`）。
- 主色 `#10b981`（翡翠綠）傳達划算、省錢的心理暗示；次色 `#f59e0b`（琥珀色）用於限量/促銷標示。
- AI 對話功能不建立獨立元件，改由全站右下角懸浮 AI Agent 統一處理，預模組僅提供 composable 封裝推薦邏輯。
- i划算 採用「門市店長開團」模式，消費者加入附近門市團購，支援「一人即享」與「集體揪團」雙價格體系。
- 所有資料使用 mock hardcode（hackathon demo），無需後端 API 呼叫。
- Demo 控制面板沿用其他模組固定右下角模式。
- 複用全站 ProgressBar 元件呈現成團進度。


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
│   ├── ProgressBar.vue                                ← 進度條（成團進度）
│   ├── StatusBadge.vue                                ← 狀態 Pill 標籤
│   └── AiButton.vue                                   ← 懸浮 AI 按鈕（Agent 入口）
│
├── app/components/booking/                            ← 預模組專屬元件
│   ├── PreOrderShelf.vue                              ← i預購虛擬貨架
│   ├── GroupBuyHub.vue                                ← i划算門市店長開團
│   ├── OrderTracker.vue                               ← 訂單追蹤
│   ├── PickupReminder.vue                             ← 取貨提醒與門市地圖
│   └── WishlistPanel.vue                              ← 收藏清單
│
├── app/composables/                                   ← 預模組共用邏輯
│   ├── useBookingState.ts                             ← 預模組頁面狀態管理
│   └── useBookingAgent.ts                             ← AI Agent 推薦邏輯封裝
│
└── app/pages/
    └── booking/
        └── index.vue                                  ← /booking 主頁面（作用域 Token 覆寫）
```


### 元件依賴關係

```
booking/index.vue (.booking-module 作用域)
├── AgentRecommendation (內嵌)      ← AI Agent 推薦提示區（條件顯示）
├── BookingNav (sticky)             ← 功能區塊快捷導航列
├── PreOrderShelf                   ← i預購虛擬貨架
│   ├── DashboardCard               ← 卡片包裝
│   └── StatusBadge                 ← 限量/獨家/熱賣 Badge
├── GroupBuyHub                     ← i划算門市店長開團
│   ├── DashboardCard               ← 卡片包裝
│   ├── ProgressBar                 ← 成團進度條
│   └── StatusBadge                 ← 一人即享/已成團 Badge
├── OrderTracker                    ← 訂單追蹤
│   ├── DashboardCard               ← 卡片包裝
│   ├── ProgressBar                 ← 成團進度（待成團訂單）
│   └── StatusBadge                 ← 訂單類型/狀態標示
├── PickupReminder                  ← 取貨提醒
│   ├── DashboardCard               ← 卡片包裝
│   └── StatusBadge                 ← 已逾期/即將到期 Badge
└── WishlistPanel                   ← 收藏清單
    ├── DashboardCard               ← 卡片包裝
    └── StatusBadge                 ← 降價/即將截止 Badge
```

### 資料流向

```
booking/index.vue (state owner)
│
├── useBookingState() ← 頁面級共享狀態 composable
│   ├── agentRecommendation: Ref<BookingRecommendation | null>
│   ├── currentStore: Ref<StoreInfo>
│   └── scrollToSection(section) → smooth scroll
│
├── PreOrderShelf
│   └── emit('add-preorder') → 更新 orders + 顯示 toast
│
├── GroupBuyHub
│   └── emit('join-group') → 更新 group progress + 可能觸發成團
│
├── OrderTracker
│   ├── emit('go-pickup') → scrollToSection('pickup') + 展開對應門市
│   └── emit('invite-friend') → 模擬分享
│
├── PickupReminder
│   └── emit('navigate-to-store') → 跨模組：帶入行模組路線規劃
│
├── WishlistPanel
│   ├── emit('buy-now') → scrollToSection('preorder' | 'groupbuy')
│   └── emit('remove-item') → 從收藏列表移除
│
└── AI Agent (全站懸浮按鈕)
    └── useBookingAgent.matchKeywords() → 設定 agentRecommendation
        → AgentRecommendation 提示區顯示
        → 點擊「前往查看」→ scrollToSection()
```


---

## 元件清單與職責說明

### 預模組專屬元件（`components/booking/`）

| 元件 | 職責 | 主要 Props | 主要 Emits |
|---|---|---|---|
| `PreOrderShelf.vue` | i預購虛擬貨架，展示節慶禮盒/名店美食/限量預購商品網格 | `products: PreOrderProduct[]` | `add-preorder`, `add-wishlist` |
| `GroupBuyHub.vue` | i划算門市店長開團，雙價格體系（一人即享/揪團超值） | `groups: GroupBuyItem[]`, `currentStore: StoreInfo` | `join-group`, `switch-store` |
| `OrderTracker.vue` | 訂單追蹤，步驟條顯示預購/團購進度 | `orders: BookingOrder[]` | `go-pickup`, `invite-friend`, `view-detail` |
| `PickupReminder.vue` | 取貨提醒與門市地圖，顯示待取貨清單與門市導航 | `pickups: PickupItem[]` | `navigate-to-store`, `confirm-pickup` |
| `WishlistPanel.vue` | 收藏清單，管理降價/截止提醒與排序 | `items: WishlistItem[]` | `buy-now`, `remove-item` |

### Composables

| Composable | 職責 | 匯出 |
|---|---|---|
| `useBookingState.ts` | 預模組頁面級狀態管理 | `agentRecommendation`, `currentStore`, `scrollToSection()`, `dismissRecommendation()` |
| `useBookingAgent.ts` | AI Agent 關鍵字匹配推薦邏輯 | `matchKeywords(input): BookingRecommendation` |


---

## 元件介面定義（TypeScript）

### 共用型別定義

```typescript
// types/booking.ts — 預模組共用型別

/** 商品分類（i預購） */
type PreOrderCategory = 'festival' | 'famous' | 'limited' | 'exclusive'

/** 商品標籤 */
type ProductTag = 'limited' | 'exclusive' | 'hot' | 'new'

/** 團購分類（i划算） */
type GroupBuyCategory = 'daily' | 'fresh' | 'beverage' | 'solo'

/** 訂單類型 */
type OrderType = 'preorder' | 'groupbuy'

/** 訂單狀態（i預購） */
type PreOrderStatus = 'ordered' | 'producing' | 'shipping' | 'ready'

/** 訂單狀態（i划算） */
type GroupBuyStatus = 'pending-group' | 'grouped' | 'preparing' | 'ready'

/** 統一訂單狀態 */
type OrderStatus = PreOrderStatus | GroupBuyStatus | 'completed'

/** 取貨狀態 */
type PickupStatus = 'pending' | 'expiring' | 'expired'

/** 收藏排序方式 */
type WishlistSort = 'recent' | 'deadline' | 'price-asc'

/** AI 推薦頻道 */
type RecommendChannel = 'preorder' | 'groupbuy'

/** 導航模式 */
type NavigateMode = 'walk' | 'drive'
```

### 門市資訊

```typescript
interface StoreInfo {
  id: string
  name: string                     // 門市名稱（如「7-11 信義門市」）
  address: string                  // 門市地址
  phone?: string                   // 門市電話
  hours?: string                   // 營業時間
  lat?: number                     // 緯度（地圖用）
  lng?: number                     // 經度（地圖用）
}
```

### `PreOrderShelf.vue`

```typescript
interface PreOrderProduct {
  id: string
  name: string                     // 商品名稱
  image: string                    // 圖片（CSS gradient 模擬用）
  originalPrice: number            // 原價
  preorderPrice: number            // 預購價
  tags: ProductTag[]               // 標籤陣列
  deadline: string                 // 預購截止日 ISO
  category: PreOrderCategory       // 分類
  description?: string             // 商品描述
  specs?: string[]                 // 規格選項（如口味/尺寸）
}

interface PreOrderShelfProps {
  products: PreOrderProduct[]
}

// Emits
// 'add-preorder': (payload: { productId: string; quantity: number; spec?: string }) => void
// 'add-wishlist': (productId: string) => void
```

### `GroupBuyHub.vue`

```typescript
interface GroupBuyItem {
  id: string
  productName: string              // 商品名稱
  spec: string                     // 規格描述（如「24入/箱」）
  soloPrice: number                // 一人即享團購價
  groupPrice: number               // 集體揪團超值價
  originalPrice: number            // 原價
  currentMembers: number           // 目前已跟團人數
  targetMembers: number            // 成團目標人數
  isSoloBuy: boolean               // 是否為一人即享商品
  category: GroupBuyCategory       // 分類
  storeId: string                  // 開團門市 ID
  storeName: string                // 開團門市名稱（店長門市）
  deadline: string                 // 團購截止日 ISO
  image?: string                   // 商品圖片
}

interface GroupBuyHubProps {
  groups: GroupBuyItem[]
  currentStore: StoreInfo          // 目前定位門市
}

// Emits
// 'join-group': (payload: { productId: string; groupId: string; storeId: string }) => void
// 'switch-store': () => void
```

### `OrderTracker.vue`

```typescript
interface BookingOrder {
  id: string
  type: OrderType                  // 'preorder' | 'groupbuy'
  productName: string              // 商品名稱
  spec: string                     // 規格
  status: OrderStatus              // 訂單目前狀態
  currentStep: number              // 目前步驟 index（0-based）
  totalSteps: number               // 總步驟數（固定 4）
  estimatedDate?: string           // 預計到貨日期 ISO
  groupProgress?: {                // 團購成團進度（僅 groupbuy）
    current: number
    target: number
  }
  createdAt: string                // 下單時間 ISO
}

/** 訂單篩選類型 */
type OrderFilter = 'all' | 'active' | 'ready' | 'completed'

interface OrderTrackerProps {
  orders: BookingOrder[]
}

// Emits
// 'go-pickup': (orderId: string) => void
// 'invite-friend': (orderId: string) => void
// 'view-detail': (orderId: string) => void
```

### `PickupReminder.vue`

```typescript
interface PickupItem {
  id: string
  orderId: string                  // 關聯訂單 ID
  productName: string              // 商品名稱
  pickupCode: string               // 取貨編號
  store: StoreInfo                 // 取貨門市
  deadline: string                 // 取貨期限 ISO
  status: PickupStatus             // 'pending' | 'expiring' | 'expired'
}

interface PickupReminderProps {
  pickups: PickupItem[]
}

// Emits
// 'navigate-to-store': (payload: { storeId: string; mode: NavigateMode }) => void
// 'confirm-pickup': (pickupId: string) => void
```

### `WishlistPanel.vue`

```typescript
interface WishlistItem {
  id: string
  productId: string                // 關聯商品 ID
  productName: string              // 商品名稱
  channel: RecommendChannel        // 來源頻道
  currentPrice: number             // 目前價格
  originalPrice: number            // 原始價格（加入收藏時）
  hasPriceDrop: boolean            // 是否有降價
  deadline: string                 // 預購/團購截止日 ISO
  addedAt: string                  // 加入收藏時間 ISO
  image?: string                   // 商品圖片
}

interface WishlistPanelProps {
  items: WishlistItem[]
}

// Emits
// 'buy-now': (payload: { productId: string; channel: RecommendChannel }) => void
// 'remove-item': (productId: string) => void
```


### Composables

```typescript
// composables/useBookingState.ts
// 管理預模組頁面級狀態，供各元件間共享

interface BookingPageState {
  // AI Agent 推薦結果（懸浮 Agent 推送時設定）
  agentRecommendation: Ref<BookingRecommendation | null>

  // 目前定位門市
  currentStore: Ref<StoreInfo>

  // 導航至指定區塊
  scrollToSection: (section: 'preorder' | 'groupbuy' | 'order' | 'pickup' | 'wishlist') => void

  // 關閉推薦提示
  dismissRecommendation: () => void
}

// composables/useBookingAgent.ts
// AI Agent 推薦邏輯封裝，供全站 AI Agent 呼叫

interface RecommendedProduct {
  id: string
  name: string
  price: number
  channel: RecommendChannel
}

interface BookingRecommendation {
  channel: RecommendChannel        // 推薦頻道
  message: string                  // AI 回應文字
  products: RecommendedProduct[]   // 推薦商品（最多 3 件）
  keywords: string[]               // 匹配到的關鍵字
}

/**
 * 分析用戶輸入關鍵字，返回推薦結果
 * @param input 用戶輸入文字
 * @returns BookingRecommendation
 */
function matchKeywords(input: string): BookingRecommendation

// 關鍵字匹配規則：
const KEYWORD_RULES: Record<string, { channel: RecommendChannel; message: string }> = {
  // i划算 關鍵字
  '衛生紙|洗衣精|日用品|箱購|補貨|洗碗精|垃圾袋': {
    channel: 'groupbuy',
    message: '看起來您需要補充日用品，推薦 i划算 的箱購優惠！'
  },
  '團購|揪團|辦公室|同事|一起買': {
    channel: 'groupbuy',
    message: '揪團更划算！推薦 i划算 的社群團購，門市取貨超方便。'
  },
  // i預購 關鍵字
  '禮盒|送禮|節慶|中秋|過年|限量|伴手禮|年節': {
    channel: 'preorder',
    message: '送禮首選！推薦 i預購 的精選禮盒，提早預購享優惠。'
  },
  '名店|蛋糕|甜點|美食|排隊': {
    channel: 'preorder',
    message: '免排隊！i預購 名店美食直接預購，到店取貨。'
  }
}
```


---

## 元件狀態機說明

### PreOrderShelf 商品詳情 Overlay

```
   mount()
     │
     ▼
┌──────────┐   點擊商品卡片   ┌───────────────┐
│  browse  │ ───────────────►│  detail-open  │
│ (瀏覽模式) │                │ (詳情展開)     │
│          │◄─────────────── │               │
└──────────┘   關閉/backdrop  └───────────────┘
                                    │
                                    │ 點擊「加入預購」
                                    ▼
                              emit('add-preorder')
                              → 關閉 overlay
                              → toast 提示「已加入預購」
```

**狀態說明：**

| 狀態 | UI 呈現 | 可執行操作 |
|---|---|---|
| `browse` | 2 欄網格商品卡片列表 | 點擊卡片展開詳情、切換分類 Tab |
| `detail-open` | 商品詳情 overlay（backdrop + slide-up）| 選規格、選數量、加入預購、加入收藏、關閉 |

---

### GroupBuyHub 跟團互動

```
   mount()
     │
     ▼
┌──────────────┐   點擊「+1 跟團」  ┌──────────────┐
│   browsing   │ ──────────────────►│   joining    │
│ (瀏覽團購)    │                    │ (跟團動畫)   │
│              │◄────────────────── │              │
└──────────────┘   動畫完成 300ms    └──────────────┘
       │                                   │
       │ (已滿團)                           ▼
       ▼                            進度條動畫更新
┌──────────────┐                    emit('join-group')
│   grouped    │
│ (已成團標示)  │ ← 當 currentMembers >= targetMembers
└──────────────┘
```

---

### OrderTracker 訂單步驟進度

```
i划算 訂單流程：
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  待成團    │ →  │  已成團    │ →  │  備貨中    │ →  │  可取貨    │
│ step: 0   │    │ step: 1   │    │ step: 2   │    │ step: 3   │
│ ○─────○─○─○│   │ ●─────○─○─○│   │ ●─────●─○─○│   │ ●─────●─●─●│
└───────────┘    └───────────┘    └───────────┘    └───────────┘

i預購 訂單流程：
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  已預購    │ →  │  生產中    │ →  │  配送中    │ →  │  可取貨    │
│ step: 0   │    │ step: 1   │    │ step: 2   │    │ step: 3   │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
```

**Step Indicator 視覺規則：**

| 步驟狀態 | 圓形節點 | 連接線 |
|---|---|---|
| 已完成 | `--color-primary` 實心 + ✓ 圖示 | `--color-primary` 實線 |
| 目前步驟 | `--color-primary` 實心 + 脈動動畫 | `--color-border` 虛線 |
| 未完成 | `--color-border` 空心圓 | `--color-border` 虛線 |

---

### PickupReminder 門市地圖展開

```
   mount()
     │
     ▼
┌──────────────┐   點擊「導航前往」   ┌──────────────┐
│  list-view   │ ────────────────────►│  map-expand  │
│ (列表模式)    │                     │ (地圖展開)    │
│              │◄──────────────────── │              │
└──────────────┘   點擊收合/切換項目   └──────────────┘
                                            │
                                            │ 點擊「步行/開車導航」
                                            ▼
                                    emit('navigate-to-store')
                                    → 跨模組聯動行模組
```


---

## 資料模型

### 預模組作用域 Token 覆寫

```css
/* pages/booking/index.vue <style scoped> */
.booking-module {
  --color-primary: #10b981;          /* 翡翠綠主色 */
  --color-primary-light: #ecfdf5;    /* 翡翠綠淡底 */
  --color-secondary: #f59e0b;        /* 琥珀色次色（促銷/限量） */
  --color-secondary-light: #fffbeb;  /* 琥珀色淡底 */
}
```

### Mock 門市資料

```typescript
const MOCK_STORES: StoreInfo[] = [
  {
    id: 'store-xinyi',
    name: '7-11 信義門市',
    address: '台北市信義區信義路五段 7 號',
    phone: '02-2345-6789',
    hours: '24小時',
    lat: 25.0330,
    lng: 121.5654
  },
  {
    id: 'store-zhongxiao',
    name: '7-11 忠孝門市',
    address: '台北市大安區忠孝東路四段 100 號',
    phone: '02-2771-1234',
    hours: '24小時',
    lat: 25.0418,
    lng: 121.5495
  },
  {
    id: 'store-nanjing',
    name: '7-11 南京門市',
    address: '台北市中山區南京東路二段 50 號',
    phone: '02-2567-8901',
    hours: '06:00-23:00',
    lat: 25.0522,
    lng: 121.5314
  }
]
```

### Mock i預購商品資料

```typescript
const MOCK_PREORDER_PRODUCTS: PreOrderProduct[] = [
  {
    id: 'po-1',
    name: '2026 中秋限定 日出鳳梨酥禮盒',
    image: 'linear-gradient(135deg, #f59e0b, #d97706)',
    originalPrice: 680,
    preorderPrice: 580,
    tags: ['hot', 'limited'],
    deadline: '2026-09-15',
    category: 'festival',
    description: '嚴選台灣土鳳梨製作，金黃酥脆外皮搭配香甜內餡',
    specs: ['12入裝', '24入裝']
  },
  {
    id: 'po-2',
    name: '微熱山丘 蘋果酥禮盒',
    image: 'linear-gradient(135deg, #ef4444, #dc2626)',
    originalPrice: 420,
    preorderPrice: 380,
    tags: ['exclusive'],
    deadline: '2026-08-30',
    category: 'famous',
    description: '日本青森蘋果搭配法式奶油酥皮',
    specs: ['6入裝', '10入裝']
  },
  {
    id: 'po-3',
    name: '星巴克聯名 限量咖啡禮盒',
    image: 'linear-gradient(135deg, #10b981, #059669)',
    originalPrice: 1280,
    preorderPrice: 999,
    tags: ['limited', 'exclusive'],
    deadline: '2026-08-01',
    category: 'limited',
    description: '精選三款限定風味咖啡豆＋聯名馬克杯',
    specs: ['經典款', '限定款']
  },
  {
    id: 'po-4',
    name: '郭元益 花好月圓禮盒',
    image: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    originalPrice: 520,
    preorderPrice: 450,
    tags: ['hot'],
    deadline: '2026-07-20',  // 已截止（Demo 用）
    category: 'festival',
    description: '傳統月餅搭配創新口味，送禮體面大方',
    specs: ['綜合 8 入', '蛋黃酥 6 入']
  }
]
```

### Mock i划算團購資料

```typescript
const MOCK_GROUPBUY_ITEMS: GroupBuyItem[] = [
  {
    id: 'gb-1',
    productName: '舒潔衛生紙',
    spec: '72包/箱',
    soloPrice: 699,
    groupPrice: 599,
    originalPrice: 899,
    currentMembers: 3,
    targetMembers: 5,
    isSoloBuy: false,
    category: 'daily',
    storeId: 'store-xinyi',
    storeName: '7-11 信義門市',
    deadline: '2026-08-05',
    image: 'linear-gradient(135deg, #60a5fa, #3b82f6)'
  },
  {
    id: 'gb-2',
    productName: '白蘭洗衣精',
    spec: '2.5kg × 4瓶',
    soloPrice: 459,
    groupPrice: 389,
    originalPrice: 596,
    currentMembers: 7,
    targetMembers: 10,
    isSoloBuy: false,
    category: 'daily',
    storeId: 'store-xinyi',
    storeName: '7-11 信義門市',
    deadline: '2026-08-03',
    image: 'linear-gradient(135deg, #34d399, #10b981)'
  },
  {
    id: 'gb-3',
    productName: '有機蔬菜箱',
    spec: '綜合 8 種/箱',
    soloPrice: 499,
    groupPrice: 429,
    originalPrice: 650,
    currentMembers: 2,
    targetMembers: 3,
    isSoloBuy: false,
    category: 'fresh',
    storeId: 'store-zhongxiao',
    storeName: '7-11 忠孝門市',
    deadline: '2026-07-30',
    image: 'linear-gradient(135deg, #a3e635, #65a30d)'
  },
  {
    id: 'gb-4',
    productName: '可口可樂',
    spec: '330ml × 24 罐',
    soloPrice: 299,
    groupPrice: 299,
    originalPrice: 399,
    currentMembers: 1,
    targetMembers: 1,
    isSoloBuy: true,
    category: 'solo',
    storeId: 'store-xinyi',
    storeName: '7-11 信義門市',
    deadline: '2026-08-10',
    image: 'linear-gradient(135deg, #f87171, #ef4444)'
  }
]
```

### Mock 訂單資料

```typescript
const MOCK_ORDERS: BookingOrder[] = [
  {
    id: 'ord-1',
    type: 'groupbuy',
    productName: '舒潔衛生紙 72包/箱',
    spec: '72包/箱',
    status: 'pending-group',
    currentStep: 0,
    totalSteps: 4,
    groupProgress: { current: 3, target: 5 },
    createdAt: '2026-07-25'
  },
  {
    id: 'ord-2',
    type: 'preorder',
    productName: '中秋限定鳳梨酥禮盒',
    spec: '12入裝',
    status: 'shipping',
    currentStep: 2,
    totalSteps: 4,
    estimatedDate: '2026-08-01',
    createdAt: '2026-07-20'
  },
  {
    id: 'ord-3',
    type: 'groupbuy',
    productName: '可口可樂 24罐裝',
    spec: '330ml × 24',
    status: 'ready',
    currentStep: 3,
    totalSteps: 4,
    createdAt: '2026-07-22'
  }
]
```

### Mock 取貨提醒資料

```typescript
const MOCK_PICKUPS: PickupItem[] = [
  {
    id: 'pk-1',
    orderId: 'ord-3',
    productName: '可口可樂 24罐裝',
    pickupCode: 'PK-20260728-001',
    store: MOCK_STORES[0],  // 7-11 信義門市
    deadline: '2026-07-30',  // 即將到期
    status: 'expiring'
  },
  {
    id: 'pk-2',
    orderId: 'ord-x',
    productName: '白蘭洗衣精 4瓶裝',
    pickupCode: 'PK-20260725-003',
    store: MOCK_STORES[1],  // 7-11 忠孝門市
    deadline: '2026-08-05',
    status: 'pending'
  }
]
```

### Mock 收藏清單資料

```typescript
const MOCK_WISHLIST: WishlistItem[] = [
  {
    id: 'wl-1',
    productId: 'po-1',
    productName: '2026 中秋限定 日出鳳梨酥禮盒',
    channel: 'preorder',
    currentPrice: 550,      // 降價了！原本 580
    originalPrice: 580,
    hasPriceDrop: true,
    deadline: '2026-09-15',
    addedAt: '2026-07-20'
  },
  {
    id: 'wl-2',
    productId: 'gb-2',
    productName: '白蘭洗衣精 4瓶裝',
    channel: 'groupbuy',
    currentPrice: 389,
    originalPrice: 389,
    hasPriceDrop: false,
    deadline: '2026-08-03',  // 即將截止
    addedAt: '2026-07-26'
  },
  {
    id: 'wl-3',
    productId: 'po-3',
    productName: '星巴克聯名限量咖啡禮盒',
    channel: 'preorder',
    currentPrice: 999,
    originalPrice: 999,
    hasPriceDrop: false,
    deadline: '2026-08-01',  // 即將截止
    addedAt: '2026-07-15'
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
│ │  [食] [醫] [住] [行] [預] [樂]  │ │  ← ModuleTab（預 = 選中翡翠綠底線）
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  AGENT RECOMMENDATION (條件顯示) │ │  ← AI Agent 推薦提示區
│ │  🤖 推薦 i划算 的箱購優惠！       │ │
│ │  [舒潔衛生紙 $699] [前往查看] [✕]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  BOOKING NAV (sticky)           │ │  ← 功能區塊快捷導航
│ │  [i預購] [i划算] [訂單] [取貨] [收藏]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  PREORDER SHELF i預購            │ │  ← PreOrderShelf.vue
│ │  [節慶禮盒🎁][名店美食🍰][限量⚡] │ │  ← 分類 Tab
│ │  ┌──────┐ ┌──────┐              │ │  ← 2 欄網格
│ │  │🎁    │ │🍰    │              │ │
│ │  │鳳梨酥│ │蘋果酥│              │ │
│ │  │$580  │ │$380  │              │ │
│ │  │剩15天│ │剩5天 │              │ │
│ │  └──────┘ └──────┘              │ │
│ │  ┌──────┐ ┌──────┐              │ │
│ │  │⚡    │ │🎁    │              │ │
│ │  │星巴克│ │郭元益│ ← 已截止灰階  │ │
│ │  │$999  │ │$450  │              │ │
│ │  └──────┘ └──────┘              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  GROUPBUY HUB i划算             │ │  ← GroupBuyHub.vue
│ │  📍 7-11 信義門市 [切換門市]     │ │  ← 門市定位
│ │  [日用箱購🧻][生鮮🥬][飲品🥤][一人👤]│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [img] 舒潔衛生紙 72包/箱    ││ │
│ │  │       一人享 $699 | 揪團 $599││ │
│ │  │       原價 $899              ││ │
│ │  │ ████████░░ 3/5人  [+1 跟團] ││ │
│ │  │ 🏪 7-11 信義門市取貨付款     ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [img] 可口可樂 24罐         ││ │
│ │  │       👤一人即享 $299        ││ │
│ │  │ 🏪 7-11 信義門市取貨付款     ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ORDER TRACKER 我的訂單          │ │  ← OrderTracker.vue
│ │  [全部][進行中][可取貨][已完成]  │ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [i划算] 舒潔衛生紙          ││ │
│ │  │ ○──○──○──○  待成團           ││ │
│ │  │ ████░░ 3/5人 [邀請好友]     ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [i預購] 鳳梨酥禮盒          ││ │
│ │  │ ●──●──●──○  配送中           ││ │
│ │  │ 預計 08/01 到貨              ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [i划算] 可口可樂            ││ │
│ │  │ ●──●──●──●  可取貨 ✓        ││ │
│ │  │ [📍 前往取貨]                ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  PICKUP REMINDER 取貨提醒        │ │  ← PickupReminder.vue
│ │                            [2]  │ │  ← 待取件數 Badge
│ │  ┌─────────────────────────────┐│ │
│ │  │ 可口可樂 24罐  PK-001       ││ │
│ │  │ 7-11 信義門市               ││ │
│ │  │ ⚠️ 請於 07/30 前取貨        ││ │  ← 即將到期紅字
│ │  │ [導航前往]                   ││ │
│ │  │  ┌── 門市地圖 ──────────┐   ││ │  ← 展開地圖
│ │  │  │ [OpenStreetMap/CSS]  │   ││ │
│ │  │  │ 地址：信義路五段7號  │   ││ │
│ │  │  │ 24小時營業           │   ││ │
│ │  │  │ [🚶步行] [🚗開車]    │   ││ │
│ │  │  └─────────────────────┘   ││ │
│ │  └─────────────────────────────┘│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  WISHLIST PANEL 我的收藏         │ │  ← WishlistPanel.vue
│ │  排序: [最近加入 ▼]  共 3 件     │ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [img] 鳳梨酥禮盒  [i預購]  ││ │
│ │  │       🔥降價了！$550 ←$580  ││ │
│ │  │       [🛒購買] [🗑️]         ││ │
│ │  └─────────────────────────────┘│ │
│ │  ┌─────────────────────────────┐│ │
│ │  │ [img] 洗衣精      [i划算]  ││ │
│ │  │       ⏰即將截止  $389      ││ │
│ │  │       [🛒購買] [🗑️]         ││ │
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
│  │ [🛒模擬跟團]    │                │
│  │ [📦模擬到貨]    │                │
│  │ [🔄重設]        │                │
│  └─────────────────┘                │
└─────────────────────────────────────┘
```


---

## 正確性屬性（Correctness Properties）

### Property 1：成團進度百分比 Clamp 不變式

*對於任意* `currentMembers` ≥ 0 與 `targetMembers` > 0，成團進度百分比 `(currentMembers / targetMembers) * 100` SHALL 始終被 clamp 至 `[0, 100]` 的閉區間內。當 `currentMembers >= targetMembers` 時，進度 SHALL 為 100 且狀態為「已成團」。

**Validates: 需求 3.5, 3.8**

---

### Property 2：訂單步驟進度不變式

*對於任意* `currentStep` 與 `totalSteps`，`currentStep` SHALL 始終落在 `[0, totalSteps - 1]` 的閉區間內。步驟只能前進不能後退（單調非遞減）。

**Validates: 需求 5.4**

---

### Property 3：取貨期限狀態一致性

*對於任意* `PickupItem`，當 `deadline` 與當前日期的差值 ≤ 2 天時 `status` SHALL 為 `'expiring'`；當差值 < 0 時 SHALL 為 `'expired'`；否則 SHALL 為 `'pending'`。

**Validates: 需求 6.3, 6.9**

---

### Property 4：收藏清單排序穩定性

*對於任意* 排序操作，排序結果 SHALL 保持穩定排序（stable sort）。相同排序鍵值的項目 SHALL 保持原相對順序。

**Validates: 需求 7.9**

---

### Property 5：AI 關鍵字匹配完整性

*對於任意* 輸入字串，`matchKeywords()` SHALL 始終返回一個有效的 `BookingRecommendation` 物件（`channel` 不為 null，`products` 陣列長度 0~3）。即使無匹配關鍵字，也 SHALL 返回預設推薦。

**Validates: 需求 4.3, 4.4**

---

## 錯誤處理

### PreOrderShelf 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 商品資料為空 | 顯示「目前沒有預購商品」空狀態 | — |
| 預購截止日解析失敗 | 視為已截止，以灰階顯示 | 該商品不可購買 |
| 數量超出範圍 | clamp 至 1~5 | 自動修正為邊界值 |

### GroupBuyHub 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 門市資料未載入 | 顯示「定位中...」loading 狀態 | 延遲顯示商品列表 |
| targetMembers = 0 | 防止除以零，進度條設為 100% | 視為一人即享 |
| 團購資料為空 | 顯示「目前附近門市沒有團購活動」空狀態 | — |

### OrderTracker 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 訂單列表為空 | 顯示空狀態 + 導航按鈕 | 引導用戶前往購物 |
| currentStep > totalSteps | clamp 至 totalSteps - 1 | 防止 UI 溢出 |
| estimatedDate 已過期 | 顯示「配送延遲」提示文字 | 黃色警示標示 |

### PickupReminder 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 地圖 iframe 載入失敗 | 降級顯示文字地址 + 「在 Google Maps 中開啟」連結 | 地圖區塊以佔位色塊替代 |
| 無取貨項目 | 顯示「目前沒有待取貨商品 🎉」空狀態 | — |
| 門市資料不完整 | 隱藏不完整欄位，僅顯示可用資訊 | 部分資訊缺失 |

### WishlistPanel 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 收藏列表為空 | 顯示「還沒有收藏商品，去逛逛吧 💚」空狀態 | — |
| 價格資料異常（NaN） | 顯示「價格更新中」佔位文字 | 購買按鈕禁用 |

---

## 測試策略

### 整體方針

預模組採用**例子測試為主、屬性測試補充純函數邏輯**的雙軌策略，與全站一致。

### 測試類型分類

| 類型 | 適用場景 | 工具 |
|---|---|---|
| **例子測試（Example）** | 狀態切換、事件觸發、Props 驗證 | Vitest + `@vue/test-utils` |
| **屬性測試（Property）** | 成團進度計算、步驟 clamp、排序穩定性 | Vitest + `fast-check` |
| **整合測試** | 元件間資料流（Agent → 頁面滾動） | Vitest + `@vue/test-utils` |

### 單元測試重點覆蓋

| 元件 | 測試重點 | 數量建議 |
|---|---|---|
| `PreOrderShelf` | 分類 Tab 切換、已截止灰階、展開詳情、加入預購 emit | 5 個例子 |
| `GroupBuyHub` | 門市顯示、雙價格呈現、一人即享 Badge、跟團 emit、已成團禁用 | 6 個例子 |
| `OrderTracker` | 篩選切換、步驟條渲染、可取貨按鈕、空狀態 | 5 個例子 |
| `PickupReminder` | 即將到期紅字、地圖展開、導航 emit、空狀態 | 4 個例子 |
| `WishlistPanel` | 降價 Badge、即將截止 Badge、排序切換、移除動畫、空狀態 | 5 個例子 |
| `useBookingAgent` | 各關鍵字規則匹配、無匹配預設回傳、空輸入處理 | 4 個例子 + 屬性測試 |

### 屬性測試配置

```typescript
import * as fc from 'fast-check'

// Property 1：成團進度 Clamp
it('Feature: booking-module, Property 1: 成團進度 Clamp', () => {
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

// Property 5：AI 關鍵字匹配完整性
it('Feature: booking-module, Property 5: matchKeywords 總是返回有效結果', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 0, maxLength: 200 }),
      (input) => {
        const result = matchKeywords(input)
        return (
          result !== null &&
          ['preorder', 'groupbuy'].includes(result.channel) &&
          result.products.length >= 0 &&
          result.products.length <= 3 &&
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
| AI Agent → 推薦提示區 | Agent 推送後，提示區正確顯示推薦內容 |
| 提示區 → 滾動至區塊 | 點擊「前往查看」後，頁面滾動至正確區塊 |
| PreOrderShelf → OrderTracker | 預購完成後，新訂單出現在 OrderTracker |
| GroupBuyHub → OrderTracker | 跟團後，新訂單出現在 OrderTracker |
| OrderTracker → PickupReminder | 點擊「前往取貨」後，滾動至對應取貨項目 |
| PickupReminder → 行模組 | 點擊導航按鈕，emit 正確 payload 供跨模組使用 |
