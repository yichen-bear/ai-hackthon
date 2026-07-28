# 需求文件：行模組（Transport Module）

## 簡介

「行」模組為「AI 生活助手」六大子頁面之一，提供使用者從出門到抵達目的地的完整交通解決方案。涵蓋智慧路線規劃、叫車服務、模擬購票與票券夾、共享運具租賃、停車助手，以及情境智慧推播等功能。模組主色為琥珀色（`#f59e0b`），沿用全站設計系統 Token 架構，並以 `.transport-module` 作用域覆寫全域 Token。

技術棧與全站一致：Nuxt 4（Vue 3）+ TypeScript，元件位於 `frontend/app/components/transport/`，頁面位於 `frontend/app/pages/transport/index.vue`。

---

## 詞彙表

- **Transport_Module**：「行」模組整體，管理所有交通相關功能與元件
- **Route_Planner**：智慧路線規劃元件，支援多種交通方式的路線計算與顯示
- **Traffic_Map**：即時路況地圖，顯示道路車流狀況與擁擠路段標示
- **Ride_Service**：叫車服務元件，整合 yoxi 叫車平台的即時/預約叫車功能
- **Ticket_Booking**：模擬購票元件，提供高鐵/台鐵的購票流程模擬介面
- **Ticket_Wallet**：票券夾元件（全站共用），管理動態 QR Code 票券的展示與使用
- **Sharing_Vehicle**：共享運具元件，顯示周邊可租借的腳踏車/機車/汽車站點
- **Parking_Finder**：停車助手元件，查詢周邊即時車位並紀錄停放位置
- **Context_Push**：情境智慧推播元件，依據時間/天氣/跨模組行程主動建議交通方案
- **Trip_Timeline**：行程時間軸元件，以垂直時間軸串聯當日所有交通行程
- **Favorite_Routes**：常用路線收藏元件，儲存使用者常用路線供一鍵啟動
- **Carbon_Tracker**：碳足跡追蹤元件，統計交通碳排放量並管理減碳成就徽章
- **Transport_Mode**：交通方式類型，包含公車、捷運、高鐵、台鐵、汽車、機車、步行
- **Vehicle_Type**：共享運具類型，包含腳踏車、機車、汽車

---

## 需求

### 需求 1：行模組頁面佈局與作用域 Token 覆寫

**用戶故事：** 身為使用者，我希望進入「行」模組時，頁面呈現一致的琥珀色交通主題，且所有元件風格和諧統一。

#### 驗收標準

1. THE Transport_Module SHALL 在最外層容器加上 `class="transport-module"`，並在作用域內覆寫全域 Token：
   - `--color-primary: #f59e0b`（琥珀主色）
   - `--color-primary-light: #fffbeb`（琥珀淡底）
   - `--color-secondary: #0ea5e9`（天空藍次色，代表出行/導航）
   - `--color-secondary-light: #e0f2fe`（天空藍淡底）
2. THE Transport_Module SHALL 沿用全站 `Container`（max-width: 430px 置中）與 `default.vue` Layout 結構。
3. THE Transport_Module SHALL 依序以垂直堆疊方式排列核心元件：Route_Planner → Ride_Service → Ticket_Booking → Sharing_Vehicle → Parking_Finder，各元件間以 `var(--space-4)` 間距分隔。
4. THE Transport_Module SHALL 在頁面頂部顯示情境智慧推播區塊（Context_Push），當有推播建議時以卡片形式呈現。
5. THE Transport_Module 頁面路由 SHALL 為 `/transport`，並正確對應 ModuleTab 的「行」頁籤選中狀態。

---

### 需求 2：智慧路線規劃（Route Planner）

**用戶故事：** 身為使用者，我希望輸入起點與終點後，系統能根據即時路況推薦最佳交通路線，並支援多種交通方式的切換比較。

#### 驗收標準

1. THE Route_Planner SHALL 提供起點與終點兩個輸入欄位，支援文字輸入與「使用目前位置」快捷按鈕。
2. THE Route_Planner SHALL 支援以下交通方式的切換選擇：公車、捷運、高鐵、台鐵、汽車、機車、步行，以圖示 + 文字的橫向 Tab 列呈現。
3. WHEN 使用者選擇交通方式並輸入起迄點後，THE Route_Planner SHALL 顯示建議路線卡片，包含：
   - 預估行程時間
   - 預估費用（若適用）
   - 路線摘要（如：捷運藍線 → 步行 5 分鐘）
   - 即時路況狀態標示（順暢/略擁擠/擁擠）
4. THE Route_Planner SHALL 支援顯示最多 3 條替代路線，以卡片列表方式呈現，使用者可點選查看詳情。
5. WHEN 路線包含擁擠路段時，THE Route_Planner SHALL 以 `--color-accent-red` 標示該路段，並在路線摘要中提示「建議避開」。
6. THE Route_Planner SHALL 以 `--color-secondary`（天空藍）標示推薦的最佳路線。
7. THE Route_Planner SHALL 透過 `defineProps` 接收 `origin`（起點字串，可選）與 `destination`（終點字串，可選）屬性，支援從其他模組帶入目的地。
8. THE Route_Planner SHALL 以 DashboardCard 包裝整體內容，套用標準卡片圓角與陰影。

---

### 需求 3：叫車服務（Ride Service — yoxi）

**用戶故事：** 身為使用者，我希望能在 App 內快速叫車，支援即時叫車與預約排程，且能選擇無障礙專車等特殊服務。

#### 驗收標準

1. THE Ride_Service SHALL 整合 yoxi 叫車平台，提供即時叫車與預約叫車兩種模式切換。
2. THE Ride_Service SHALL 顯示以下叫車資訊欄位：
   - 上車地點（預設帶入目前位置或使用者輸入）
   - 目的地（可從 Route_Planner 帶入）
   - 預估費用區間
   - 預估等候時間
3. THE Ride_Service SHALL 提供車種選擇，至少包含：
   - 一般轎車
   - 多人座車（6 人以上）
   - 無障礙專車
   - 寵物友善車
4. WHEN 使用者選擇「預約叫車」模式時，THE Ride_Service SHALL 顯示日期與時間選擇器，允許使用者設定未來的上車時間。
5. THE Ride_Service SHALL 提供「確認叫車」按鈕，按鈕使用 `--color-primary` 背景色與純白文字，點擊後 `emit('confirm-ride', rideData)` 通知父元件。
6. WHEN 叫車確認後，THE Ride_Service SHALL 切換至等候狀態畫面，顯示司機資訊（車牌、車型、司機姓名）與預估到達倒數計時。
7. THE Ride_Service SHALL 以 DashboardCard 包裝，並在卡片頂部顯示 yoxi 品牌標示。
8. IF 目的地未輸入，THEN THE Ride_Service SHALL 禁用「確認叫車」按鈕，並以 `--color-text-disabled` 顯示佔位提示文字。

---

### 需求 4：模擬購票與票券夾（Ticket Booking & Ticket Wallet）

**用戶故事：** 身為使用者，我希望能在 App 內模擬購買高鐵/台鐵車票的流程，並將購買的票券統一收納在票券夾中，方便搭車時出示 QR Code。

#### 驗收標準

##### 4A：模擬購票（Ticket Booking）

1. THE Ticket_Booking SHALL 支援高鐵與台鐵兩種票種的切換（以 Tab 或切換按鈕呈現）。
2. THE Ticket_Booking SHALL 提供以下購票表單欄位：
   - 出發站（下拉選單）
   - 到達站（下拉選單）
   - 出發日期（日期選擇器）
   - 出發時間（時段選擇或指定時間）
   - 票種（全票/孩童票/敬老票/愛心票）
   - 張數（數量選擇器，1~10）
3. WHEN 使用者完成表單填寫並點擊「查詢班次」時，THE Ticket_Booking SHALL 顯示可選班次列表，每筆包含：
   - 車次號碼
   - 出發時間 → 到達時間
   - 行車時間
   - 票價
   - 座位狀態（可選座位/僅站票/已滿）
4. WHEN 使用者選擇班次並點擊「確認購票」時，THE Ticket_Booking SHALL `emit('ticket-purchased', ticketData)` 通知父元件，並將票券加入 Ticket_Wallet。
5. THE Ticket_Booking SHALL 以步驟式（Step 1: 填寫資訊 → Step 2: 選擇班次 → Step 3: 確認付款）流程引導使用者。
6. THE Ticket_Booking SHALL 以 DashboardCard 包裝，標題顯示「高鐵購票」或「台鐵購票」。

##### 4B：票券夾（Ticket Wallet）— 全站共用元件

7. THE Ticket_Wallet SHALL 存放於 `frontend/app/components/ui/TicketWallet.vue`（全站共用，非行模組專屬）。
8. THE Ticket_Wallet SHALL 以卡片列表方式顯示所有已購票券，每張票券卡片包含：
   - 票種標示（高鐵/台鐵/其他）
   - 出發站 → 到達站
   - 日期與時間
   - 車次號碼
   - 動態 QR Code 圖片區塊（模擬用佔位圖或 QR Code 生成）
   - 票券狀態：未使用 / 已使用 / 已過期
9. WHEN 使用者點擊某張票券時，THE Ticket_Wallet SHALL 展開該票券的完整資訊，並將 QR Code 放大顯示供掃描。
10. THE Ticket_Wallet SHALL 支援依狀態篩選（全部/未使用/已使用/已過期），以 StatusBadge 元件標示各票券狀態。
11. THE Ticket_Wallet SHALL 透過 `defineProps` 接收 `tickets: Ticket[]` 屬性，每張票券包含 `id`、`type`、`origin`、`destination`、`date`、`time`、`trainNo`、`qrCode`、`status` 欄位。
12. WHEN 票券狀態為「已過期」時，THE Ticket_Wallet SHALL 以降低透明度（`opacity: 0.5`）與灰階呈現該票券。

---

### 需求 5：共享運具與租賃（Sharing Vehicle）

**用戶故事：** 身為使用者，我希望能查看周邊可租借的共享運具站點，快速了解各站點可用車輛數量，並一鍵完成租借。

#### 驗收標準

1. THE Sharing_Vehicle SHALL 以地圖 + 列表雙視圖模式呈現周邊站點，使用者可切換「地圖模式」或「列表模式」。
2. THE Sharing_Vehicle SHALL 支援以下運具類型的篩選切換：腳踏車（YouBike）、機車（GoShare/iRent）、汽車（iRent/Zipcar），以圖示 Tab 列呈現。
3. THE Sharing_Vehicle 列表模式中每筆站點卡片 SHALL 顯示：
   - 站點名稱
   - 距離（公尺或公里）
   - 可用車輛數量
   - 可用狀態標示（使用 StatusBadge：available / limited / empty）
4. WHEN 可用車輛數量 > 3 時，THE Sharing_Vehicle SHALL 以 `--color-secondary`（available）標示；數量 1~3 時以 `--color-primary`（limited）標示；數量為 0 時以 `--color-text-disabled`（empty）標示。
5. WHEN 使用者點擊某站點時，THE Sharing_Vehicle SHALL 展開站點詳情，顯示具體車輛編號列表與「租借」按鈕。
6. THE Sharing_Vehicle SHALL 提供「重新整理」按鈕以更新站點即時資訊。
7. THE Sharing_Vehicle 地圖模式 SHALL 嵌入地圖（複用類似 FoodMap 的 iframe 模式），以標記點顯示各站點位置，標記顏色對應可用狀態。
8. THE Sharing_Vehicle SHALL 透過 `defineProps` 接收 `vehicleType`（預設 'bike'）與 `userLocation`（`{ lat: number; lng: number }`）屬性。

---

### 需求 6：停車助手（Parking Finder）

**用戶故事：** 身為使用者，我希望能快速查詢目的地周邊的停車場即時空位，並在停好車後記錄停放位置，避免找不到車。

#### 驗收標準

1. THE Parking_Finder SHALL 顯示周邊停車場列表，每筆包含：
   - 停車場名稱
   - 距離
   - 即時剩餘車位數量
   - 費率（元/小時）
   - 營業狀態（營業中/已滿/休息中）
2. THE Parking_Finder SHALL 以 ProgressBar 元件呈現各停車場的車位使用率（已停車位/總車位 × 100）。
3. WHEN 剩餘車位 ≤ 5 時，THE Parking_Finder SHALL 以 `--color-accent-red` 標示「即將額滿」警示。
4. THE Parking_Finder SHALL 提供「記錄停車位置」按鈕，點擊後記錄當前位置（模擬 GPS 座標）與停放時間。
5. WHEN 使用者已記錄停車位置時，THE Parking_Finder SHALL 在頂部顯示「我的停車位」卡片，包含：
   - 停車場名稱
   - 停放樓層/區域（手動輸入）
   - 已停放時間（自動計時）
   - 「導航至車位」按鈕
   - 「結束停車」按鈕（清除記錄）
6. THE Parking_Finder SHALL 透過 `defineProps` 接收 `location`（`{ lat: number; lng: number }`，使用者當前位置或目的地）屬性。
7. THE Parking_Finder SHALL 以 DashboardCard 包裝整體內容。

---

### 需求 7：情境智慧推播（Context Push）

**用戶故事：** 身為使用者，我希望系統能根據我的行程、時間和天氣等情境，主動推薦交通方案，減少我手動操作的步驟。

#### 驗收標準

1. THE Context_Push SHALL 在行模組頁面頂部以通知卡片形式顯示情境建議，每張卡片包含：
   - 推播標題（如：「前往鼎泰豐信義店？」）
   - 推播描述（如：「根據您的訂位時間，建議 18:00 出發」）
   - 建議交通方式圖示
   - 「規劃路線」快捷按鈕
   - 「叫車前往」快捷按鈕
   - 「忽略」按鈕
2. THE Context_Push SHALL 支援以下情境觸發條件：
   - 時間觸發：接近已預約行程的出發時間時推播
   - 天氣觸發：下雨天主動建議叫車或搭乘大眾運輸
   - 跨模組觸發：從「食」模組的餐廳訂位帶入目的地，主動詢問交通安排
3. WHEN 使用者點擊「規劃路線」時，THE Context_Push SHALL 自動將目的地帶入 Route_Planner 並捲動至路線規劃區塊。
4. WHEN 使用者點擊「叫車前往」時，THE Context_Push SHALL 自動將目的地帶入 Ride_Service 並展開叫車表單。
5. WHEN 使用者點擊「忽略」時，THE Context_Push SHALL 以滑動動畫收起該推播卡片，並在本次 session 中不再重複推播相同內容。
6. THE Context_Push SHALL 透過 `defineProps` 接收 `suggestions: ContextSuggestion[]` 屬性，每筆包含 `id`、`title`、`description`、`destination`、`triggerType`（'time' | 'weather' | 'cross-module'）、`suggestedMode`（交通方式）。
7. IF 無任何推播建議時，THE Context_Push SHALL 不渲染任何內容（`v-if` 隱藏）。

---

### 需求 8：行模組 Header 與導航整合

**用戶故事：** 身為使用者，我希望在行模組內能透過頂部 Tab 快速切換各交通功能區塊，且與全站 Header 整合。

#### 驗收標準

1. THE Transport_Module SHALL 在頁面內容區頂部（Header 下方）提供功能區塊快捷導航列，以橫向可滾動 Tab 呈現：「路線」「叫車」「購票」「租車」「停車」。
2. WHEN 使用者點擊某功能 Tab 時，THE Transport_Module SHALL 平滑捲動至對應元件區塊（使用 `scrollIntoView({ behavior: 'smooth' })`）。
3. THE 功能導航列 SHALL 以 `--color-primary`（琥珀色）標示當前可視區塊的 Tab，未選中 Tab 以 `--color-text-disabled` 顯示。
4. THE 功能導航列 SHALL 採用黏性定位（`position: sticky; top: 50px`），隨頁面捲動固定於 Header 下方。
5. THE Transport_Module SHALL 與全站 ModuleTab 的「行」頁籤正確連動，進入 `/transport` 路由時「行」頁籤自動高亮。

---

### 需求 9：無障礙與互動規範（行模組 — 觸控優先）

**用戶故事：** 身為使用者（含視障或行動不便者），我希望行模組所有功能在手機端皆能透過螢幕閱讀器操作，且觸控目標足夠大、狀態資訊不僅依賴顏色區分。

#### 驗收標準

1. THE Transport_Module 所有可互動元件 SHALL 設定最小觸控目標尺寸為 44×44px（符合 WCAG 2.5.5 Target Size），確保手指操作不易誤觸。
2. THE Transport_Module 所有可互動元件 SHALL 加入適當的 `aria-label` 與語意化 HTML 標籤，確保 iOS VoiceOver 與 Android TalkBack 可正確朗讀。
3. THE Ride_Service 無障礙專車選項 SHALL 以明顯的無障礙圖示（♿）標示，並加入 `aria-label="無障礙專車"`。
4. THE Ride_Service 寵物友善車選項 SHALL 以寵物圖示（🐾）標示，並加入 `aria-label="寵物友善車"`。
5. THE Ticket_Wallet QR Code 區塊 SHALL 加入 `aria-label="票券 QR Code，請出示給驗票閘門掃描"` 描述。
6. THE Parking_Finder「記錄停車位置」操作完成後 SHALL 提供 `aria-live="polite"` 即時通知：「已記錄您的停車位置」。
7. THE Route_Planner 路況狀態 SHALL 除顏色標示外，同時以文字標籤（順暢/略擁擠/擁擠）呈現，確保色覺障礙者可辨識。
8. THE Transport_Module 所有狀態變更（如叫車成功、購票完成）SHALL 透過視覺回饋（動畫/Toast）與螢幕閱讀器通知雙重管道告知使用者。

---

### 需求 10：行程時間軸（Trip Timeline）

**用戶故事：** 身為使用者，我希望能在行模組頁面一目了然地看到今日所有交通安排，以時間軸方式串聯顯示，方便掌握整日行程。

#### 驗收標準

1. THE Trip_Timeline SHALL 以垂直時間軸元件呈現當日所有交通相關行程（已購票、已叫車、已預約租車），每個節點包含：
   - 時間標記
   - 交通方式圖示（捷運/高鐵/叫車/租車等）
   - 起迄點摘要
   - 行程狀態（待出發/進行中/已完成）
2. THE Trip_Timeline SHALL 以 DashboardCard 包裝，標題為「今日行程」，位於行模組頁面 Context_Push 下方、Route_Planner 上方。
3. WHEN 使用者點擊某時間軸節點時，THE Trip_Timeline SHALL 展開詳情區塊，提供快捷操作按鈕（如：查看票券、取消預約、導航至上車點）。
4. THE Trip_Timeline SHALL 以 `--color-secondary` 標示「進行中」的行程節點，以 `--color-text-disabled` 標示「已完成」節點，以 `--color-primary` 標示「待出發」節點。
5. IF 當日無任何交通行程，THE Trip_Timeline SHALL 顯示空狀態插圖與「尚無行程安排」提示文字。
6. THE Trip_Timeline SHALL 透過 `defineProps` 接收 `trips: TripItem[]` 屬性，每筆包含 `id`、`time`、`mode`、`origin`、`destination`、`status`（'pending' | 'active' | 'completed'）、`ticketId?`（可選，關聯票券夾）。

---

### 需求 11：常用路線收藏（Favorite Routes）

**用戶故事：** 身為使用者，我希望能將每日通勤或常去的路線儲存為捷徑，避免重複輸入起迄點，一鍵啟動路線規劃或叫車。

#### 驗收標準

1. THE Favorite_Routes SHALL 以小型卡片列表顯示在 Route_Planner 上方，每張卡片包含：
   - 路線名稱（如：「上班通勤」「回家」）
   - 起點 → 終點摘要
   - 常用交通方式圖示
   - 上次使用時間
2. THE Favorite_Routes SHALL 支援新增、編輯（重新命名/修改起迄點）、刪除常用路線。
3. WHEN 使用者點擊某常用路線卡片時，THE Favorite_Routes SHALL 自動將起點與終點帶入 Route_Planner，並觸發路線查詢。
4. THE Favorite_Routes SHALL 提供「叫車前往」快捷按鈕，點擊後將終點帶入 Ride_Service。
5. THE Favorite_Routes SHALL 最多收藏 10 條常用路線，超出時提示使用者刪除舊路線。
6. THE Favorite_Routes SHALL 透過 `defineProps` 接收 `routes: FavoriteRoute[]` 屬性，每筆包含 `id`、`name`、`origin`、`destination`、`preferredMode`、`lastUsed`。
7. THE Favorite_Routes SHALL 以橫向可滾動卡片列呈現（類似 TimelineSelector 的橫向滾動模式），節省垂直空間。

---

### 需求 12：碳足跡追蹤（Carbon Footprint Tracker）

**用戶故事：** 身為注重環保的使用者，我希望能追蹤自己的交通碳排放量，了解不同交通方式的環境影響，並透過減碳成就獲得正向回饋。

#### 驗收標準

1. THE Carbon_Tracker SHALL 以 DashboardCard 包裝，顯示本月累計碳排放量（kg CO₂）與設定的月度目標。
2. THE Carbon_Tracker SHALL 使用 ProgressBar 呈現本月碳排放進度（已排放/月度目標 × 100），底色為 `var(--color-progress-bg)`。
3. WHEN 碳排放量低於目標時，THE Carbon_Tracker 進度條 SHALL 使用綠色漸層（`linear-gradient(90deg, #22c55e, #16a34a)`）表示良好狀態。
4. WHEN 碳排放量超過目標時，THE Carbon_Tracker 進度條 SHALL 使用 `--color-accent-red` 警示色。
5. THE Carbon_Tracker SHALL 顯示碳排放分類統計（圖示 + 數值）：
   - 🚗 汽車/叫車
   - 🚌 大眾運輸
   - 🚲 共享單車/步行（顯示為「減碳貢獻」）
6. THE Carbon_Tracker SHALL 提供「減碳成就」徽章區塊，以網格排列（複用類似 FoodPassport 的徽章概念），包含：
   - 🌱 綠色通勤（連續 7 天使用大眾運輸）
   - 🚴 單車達人（累計騎乘 50km）
   - 🌍 減碳先鋒（本月碳排低於目標 20%）
   - 徽章以全彩（已解鎖）/ 灰階（未解鎖）區分
7. THE Carbon_Tracker SHALL 在 Route_Planner 的路線建議卡片中，額外標示各方案的預估碳排放量（g CO₂），以小型文字呈現於路線卡片底部。
8. THE Carbon_Tracker SHALL 透過 `defineProps` 接收 `emissions: EmissionData` 屬性，包含 `total`、`goal`、`breakdown`（分類明細）、`badges: CarbonBadge[]`。

---

## 額外建議功能（Optional Enhancements）

以下為建議新增但非 MVP 必要的功能，可視開發時程決定是否納入：

### 建議 B：交通費用統計儀表板（Transport Expense Dashboard）

**說明：** 類似食模組的「熱量儀表板」，統計本週/本月的交通花費，以進度條與分類圓餅圖呈現。

- 分類統計：叫車、大眾運輸、停車、共享運具
- 設定每月交通預算，超出時以 `--color-accent-red` 警示
- 複用 ProgressBar 與 DashboardCard 元件

### 建議 D：即時大眾運輸到站資訊（Real-time Transit Info）

**說明：** 顯示使用者附近公車站牌/捷運站的即時到站時間，類似公車動態資訊看板。

- 以列表卡片顯示最近 3~5 站的即時到站資訊
- 自動依據使用者位置排序最近站點
- 支援「加入關注」功能，釘選常用站點

---

## 元件與模組間關聯

### 與「食」模組的跨模組連動

- 「食」模組的餐廳訂位確認後，可將餐廳地址帶入 Context_Push，觸發「是否需要叫車/規劃路線」推播
- Route_Planner 的 `destination` prop 支援從外部模組傳入

### 票券夾的全站共用

- Ticket_Wallet 元件放置於 `components/ui/`，供「行」（高鐵/台鐵票）、「預」（活動票券）、「樂」（演唱會票）等模組共同使用
- 各模組透過統一的 `Ticket` 介面新增票券至票券夾

