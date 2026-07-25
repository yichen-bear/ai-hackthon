# 技術設計文件：UI/UX 設計系統

## 概覽

本設計系統為「AI 生活助手」全站子頁面（食、醫、住、行、預、樂）提供統一的視覺語言、CSS Token 架構與 Vue 3 元件規範。採用 Mobile-First 設計原則，以 `max-width: 430px` 置中容器模擬手機 App 視角，確保跨子頁面的一致性、可維護性與可擴充性。

**技術棧：**
- Nuxt 4（v4.5+）+ Vue 3 + TypeScript
- 元件語法：`<script setup lang="ts">`
- 樣式策略：全域 CSS Token（`:root`）+ 元件 Scoped CSS + 食模組作用域覆寫
- 元件自動引入：Nuxt 4 Auto-import

**設計決策：**
- 採用原生 CSS 自訂屬性（CSS Variables）而非 SCSS 變數，確保 JavaScript 可讀取 Token 值，且無需編譯時期依賴。
- 食模組作用域覆寫採用 CSS 選擇器特異度策略（`.food-module { --token: value }`），而非獨立 CSS 檔案，降低維護成本。
- 使用 Nuxt 4 元件自動引入，無需手動 `import`，減少樣板程式碼。

---

## 架構

### 高層次架構圖

```
Nuxt 4 Application
├── nuxt.config.ts
│   └── css: ['~/assets/css/design-system.css']   ← 全域 CSS Token 引入
│
├── app/assets/css/
│   └── design-system.css                          ← :root Token + 基礎重置
│
├── app/layouts/
│   └── default.vue                                ← Container 置中容器
│
├── app/components/ui/                             ← 設計系統元件（Auto-import）
│   ├── ModuleTab.vue                              ← 六大模組頁籤
│   ├── StatusBadge.vue                            ← 狀態 Pill 標籤
│   ├── TimelineSelector.vue                       ← 橫向時段選擇列
│   ├── DashboardCard.vue                          ← 儀表板卡片包裝器
│   ├── ProgressBar.vue                            ← 熱量/進度條
│   └── AiButton.vue                               ← 固定懸浮 AI 按鈕
│
├── app/components/food/                           ← 食模組專屬元件
│   ├── BookingCard.vue                            ← AI 預填訂位卡片
│   ├── FoodMap.vue                                ← Google Maps 嵌入
│   ├── CalorieDashboard.vue                       ← 熱量儀表板
│   └── FoodPassport.vue                           ← 美食護照徽章網格
│
└── app/pages/
    └── food.vue                                   ← 食模組頁面（作用域 Token 覆寫）
```

### 元件依賴關係

```
food.vue (.food-module 作用域)
├── ModuleTab          ← 頂部模組切換（來自 Header）
├── BookingCard
│   ├── TimelineSelector  ← 內嵌時段選擇
│   └── StatusBadge       ← 支援外送標籤
├── FoodMap
├── CalorieDashboard
│   └── DashboardCard
│       └── ProgressBar
└── FoodPassport
    └── DashboardCard
```

---

## 元件清單與職責說明

### 全域基礎層

| 元件／檔案 | 路徑 | 職責 |
|---|---|---|
| `design-system.css` | `assets/css/design-system.css` | `:root` CSS Token 定義、全域 CSS 重置（box-sizing、font）、Container 基礎樣式 |
| `default.vue` (Layout) | `app/layouts/default.vue` | 實作 430px 置中容器包裝，`position: relative` 供 AiButton 相對定位 |

### UI 元件層（`components/ui/`）

| 元件 | 職責 | 主要 Props | 主要 Emits |
|---|---|---|---|
| `ModuleTab.vue` | 頂部六大模組頁籤，顯示選中底線、導航路由 | `activeTab: string` | — |
| `StatusBadge.vue` | 狀態 Pill 標籤，支援 available / delivery / popular 三種預設 | `type: string`, `label: string` | — |
| `TimelineSelector.vue` | 橫向可滾動時段選擇列，支援有位/滿位狀態 | `slots: TimeSlot[]`, `selected: string` | `update:selected` |
| `DashboardCard.vue` | 通用儀表板卡片包裝器（slot 插槽） | — | — |
| `ProgressBar.vue` | 漸層進度條，自動 clamp 0-100 | `value: number`, `label?: string` | — |
| `AiButton.vue` | 固定右下角懸浮 AI 按鈕 | — | `open-ai` |

### 食模組元件層（`components/food/`）

| 元件 | 職責 | 主要 Props | 主要 Emits |
|---|---|---|---|
| `BookingCard.vue` | AI 預填訂位卡片，內嵌 TimelineSelector 與 StatusBadge | `restaurantName: string`, `time: string`, `partySize: number` | `confirm` |
| `FoodMap.vue` | Google Maps iframe 嵌入，含骨架屏與錯誤降級 | `latitude: number`, `longitude: number`, `zoom?: number` | — |
| `CalorieDashboard.vue` | 熱量進度儀表板，自動計算百分比 | `calories: number`, `goal: number` | — |
| `FoodPassport.vue` | 美食徽章網格，全彩/灰階區分已解鎖狀態 | `badges: Badge[]` | — |

---

## 元件介面定義（TypeScript）

### `ModuleTab.vue`

```typescript
// 六大模組定義
type ModuleKey = 'food' | 'medical' | 'home' | 'transport' | 'booking' | 'entertainment'

interface ModuleItem {
  key: ModuleKey
  label: string       // '食' | '醫' | '住' | '行' | '預' | '樂'
  route: string       // '/food' | '/medical' | ...
}

interface ModuleTabProps {
  activeTab: ModuleKey
}
```

### `StatusBadge.vue`

```typescript
type BadgeType = 'available' | 'delivery' | 'popular' | string

interface StatusBadgeProps {
  type: BadgeType
  label: string
}

// 內部樣式映射（元件內部使用）
interface BadgeStyle {
  background: string
  color: string
}
```

### `TimelineSelector.vue`

```typescript
interface TimeSlot {
  time: string          // 例如 '18:30'
  available: boolean    // true = 有位；false = 已滿
}

interface TimelineSelectorProps {
  slots: TimeSlot[]
  selected: string      // 目前選中的時段 time 字串
}

// Emits
// 'update:selected': (timeSlot: string) => void
// 支援 v-model:selected 雙向綁定
```

### `ProgressBar.vue`

```typescript
interface ProgressBarProps {
  value: number         // 0-100，超出範圍自動 clamp
  label?: string        // 可選說明文字
  overLimit?: boolean   // true 時使用紅色警示漸層
}
```

### `AiButton.vue`

```typescript
// 無 Props，僅有 Emit
// Emits: 'open-ai': () => void
```

### `DashboardCard.vue`

```typescript
// 純 slot 包裝器，無 Props
// Template: <slot /> 插槽接受任意內容
```

### `BookingCard.vue`

```typescript
interface BookingCardProps {
  restaurantName: string    // 餐廳名稱；未傳入時顯示佔位文字
  time: string              // 預定時間字串，例如 '19:00'
  partySize: number         // 用餐人數
}

interface BookingData {
  userName: string          // 預設 '陳小明'
  phone: string             // 預設 '0912-345-678'
  restaurantName: string
  time: string
  partySize: number
}

// Emits: 'confirm': (data: BookingData) => void
```

### `FoodMap.vue`

```typescript
interface FoodMapProps {
  latitude: number
  longitude: number
  zoom?: number             // 預設值 15
}

// 元件內部狀態
type MapState = 'loading' | 'loaded' | 'error'
```

### `CalorieDashboard.vue`

```typescript
interface CalorieDashboardProps {
  calories: number          // 當日已攝取熱量（kcal）
  goal: number              // 每日熱量目標（kcal）
}

// 內部計算：percentage = Math.min(100, Math.max(0, (calories / goal) * 100))
// overLimit = calories > goal
```

### `FoodPassport.vue`

```typescript
interface Badge {
  icon: string              // emoji 或 SVG icon 路徑
  name: string              // 徽章名稱
  unlocked: boolean         // true = 全彩；false = 灰階
}

interface FoodPassportProps {
  badges: Badge[]
}
```

---

## 資料模型

### CSS Token 完整列表（`:root` 定義）

以下為 `frontend/app/assets/css/design-system.css` 中 `:root` 的完整 Token 定義：

```css
:root {
  /* ── 顏色：背景 ── */
  --color-bg-page: #fafaf9;          /* 頁面背景，米白 */
  --color-bg-card: #ffffff;          /* 卡片背景，純白 */

  /* ── 顏色：主色（橘紅系） ── */
  --color-primary: #f97316;          /* 主色，橘紅，選中狀態與強調 */
  --color-primary-light: #fff7ed;    /* 主色淡底 */

  /* ── 顏色：次色（鮮綠系） ── */
  --color-secondary: #22c55e;        /* 次色，鮮綠，選中時段按鈕 */
  --color-secondary-light: #dcfce7;  /* 次色淡底 */

  /* ── 顏色：強調色 ── */
  --color-accent-blue: #0369a1;      /* 藍色強調字（外送標籤） */
  --color-accent-blue-light: #e0f2fe;
  --color-accent-red: #e11d48;       /* 紅色強調字（熱門/超標） */
  --color-accent-red-light: #ffe4e6;

  /* ── 顏色：文字 ── */
  --color-text-primary: #1c1917;     /* 主要文字，近黑 */
  --color-text-secondary: #78716c;   /* 次要文字，灰 */
  --color-text-disabled: #cbd5e1;    /* 停用/未選中文字，淡灰 */

  /* ── 顏色：結構 ── */
  --color-border: #e2e8f0;           /* 一般邊框 */
  --color-progress-bg: #f1f5f9;      /* 進度條底色 */

  /* ── 間距（4px 基礎單位） ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  /* ── 圓角 ── */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* ── 陰影 ── */
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.06);    /* 卡片極輕微陰影 */
  --shadow-float: 0 4px 16px rgba(0, 0, 0, 0.14);  /* 懸浮元素陰影 */

  /* ── 字體大小 ── */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 20px;
}
```

### 食模組作用域 Token 覆寫策略

食模組頁面（`food.vue`）在最外層容器加上 `.food-module` class，透過 CSS 選擇器特異度覆寫全域 Token：

```css
/* food.vue 或 food.vue 的 <style scoped> 內 */
.food-module {
  /* 食模組主色：橘紅深化，對應 #ff5252（進度條終點色） */
  --color-primary: #ff5252;
  --color-primary-light: #fff1f2;

  /* 食模組即時有位專用色：深綠 #00a86b 覆寫全域 #22c55e */
  --color-secondary: #00a86b;
  --color-secondary-light: #d1fae5;
}
```

**覆寫策略設計決策：**
- 使用 class 選擇器覆寫（`.food-module { --token }`）而非 CSS `@scope`（瀏覽器支援度不足），確保相容性。
- 食模組子元件（BookingCard、CalorieDashboard 等）自動繼承父容器的 Token 覆寫，無需傳入額外 props。
- 全域元件（ModuleTab、AiButton 等）在食模組內亦自動套用覆寫色，保持一致的橘紅深化主題。

---

## 食模組頁面佈局

### 頁面結構草圖（ASCII）

```
┌─────────────────────────────────────┐  ← max-width: 430px Container
│ ┌─────────────────────────────────┐ │
│ │  HEADER (fixed, h=50px)         │ │
│ │  📍 台北市信義區    [👤 用戶]    │ │
│ │  [食] [醫] [住] [行] [預] [樂]  │ │  ← ModuleTab（食 = 選中橘紅底線）
│ └─────────────────────────────────┘ │
│                                     │
│ ← padding-top: 50px →               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  BOOKING CARD                   │ │  ← BookingCard.vue
│ │  🍽️ 鼎泰豐信義店                 │ │
│ │  👤 陳小明  📞 0912-345-678      │ │  ← 預填欄位
│ │  [18:30 ●] [19:00 ●] [19:30 ✗] │ │  ← TimelineSelector（●有位 ✗滿）
│ │  [支援外送]                      │ │  ← StatusBadge type="delivery"
│ │  ┌──────────────────────────┐   │ │
│ │  │      確認訂位             │   │ │  ← 主色按鈕
│ │  └──────────────────────────┘   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  FOOD MAP (h=260px)             │ │  ← FoodMap.vue
│ │  ┌─────────────────────────┐    │ │
│ │  │  [Google Maps iframe]   │    │ │
│ │  │  骨架屏 → 地圖 → 錯誤   │    │ │
│ │  └─────────────────────────┘    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  CALORIE DASHBOARD              │ │  ← CalorieDashboard → DashboardCard
│ │  +850 kcal  / 2000 kcal 目標    │ │
│ │  ████████████░░░░░░░░░░  42%    │ │  ← ProgressBar（橘紅漸層）
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  FOOD PASSPORT 美食護照          │ │  ← FoodPassport → DashboardCard
│ │  ┌───┐ ┌───┐ ┌───┐ ┌───┐       │ │
│ │  │🍜 │ │🍣 │ │☕ │ │░░░│       │ │  ← 網格（彩色=解鎖 / 灰色=未解鎖）
│ │  │拉麵│ │壽司│ │咖啡│ │???│       │ │
│ │  └───┘ └───┘ └───┘ └───┘       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ← padding-bottom: 80px →            │
│                                     │
│                           ┌───┐     │
│                           │ 🤖│     │  ← AiButton (fixed bottom-right)
│                           └───┘     │
└─────────────────────────────────────┘
```

### 頁面捲動與固定元素

- **Header**（固定 top: 0）：z-index: 100，滾動時保持可見
- **AiButton**（固定 bottom: 24px, right: 20px）：z-index: 999，相對 Container 定位
- **主要內容區**：正常文件流，`padding-top: 50px`（Header 高度），`padding-bottom: 80px`（AI 按鈕保留空間）

---

## 元件狀態機說明

### Timeline_Selector 時段狀態機

```
TimeSlot 狀態：available | full

                  ┌──────────────────────────────────────────┐
                  │            TimeSlot                      │
                  │                                          │
   available=true │  ┌──────────┐    click    ┌──────────┐  │
   ──────────────►│  │ unselected│ ──────────►│ selected │  │
                  │  │ 白底綠框  │◄────────── │ 綠底白字  │  │
                  │  └──────────┘  click other└──────────┘  │
                  │                                          │
   available=false│  ┌──────────┐                           │
   ──────────────►│  │   full   │  (無法互動)               │
                  │  │ 灰字禁用  │                           │
                  │  └──────────┘                           │
                  └──────────────────────────────────────────┘
```

**狀態說明：**

| 狀態 | 觸發條件 | 視覺樣式 | 互動行為 |
|---|---|---|---|
| `unselected`（未選中有位） | `available=true` 且非 selected | 白底 `--color-bg-card`，`--color-border` 邊框，`--color-text-primary` 文字 | 可點擊，emit `update:selected` |
| `selected`（已選中） | `available=true` 且 `time === selected` | `--color-secondary` 底（食模組為 `#00a86b`），純白文字 | 可點擊取消（emit 空字串）或直接確認 |
| `full`（已滿） | `available=false` | `--color-text-disabled` 文字，`--color-progress-bg` 底，`cursor: not-allowed` | 不可點擊，阻止事件 |

### FoodMap 載入狀態機

```
              mount()
                │
                ▼
          ┌──────────┐
          │  loading  │  骨架屏（灰色佔位區塊）
          └──────────┘
               │ iframe onload
               ├────────────────► ┌──────────┐
               │                  │  loaded  │  顯示地圖
               │                  └──────────┘
               │ iframe onerror / 載入逾時
               └────────────────► ┌──────────┐
                                   │  error   │  「地圖暫時無法顯示」
                                   └──────────┘
```

### ProgressBar 值限制邏輯

```
輸入 value
     │
     ▼
  value < 0 ? ──► clampedValue = 0
     │
  value > 100 ? ──► clampedValue = 100，且 overLimit = true
     │
  0 ≤ value ≤ 100 ──► clampedValue = value

overLimit = true 時：漸層終點色換為 --color-accent-red（#e11d48）
```

---

## 正確性屬性（Correctness Properties）

*屬性（Property）是一個系統在所有有效執行情境下都應成立的特性或行為——本質上是對系統應做什麼的形式化陳述。屬性在人類可讀的規格與機器可驗證的正確性保證之間架起了橋梁。*

本設計系統主要為 UI 渲染元件，大多數需求屬於 UI 快照測試或例子測試範疇。以下兩個屬性涉及純函數計算邏輯，適合屬性測試（PBT）：

---

### Property 1：ProgressBar 值域 Clamp 不變式

*對於任意* 數值輸入 `value`，`ProgressBar` 元件計算出的顯示百分比，應始終落在 `[0, 100]` 的閉區間內，不論輸入值為任何正數、負數或超出範圍的數值。

**Validates: Requirements 7.5**

---

### Property 2：Calorie 進度百分比計算正確性

*對於任意* 正數 `calories` 與正數 `goal`，`CalorieDashboard` 計算出的進度百分比應等於 `(calories / goal) * 100`（未 clamp 前），且 clamp 後結果應等於 `Math.min(100, Math.max(0, (calories / goal) * 100))`。當 `calories > goal` 時，`overLimit` 旗標應為 `true`。

**Validates: Requirements 14.4, 14.5**

---

## 錯誤處理

### FoodMap 載入失敗降級

| 失敗情境 | 處理方式 | 使用者體驗影響 |
|---|---|---|
| iframe `onerror` 觸發 | 切換至 `error` 狀態，顯示「地圖暫時無法顯示」文字 | 地圖區塊顯示錯誤訊息，其他元件不受影響 |
| `latitude`/`longitude` 未傳入 | Props validation 發出 Vue warning，地圖顯示預設位置（台北 25.033, 121.565）或錯誤狀態 | 開發時期警告，生產環境降級為預設位置 |
| iframe 載入逾時（> 8 秒） | 切換至 `error` 狀態（透過 `setTimeout` 實作） | 同上 |

### BookingCard 缺少 Props

| 缺少 Props | 處理方式 |
|---|---|
| `restaurantName` 未傳入 | 顯示佔位文字「餐廳名稱」，以 `--color-text-disabled` 顏色呈現 |
| `time` 未傳入 | 顯示佔位文字「選擇時間」 |
| `partySize` 未傳入 | 顯示佔位文字「--人」 |
| 所有必填未傳入 | 元件仍正常渲染，禁用「確認訂位」按鈕，`button[disabled]` 樣式降低透明度 |

### ProgressBar 異常輸入

| 異常輸入 | 處理方式 |
|---|---|
| `value < 0` | clamp 為 0，進度條不顯示填充 |
| `value > 100` | clamp 為 100，進度條填滿，終點色換為 `--color-accent-red` |
| `value = NaN` | 視為 0，`isNaN()` 守衛 |
| `goal = 0`（CalorieDashboard） | 防止除以零，百分比設為 0，`goal > 0` 守衛 |

### CSS Token 降級

若瀏覽器不支援 CSS 自訂屬性（極少數舊版瀏覽器），各元件樣式回落至硬編碼的備用色值（在 CSS 屬性後加靜態備用值）：

```css
/* 範例：備用色值寫在 var() 前一行 */
background-color: #f97316;
background-color: var(--color-primary, #f97316);
```

---

## 測試策略

### 整體方針

本設計系統大部分為 UI 渲染元件，採用**例子測試為主、屬性測試補充純函數邏輯**的雙軌策略。

### 測試類型分類

| 類型 | 適用場景 | 工具 |
|---|---|---|
| **快照測試（Snapshot）** | 元件 HTML 結構驗證、CSS class 斷言 | Vitest + `@vue/test-utils` |
| **例子測試（Example）** | 狀態切換、事件觸發、Props 驗證 | Vitest + `@vue/test-utils` |
| **屬性測試（Property）** | ProgressBar clamp、CalorieDashboard 百分比計算 | Vitest + `fast-check` |
| **無障礙測試** | aria-label、語意 HTML、對比度 | `axe-core` / `vitest-axe` |

### 屬性測試配置

使用 `fast-check`（TypeScript 原生支援）實作屬性測試，每個屬性測試最少執行 **100 次**隨機迭代。

```typescript
// 安裝
// npm install -D fast-check

// Property 1：ProgressBar clamp
import * as fc from 'fast-check'

it('Feature: ui-design-system, Property 1: ProgressBar 值域 Clamp 不變式', () => {
  fc.assert(
    fc.property(fc.float({ min: -1000, max: 1000 }), (value) => {
      const result = clampProgressValue(value)  // 待測純函數
      return result >= 0 && result <= 100
    }),
    { numRuns: 100 }
  )
})

// Property 2：CalorieDashboard 百分比計算
it('Feature: ui-design-system, Property 2: Calorie 進度百分比計算正確性', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 5000, noNaN: true }),
      fc.float({ min: 1, max: 5000, noNaN: true }),  // goal > 0
      (calories, goal) => {
        const { percentage, overLimit } = calculateCalorieProgress(calories, goal)
        const expected = Math.min(100, Math.max(0, (calories / goal) * 100))
        return (
          Math.abs(percentage - expected) < 0.001 &&
          overLimit === (calories > goal)
        )
      }
    ),
    { numRuns: 100 }
  )
})
```

### 單元測試重點覆蓋

| 元件 | 測試重點 | 數量建議 |
|---|---|---|
| `StatusBadge` | 3 種預設 type 樣式 + 未知 type 降級 | 4 個例子 |
| `TimelineSelector` | 有位點選 emit、滿位禁用點擊、v-model 同步 | 3 個例子 |
| `BookingCard` | 預設值顯示、confirm emit 含正確 payload、缺少 Props 降級 | 3 個例子 |
| `FoodMap` | loading 骨架屏、loaded 狀態、error 降級文字 | 3 個例子 |
| `FoodPassport` | 已解鎖全彩 vs 未解鎖灰階 CSS class | 2 個例子 |
| `ProgressBar` | value=0、value=100、value=50 → 屬性測試補完邊界外情境 | 3 例子 + 屬性測試 |
| `CalorieDashboard` | calories=0、calories=goal、calories>goal | 3 例子 + 屬性測試 |
| `ModuleTab` | 選中底線顯示、未選中樣式、點擊路由導航 | 3 個例子 |
| `AiButton` | 點擊觸發 `open-ai` emit、固定定位 CSS | 2 個例子 |

### 無障礙驗證

- 使用 `axe-core` 對每個關鍵元件執行 WCAG 2.1 AA 合規掃描
- 手動確認焦點順序：Header → 模組頁籤 → 主要內容 → AiButton
- 注意：完整的無障礙驗證需要搭配實際螢幕閱讀器（NVDA / VoiceOver）進行手動測試
