# 技術設計文件：行模組（Transport Module）

## 概覽

本設計文件定義「行」模組的元件架構、TypeScript 介面、狀態機與資料模型。遵循全站設計系統（`ui-design-system`）的 Token 架構與元件規範，以 `.transport-module` 作用域覆寫全域 Token 實現琥珀色交通主題。

**技術棧：**
- Nuxt 4（v4.5+）+ Vue 3 + TypeScript
- 元件語法：`<script setup lang="ts">`
- 樣式策略：全域 CSS Token + 元件 Scoped CSS + 行模組作用域覆寫（`.transport-module`）
- 元件自動引入：Nuxt 4 Auto-import

**設計決策：**
- 行模組作用域覆寫採用與食模組相同的 CSS 選擇器特異度策略（`.transport-module { --token: value }`）。
- Ticket_Wallet 為全站共用元件，存放於 `components/ui/`，行模組與預/樂模組共用。
- 購票流程採用步驟式狀態機（Step-based FSM），確保使用者操作流程清晰可控。
- 叫車服務採用模式切換 + 狀態機（idle → confirming → waiting → arrived），管理叫車生命週期。
- 碳足跡追蹤複用食模組 FoodPassport 的徽章概念，以 CarbonBadge 介面統一規格。


---

## 架構

### 高層次架構圖

```
Nuxt 4 Application
├── app/assets/css/
│   └── design-system.css                              ← 全域 CSS Token（已存在）
│
├── app/components/ui/                                 ← 全站共用元件
│   ├── ModuleTab.vue                                  ← 六大模組頁籤（已存在）
│   ├── StatusBadge.vue                                ← 狀態 Pill 標籤（已存在）
│   ├── DashboardCard.vue                              ← 儀表板卡片包裝器（已存在）
│   ├── ProgressBar.vue                                ← 進度條（已存在）
│   ├── TimelineSelector.vue                           ← 時段選擇列（已存在）
│   ├── AiButton.vue                                   ← 懸浮 AI 按鈕（已存在）
│   └── TicketWallet.vue                               ← 票券夾（新建，全站共用）
│
├── app/components/transport/                          ← 行模組專屬元件
│   ├── ContextPush.vue                                ← 情境智慧推播
│   ├── TripTimeline.vue                               ← 行程時間軸
│   ├── FavoriteRoutes.vue                             ← 常用路線收藏
│   ├── RoutePlanner.vue                               ← 智慧路線規劃
│   ├── RideService.vue                                ← 叫車服務（yoxi）
│   ├── TicketBooking.vue                              ← 模擬購票
│   ├── SharingVehicle.vue                             ← 共享運具租賃
│   ├── ParkingFinder.vue                              ← 停車助手
│   └── CarbonTracker.vue                              ← 碳足跡追蹤
│
├── app/composables/                                   ← 行模組共用邏輯
│   ├── useTransportState.ts                           ← 行模組頁面狀態管理
│   └── useCarbonCalculator.ts                         ← 碳排放計算純函數
│
└── app/pages/
    └── transport/                                     ← 行模組頁面資料夾（Nuxt 資料夾路由）
        └── index.vue                                  ← /transport 主頁面（作用域 Token 覆寫）
```


### 元件依賴關係

```
transport/index.vue (.transport-module 作用域)
├── ContextPush                    ← 情境智慧推播（頁面頂部）
├── TransportNav (sticky)          ← 功能區塊快捷導航列
├── TripTimeline                   ← 今日行程時間軸
│   └── StatusBadge                ← 行程狀態標示
├── FavoriteRoutes                 ← 常用路線收藏（橫向滾動）
├── RoutePlanner                   ← 智慧路線規劃
│   ├── DashboardCard              ← 卡片包裝
│   └── StatusBadge                ← 路況狀態標示
├── RideService                    ← 叫車服務
│   ├── DashboardCard              ← 卡片包裝
│   └── StatusBadge                ← 車種/等候狀態
├── TicketBooking                  ← 模擬購票
│   ├── DashboardCard              ← 卡片包裝
│   └── TimelineSelector           ← 時間選擇（複用）
├── TicketWallet                   ← 票券夾（全站共用）
│   └── StatusBadge                ← 票券狀態
├── SharingVehicle                 ← 共享運具
│   ├── DashboardCard              ← 卡片包裝
│   └── StatusBadge                ← 可用狀態
├── ParkingFinder                  ← 停車助手
│   ├── DashboardCard              ← 卡片包裝
│   └── ProgressBar                ← 車位使用率
└── CarbonTracker                  ← 碳足跡追蹤
    ├── DashboardCard              ← 卡片包裝
    └── ProgressBar                ← 碳排進度條
```

---

## 元件清單與職責說明

### 行模組專屬元件（`components/transport/`）

| 元件 | 職責 | 主要 Props | 主要 Emits |
|---|---|---|---|
| `ContextPush.vue` | 情境智慧推播，依時間/天氣/跨模組觸發顯示建議卡片 | `suggestions: ContextSuggestion[]` | `plan-route`, `call-ride`, `dismiss` |
| `TripTimeline.vue` | 垂直時間軸，串聯當日交通行程 | `trips: TripItem[]` | `trip-action` |
| `FavoriteRoutes.vue` | 橫向滾動常用路線列表，一鍵啟動 | `routes: FavoriteRoute[]` | `select-route`, `call-ride`, `add`, `edit`, `delete` |
| `RoutePlanner.vue` | 多交通方式路線規劃，含即時路況 | `origin?: string`, `destination?: string` | `route-selected` |
| `RideService.vue` | yoxi 叫車，即時/預約，多車種 | `destination?: string`, `pickup?: string` | `confirm-ride` |
| `TicketBooking.vue` | 高鐵/台鐵模擬購票步驟式流程 | — | `ticket-purchased` |
| `SharingVehicle.vue` | 共享運具地圖+列表，站點租借 | `vehicleType?: VehicleType`, `userLocation?: GeoLocation` | `rent-vehicle` |
| `ParkingFinder.vue` | 停車場查詢，記錄/導航停車位 | `location?: GeoLocation` | `park-recorded`, `park-cleared` |
| `CarbonTracker.vue` | 碳排放統計與減碳成就徽章 | `emissions: EmissionData` | — |


### 全站共用元件（新建）

| 元件 | 路徑 | 職責 | 主要 Props | 主要 Emits |
|---|---|---|---|---|
| `TicketWallet.vue` | `components/ui/TicketWallet.vue` | 票券夾，管理所有票券的展示、篩選與 QR Code 放大 | `tickets: Ticket[]` | `ticket-select`, `ticket-use` |

---

## 元件介面定義（TypeScript）

### 共用型別定義

```typescript
// types/transport.ts — 行模組共用型別

/** 地理座標 */
interface GeoLocation {
  lat: number
  lng: number
}

/** 交通方式 */
type TransportMode = 'bus' | 'metro' | 'hsr' | 'train' | 'car' | 'motorcycle' | 'walk'

/** 共享運具類型 */
type VehicleType = 'bike' | 'scooter' | 'car'

/** 路況狀態 */
type TrafficStatus = 'smooth' | 'moderate' | 'congested'

/** 行程狀態 */
type TripStatus = 'pending' | 'active' | 'completed'

/** 票券狀態 */
type TicketStatus = 'unused' | 'used' | 'expired'

/** 票券類型 */
type TicketType = 'hsr' | 'train' | 'event' | 'other'

/** 叫車服務狀態 */
type RideState = 'idle' | 'confirming' | 'waiting' | 'arrived' | 'completed'

/** 叫車模式 */
type RideMode = 'instant' | 'scheduled'

/** 車種 */
type CarType = 'sedan' | 'van' | 'accessible' | 'pet-friendly'

/** 購票步驟 */
type BookingStep = 'form' | 'select-train' | 'confirm'

/** 情境推播觸發類型 */
type TriggerType = 'time' | 'weather' | 'cross-module'

/** 站點可用狀態 */
type AvailabilityStatus = 'available' | 'limited' | 'empty'

/** 停車場營業狀態 */
type ParkingStatus = 'open' | 'full' | 'closed'
```


### `ContextPush.vue`

```typescript
interface ContextSuggestion {
  id: string
  title: string                    // 推播標題
  description: string              // 推播描述
  destination: string              // 目的地地址
  triggerType: TriggerType         // 觸發類型
  suggestedMode: TransportMode     // 建議交通方式
}

interface ContextPushProps {
  suggestions: ContextSuggestion[]
}

// Emits
// 'plan-route': (suggestion: ContextSuggestion) => void
// 'call-ride': (suggestion: ContextSuggestion) => void
// 'dismiss': (suggestionId: string) => void
```

### `TripTimeline.vue`

```typescript
interface TripItem {
  id: string
  time: string                     // 出發時間，格式 'HH:mm'
  mode: TransportMode              // 交通方式
  origin: string                   // 起點
  destination: string              // 終點
  status: TripStatus               // 行程狀態
  ticketId?: string                // 關聯票券 ID（可選）
}

interface TripTimelineProps {
  trips: TripItem[]
}

// Emits
// 'trip-action': (trip: TripItem, action: 'view-ticket' | 'cancel' | 'navigate') => void
```

### `FavoriteRoutes.vue`

```typescript
interface FavoriteRoute {
  id: string
  name: string                     // 路線名稱（如「上班通勤」）
  origin: string                   // 起點
  destination: string              // 終點
  preferredMode: TransportMode     // 常用交通方式
  lastUsed: string                 // ISO 日期字串
}

interface FavoriteRoutesProps {
  routes: FavoriteRoute[]
}

// Emits
// 'select-route': (route: FavoriteRoute) => void  — 帶入 RoutePlanner
// 'call-ride': (route: FavoriteRoute) => void     — 帶入 RideService
// 'add': () => void                                — 開啟新增表單
// 'edit': (route: FavoriteRoute) => void           — 開啟編輯表單
// 'delete': (routeId: string) => void              — 確認刪除
```


### `RoutePlanner.vue`

```typescript
interface RouteOption {
  id: string
  mode: TransportMode
  duration: number                 // 預估行程時間（分鐘）
  cost?: number                    // 預估費用（元），步行等無費用
  summary: string                  // 路線摘要文字
  trafficStatus: TrafficStatus     // 即時路況
  carbonEmission: number           // 預估碳排放（g CO₂）
  isRecommended: boolean           // 是否為推薦路線
}

interface RoutePlannerProps {
  origin?: string                  // 可從外部模組帶入
  destination?: string             // 可從外部模組帶入
}

// Emits
// 'route-selected': (route: RouteOption) => void
```

### `RideService.vue`

```typescript
interface RideRequest {
  pickup: string                   // 上車地點
  destination: string              // 目的地
  carType: CarType                 // 車種
  mode: RideMode                   // 即時 / 預約
  scheduledTime?: string           // 預約時間（ISO 字串，僅預約模式）
}

interface DriverInfo {
  name: string                     // 司機姓名
  plateNumber: string              // 車牌號碼
  carModel: string                 // 車型
  rating: number                   // 評分（1~5）
  eta: number                      // 預估到達時間（秒）
}

interface RideEstimate {
  minCost: number                  // 最低費用
  maxCost: number                  // 最高費用
  waitTime: number                 // 預估等候時間（分鐘）
}

interface RideServiceProps {
  destination?: string             // 可從 RoutePlanner/ContextPush 帶入
  pickup?: string                  // 預設為目前位置
}

// Emits
// 'confirm-ride': (rideData: RideRequest) => void
```

### `TicketBooking.vue`

```typescript
interface Station {
  id: string
  name: string                     // 站名
}

interface TrainSchedule {
  id: string
  trainNo: string                  // 車次號碼
  departureTime: string            // 出發時間 'HH:mm'
  arrivalTime: string              // 到達時間 'HH:mm'
  duration: number                 // 行車時間（分鐘）
  price: number                    // 票價（元）
  seatStatus: 'available' | 'standing' | 'full'
}

type TicketCategory = 'adult' | 'child' | 'senior' | 'disabled'

interface TicketFormData {
  type: 'hsr' | 'train'           // 高鐵 / 台鐵
  origin: string                   // 出發站 ID
  destination: string              // 到達站 ID
  date: string                     // 出發日期 ISO
  time: string                     // 出發時間偏好
  category: TicketCategory         // 票種
  quantity: number                 // 張數 1~10
}

interface PurchasedTicket {
  id: string
  type: TicketType
  trainNo: string
  origin: string
  destination: string
  date: string
  time: string
  category: TicketCategory
  price: number
}

// Emits
// 'ticket-purchased': (ticket: PurchasedTicket) => void
```


### `TicketWallet.vue`（全站共用）

```typescript
interface Ticket {
  id: string
  type: TicketType                 // 'hsr' | 'train' | 'event' | 'other'
  origin: string                   // 出發站/地點
  destination: string              // 到達站/地點
  date: string                     // 日期 ISO
  time: string                     // 時間 'HH:mm'
  trainNo?: string                 // 車次（交通票專用）
  qrCode: string                   // QR Code 資料（URL 或 Base64）
  status: TicketStatus             // 'unused' | 'used' | 'expired'
  label?: string                   // 票券顯示名稱（如「高鐵」「台鐵」「演唱會」）
}

type TicketFilter = 'all' | 'unused' | 'used' | 'expired'

interface TicketWalletProps {
  tickets: Ticket[]
}

// Emits
// 'ticket-select': (ticket: Ticket) => void    — 展開票券詳情
// 'ticket-use': (ticketId: string) => void     — 標記票券為已使用
```

### `SharingVehicle.vue`

```typescript
interface VehicleStation {
  id: string
  name: string                     // 站點名稱
  distance: number                 // 距離（公尺）
  availableCount: number           // 可用車輛數量
  totalCount: number               // 總車位數
  status: AvailabilityStatus       // 可用狀態
  location: GeoLocation            // 站點座標
  provider: string                 // 營運商（YouBike/GoShare/iRent/Zipcar）
}

interface VehicleItem {
  id: string
  code: string                     // 車輛編號
  batteryLevel?: number            // 電量（電動運具，0~100）
}

type ViewMode = 'map' | 'list'

interface SharingVehicleProps {
  vehicleType?: VehicleType        // 預設 'bike'
  userLocation?: GeoLocation       // 使用者位置
}

// Emits
// 'rent-vehicle': (stationId: string, vehicleId: string) => void
```

### `ParkingFinder.vue`

```typescript
interface ParkingLot {
  id: string
  name: string                     // 停車場名稱
  distance: number                 // 距離（公尺）
  availableSpaces: number          // 剩餘車位
  totalSpaces: number              // 總車位
  rate: number                     // 費率（元/小時）
  status: ParkingStatus            // 營業狀態
  location: GeoLocation
}

interface ParkedRecord {
  lotName: string                  // 停車場名稱
  floor: string                    // 樓層/區域
  location: GeoLocation            // GPS 座標
  parkedAt: string                 // 停放時間 ISO
}

interface ParkingFinderProps {
  location?: GeoLocation           // 搜尋中心點
}

// Emits
// 'park-recorded': (record: ParkedRecord) => void
// 'park-cleared': () => void
```


### `CarbonTracker.vue`

```typescript
interface EmissionBreakdown {
  car: number                      // 汽車/叫車碳排（kg）
  transit: number                  // 大眾運輸碳排（kg）
  green: number                    // 共享單車/步行減碳貢獻（kg，負值表示減碳）
}

interface CarbonBadge {
  id: string
  icon: string                     // emoji 或 SVG icon
  name: string                     // 徽章名稱
  description: string              // 解鎖條件描述
  unlocked: boolean                // 是否已解鎖
}

interface EmissionData {
  total: number                    // 本月累計碳排放（kg CO₂）
  goal: number                     // 月度目標（kg CO₂）
  breakdown: EmissionBreakdown     // 分類明細
  badges: CarbonBadge[]            // 減碳成就徽章
}

interface CarbonTrackerProps {
  emissions: EmissionData
}

// 純展示元件，無 Emits
```

### Composables

```typescript
// composables/useTransportState.ts
// 管理行模組頁面級狀態，供各元件間共享

interface TransportPageState {
  // 從 ContextPush/FavoriteRoutes 帶入的目的地
  sharedDestination: Ref<string>
  sharedOrigin: Ref<string>

  // 導航至指定區塊
  scrollToSection: (section: 'route' | 'ride' | 'ticket' | 'sharing' | 'parking') => void

  // 將目的地帶入 RoutePlanner
  setRouteDestination: (destination: string) => void

  // 將目的地帶入 RideService
  setRideDestination: (destination: string) => void

  // 已忽略的推播 ID（session 級別）
  dismissedSuggestions: Ref<Set<string>>
}

// composables/useCarbonCalculator.ts
// 碳排放計算純函數

/**
 * 根據交通方式與距離計算碳排放量
 * @param mode 交通方式
 * @param distanceKm 距離（公里）
 * @returns 碳排放量（g CO₂）
 */
function calculateEmission(mode: TransportMode, distanceKm: number): number

/**
 * 計算碳排放進度百分比（clamp 0~100）
 * @param total 當前碳排放量
 * @param goal 目標碳排放量
 * @returns { percentage: number; overLimit: boolean }
 */
function calculateCarbonProgress(total: number, goal: number): {
  percentage: number
  overLimit: boolean
}
```


---

## 元件狀態機說明

### RideService 叫車生命週期狀態機

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                   RideService                           │
                        │                                                         │
   mount()              │  ┌────────┐  confirm   ┌────────────┐  dispatch  ┌─────────┐  arrive  ┌───────────┐
   ─────────────────────►  │  idle  │ ──────────►│ confirming │ ─────────►│ waiting │ ────────►│  arrived  │
                        │  │        │            │ (摘要確認)  │           │(等候司機)│          │(司機到達) │
                        │  └────────┘            └────────────┘           └─────────┘          └───────────┘
                        │       ▲                      │                       │                      │
                        │       │        cancel        │                       │ cancel               │ complete
                        │       └──────────────────────┘                       │                      ▼
                        │       ▲                                              │              ┌───────────┐
                        │       └──────────────────────────────────────────────┘              │ completed │
                        │                                                                     └───────────┘
                        └─────────────────────────────────────────────────────────┘
```

**狀態說明：**

| 狀態 | 觸發條件 | UI 呈現 | 可執行操作 |
|---|---|---|---|
| `idle` | 初始狀態 / 取消叫車 | 顯示叫車表單（上車地點、目的地、車種選擇） | 填寫表單、切換即時/預約模式 |
| `confirming` | 使用者點擊「確認叫車」 | 顯示訂單摘要（費用預估、路線摘要）| 確認派車 / 返回修改 |
| `waiting` | 訂單已派車 | 顯示司機資訊、預估到達倒數計時 | 取消叫車 |
| `arrived` | 司機到達上車點 | 顯示「司機已到達」通知、車牌資訊 | 確認上車（完成） |
| `completed` | 行程結束 | 顯示行程摘要與費用 | 返回 idle |

---

### TicketBooking 購票步驟式狀態機

```
   mount()
     │
     ▼
┌──────────┐   查詢班次   ┌───────────────┐   確認購票   ┌───────────────┐
│   form   │ ───────────►│ select-train  │ ───────────►│   confirm     │
│ 填寫資訊  │             │  選擇班次     │             │  確認付款     │
└──────────┘             └───────────────┘             └───────────────┘
     ▲                         │                             │
     │          返回修改        │                             │ 購票完成
     └─────────────────────────┘                             │
     ▲                                                       │
     └───────────────────────────────────────────────────────┘
                          重新購票
```

**步驟說明：**

| 步驟 | 觸發條件 | UI 呈現 | 驗證規則 |
|---|---|---|---|
| `form` | 初始 / 返回修改 | 購票表單（出發站、到達站、日期、時間、票種、張數） | 所有必填欄位須填寫；張數 1~10 |
| `select-train` | 點擊「查詢班次」且表單驗證通過 | 可選班次列表卡片 | 至少選擇一班次；已滿班次不可選 |
| `confirm` | 選擇班次後點擊「確認購票」 | 訂單摘要（含票價計算）+ 付款確認按鈕 | — |

---

### SharingVehicle 視圖切換與站點展開

```
┌───────────────────────────────────────────────┐
│              SharingVehicle                    │
│                                               │
│  ViewMode: ┌──────┐         ┌──────┐          │
│            │ list │ ◄─────► │ map  │          │
│            └──────┘ toggle  └──────┘          │
│                                               │
│  StationState (列表模式):                      │
│  ┌────────────┐  tap   ┌────────────┐         │
│  │ collapsed  │ ──────►│  expanded  │         │
│  │  (摺疊)    │◄────── │  (展開)    │         │
│  └────────────┘  tap   └────────────┘         │
│                  other                         │
└───────────────────────────────────────────────┘
```

---

### ParkingFinder 停車記錄狀態機

```
   mount()
     │
     ▼
┌──────────────┐  記錄停車   ┌──────────────┐
│  no-record   │ ──────────►│  has-record  │
│ (未記錄狀態)  │            │ (已記錄狀態)  │
│              │◄────────── │              │
└──────────────┘  結束停車   └──────────────┘
                                   │
                                   │ 計時中
                                   ▼
                            ┌──────────────┐
                            │  自動更新     │
                            │ 已停放時間    │
                            │ (每分鐘 tick) │
                            └──────────────┘
```

**狀態說明：**

| 狀態 | UI 呈現 | 資料 |
|---|---|---|
| `no-record` | 停車場列表 +「記錄停車位置」按鈕 | 無停車記錄 |
| `has-record` | 頂部「我的停車位」卡片（含計時）+ 停車場列表 | `ParkedRecord` 物件，含 parkedAt 時間戳 |

---

### ContextPush 推播卡片生命週期

```
   suggestions 傳入
        │
        ▼
  ┌─────────────┐
  │   visible   │  ← 過濾已忽略的 ID 後顯示
  └─────────────┘
        │
        ├── 點擊「規劃路線」──► emit('plan-route') ──► 卡片保留（使用者可能回看）
        ├── 點擊「叫車前往」──► emit('call-ride')  ──► 卡片保留
        └── 點擊「忽略」    ──► 滑動動畫收起 ──► 加入 dismissedSuggestions Set
                                                      ──► 本次 session 不再顯示
```

---

### TicketWallet 票券展開與篩選

```
┌─────────────────────────────────────────┐
│            TicketWallet                  │
│                                         │
│  Filter: [全部] [未使用] [已使用] [已過期]│  ← StatusBadge 按鈕列
│                                         │
│  Ticket State:                          │
│  ┌────────────┐  tap  ┌────────────┐   │
│  │ collapsed  │ ─────►│  expanded  │   │
│  │ (摘要模式)  │◄───── │ (QR 放大)  │   │
│  └────────────┘  tap  └────────────┘   │
│                 outside                  │
└─────────────────────────────────────────┘
```


---

## 資料模型

### 行模組作用域 Token 覆寫

```css
/* pages/transport/index.vue <style scoped> */
.transport-module {
  --color-primary: #f59e0b;          /* 琥珀主色 */
  --color-primary-light: #fffbeb;    /* 琥珀淡底 */
  --color-secondary: #0ea5e9;        /* 天空藍次色（出行/導航） */
  --color-secondary-light: #e0f2fe;  /* 天空藍淡底 */
}
```

### 碳排放係數（每公里 g CO₂）

```typescript
// composables/useCarbonCalculator.ts

const EMISSION_FACTORS: Record<TransportMode, number> = {
  car: 170,           // 汽車/叫車：170g CO₂/km
  motorcycle: 103,    // 機車：103g CO₂/km
  bus: 68,            // 公車：68g CO₂/km
  metro: 35,          // 捷運：35g CO₂/km
  train: 41,          // 台鐵：41g CO₂/km
  hsr: 28,            // 高鐵：28g CO₂/km
  walk: 0,            // 步行：0
}

// bike（共享單車）視為 walk = 0
```

### 高鐵站點資料（模擬）

```typescript
const HSR_STATIONS: Station[] = [
  { id: 'nangang', name: '南港' },
  { id: 'taipei', name: '台北' },
  { id: 'banqiao', name: '板橋' },
  { id: 'taoyuan', name: '桃園' },
  { id: 'hsinchu', name: '新竹' },
  { id: 'miaoli', name: '苗栗' },
  { id: 'taichung', name: '台中' },
  { id: 'changhua', name: '彰化' },
  { id: 'yunlin', name: '雲林' },
  { id: 'chiayi', name: '嘉義' },
  { id: 'tainan', name: '台南' },
  { id: 'zuoying', name: '左營' },
]
```

### 頁面佈局結構（ASCII）

```
┌─────────────────────────────────────┐  ← max-width: 430px Container
│ ┌─────────────────────────────────┐ │
│ │  HEADER (fixed, h=50px)         │ │
│ │  📍 台北市信義區    [👤 用戶]    │ │
│ │  [食] [醫] [住] [行] [預] [樂]  │ │  ← ModuleTab（行 = 選中琥珀底線）
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  TRANSPORT NAV (sticky)         │ │  ← 功能區塊快捷導航
│ │  [路線] [叫車] [購票] [租車] [停車]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  CONTEXT PUSH (條件顯示)         │ │  ← ContextPush.vue
│ │  🍽️ 前往鼎泰豐信義店？            │ │
│ │  [規劃路線] [叫車前往] [忽略]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  TRIP TIMELINE 今日行程          │ │  ← TripTimeline.vue
│ │  09:00 ● 🚇 家→公司 (已完成)     │ │
│ │  12:30 ● 🚕 公司→餐廳 (進行中)   │ │
│ │  19:00 ○ 🚄 台北→桃園 (待出發)   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ FAVORITE ROUTES (橫向滾動) ────┐ │  ← FavoriteRoutes.vue
│ │ [🏠上班] [🏢回家] [🍜常去餐廳]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  ROUTE PLANNER 路線規劃          │ │  ← RoutePlanner.vue
│ │  起點: [📍目前位置          ]    │ │
│ │  終點: [台北101              ]    │ │
│ │  [🚌][🚇][🚄][🚗][🏍][🚶]      │ │  ← 交通方式 Tab
│ │  ┌─ 推薦路線 ─────────────────┐  │ │
│ │  │ 🚇 捷運藍線 → 步行 5min    │  │ │
│ │  │ ⏱ 25min  💰$35  🟢順暢     │  │ │
│ │  │ 🌱 28g CO₂                 │  │ │
│ │  └────────────────────────────┘  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  RIDE SERVICE 叫車服務           │ │  ← RideService.vue
│ │  yoxi                           │ │
│ │  上車: [目前位置]    目的地: [...] │ │
│ │  車種: [轎車][多人][♿][🐾]      │ │
│ │  模式: [即時] [預約]             │ │
│ │  預估: $250~320  等候: 5min     │ │
│ │  [────── 確認叫車 ──────]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  TICKET BOOKING 模擬購票         │ │  ← TicketBooking.vue
│ │  [高鐵] [台鐵]                   │ │
│ │  Step 1/3: 填寫資訊             │ │
│ │  出發站: [台北 ▼]                │ │
│ │  到達站: [左營 ▼]                │ │
│ │  日期: [2026/07/30]             │ │
│ │  [────── 查詢班次 ──────]       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  TICKET WALLET 票券夾            │ │  ← TicketWallet.vue
│ │  [全部][未使用][已使用][已過期]   │ │
│ │  ┌──────────────────────────┐   │ │
│ │  │ 🚄 高鐵 1309             │   │ │
│ │  │ 台北 → 左營  07/28 14:00 │   │ │
│ │  │ [QR Code]    ⬜ 未使用    │   │ │
│ │  └──────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  SHARING VEHICLE 共享運具        │ │  ← SharingVehicle.vue
│ │  [🚲腳踏車][🛵機車][🚗汽車]     │ │
│ │  [列表模式] [地圖模式]           │ │
│ │  ┌──────────────────────────┐   │ │
│ │  │ YouBike 信義區公所站      │   │ │
│ │  │ 120m  可用:8台  🟢充足   │   │ │
│ │  └──────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  PARKING FINDER 停車助手         │ │  ← ParkingFinder.vue
│ │  [我的停車位: 信義停車場 B2]     │ │  ← 條件顯示
│ │  已停放: 1h 23min [導航][結束]  │ │
│ │  ┌──────────────────────────┐   │ │
│ │  │ 台北101停車場             │   │ │
│ │  │ 200m  剩餘:12位  $60/hr  │   │ │
│ │  │ ████████░░░  80%          │   │ │  ← ProgressBar
│ │  └──────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  CARBON TRACKER 碳足跡           │ │  ← CarbonTracker.vue
│ │  本月碳排: 45.2 kg / 目標 80 kg │ │
│ │  ████████████░░░░░░░  56%       │ │  ← ProgressBar（綠色）
│ │  🚗 32kg  🚌 8kg  🚲 -5kg      │ │
│ │  ┌───┐ ┌───┐ ┌───┐             │ │
│ │  │🌱 │ │🚴 │ │░░░│             │ │  ← 減碳成就徽章
│ │  │綠色│ │單車│ │???│             │ │
│ │  └───┘ └───┘ └───┘             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ← padding-bottom: 80px →            │
│                           ┌───┐     │
│                           │ 🤖│     │  ← AiButton
│                           └───┘     │
└─────────────────────────────────────┘
```


---

## 正確性屬性（Correctness Properties）

本行模組包含多個涉及純函數計算的邏輯，適合以屬性測試（PBT）驗證其普遍正確性。

---

### Property 1：碳排放計算非負性與單調性

*對於任意* 交通方式 `mode` 與任意非負距離 `distanceKm`，`calculateEmission(mode, distanceKm)` 的結果 SHALL 始終 ≥ 0，且當 `distanceKm` 增加時，結果不遞減（單調非遞減）。

**Validates: 需求 12.7**

---

### Property 2：碳排放進度百分比 Clamp 不變式

*對於任意* 正數 `total` 與正數 `goal`，`calculateCarbonProgress(total, goal)` 計算出的 `percentage` SHALL 始終落在 `[0, 100]` 的閉區間內。當 `total > goal` 時，`overLimit` SHALL 為 `true`。

**Validates: 需求 12.2, 12.3, 12.4**

---

### Property 3：購票張數限制不變式

*對於任意* 購票表單輸入，`quantity` 的有效值域 SHALL 始終為 `[1, 10]` 的閉區間。任何超出此範圍的輸入 SHALL 被 clamp 至邊界值。

**Validates: 需求 4A.2**

---

### Property 4：停車使用率計算正確性

*對於任意* `availableSpaces` ≥ 0 與 `totalSpaces` > 0，停車使用率 `((totalSpaces - availableSpaces) / totalSpaces) * 100` SHALL 始終落在 `[0, 100]`，且當 `availableSpaces = 0` 時使用率 SHALL 為 100。

**Validates: 需求 6.2**

---

### Property 5：常用路線收藏上限不變式

*對於任意* 操作序列，`FavoriteRoutes` 的 `routes` 陣列長度 SHALL 始終 ≤ 10。新增操作在已達 10 筆時 SHALL 被拒絕並提示使用者。

**Validates: 需求 11.5**

---

## 錯誤處理

### RoutePlanner 路線查詢失敗

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| API 回應逾時（> 10 秒） | 顯示「路線查詢逾時，請重試」提示，提供重試按鈕 | 路線卡片區顯示錯誤，其他元件不受影響 |
| 起點/終點無法解析 | 輸入欄位下方顯示紅色提示「無法辨識此地點」 | 阻止查詢送出 |
| 無可用路線 | 顯示「目前無可用路線」空狀態 | — |

### RideService 叫車異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 無可用車輛 | 顯示「目前無可用車輛，請稍後再試」，自動回到 idle | Toast 通知 + 回到表單 |
| 等候超時（司機未到達） | 顯示「等候超時」提示，提供「取消」與「繼續等候」選項 | waiting 狀態顯示警示 |
| 目的地未填寫 | 禁用「確認叫車」按鈕，`--color-text-disabled` 佔位文字 | 視覺提示 |

### TicketBooking 購票異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 查詢無班次結果 | 顯示「該時段無可用班次」提示，建議調整時間 | select-train 步驟顯示空狀態 |
| 選擇已滿班次 | 該班次卡片以 `--color-text-disabled` 呈現，`cursor: not-allowed`，阻止選取 | 視覺禁用 |
| 出發站=到達站 | 表單驗證失敗，顯示「出發站與到達站不可相同」 | 阻止送出查詢 |

### SharingVehicle 站點資料異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| 位置權限未授權 | 顯示「請開啟定位服務」提示，提供手動輸入地址替代 | 無法自動排序站點距離 |
| 地圖載入失敗 | 同 FoodMap 降級策略：顯示「地圖暫時無法顯示」，自動切換至列表模式 | 地圖模式不可用 |
| 站點資料為空 | 顯示「附近暫無站點」空狀態 | — |

### ParkingFinder 停車記錄異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| GPS 定位失敗 | 顯示「無法取得目前位置」，允許手動輸入停車場名稱與樓層 | 記錄功能降級為手動模式 |
| 停車場資料為空 | 顯示「附近暫無停車場資訊」空狀態 | — |

### TicketWallet QR Code 異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| QR Code 資料無效 | 顯示佔位圖片與「QR Code 載入失敗」文字 | 票券其他資訊正常顯示 |
| 票券列表為空 | 顯示「尚無票券」空狀態插圖 | — |

### CarbonTracker 資料異常

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| `goal = 0` | 防止除以零，百分比設為 0，`goal > 0` 守衛 | 進度條不顯示填充 |
| `total` 為 NaN | 視為 0，`isNaN()` 守衛 | — |

---

## 測試策略

### 整體方針

行模組採用**例子測試為主、屬性測試補充純函數邏輯**的雙軌策略，與全站設計系統一致。

### 測試類型分類

| 類型 | 適用場景 | 工具 |
|---|---|---|
| **快照測試（Snapshot）** | 元件 HTML 結構驗證、CSS class 斷言 | Vitest + `@vue/test-utils` |
| **例子測試（Example）** | 狀態切換、事件觸發、Props 驗證、步驟流程 | Vitest + `@vue/test-utils` |
| **屬性測試（Property）** | 碳排計算、停車使用率、Clamp 邏輯 | Vitest + `fast-check` |
| **整合測試** | 元件間資料流（ContextPush → RoutePlanner）| Vitest + `@vue/test-utils` |

### 屬性測試配置

```typescript
// Property 1：碳排放計算非負性與單調性
import * as fc from 'fast-check'

const transportModes: TransportMode[] = ['bus', 'metro', 'hsr', 'train', 'car', 'motorcycle', 'walk']

it('Feature: transport-module, Property 1: 碳排放計算非負性', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...transportModes),
      fc.float({ min: 0, max: 1000, noNaN: true }),
      (mode, distance) => {
        const result = calculateEmission(mode, distance)
        return result >= 0
      }
    ),
    { numRuns: 100 }
  )
})

it('Feature: transport-module, Property 1: 碳排放計算單調性', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...transportModes),
      fc.float({ min: 0, max: 500, noNaN: true }),
      fc.float({ min: 0, max: 500, noNaN: true }),
      (mode, d1, d2) => {
        const [smaller, larger] = d1 <= d2 ? [d1, d2] : [d2, d1]
        return calculateEmission(mode, larger) >= calculateEmission(mode, smaller)
      }
    ),
    { numRuns: 100 }
  )
})

// Property 2：碳排放進度百分比 Clamp
it('Feature: transport-module, Property 2: 碳排放進度 Clamp', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 500, noNaN: true }),
      fc.float({ min: 1, max: 500, noNaN: true }),
      (total, goal) => {
        const { percentage, overLimit } = calculateCarbonProgress(total, goal)
        return (
          percentage >= 0 &&
          percentage <= 100 &&
          overLimit === (total > goal)
        )
      }
    ),
    { numRuns: 100 }
  )
})

// Property 4：停車使用率計算
it('Feature: transport-module, Property 4: 停車使用率 Clamp', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1000 }),
      fc.integer({ min: 1, max: 1000 }),
      (available, total) => {
        const safeAvailable = Math.min(available, total)
        const usage = ((total - safeAvailable) / total) * 100
        return usage >= 0 && usage <= 100
      }
    ),
    { numRuns: 100 }
  )
})
```

### 單元測試重點覆蓋

| 元件 | 測試重點 | 數量建議 |
|---|---|---|
| `ContextPush` | 有推播時渲染、無推播時隱藏、忽略後不再顯示、emit 正確 | 4 個例子 |
| `TripTimeline` | 空行程顯示、多行程排序、狀態顏色正確、點擊展開 | 4 個例子 |
| `FavoriteRoutes` | 渲染路線列表、點擊帶入、上限 10 筆拒絕新增、刪除 | 4 個例子 |
| `RoutePlanner` | 交通方式切換、路線卡片渲染、路況色彩標示、推薦路線高亮 | 4 個例子 |
| `RideService` | 狀態切換（idle→confirming→waiting）、車種選擇、預約模式、目的地空禁用 | 5 個例子 |
| `TicketBooking` | 步驟切換、表單驗證、班次選擇禁用已滿、購票 emit | 4 個例子 |
| `TicketWallet` | 篩選切換、票券展開 QR Code、已過期灰階、空狀態 | 4 個例子 |
| `SharingVehicle` | 視圖切換、運具篩選、可用狀態色彩、站點展開 | 4 個例子 |
| `ParkingFinder` | 使用率 ProgressBar、即將額滿警示、記錄停車位、計時更新 | 4 個例子 |
| `CarbonTracker` | 正常進度（綠色）、超標（紅色）、徽章解鎖/未解鎖、goal=0 守衛 | 4 個例子 + 屬性測試 |

### 整合測試重點

| 測試場景 | 驗證內容 |
|---|---|
| ContextPush → RoutePlanner | 點擊「規劃路線」後，destination 正確帶入 RoutePlanner |
| ContextPush → RideService | 點擊「叫車前往」後，destination 正確帶入 RideService |
| FavoriteRoutes → RoutePlanner | 點擊常用路線後，origin + destination 正確帶入 |
| TicketBooking → TicketWallet | 購票完成後，新票券出現在 TicketWallet 列表中 |
| 跨模組：食 → 行 | 餐廳訂位後，Context_Push 顯示對應推播建議 |
