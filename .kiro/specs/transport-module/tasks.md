# 實作計畫：行模組（Transport Module）

## 概覽

依照 requirements.md 與 design.md，以漸進式步驟實作行模組頁面、專屬元件與全站共用票券夾。
技術棧：Nuxt 4 + Vue 3 + TypeScript（`<script setup lang="ts">`）。
行模組元件放在 `frontend/app/components/transport/`，頁面放在 `frontend/app/pages/transport/index.vue`。
票券夾（TicketWallet）為全站共用元件，放在 `frontend/app/components/ui/`。

---

## 任務

- [x] 1. 行模組基礎架構與頁面骨架
  - [x] 1.1 建立 `frontend/app/pages/transport/index.vue` 頁面骨架
    - 最外層容器加上 `class="transport-module"`
    - 在 `<style scoped>` 中定義 `.transport-module` Token 覆寫：
      - `--color-primary: #f59e0b`（琥珀主色）
      - `--color-primary-light: #fffbeb`（琥珀淡底）
      - `--color-secondary: #0ea5e9`（天空藍次色）
      - `--color-secondary-light: #e0f2fe`（天空藍淡底）
    - 頁面內容以 `display: flex; flex-direction: column; gap: var(--space-4)` 垂直堆疊
    - 加入 `<main role="main">` 語意標籤
    - _需求: 1.1, 1.2, 1.3, 1.5_

  - [x] 1.2 建立行模組功能區塊快捷導航列（TransportNav）
    - 在 `transport/index.vue` 內建立 sticky 導航列（可抽為獨立元件或內嵌）
    - 橫向可滾動 Tab：「路線」「叫車」「購票」「租車」「停車」
    - `position: sticky; top: 50px; z-index: 50`，純白背景，底部 1px border
    - 選中 Tab：`--color-primary` 文字 + 底線；未選中：`--color-text-disabled`
    - 點擊 Tab 以 `scrollIntoView({ behavior: 'smooth' })` 捲動至對應區塊
    - 各元件區塊以 `ref` 標記（routeRef、rideRef、ticketRef、sharingRef、parkingRef）
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 1.3 建立 `frontend/app/composables/useTransportState.ts`
    - 定義共享狀態：`sharedDestination`、`sharedOrigin`（`ref<string>`）
    - 定義 `scrollToSection(section)` 方法
    - 定義 `setRouteDestination(dest)` / `setRideDestination(dest)` 方法
    - 定義 `dismissedSuggestions: ref<Set<string>>()` 管理已忽略推播
    - 使用 `provide/inject` 或 `useState`（Nuxt composable）在頁面內共享
    - _需求: 7.3, 7.4, 7.5, 8.2_

  - [x] 1.4 建立 `frontend/app/composables/useCarbonCalculator.ts`
    - 定義 `EMISSION_FACTORS` 碳排放係數常量（參照 design.md）
    - 實作 `calculateEmission(mode, distanceKm): number` 純函數
    - 實作 `calculateCarbonProgress(total, goal): { percentage, overLimit }` 純函數
    - 加入 `isNaN` 守衛與 `goal > 0` 防除零守衛
    - _需求: 12.2, 12.7_

- [x] 2. 情境智慧推播與行程總覽元件
  - [x] 2.1 建立 `frontend/app/components/transport/ContextPush.vue`
    - 以 `defineProps<{ suggestions: ContextSuggestion[] }>()` 接收屬性
    - 以 `defineEmits<{ 'plan-route': [s: ContextSuggestion]; 'call-ride': [s: ContextSuggestion]; 'dismiss': [id: string] }>()` 定義事件
    - 使用 `useTransportState` 取得 `dismissedSuggestions`，過濾已忽略 ID
    - 無推播時整個元件 `v-if="filteredSuggestions.length > 0"` 不渲染
    - 每張推播卡片：DashboardCard 樣式、標題、描述、建議交通方式圖示
    - 三個按鈕：「規劃路線」（`--color-secondary`）、「叫車前往」（`--color-primary`）、「忽略」（灰色文字按鈕）
    - 「忽略」點擊：滑動動畫（`transition: transform 0.3s, opacity 0.3s`）收起卡片
    - 觸控目標 ≥ 44×44px，各按鈕加 `aria-label`
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.1, 9.2_

  - [x] 2.2 建立 `frontend/app/components/transport/TripTimeline.vue`
    - 以 `defineProps<{ trips: TripItem[] }>()` 接收屬性
    - 以 `defineEmits<{ 'trip-action': [trip: TripItem, action: string] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「今日行程」
    - 垂直時間軸 UI：左側時間線條（2px 寬）、圓形節點、右側內容卡片
    - 節點顏色依 status：pending→`--color-primary`、active→`--color-secondary`、completed→`--color-text-disabled`
    - 每個節點包含：時間、交通方式圖示（emoji）、起迄點摘要、狀態文字
    - 點擊節點展開詳情（`v-show` 切換），顯示快捷操作按鈕
    - 空行程時顯示「尚無行程安排」空狀態文字
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 2.3 建立 `frontend/app/components/transport/FavoriteRoutes.vue`
    - 以 `defineProps<{ routes: FavoriteRoute[] }>()` 接收屬性
    - 以 `defineEmits` 定義 `select-route`、`call-ride`、`add`、`edit`、`delete` 事件
    - 橫向可滾動容器（`overflow-x: auto; white-space: nowrap`），隱藏滾動條
    - 每張小卡片：路線名稱、起→終摘要、交通方式圖示、上次使用時間
    - 卡片尺寸固定寬度（140px），觸控友善間距
    - 點擊卡片 emit `select-route`；長按或右上角圖示 emit `edit`/`delete`
    - 末尾顯示「+ 新增」按鈕卡片（routes.length < 10 時）
    - 已達 10 筆時「+ 新增」按鈕禁用，顯示「已達上限」提示
    - _需求: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 3. 智慧路線規劃元件
  - [x] 3.1 建立 `frontend/app/components/transport/RoutePlanner.vue`
    - 以 `defineProps<{ origin?: string; destination?: string }>()` 接收屬性
    - 以 `defineEmits<{ 'route-selected': [route: RouteOption] }>()` 定義事件
    - 以 DashboardCard 包裝整體內容
    - 起點/終點輸入欄位：`<input>` + 「📍使用目前位置」快捷按鈕
    - 交通方式 Tab 列：公車🚌、捷運🚇、高鐵🚄、台鐵🚃、汽車🚗、機車🏍、步行🚶
      - 橫向可滾動、選中以 `--color-secondary` 底色 + 白字、未選中白底灰字
    - 路線結果區：以卡片列表顯示最多 3 條路線
      - 推薦路線：左側 `--color-secondary` 色帶標示
      - 每張路線卡片：預估時間、費用、路線摘要、路況狀態 Badge
      - 路況以 StatusBadge 呈現：順暢(available/綠) / 略擁擠(limited/黃) / 擁擠(popular/紅)
      - 擁擠路段加「建議避開」文字提示
      - 底部顯示碳排放量（g CO₂）小型文字
    - 點擊路線卡片 emit `route-selected`
    - 使用 `useTransportState` 監聯 `sharedDestination` 變更自動填入終點
    - 觸控目標 ≥ 44×44px
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1, 9.7, 12.7_

- [x] 4. 叫車服務元件
  - [x] 4.1 建立 `frontend/app/components/transport/RideService.vue`
    - 以 `defineProps<{ destination?: string; pickup?: string }>()` 接收屬性
    - 以 `defineEmits<{ 'confirm-ride': [data: RideRequest] }>()` 定義事件
    - 以 DashboardCard 包裝，頂部顯示 yoxi 品牌標示文字
    - 內部狀態機：`rideState: Ref<RideState>` 初始為 `'idle'`
    - **idle 狀態 UI：**
      - 模式切換：「即時叫車」/「預約叫車」按鈕組
      - 上車地點輸入欄（預設「目前位置」）
      - 目的地輸入欄（可從 props 帶入，監聽 `sharedDestination`）
      - 車種選擇：一般轎車🚗 / 多人座車🚐 / 無障礙專車♿ / 寵物友善車🐾
        - 以圖示 + 文字網格排列，選中以 `--color-primary` 外框高亮
        - ♿ 加 `aria-label="無障礙專車"`、🐾 加 `aria-label="寵物友善車"`
      - 預約模式時顯示日期/時間選擇器（原生 `<input type="date/time">`）
      - 預估費用區間與等候時間顯示區
      - 「確認叫車」按鈕：`--color-primary` 背景、白字、`--radius-md` 圓角
      - 目的地空時按鈕 `disabled`，降低透明度，佔位文字 `--color-text-disabled`
    - **confirming / waiting / arrived / completed 狀態完整實作**
    - 狀態變更時 `aria-live="polite"` 通知螢幕閱讀器
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 9.1, 9.2, 9.3, 9.4, 9.8_

- [x] 5. 模擬購票元件
  - [x] 5.1 建立 `frontend/app/components/transport/TicketBooking.vue`
    - 以 `defineEmits<{ 'ticket-purchased': [ticket: PurchasedTicket] }>()` 定義事件
    - 以 DashboardCard 包裝
    - 內部狀態機：`currentStep: Ref<BookingStep>` 初始為 `'form'`
    - 票種 Tab 切換：「高鐵」/「台鐵」（切換後重置表單）
    - 3 步驟完整實作（form → select-train → confirm）
    - 表單驗證、張數 clamp 1~10、已滿班次禁用
    - _需求: 4A.1, 4A.2, 4A.3, 4A.4, 4A.5, 4A.6, 9.1, 9.8_

- [x] 6. 票券夾元件（全站共用）
  - [x] 6.1 建立 `frontend/app/components/ui/TicketWallet.vue`
    - 以 `defineProps<{ tickets: Ticket[] }>()` 接收屬性
    - 以 `defineEmits<{ 'ticket-select': [ticket: Ticket]; 'ticket-use': [ticketId: string] }>()` 定義事件
    - 篩選列、卡片列表、QR Code 展開放大、已過期灰階完整實作
    - QR Code 加 `aria-label="票券 QR Code，請出示給驗票閘門掃描"`
    - _需求: 4B.7, 4B.8, 4B.9, 4B.10, 4B.11, 4B.12, 9.5_

- [x] 7. 共享運具元件
  - [x] 7.1 建立 `frontend/app/components/transport/SharingVehicle.vue`
    - 運具類型 Tab、列表+地圖雙視圖、站點展開租借、地圖 iframe 含降級
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 9.1_

- [x] 8. 停車助手元件
  - [x] 8.1 建立 `frontend/app/components/transport/ParkingFinder.vue`
    - no-record/has-record 狀態機、記錄表單、計時、ProgressBar 使用率、紅色警示
    - `aria-live="polite"` 通知
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.1, 9.6_

- [x] 9. 碳足跡追蹤元件
  - [x] 9.1 建立 `frontend/app/components/transport/CarbonTracker.vue`
    - 碳排摘要、ProgressBar（綠/紅）、分類統計、減碳成就徽章 Grid
    - 使用 `useCarbonCalculator` 的 `calculateCarbonProgress` 計算百分比
    - _需求: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8_

- [x] 10. 頁面組裝與元件間資料流
  - [x] 10.1 在 `transport/index.vue` 中組裝所有元件並串接資料流
    - 10 個元件依佈局順序插入
    - ContextPush → RoutePlanner / RideService 目的地帶入
    - FavoriteRoutes → RoutePlanner 起迄點帶入
    - TicketBooking → TicketWallet 新票券加入
    - _需求: 1.3, 1.4, 7.3, 7.4, 8.2, 11.3, 11.4_

  - [x] 10.2 準備模擬資料（Mock Data）
    - mockSuggestions 2 筆、mockTrips 3 筆、mockFavoriteRoutes 3 筆
    - mockTickets 2 筆、mockEmissions 含 3 徽章
    - _需求: 所有元件的 Props 示範_

- [x] 11. 無障礙驗收與觸控優化
  - [x] 11.1 為所有元件補充無障礙屬性與觸控優化
    - 所有可互動按鈕觸控目標 ≥ 44×44px ✅
    - 所有 `<button>` 均有 `aria-label` 或可見文字 ✅
    - RideService ♿ + 🐾 aria-label ✅
    - TicketWallet QR Code aria-label ✅
    - ParkingFinder aria-live 通知 ✅
    - RoutePlanner 路況文字標籤 ✅
    - 所有狀態變更 aria-live 通知 ✅
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 12. 屬性測試與單元測試
  - [x] 12.1 為 `useCarbonCalculator` 撰寫屬性測試
    - Property 1：碳排放計算非負性與單調性（5 個測試，100 次迭代）✅
    - Property 2：碳排放進度百分比 Clamp 不變式（5 個測試，100 次迭代）✅
    - **Validates: 需求 12.2, 12.7**

  - [x] 12.2 為 TicketBooking 撰寫例子測試
    - 7 個測試：初始狀態、驗證錯誤×2、步驟切換、已滿禁用、張數 clamp、票種切換重置 ✅
    - **Validates: 需求 4A.2, 4A.3**

  - [x] 12.3 為 ParkingFinder 撰寫例子測試
    - 7 個測試：使用率、紅色警示、記錄/清除狀態切換、已滿 Badge ✅
    - **Validates: 需求 6.2, 6.3**

  - [x] 12.4 為 FavoriteRoutes 撰寫例子測試
    - 8 個測試：渲染列表、select-route emit、10 筆上限拒絕、delete emit ✅
    - **Validates: 需求 11.5**

- [x] 13. 最終檢查點 — 全面整合驗證
  - [x] 所有元件已建立且無 TypeScript 編譯錯誤 ✅（nuxt build 通過）
  - [x] `transport/index.vue` 頁面可正常渲染所有元件 ✅
  - [x] 作用域 Token 覆寫生效（琥珀主色 `#f59e0b`、天空藍次色 `#0ea5e9`）✅
  - [x] Container 以 430px 置中顯示 ✅
  - [x] 功能導航列 sticky 定位正確 ✅
  - [x] ContextPush 無推播時不渲染 ✅
  - [x] RideService 狀態機切換正常 ✅
  - [x] TicketBooking 步驟式流程正常 ✅
  - [x] TicketWallet 篩選與展開 QR Code 正常 ✅
  - [x] ParkingFinder 記錄停車位與計時功能正常 ✅
  - [x] CarbonTracker 進度條顏色依超標切換 ✅
  - [x] 32 個測試全部通過 ✅

---

## 備註

- 每個任務均標注對應需求編號，確保可追溯性
- 模擬資料（Mock Data）用於展示用途，後續可替換為後端 API 回應
- TicketWallet 為全站共用元件，其他模組（預/樂）可直接引用
- 行模組 Token 覆寫策略與食模組一致（`.transport-module { --token }`），子元件自動繼承
- 地圖功能（SharingVehicle 地圖模式）採用 iframe 降級方案，可後續替換為 Google Maps JS API
- 測試配置：vitest + @vue/test-utils + happy-dom + fast-check

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4"], "status": "completed" },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2", "2.3"], "status": "completed" },
    { "id": 2, "tasks": ["3.1", "4.1"], "status": "completed" },
    { "id": 3, "tasks": ["5.1", "6.1"], "status": "completed" },
    { "id": 4, "tasks": ["7.1", "8.1", "9.1"], "status": "completed" },
    { "id": 5, "tasks": ["10.1", "10.2"], "status": "completed" },
    { "id": 6, "tasks": ["11.1"], "status": "completed" },
    { "id": 7, "tasks": ["12.1", "12.2", "12.3", "12.4"], "status": "completed" },
    { "id": 8, "tasks": ["13"], "status": "completed" }
  ]
}
```
