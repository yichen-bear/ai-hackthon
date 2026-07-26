# 需求文件：住模組（Housing Module）

## 簡介

「住」模組為「AI 生活助手」六大模組之一，專注於居住生活相關服務整合。涵蓋包裹管理、AI 垃圾分類與家事輔助、水電修繕即時追蹤、以及社區公設服務等功能。模組頁面位於 `frontend/app/pages/housing.vue`，元件存放於 `frontend/app/components/housing/` 目錄下。

本模組遵循既有設計系統規範，採用作用域 Token 覆寫策略（`.housing-module` class），使用暖色/大地色系作為模組主題色，並以 Mock 資料預設狀態供 Demo 展示。

---

## 詞彙表

- **Housing_Module**：住模組頁面整體，包含所有住模組子元件與作用域 Token 覆寫
- **Parcel_Dashboard**：包裹管理區元件，顯示待領包裹分類與快速操作按鈕
- **Garbage_AI_Assistant**：AI 垃圾分類與家事區元件，提供拍照辨識模擬、垃圾車倒數與大型家具回收預約
- **Repair_Tracker**：水電修繕與即時追蹤區元件，包含報修表單與派工追蹤卡片
- **Community_Service**：社區與公設區元件，顯示社區公告與公設故障回報功能
- **Urgency_Badge**：包裹緊急標示，以視覺標記區分包裹溫層與領取急迫性
- **Parcel**：待領包裹物件，含溫層類型（冷凍/冷藏/常溫）與到期資訊
- **Repair_Request**：報修請求物件，含故障類型、照片與描述
- **Dispatch_Card**：派工追蹤卡片，顯示師傅即時位置、ETA 倒數與聯絡按鈕
- **Classification_Result**：AI 垃圾分類辨識結果卡片，顯示辨識物品與分類建議

---

## 需求

### 需求 1：住模組頁面結構與作用域 Token 覆寫

**用戶故事：** 身為前端開發者，我希望住模組頁面遵循與食模組、醫模組相同的作用域 Token 覆寫策略，讓模組擁有獨立主題色且視覺風格一致。

#### 驗收標準

1. THE Housing_Module SHALL 在 `frontend/app/pages/housing.vue` 建立頁面，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Housing_Module SHALL 以 `.housing-module` class 包裹最外層容器，並在該作用域內覆寫以下 CSS Token：
   - `--color-primary: #d97706`（琥珀色，暖色大地系主色）
   - `--color-primary-light: #fffbeb`（琥珀色淡底）
   - `--color-secondary: #0d9488`（青綠色，次色）
   - `--color-secondary-light: #ccfbf1`（青綠淡底）
3. THE Housing_Module SHALL 包含 `.housing-page` 內容容器，設定 `display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4)` 佈局。
4. THE Housing_Module SHALL 依序排列子元件：Community_Service 公告區（頂部）、Parcel_Dashboard（頂部）、Garbage_AI_Assistant（中段）、Repair_Tracker（底部）。
5. THE Housing_Module SHALL 使用 `ref` 預設 Mock 響應式狀態（例如 `hasActiveRepair = ref(true)`），供 Hackathon Demo 展示用。

---

### 需求 2：包裹管理區（Parcel Dashboard）

**用戶故事：** 身為住戶，我希望一目了然地看到待領包裹清單與溫層分類，並能快速設定代領或退貨等操作，減少包裹逾期風險。

#### 驗收標準

1. THE Parcel_Dashboard SHALL 在 `frontend/app/components/housing/ParcelDashboard.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Parcel_Dashboard SHALL 以 DashboardCard 元件包裝，採用 `--radius-lg`（16px）圓角、`--shadow-card` 陰影與 `--space-4`（16px）內距。
3. THE Parcel_Dashboard SHALL 將待領包裹依溫層分為三類顯示：冷凍（❄️ 藍色標記）、冷藏（🧊 青色標記）、常溫（📦 褐色標記）。
4. WHEN 包裹為冷凍或冷藏類型時，THE Parcel_Dashboard SHALL 顯示 Urgency_Badge（紅底白字 Pill 標籤），文字為「需今日領取」，提醒住戶優先處理。
5. THE Parcel_Dashboard SHALL 提供三個快速操作按鈕：「系統留言替代電話」、「7-11/智取櫃代領」、「一鍵退貨/代發」，以橫向排列的 Pill 按鈕呈現。
6. WHEN 使用者點擊快速操作按鈕時，THE Parcel_Dashboard SHALL 切換該按鈕的啟用/停用狀態，啟用時以 `--color-primary` 背景色與白色文字顯示，停用時以 `--color-bg-card` 背景與 `--color-border` 邊框顯示。
7. THE Parcel_Dashboard SHALL 透過 `defineProps` 接收 `parcels`（包裹物件陣列，每個物件包含 `id: string`、`name: string`、`type: 'frozen' | 'refrigerated' | 'normal'`、`urgent: boolean`）屬性。

---

### 需求 3：AI 垃圾分類與家事區（Garbage AI Assistant）

**用戶故事：** 身為住戶，我希望能拍照辨識垃圾分類、即時掌握垃圾車到達時間，並能線上預約大型家具回收，讓家事處理更有效率。

#### 驗收標準

1. THE Garbage_AI_Assistant SHALL 在 `frontend/app/components/housing/GarbageAiAssistant.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Garbage_AI_Assistant SHALL 以 DashboardCard 元件包裝，採用與 Parcel_Dashboard 一致的卡片視覺規範。
3. THE Garbage_AI_Assistant SHALL 提供一個「📷 拍照辨識垃圾分類」按鈕，按鈕採用 `--color-primary` 背景色與白色文字，`--radius-md` 圓角。
4. WHEN 使用者點擊拍照辨識按鈕時，THE Garbage_AI_Assistant SHALL 模擬辨識流程（延遲 500ms），並顯示 Classification_Result 結果卡片，內容包含辨識物品名稱、分類類別（一般垃圾/資源回收/廚餘）與處理建議。
5. THE Garbage_AI_Assistant SHALL 顯示垃圾車即時倒數區塊，格式為「🚛 垃圾車還有 {分鐘} 分鐘到社區」，分鐘數以 `--color-accent-red`（紅色）強調顯示。
6. THE Garbage_AI_Assistant SHALL 提供大型家具回收預約表單，包含「物品類型」下拉選單（沙發/床墊/桌椅/家電/其他）、「預約日期」輸入欄位與「送出預約」按鈕。
7. WHEN 使用者點擊送出預約按鈕時，THE Garbage_AI_Assistant SHALL 透過 `emit('submit-recycling', formData)` 將預約資料通知父元件，`formData` 包含 `itemType: string` 與 `date: string`。
8. THE Garbage_AI_Assistant SHALL 透過 `defineProps` 接收 `truckMinutes`（垃圾車倒數分鐘數字）屬性。

---

### 需求 4：水電修繕與即時追蹤區（Repair Tracker）

**用戶故事：** 身為住戶，我希望能線上報修水電問題並即時追蹤師傅位置與預估到達時間，方便安排在家等候的時間。

#### 驗收標準

1. THE Repair_Tracker SHALL 在 `frontend/app/components/housing/RepairTracker.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Repair_Tracker SHALL 以 DashboardCard 元件包裝，採用與其他住模組子元件一致的卡片視覺規範。
3. THE Repair_Tracker SHALL 提供報修表單，包含「故障類型」下拉選單（水管漏水/馬桶堵塞/電路問題/冷氣故障/其他）、「照片上傳」按鈕（模擬，顯示已選擇圖片名稱）與「提交報修」按鈕。
4. WHEN 使用者點擊提交報修按鈕時，THE Repair_Tracker SHALL 透過 `emit('submit-repair', repairData)` 將報修資料通知父元件，`repairData` 包含 `faultType: string`、`photo: string`、`description: string`。
5. WHILE 有進行中的派工任務（`hasActiveRepair = true`）時，THE Repair_Tracker SHALL 顯示 Dispatch_Card 即時追蹤卡片，取代報修表單。
6. THE Dispatch_Card SHALL 顯示以下資訊：師傅名稱、即時位置圖示（模擬地圖標記，以 CSS 繪製的簡易定位動畫）、ETA 倒數計時（格式為「預計 {分鐘} 分鐘抵達」）。
7. THE Dispatch_Card SHALL 提供兩個操作按鈕：「📞 撥打電話」與「💬 傳送訊息確認抵達」，按鈕以橫向排列方式呈現，採用 `--color-primary` 邊框與文字色的外框按鈕樣式。
8. THE Repair_Tracker SHALL 透過 `defineProps` 接收 `hasActiveRepair`（布林值）、`technicianName`（師傅名稱字串）與 `etaMinutes`（預估到達分鐘數字）三個屬性。

---

### 需求 5：社區與公設區（Community Service）

**用戶故事：** 身為住戶，我希望能快速瀏覽社區最新公告並回報公設故障，讓社區管理更順暢。

#### 驗收標準

1. THE Community_Service SHALL 在 `frontend/app/components/housing/CommunityService.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Community_Service SHALL 以 DashboardCard 元件包裝，採用與其他住模組子元件一致的卡片視覺規範。
3. THE Community_Service SHALL 顯示最新社區公告卡片，每則公告包含標題、發佈日期與摘要文字，最多顯示 3 則。
4. THE Community_Service SHALL 以列表方式排列公告，每則公告之間以 1px `--color-border` 分隔線區隔。
5. THE Community_Service SHALL 提供「📷 公設故障回報」按鈕，按鈕採用 `--color-secondary` 背景色與白色文字，`--radius-md` 圓角。
6. WHEN 使用者點擊公設故障回報按鈕時，THE Community_Service SHALL 透過 `emit('report-malfunction')` 通知父元件觸發回報流程。
7. THE Community_Service SHALL 透過 `defineProps` 接收 `announcements`（公告物件陣列，每個物件包含 `id: string`、`title: string`、`date: string`、`summary: string`）屬性。

---

### 需求 6：住模組 Mock 資料與 Demo 控制

**用戶故事：** 身為 Hackathon 展示者，我希望住模組頁面預設有完整的 Mock 資料與狀態切換控制，方便在 Demo 時展示各種使用情境。

#### 驗收標準

1. THE Housing_Module SHALL 使用 `ref` 定義以下 Mock 響應式狀態：
   - `hasActiveRepair: ref<boolean>(true)`（預設有進行中派工）
   - `showClassificationResult: ref<boolean>(false)`（預設未顯示辨識結果）
   - `truckMinutes: ref<number>(8)`（垃圾車倒數 8 分鐘）
2. THE Housing_Module SHALL 預設以下 Mock 資料：
   - 包裹清單：至少 3 筆，涵蓋冷凍、冷藏、常溫各一筆，冷藏包裹標示為 urgent
   - 社區公告：至少 2 則，包含標題、日期與摘要
   - 師傅名稱：「王師傅」，ETA：15 分鐘
3. THE Housing_Module SHALL 提供 Demo 控制面板（固定於右下角），包含以下按鈕：
   - 「🔧 切換派工狀態」：切換 `hasActiveRepair` 布林值
   - 「🔄 重設」：將所有 Mock 狀態恢復為預設值
4. THE Housing_Module 的 Demo 控制面板 SHALL 採用與 medical.vue 相同的固定定位樣式（`position: fixed; bottom: 20px; right: 20px; z-index: 999`）。

---

### 需求 7：視覺一致性與無障礙規範

**用戶故事：** 身為使用者，我希望住模組的視覺風格與其他模組一致，且所有互動元素都具備基本無障礙支援。

#### 驗收標準

1. THE Housing_Module SHALL 使用與 food.vue、medical.vue 相同的 Design System CSS 變數（`--radius-lg`、`--shadow-card`、`--space-4` 等），確保卡片圓角、陰影、間距視覺一致。
2. THE Housing_Module 所有子元件 SHALL 使用 `--text-base`（15px）作為主要文字大小、`--text-sm`（13px）作為次要文字大小、`--text-xs`（11px）作為標籤文字大小。
3. THE Housing_Module 所有可互動元件（按鈕、下拉選單、連結） SHALL 設定 `cursor: pointer`，並提供 hover 時 `opacity: 0.85` 的視覺回饋（`transition: 0.15s ease`）。
4. THE Housing_Module 所有表單按鈕 SHALL 使用語意化 `<button>` 標籤，並設定適當的 `aria-label` 屬性。
5. WHEN 可互動元件獲得鍵盤焦點時，THE Housing_Module SHALL 顯示可見的焦點外框（`outline: 2px solid var(--color-primary)`）。
6. THE Housing_Module SHALL 確保所有文字與背景色組合的對比度符合 WCAG 2.1 AA 標準（對比度 ≥ 4.5:1）。

---

### 需求 8：元件自動引入與目錄規範

**用戶故事：** 身為前端開發者，我希望住模組元件遵循 Nuxt 4 自動引入慣例與既有目錄結構，確保團隊協作順暢。

#### 驗收標準

1. THE Housing_Module SHALL 將所有住模組專屬元件存放於 `frontend/app/components/housing/` 目錄下。
2. THE Housing_Module SHALL 採用 PascalCase 命名元件檔案：`ParcelDashboard.vue`、`GarbageAiAssistant.vue`、`RepairTracker.vue`、`CommunityService.vue`。
3. THE Housing_Module SHALL 利用 Nuxt 4 元件自動引入機制，所有 `components/housing/` 下的元件無需手動 `import` 即可在 template 中使用。
4. THE Housing_Module 頁面檔案 SHALL 位於 `frontend/app/pages/housing.vue`，對應路由 `/housing`。
5. THE Housing_Module 所有元件 SHALL 使用 Vue 3 `<script setup lang="ts">` 語法，確保 TypeScript 型別安全。
