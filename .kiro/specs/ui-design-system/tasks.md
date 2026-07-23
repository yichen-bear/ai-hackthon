# 實作計畫：UI/UX 設計系統

## 概覽

依照 requirements.md 與 design.md，以漸進式步驟實作全站設計系統與食模組元件。
技術棧：Nuxt 4 + Vue 3 + TypeScript（`<script setup lang="ts">`）。
元件全部放在 `frontend/app/components/`，透過 Nuxt Auto-import 機制無需手動引入。

---

## 任務

- [x] 1. 建立全域 CSS 設計 Token 與基礎配置
  - [x] 1.1 建立 `frontend/app/assets/css/design-system.css`，在 `:root` 中定義所有 CSS Token
    - 依照 design.md「CSS Token 完整列表」定義顏色、間距、圓角、陰影、字體大小 Token
    - 加入全域 CSS 重置：`*, *::before, *::after { box-sizing: border-box }` 與 `body { margin: 0; font-family: system-ui, sans-serif }`
    - 加入 `.app-container` 基礎樣式：`max-width: 430px; margin: 0 auto; min-height: 100vh; background: var(--color-bg-card); position: relative`
    - 加入 `body` 背景色 `var(--color-bg-page)`
    - 加入 CSS 備用靜態值（於 `var()` 前一行補上硬編碼值），確保舊版瀏覽器降級
    - _需求: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 更新 `frontend/nuxt.config.ts`，在 `css` 陣列中全站引入 `design-system.css`
    - 新增 `css: ['~/assets/css/design-system.css']` 配置
    - _需求: 1.5, 9.4_

  - [x] 1.3 更新 `frontend/app/layouts/default.vue`，實作 430px 置中容器 Layout
    - 外層 `<div class="app-container">` 包裹 `<slot />`
    - 套用 `position: relative` 供 AiButton 相對定位
    - 加入 `padding-top: 50px`（Header 高度）與 `padding-bottom: 80px`（AI 按鈕保留空間）
    - _需求: 1.1, 1.3, 1.4, 3.5, 8.3_

- [x] 2. 實作全域 UI 基礎元件
  - [x] 2.1 建立 `frontend/app/components/ui/ModuleTab.vue`
    - 定義 `ModuleKey` 型別與 `ModuleItem` 介面（含 key、label、route）
    - 以 `defineProps<{ activeTab: ModuleKey }>()` 接收當前選中模組
    - 六個頁籤水平排列，允許橫向滾動（`overflow-x: auto; white-space: nowrap`）
    - 選中頁籤：`color: var(--color-primary)`，底部 `3px solid var(--color-primary)` 底線
    - 未選中頁籤：`color: var(--color-text-disabled)`，無底線
    - 使用 `useRouter().push(route)` 導航至對應路由
    - 加入 `<nav aria-label="模組導覽">` 語意標籤，各頁籤使用 `<button>` 元素
    - 加入 `cursor: pointer`、`transition: 0.15s ease`、`focus-visible` 焦點外框樣式
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.5, 10.1, 10.2, 10.3, 10.5_

  - [x] 2.2 建立 `frontend/app/components/ui/StatusBadge.vue`
    - 定義 `BadgeType` 型別與 `BadgeStyle` 介面
    - 以 `defineProps<{ type: string; label: string }>()` 接收屬性
    - 內部 `computed` 依照 `type` 映射三種預設樣式（available / delivery / popular）
    - 未知 type 降級：灰色底 `#f1f5f9`、`var(--color-text-secondary)` 文字
    - Pill 形狀：`border-radius: var(--radius-full); padding: 2px 10px; font-size: var(--text-xs)`
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.3 建立 `frontend/app/components/ui/TimelineSelector.vue`
    - 定義 `TimeSlot` 介面（`time: string; available: boolean`）
    - 以 `defineProps<{ slots: TimeSlot[]; selected: string }>()` 接收屬性
    - 以 `defineEmits<{ 'update:selected': [timeSlot: string] }>()` 支援 v-model:selected
    - 橫向滾動容器（`overflow-x: auto; white-space: nowrap`），隱藏滾動條（`::-webkit-scrollbar { display: none }`）
    - 未選中有位：白底、`var(--color-border)` 邊框、`var(--color-text-primary)` 文字
    - 已選中：`var(--color-secondary)` 底色、純白文字
    - 已滿（`available=false`）：`var(--color-text-disabled)` 文字、`var(--color-progress-bg)` 底色、`cursor: not-allowed`，阻止點擊事件
    - 加入 `aria-pressed` 屬性標示選中狀態，已滿時加 `aria-disabled="true"`
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1, 10.3_

  - [x] 2.4 建立 `frontend/app/components/ui/ProgressBar.vue`
    - 定義 `ProgressBarProps`（`value: number; label?: string; overLimit?: boolean`）
    - 使用 `computed` 實作 clamp 邏輯：`Math.min(100, Math.max(0, isNaN(value) ? 0 : value))`
    - 底色 `var(--color-progress-bg)`，填滿條：`linear-gradient(90deg, #ff7e5f, #ff5252)`
    - 當 `overLimit=true` 時，終點色換為 `var(--color-accent-red)（#e11d48）`
    - `role="progressbar"`，`aria-valuenow`、`aria-valuemin="0"`、`aria-valuemax="100"` 無障礙屬性
    - 可選 `label` 顯示於進度條下方或旁側
    - _需求: 7.3, 7.4, 7.5, 10.3_

  - [ ]* 2.5 為 ProgressBar 撰寫屬性測試（Property 1）
    - **Property 1：ProgressBar 值域 Clamp 不變式**
    - 安裝 `fast-check`（若尚未安裝）：`npm install -D fast-check`（在 `frontend/` 目錄）
    - 在 `frontend/app/components/ui/__tests__/ProgressBar.spec.ts` 建立測試檔
    - 將 clamp 邏輯提取為可獨立測試的純函數 `clampProgressValue(value: number): number`
    - 使用 `fc.float({ min: -1000, max: 1000 })` 生成任意浮點數輸入
    - 斷言：任意輸入的 clamp 結果始終 `>= 0` 且 `<= 100`，執行 100 次隨機迭代
    - **Validates: 需求 7.5**

  - [x] 2.6 建立 `frontend/app/components/ui/DashboardCard.vue`
    - 純 slot 包裝器，無 Props
    - 樣式：白底 `var(--color-bg-card)`、`var(--radius-lg)` 圓角、`var(--shadow-card)` 陰影、`var(--space-4)` 內距
    - _需求: 7.1, 7.2, 7.6_

  - [x] 2.7 建立 `frontend/app/components/ui/AiButton.vue`
    - 以 `defineEmits<{ 'open-ai': [] }>()` 定義 emit
    - 固定定位：`position: absolute; bottom: 24px; right: 20px; z-index: 999`（相對 `.app-container` 定位）
    - 尺寸 52×52px，圓形（`var(--radius-full)`），背景 `var(--color-primary)`
    - 加入純白圖示（機器人 emoji 或 SVG）
    - `aria-label="開啟 AI 助手"`，`<button>` 元素確保鍵盤可觸達
    - `transition: opacity 0.15s ease`，hover 時 `opacity: 0.85`
    - _需求: 8.1, 8.2, 8.4, 8.5, 10.1, 10.2, 10.3, 10.5_

- [x] 3. 建立 Header 元件與全域 Layout 整合
  - [x] 3.1 建立 `frontend/app/components/ui/AppHeader.vue`
    - 固定頂端：`position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; height: 50px; z-index: 100`
    - 純白背景 `var(--color-bg-card)`，底部 `1px solid var(--color-border)` 細線
    - 左側地點選擇區（📍圖示 + 地點文字），右側用戶資訊區（頭像或用戶名）
    - 包含 `<ModuleTab>` 元件，接收 `activeTab` 屬性
    - 使用 `<header>` 語意標籤，`role="banner"`
    - _需求: 3.1, 3.2, 3.3, 3.4, 10.3_

  - [x] 3.2 更新 `frontend/app/layouts/default.vue`，加入 AppHeader 與 AiButton
    - 在 layout 最上方插入 `<AppHeader :active-tab="activeTab" />`
    - 在 layout 最下方（container 內）插入 `<AiButton @open-ai="handleOpenAi" />`
    - 以 `useRoute()` 計算當前 `activeTab` 值
    - 監聽 `open-ai` 事件（目前 `console.log` 佔位，後續接 AI 助手模組）
    - _需求: 3.4, 3.5, 8.1, 8.2_

- [x] 4. 檢查點 — 全域元件基礎整合驗證
  - 確認所有全域 UI 元件（ModuleTab、StatusBadge、TimelineSelector、DashboardCard、ProgressBar、AiButton、AppHeader）已建立且無 TypeScript 編譯錯誤
  - 確認 `nuxt.config.ts` 已正確引入 CSS，`default.vue` Layout 含置中容器與正確 padding
  - 確認屬性測試通過（若已執行），向使用者確認是否有問題

- [x] 5. 實作食模組元件
  - [x] 5.1 建立 `frontend/app/components/food/BookingCard.vue`
    - 定義 `BookingCardProps`（`restaurantName: string; time: string; partySize: number`）與 `BookingData` 介面
    - 以 `defineProps` 接收屬性，以 `withDefaults` 設定各欄位為可選（未傳入時顯示佔位文字並使用 `var(--color-text-disabled)`）
    - 預填用戶姓名 `'陳小明'`、電話 `'0912-345-678'` 作為 `ref` 初始值
    - 內嵌 `<TimelineSelector>` 元件，傳入預設時段陣列（18:30、19:00 有位，19:30 已滿）
    - 顯示 `<StatusBadge type="delivery" label="支援外送" />`，位置在時段選擇列下方
    - 「確認訂位」按鈕：`var(--color-primary)` 背景、純白文字、`var(--radius-md)` 圓角、`var(--space-4)` 內距
    - 當必填屬性（`restaurantName`、`time`、`partySize`）任一未提供時，禁用確認按鈕（`button[disabled]` 降低透明度）
    - 點擊確認時 `emit('confirm', bookingData)`，bookingData 包含姓名、電話、餐廳名稱、時間、人數
    - 卡片樣式：`var(--radius-lg)` 圓角、`var(--shadow-card)` 陰影、`var(--space-4)` 內距
    - _需求: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 5.2 建立 `frontend/app/components/food/FoodMap.vue`
    - 定義 `FoodMapProps`（`latitude: number; longitude: number; zoom?: number`），zoom 預設值 15
    - 內部狀態：`mapState: Ref<'loading' | 'loaded' | 'error'>` 初始為 `'loading'`
    - 以 Google Maps Embed API iframe 嵌入地圖：`https://www.google.com/maps?q={lat},{lng}&z={zoom}&output=embed`
    - iframe `onload` 時切換至 `'loaded'`，`onerror` 時切換至 `'error'`
    - 載入逾時（8 秒）：以 `onMounted` + `setTimeout` 實作，超時則切換至 `'error'`
    - `lat` / `lng` 未傳入時 Props validation 提示，並降級為台北預設座標（25.033, 121.565）
    - Loading 狀態：顯示骨架屏（`background: var(--color-progress-bg)`，相同高度）
    - Error 狀態：顯示「地圖暫時無法顯示」，`var(--color-text-secondary)` 顏色，不影響其他元件
    - 固定高度 `260px`，寬度 `100%`，`var(--radius-md)` 圓角，`overflow: hidden`
    - _需求: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 5.3 建立 `frontend/app/components/food/CalorieDashboard.vue`
    - 定義 `CalorieDashboardProps`（`calories: number; goal: number`）
    - 使用 `computed` 計算 `percentage`：`Math.min(100, Math.max(0, goal > 0 ? (calories / goal) * 100 : 0))`
    - 使用 `computed` 計算 `overLimit`：`calories > goal`
    - 以 `<DashboardCard>` 包裹整體內容
    - 顯示「+{calories} kcal」大字標題與「目標 {goal} kcal」副標
    - 傳入 `<ProgressBar :value="percentage" :over-limit="overLimit" label="今日熱量進度" />`
    - `overLimit=true` 時，在文字旁顯示超標提示（`var(--color-accent-red)`）
    - _需求: 14.1, 14.2, 14.4, 14.5_

  - [ ]* 5.4 為 CalorieDashboard 撰寫屬性測試（Property 2）
    - **Property 2：Calorie 進度百分比計算正確性**
    - 在 `frontend/app/components/food/__tests__/CalorieDashboard.spec.ts` 建立測試檔
    - 將計算邏輯提取為純函數 `calculateCalorieProgress(calories: number, goal: number): { percentage: number; overLimit: boolean }`
    - 使用 `fc.float({ min: 0, max: 5000, noNaN: true })` 生成 calories，`fc.float({ min: 1, max: 5000, noNaN: true })` 生成 goal（> 0）
    - 斷言：`percentage` 與 `Math.min(100, Math.max(0, (calories / goal) * 100))` 差值 < 0.001
    - 斷言：`overLimit === (calories > goal)`
    - 執行 100 次隨機迭代
    - **Validates: 需求 14.4, 14.5**

  - [x] 5.5 建立 `frontend/app/components/food/FoodPassport.vue`
    - 定義 `Badge` 介面（`icon: string; name: string; unlocked: boolean`）
    - 以 `defineProps<{ badges: Badge[] }>()` 接收屬性
    - 以 `<DashboardCard>` 包裹整體，卡片標題「美食護照」
    - 徽章以 CSS Grid（`grid-template-columns: repeat(4, 1fr)`）排列
    - 已解鎖（`unlocked=true`）：全彩圖示 + `var(--color-text-primary)` 文字
    - 未解鎖（`unlocked=false`）：`filter: grayscale(100%)` + `var(--color-text-disabled)` 文字
    - 每個徽章加 `aria-label="{name} ${unlocked ? '已解鎖' : '未解鎖'}"` 無障礙描述
    - _需求: 14.6, 14.7, 14.8, 14.9_

- [x] 6. 組裝食模組頁面與作用域 Token 覆寫
  - [x] 6.1 更新 `frontend/app/pages/food.vue`，套用 `.food-module` 作用域 Token 覆寫與完整頁面佈局
    - 最外層容器加上 `class="food-module"`
    - 在 `<style scoped>` 中定義 `.food-module` Token 覆寫：`--color-primary: #ff5252; --color-primary-light: #fff1f2; --color-secondary: #00a86b; --color-secondary-light: #d1fae5`
    - 依照 design.md 頁面佈局草圖，依序插入以下元件：
      - `<BookingCard>` 傳入 `restaurantName="鼎泰豐信義店" time="19:00" :party-size="2"` 範例資料
      - `<FoodMap>` 傳入台北信義區座標（`latitude=25.0330` `longitude=121.5654` `:zoom="15"`）
      - `<CalorieDashboard>` 傳入 `:calories="850"` `:goal="2000"` 範例資料
      - `<FoodPassport>` 傳入含 4 個示範徽章的 `badges` 陣列（至少 2 個已解鎖、2 個未解鎖）
    - 加入 `@confirm` 事件處理函式（`console.log` 訂位資料作為佔位）
    - _需求: 12.6, 14.3, 1.5_

- [x] 7. 無障礙驗收與互動回饋補強
  - [x] 7.1 為所有可互動元件補充無障礙屬性與鍵盤支援
    - 確認所有 `<button>` 元素均有 `aria-label` 或可見文字
    - 確認 `ModuleTab` 的 `<nav>` 與各頁籤 `<button>` 具備正確 `aria-current="page"` 或 `aria-selected` 屬性
    - 確認 `TimelineSelector` 時段按鈕的 `aria-pressed`（選中）與 `aria-disabled`（已滿）屬性正確設定
    - 確認 `AiButton` 有 `aria-label="開啟 AI 助手"`
    - 確認 `ProgressBar` 有 `role="progressbar"` 與對應 `aria-valuenow/min/max`
    - 確認所有可互動元件的 `:focus-visible` 外框樣式為 `outline: 2px solid var(--color-primary)`（不設定 `outline: none`）
    - _需求: 10.3, 10.4, 10.5_

  - [ ]* 7.2 撰寫關鍵元件單元測試（例子測試）
    - 在 `frontend/app/components/ui/__tests__/` 建立以下測試檔：
      - `StatusBadge.spec.ts`：測試 available / delivery / popular 三種樣式 + 未知 type 降級（4 個例子）
      - `TimelineSelector.spec.ts`：有位點選 emit、滿位禁用點擊、v-model 同步（3 個例子）
      - `ModuleTab.spec.ts`：選中底線顯示、未選中樣式、點擊路由導航（3 個例子）
    - 在 `frontend/app/components/food/__tests__/` 建立以下測試檔：
      - `BookingCard.spec.ts`：預設值顯示、confirm emit payload 正確、缺 Props 降級（3 個例子）
      - `FoodMap.spec.ts`：loading 骨架屏、loaded 狀態、error 降級文字（3 個例子）
      - `FoodPassport.spec.ts`：已解鎖全彩 vs 未解鎖灰階 CSS 斷言（2 個例子）
    - 使用 Vitest + `@vue/test-utils`
    - _需求: 5.1~5.5, 6.2~6.5, 11.4, 11.7, 13.4, 13.5, 14.7, 14.8_

- [x] 8. 最終檢查點 — 全面整合驗證
  - 確認所有任務完成，TypeScript 無型別錯誤
  - 確認 `food.vue` 頁面可正常渲染所有元件，作用域 Token 覆寫生效（橘紅深化為 `#ff5252`，綠色深化為 `#00a86b`）
  - 確認 Container 在桌面瀏覽器以 430px 置中顯示，兩側以米白色填滿
  - 確認 Header 固定於頂端，AiButton 固定於右下角
  - 確認所有屬性測試（Property 1、Property 2）通過
  - 如有問題請向使用者確認

---

## 備註

- 標有 `*` 的子任務為選填，可跳過以加速 MVP 交付
- 每個任務均標注對應需求編號，確保可追溯性
- 屬性測試（Property 1、Property 2）驗證純函數邏輯的普遍正確性，補充例子測試無法覆蓋的邊界情境
- 食模組 Token 覆寫採用 CSS 選擇器特異度策略（`.food-module { --token }`），子元件自動繼承，無需額外 props 傳遞
- FoodMap 採用 Google Maps Embed API（免費層，無需 JS API Key），若地圖載入失敗可使用靜態圖片降級

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.6", "2.7"] },
    { "id": 3, "tasks": ["2.5", "3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.5"] },
    { "id": 6, "tasks": ["5.4", "6.1"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2"] }
  ]
}
```
