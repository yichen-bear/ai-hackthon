# 需求文件：UI/UX 設計系統

## 簡介

本設計系統為「AI 生活助手」全站子頁面（食、醫、住、行、預、樂）提供統一的視覺語言與元件規範。系統採用 Mobile-First 設計原則，在桌面瀏覽器以置中手機視角呈現，確保跨子頁面的一致性、可維護性與可擴充性。技術棧為 Nuxt 4（Vue 3）搭配 TypeScript，前端路徑為 `frontend/app/`。

---

## 詞彙表

- **Design_System**：本設計系統整體，管理所有設計 Token、元件與版面規則
- **Design_Token**：以 CSS 自訂屬性（`--變數名`）定義的全域設計值，包含顏色、間距、圓角、陰影等
- **Module_Tab**：頂部 Header 中切換「食/醫/住/行/預/樂」六大模組的分頁元件
- **Status_Badge**：顯示狀態資訊（如：實時有位、支援外送、熱門推薦）的 Pill 標籤元件
- **Timeline_Selector**：橫向可滾動的實時時段選擇列元件
- **Dashboard_Card**：顯示摘要資訊（含進度條）的儀表板卡片元件
- **AI_Button**：固定於畫面右下角、進入 AI 助手的懸浮按鈕
- **Header**：固定於頁面頂端、高度 50px 的全站導覽列
- **Primary_Color**：主色，橘紅色（`#f97316`），用於選中狀態與強調
- **Secondary_Color**：次色，鮮綠色（`#22c55e`），用於選中的時段按鈕
- **Container**：全站內容的置中容器，`max-width: 430px`
- **Booking_Card**：食模組中由 AI 預填的訂位確認卡片
- **Food_Map**：食模組中嵌入的 Google Maps 周邊餐廳地圖區塊
- **Calorie_Dashboard**：食模組中顯示每日熱量攝取進度的儀表板
- **Food_Passport**：食模組中記錄已解鎖美食徽章的美食護照元件

---

## 需求

### 需求 1：全站版面與 Container 規範

**用戶故事：** 身為前端開發者，我希望有一套統一的全站版面規則，讓所有子頁面在桌面瀏覽器上都能以手機 App 視角呈現。

#### 驗收標準

1. THE Design_System SHALL 定義一個 `Container` 樣式，設定 `max-width: 430px`、`margin: 0 auto`、`min-height: 100vh`。
2. THE Design_System SHALL 將全站背景色設定為米白色（`#fafaf9`），`Container` 本身為純白色（`#ffffff`）。
3. WHEN 視窗寬度大於 430px 時，THE Container SHALL 在水平方向置中，兩側以背景色填滿。
4. WHEN 視窗寬度小於或等於 430px 時，THE Container SHALL 填滿全部視窗寬度。
5. THE Design_System SHALL 在 `frontend/app/assets/` 路徑下建立全域 CSS 檔案，並在 Nuxt 4 的 `nuxt.config.ts` 中透過 `css` 陣列全站引入。

---

### 需求 2：Design Token（CSS 自訂屬性）

**用戶故事：** 身為前端開發者，我希望所有視覺屬性以 CSS 自訂屬性集中管理，讓跨元件的主題一致且易於維護。

#### 驗收標準

1. THE Design_System SHALL 在 `:root` 選擇器中定義以下顏色 Token：
   - `--color-bg-page: #fafaf9`（頁面背景，米白）
   - `--color-bg-card: #ffffff`（卡片背景，純白）
   - `--color-primary: #f97316`（主色，橘紅）
   - `--color-primary-light: #fff7ed`（主色淡底）
   - `--color-secondary: #22c55e`（次色，鮮綠）
   - `--color-secondary-light: #dcfce7`（次色淡底）
   - `--color-accent-blue: #0369a1`（藍色強調字）
   - `--color-accent-blue-light: #e0f2fe`（藍色淡底）
   - `--color-accent-red: #e11d48`（紅色強調字）
   - `--color-accent-red-light: #ffe4e6`（紅色淡底）
   - `--color-text-primary: #1c1917`（主要文字，近黑）
   - `--color-text-secondary: #78716c`（次要文字，灰）
   - `--color-text-disabled: #cbd5e1`（停用文字，淡灰）
   - `--color-border: #e2e8f0`（一般邊框）
   - `--color-progress-bg: #f1f5f9`（進度條底色）
2. THE Design_System SHALL 在 `:root` 中定義以下間距 Token（以 4px 為基礎單位）：
   - `--space-1: 4px`、`--space-2: 8px`、`--space-3: 12px`、`--space-4: 16px`、`--space-5: 20px`、`--space-6: 24px`
3. THE Design_System SHALL 在 `:root` 中定義以下圓角 Token：
   - `--radius-sm: 6px`、`--radius-md: 12px`、`--radius-lg: 16px`、`--radius-full: 9999px`
4. THE Design_System SHALL 在 `:root` 中定義以下陰影 Token：
   - `--shadow-card: 0 1px 4px rgba(0, 0, 0, 0.06)`（卡片極輕微陰影）
   - `--shadow-float: 0 4px 16px rgba(0, 0, 0, 0.14)`（懸浮元素陰影）
5. THE Design_System SHALL 在 `:root` 中定義以下字體大小 Token：
   - `--text-xs: 11px`、`--text-sm: 13px`、`--text-base: 15px`、`--text-lg: 17px`、`--text-xl: 20px`
6. WHERE 未來主題色需要調整時，THE Design_System SHALL 允許開發者僅修改 `:root` Token 值，即可全站套用變更，無需逐一修改元件樣式。

---

### 需求 3：頂部 Header 元件

**用戶故事：** 身為使用者，我希望頁面頂端有固定的導覽列，顯示當前地點、用戶資訊，並能快速切換六大模組。

#### 驗收標準

1. THE Header SHALL 固定於頁面頂端（`position: fixed; top: 0`），高度為 50px，寬度不超過 `Container` 的 430px。
2. THE Header SHALL 使用純白背景（`--color-bg-card`），底部帶有 1px 細線（顏色為 `--color-border`）。
3. THE Header SHALL 顯示地點選擇區（左側）與用戶資訊區（右側）。
4. THE Header SHALL 包含 Module_Tab 元件，用於切換「食、醫、住、行、預、樂」六大模組。
5. WHEN Header 固定於頂端時，THE Header 下方的頁面內容 SHALL 具備等同 Header 高度（50px）的 `padding-top`，避免內容被遮蓋。

---

### 需求 4：模組頁籤（Module Tab）元件

**用戶故事：** 身為使用者，我希望能透過頁籤在六大功能模組之間切換，且當前模組有清晰的視覺標示。

#### 驗收標準

1. THE Module_Tab SHALL 水平排列「食、醫、住、行、預、樂」六個頁籤，並允許橫向滾動以應對小螢幕。
2. WHEN 某一頁籤為當前選中狀態時，THE Module_Tab SHALL 以 `--color-primary` 顏色顯示文字，並在底部加上 3px 寬的底線（顏色同 `--color-primary`）。
3. WHEN 某一頁籤為未選中狀態時，THE Module_Tab SHALL 以 `--color-text-disabled`（`#cbd5e1`）顯示文字，且無底線。
4. WHEN 使用者點擊某一頁籤時，THE Module_Tab SHALL 導航至對應的子頁面路由（`/food`、`/medical`、`/home`、`/transport`、`/booking`、`/entertainment`）。
5. THE Module_Tab SHALL 使用 Vue 3 的 `<script setup>` 語法，並透過 `defineProps` 接收 `activeTab` 字串屬性以標示當前選中模組。

---

### 需求 5：狀態 Pill 標籤（Status Badge）元件

**用戶故事：** 身為使用者，我希望在卡片上能快速辨識每個項目的狀態（如：有位、外送、熱門），減少閱讀負擔。

#### 驗收標準

1. THE Status_Badge SHALL 支援以下三種預設狀態類型，各有對應的底色與文字色：
   - `available`（實時有位）：底色 `#dcfce7`（`--color-secondary-light`），文字 `#15803d`
   - `delivery`（支援外送）：底色 `#e0f2fe`（`--color-accent-blue-light`），文字 `#0369a1`（`--color-accent-blue`）
   - `popular`（熱門推薦）：底色 `#ffe4e6`（`--color-accent-red-light`），文字 `#e11d48`（`--color-accent-red`）
2. THE Status_Badge SHALL 採用 Pill 形狀（`border-radius: --radius-full`），並設定適當的內距（`padding: 2px 10px`）。
3. THE Status_Badge SHALL 透過 `defineProps` 接收 `type`（狀態類型）與 `label`（顯示文字）兩個屬性。
4. THE Status_Badge SHALL 以 `--text-xs`（11px）字體大小顯示標籤文字。
5. IF 傳入的 `type` 屬性不符合任何預設類型，THEN THE Status_Badge SHALL 採用灰色底（`#f1f5f9`）與灰色文字（`--color-text-secondary`）作為預設樣式。

---

### 需求 6：實時時段選擇列（Timeline Selector）元件

**用戶故事：** 身為使用者，我希望能橫向滑動選擇不同時段，且選中的時段有清晰的視覺回饋。

#### 驗收標準

1. THE Timeline_Selector SHALL 提供一個橫向可滾動的容器（`overflow-x: auto`），隱藏滾動條，讓時段按鈕以單行排列。
2. WHEN 某一時段按鈕為未選中狀態時，THE Timeline_Selector SHALL 以純白背景（`--color-bg-card`）與 `--color-border`（`#cbd5e1`）邊框顯示該按鈕。
3. WHEN 某一時段按鈕為選中狀態時，THE Timeline_Selector SHALL 以 `--color-secondary`（鮮綠底）與純白文字顯示該按鈕。
4. WHEN 使用者點擊某一時段按鈕時，THE Timeline_Selector SHALL 透過 `emit('update:selected', timeSlot)` 通知父元件所選時段。
5. THE Timeline_Selector SHALL 透過 `defineProps` 接收 `slots`（時段字串陣列）與 `selected`（目前選中時段字串）兩個屬性。
6. THE Timeline_Selector SHALL 支援 `v-model:selected` 雙向綁定語法，方便父元件使用。

---

### 需求 7：儀表板卡片（Dashboard Card）元件

**用戶故事：** 身為使用者，我希望重要的摘要資訊（如熱量進度）以卡片形式清晰呈現，且視覺上具有層次感。

#### 驗收標準

1. THE Dashboard_Card SHALL 採用純白背景（`--color-bg-card`）、16px 圓角（`--radius-lg`）與極輕微陰影（`--shadow-card`）。
2. THE Dashboard_Card SHALL 透過 `<slot>` 插槽機制允許父元件插入任意內容，保持元件的通用性。
3. WHERE 需要顯示進度條時，THE Dashboard_Card SHALL 提供一個 `ProgressBar` 子元件，底色為 `--color-progress-bg`（`#f1f5f9`），填滿條採用漸層 `linear-gradient(90deg, #ff7e5f, #ff5252)`。
4. THE ProgressBar 子元件 SHALL 透過 `defineProps` 接收 `value`（0 到 100 之間的數字）與 `label`（說明文字字串）兩個屬性。
5. IF `value` 屬性超出 0 到 100 的範圍，THEN THE ProgressBar 子元件 SHALL 將顯示值限制在 0（最小）或 100（最大）。
6. THE Dashboard_Card SHALL 在卡片內部設定 `--space-4`（16px）的內距（`padding`）。

---

### 需求 8：懸浮 AI 按鈕（AI Button）空間保留

**用戶故事：** 身為使用者，我希望在任何子頁面都能快速進入 AI 助手，且懸浮按鈕不遮擋主要內容操作區域。

#### 驗收標準

1. THE AI_Button SHALL 固定於畫面右下角，位置為 `bottom: 24px`、`right: 20px`，`z-index: 999`。
2. THE AI_Button SHALL 不超出 `Container` 的 430px 範圍（即相對於 `Container` 定位，而非視窗）。
3. THE Design_System SHALL 在頁面底部預留至少 80px 的 `padding-bottom`，確保最後一個可互動元素不被 AI_Button 遮蓋。
4. WHEN 使用者點擊 AI_Button 時，THE AI_Button SHALL 觸發 AI 助手介面的開啟事件（`emit('open-ai')`）。
5. THE AI_Button SHALL 採用 `--color-primary` 作為按鈕背景色，並以純白圓形（`border-radius: --radius-full`，尺寸 52x52px）呈現。

---

### 需求 9：元件目錄結構與命名規範

**用戶故事：** 身為前端開發者，我希望元件依照統一的目錄結構與命名規範組織，方便團隊協作與 Nuxt 4 的自動引入。

#### 驗收標準

1. THE Design_System SHALL 將所有設計系統元件存放於 `frontend/app/components/ui/` 目錄下。
2. THE Design_System SHALL 採用 PascalCase 命名元件檔案，例如：`ModuleTab.vue`、`StatusBadge.vue`、`TimelineSelector.vue`、`DashboardCard.vue`、`ProgressBar.vue`、`AiButton.vue`。
3. THE Design_System SHALL 利用 Nuxt 4 的元件自動引入（Auto-import）機制，所有 `components/` 下的元件無需手動 `import` 即可在 template 中使用。
4. THE Design_System SHALL 將全域 CSS（含 `:root` Token 定義與基礎重置樣式）存放於 `frontend/app/assets/css/design-system.css`，並在 `nuxt.config.ts` 的 `css` 陣列中引入。
5. THE Design_System SHALL 使用 Vue 3 `<script setup lang="ts">` 語法撰寫所有元件，確保 TypeScript 型別安全。

---

### 需求 10：無障礙與互動回饋基礎規範

**用戶故事：** 身為使用者，我希望所有可互動元件都能提供清晰的互動回饋，並具備基本的無障礙支援。

#### 驗收標準

1. THE Design_System SHALL 為所有可互動元件（按鈕、頁籤、時段選擇）設定 `cursor: pointer` 樣式。
2. WHEN 使用者的游標懸停於可互動元件時，THE Design_System SHALL 提供輕微的透明度變化（`opacity: 0.85`）或背景色轉換作為視覺回饋（`transition: 0.15s ease`）。
3. THE Design_System SHALL 為所有可互動元件加入 `aria-label` 或語意化 HTML 標籤（`<button>`、`<nav>`），確保螢幕閱讀器可識別。
4. THE Design_System SHALL 確保所有文字與其背景色的對比度符合 WCAG 2.1 AA 標準（對比度 ≥ 4.5:1）。
5. WHEN 可互動元件獲得鍵盤焦點時，THE Design_System SHALL 顯示可見的焦點外框（`outline: 2px solid --color-primary`），不設定 `outline: none`。

---

### 需求 11：食模組 — AI 自動預填訂位卡片

**用戶故事：** 身為使用者，我希望系統能自動帶入我的基本資料與餐廳資訊，讓我一鍵完成訂位，減少手動輸入的步驟。

#### 驗收標準

1. THE Booking_Card SHALL 自動帶入預設用戶姓名（陳小明）與聯絡電話（0912-345-678）作為預填欄位初始值。
2. THE Booking_Card SHALL 顯示餐廳名稱、預定時間及用餐人數三項資訊。
3. THE Booking_Card SHALL 提供一個一鍵確認按鈕，按鈕文字為「確認訂位」，採用 `--color-primary` 背景色與純白文字。
4. WHEN 使用者點擊確認訂位按鈕時，THE Booking_Card SHALL 透過 `emit('confirm', bookingData)` 將訂位資料（含姓名、電話、餐廳名稱、時間、人數）通知父元件。
5. THE Booking_Card SHALL 採用 `--radius-lg`（16px）圓角、`--shadow-card` 陰影與 `--space-4`（16px）內距，與 Dashboard_Card 視覺層次一致。
6. THE Booking_Card SHALL 透過 `defineProps` 接收 `restaurantName`（餐廳名稱字串）、`time`（預定時間字串）及 `partySize`（人數數字）三個屬性。
7. IF 任一必填屬性（`restaurantName`、`time`、`partySize`）未傳入，THEN THE Booking_Card SHALL 顯示對應欄位的佔位文字（`--color-text-disabled`），不阻擋元件渲染。

---

### 需求 12：食模組 — Inline 實時桌位選單

**用戶故事：** 身為使用者，我希望在訂位卡片上直接看到即時可訂的時段，並以明顯的視覺標示區別有位與無位，快速選擇用餐時間。

#### 驗收標準

1. THE Booking_Card SHALL 在卡片內嵌入 Timeline_Selector 元件，以橫向單行排列方式顯示即時可訂時段（例如 18:30、19:00）。
2. WHEN 某一時段為「即時有位」狀態時，THE Timeline_Selector SHALL 以 `--color-secondary`（`#00a86b`，食模組 inline 實時綠）作為按鈕背景色，並以純白文字顯示。
3. WHEN 某一時段為「已滿」狀態時，THE Timeline_Selector SHALL 以 `--color-text-disabled`（`#cbd5e1`）顯示文字，並設定 `cursor: not-allowed`，禁止選取。
4. THE Booking_Card SHALL 顯示一個 `type="delivery"`、`label="支援外送"` 的 Status_Badge，位置位於時段選擇列下方。
5. WHEN 使用者選取某一即時有位時段時，THE Timeline_Selector SHALL 透過 `emit('update:selected', timeSlot)` 將所選時段同步至 Booking_Card。
6. THE Design_System SHALL 將食模組「即時有位」專用色更新為 `--color-secondary: #00a86b`（食模組 inline 實時綠），並在食模組作用域內覆寫全域 Token。

---

### 需求 13：食模組 — Google Maps 周邊餐廳地圖

**用戶故事：** 身為使用者，我希望在食模組頁面看到周邊餐廳的地圖，直觀了解各餐廳位置，方便選擇。

#### 驗收標準

1. THE Food_Map SHALL 嵌入 Google Maps iframe 或地圖元件，顯示使用者周邊的餐廳標記。
2. THE Food_Map SHALL 設定固定高度（不超過 260px），寬度自動填滿父容器，且不超出 Container 的 430px 最大寬度限制。
3. THE Food_Map SHALL 採用 `--radius-md`（12px）圓角，與頁面卡片視覺風格一致。
4. WHEN Google Maps 資源載入中時，THE Food_Map SHALL 顯示骨架屏（`background: --color-progress-bg`）作為載入佔位，直到地圖完整顯示。
5. IF Google Maps 嵌入失敗或資源無法存取，THEN THE Food_Map SHALL 顯示錯誤提示文字「地圖暫時無法顯示」，並以 `--color-text-secondary` 顏色呈現，不影響頁面其他元件的正常運作。
6. THE Food_Map SHALL 透過 `defineProps` 接收 `latitude`（緯度數字）、`longitude`（經度數字）及 `zoom`（縮放層級數字，預設值 15）三個屬性。

---

### 需求 14：食模組 — 熱量儀表板與美食護照

**用戶故事：** 身為使用者，我希望在食模組頁面能掌握今日的熱量攝取進度，並透過美食護照追蹤已解鎖的飲食成就，增加使用樂趣。

#### 驗收標準

1. THE Calorie_Dashboard SHALL 以 Dashboard_Card 元件包裝，顯示本日熱量攝取進度，格式為「+{數值} kcal」（例如：+850 kcal）。
2. THE Calorie_Dashboard SHALL 使用 ProgressBar 子元件呈現熱量進度，底色為 `--color-progress-bg`（`#f1f5f9`），填滿條採用漸層 `linear-gradient(90deg, #ff7e5f, #ff5252)`（食模組強調色 `#ff5252`）。
3. THE Design_System SHALL 將食模組強調色（進度條終點色）設定為 `--color-primary: #ff5252`，並在食模組作用域內覆寫全域 `--color-primary` Token。
4. THE Calorie_Dashboard SHALL 透過 `defineProps` 接收 `calories`（當日已攝取熱量數字）與 `goal`（每日熱量目標數字）兩個屬性，並自動計算進度百分比（`calories / goal * 100`）傳入 ProgressBar。
5. IF 計算所得進度百分比超過 100，THEN THE ProgressBar SHALL 限制顯示值為 100，並以 `--color-accent-red`（`#e11d48`）替換漸層終點色，提示使用者熱量超標。
6. THE Food_Passport SHALL 以 Dashboard_Card 元件包裝，以網格排列方式顯示已解鎖的美食徽章，每個徽章包含圖示（emoji 或 SVG icon）與名稱文字。
7. WHEN 某一美食徽章為「已解鎖」狀態時，THE Food_Passport SHALL 以全彩圖示與 `--color-text-primary` 文字顯示該徽章。
8. WHEN 某一美食徽章為「未解鎖」狀態時，THE Food_Passport SHALL 以灰階圖示（`filter: grayscale(100%)`）與 `--color-text-disabled` 文字顯示該徽章。
9. THE Food_Passport SHALL 透過 `defineProps` 接收 `badges`（徽章物件陣列，每個物件包含 `icon`、`name` 字串及 `unlocked` 布林值）屬性。
