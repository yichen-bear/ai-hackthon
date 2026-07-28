# 需求文件：預模組（Booking Module）

## 簡介

「預」模組為「AI 生活助手」六大模組之一，專注於預購、團購與智慧消費服務整合。涵蓋 i預購（線上大賣場/虛擬門市貨架）、i划算（7-11 門市在地社群團購）、AI 對話匹配（智慧分流推薦）、訂單追蹤、取貨提醒與門市地圖、以及收藏清單等功能。模組頁面位於 `frontend/app/pages/booking/index.vue`，元件存放於 `frontend/app/components/booking/` 目錄下。

本模組遵循既有設計系統規範，採用作用域 Token 覆寫策略（`.booking-module` class），使用翡翠綠（`#10b981`）作為模組主題色，並以 Mock 資料預設狀態供 Demo 展示。

---

## 詞彙表

- **Booking_Module**：預模組頁面整體，包含所有預模組子元件與作用域 Token 覆寫
- **PreOrder_Shelf**：i預購虛擬貨架元件，展示節慶禮盒、名店美食、限量預購與獨家商品
- **GroupBuy_Hub**：i划算門市店長開團元件，展示附近門市的團購商品，支援一人即享與集體揪團兩種價格模式
- **AI_Agent_Integration**：全站 AI Agent 與預模組的聯動邏輯，透過 composable 封裝關鍵字匹配與推薦導航
- **Order_Tracker**：訂單追蹤元件，顯示預購/團購訂單狀態進度與成團資訊
- **Pickup_Reminder**：取貨提醒與門市地圖元件，顯示到貨通知與取貨門市位置
- **Wishlist_Panel**：收藏清單元件，管理用戶收藏的商品與到期/降價提醒
- **Product_Card**：商品卡片，顯示商品圖片、名稱、價格與標籤
- **Group_Progress**：成團進度條，以視覺化百分比顯示團購湊團狀態
- **Pickup_Store**：取貨門市物件，含門市名稱、地址、營業時間與地圖座標
- **Store_Info**：門市資訊物件，含門市 ID、名稱、地址，用於店長開團定位

---

## 需求

### 需求 1：預模組頁面結構與作用域 Token 覆寫

**用戶故事：** 身為前端開發者，我希望預模組頁面遵循與其他模組相同的作用域 Token 覆寫策略，讓模組擁有獨立主題色且視覺風格一致。

#### 驗收標準

1. THE Booking_Module SHALL 在 `frontend/app/pages/booking/index.vue` 建立頁面，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Booking_Module SHALL 以 `.booking-module` class 包裹最外層容器，並在該作用域內覆寫以下 CSS Token：
   - `--color-primary: #10b981`（翡翠綠主色）
   - `--color-primary-light: #ecfdf5`（翡翠綠淡底）
   - `--color-secondary: #f59e0b`（琥珀色次色，代表促銷/限量）
   - `--color-secondary-light: #fffbeb`（琥珀色淡底）
3. THE Booking_Module SHALL 包含 `.booking-page` 內容容器，設定 `display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4)` 佈局。
4. THE Booking_Module SHALL 依序排列子元件：智慧推薦提示區（頂部，AI Agent 推送時顯示）、PreOrder_Shelf（i預購區）、GroupBuy_Hub（i划算區）、Order_Tracker（訂單追蹤）、Pickup_Reminder（取貨提醒）、Wishlist_Panel（收藏清單）。
5. THE Booking_Module SHALL 使用 `<main role="main">` 語意標籤包裹主內容區域。
6. THE Booking_Module SHALL 沿用全站 Container（max-width: 430px 置中）與 `default.vue` Layout 結構。

---

### 需求 2：i預購 — 線上大賣場虛擬貨架（PreOrder Shelf）

**用戶故事：** 身為消費者，我希望瀏覽節慶禮盒、名店美食與限量商品的虛擬貨架，並能快速下單預購，享受獨家優惠。

#### 驗收標準

1. THE PreOrder_Shelf SHALL 在 `frontend/app/components/booking/PreOrderShelf.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE PreOrder_Shelf SHALL 以 DashboardCard 元件包裝，標題為「i預購」，右上角顯示「🏪 虛擬門市」副標籤。
3. THE PreOrder_Shelf SHALL 提供分類 Tab 列：「節慶禮盒🎁」「名店美食🍰」「限量預購⚡」「獨家商品✨」，橫向可滾動，選中 Tab 以 `--color-primary` 底色白字，未選中白底灰字。
4. THE PreOrder_Shelf SHALL 以網格方式（2 欄）顯示商品卡片列表，每張 Product_Card 包含：
   - 商品圖片區（以 CSS 漸層色塊模擬，高度 120px）
   - 商品名稱（最多 2 行，超出以 ellipsis 截斷）
   - 原價（刪除線）與預購價（`--color-primary` 強調色）
   - 標籤 Badge：「限量」（紅底白字）、「獨家」（`--color-secondary` 底白字）、「熱賣」（粉底紅字）
   - 預購截止倒數（格式：「剩 X 天」）
5. WHEN 使用者點擊商品卡片時，THE PreOrder_Shelf SHALL 展開商品詳情 overlay，顯示完整描述、規格選擇（如口味/尺寸）、數量選擇器（1~5）與「加入預購」按鈕。
6. WHEN 使用者點擊「加入預購」按鈕時，THE PreOrder_Shelf SHALL 透過 `emit('add-preorder', { productId, quantity, spec })` 通知父元件。
7. THE PreOrder_Shelf SHALL 透過 `defineProps<{ products: PreOrderProduct[] }>()` 接收商品資料，型別包含 `id`、`name`、`image`、`originalPrice`、`preorderPrice`、`tags`、`deadline`、`category`。
8. WHEN 商品預購截止時間已過時，THE PreOrder_Shelf SHALL 將該商品卡片以灰階 + `opacity: 0.5` 呈現，並顯示「已截止」標籤取代倒數。

---

### 需求 3：i划算 — 7-11 門市店長開團社群團購（GroupBuy Hub）

**用戶故事：** 身為消費者，我希望在 APP 的 i划算 專區加入附近門市店長開的團購，享有「一人即享團購價」或「集體揪團超值價」，並在門市取貨付款。

#### 驗收標準

1. THE GroupBuy_Hub SHALL 在 `frontend/app/components/booking/GroupBuyHub.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE GroupBuy_Hub SHALL 以 DashboardCard 元件包裝，標題為「i划算」，右上角顯示「🛒 門市團購」副標籤。
3. THE GroupBuy_Hub SHALL 在頂部顯示「📍 附近門市團購」區塊，包含目前定位門市名稱（如「7-11 信義門市」）與「切換門市」按鈕，模擬選擇不同門市店長的開團。
4. THE GroupBuy_Hub SHALL 提供分類 Tab 列：「日用箱購🧻」「生鮮食材🥬」「飲品量販🥤」「一人即享👤」，橫向可滾動，選中 Tab 以 `--color-primary` 底色白字。
5. THE GroupBuy_Hub SHALL 以垂直列表方式顯示團購商品卡片，每張卡片包含：
   - 左側：商品圖片區（80×80px CSS 色塊模擬）
   - 右側上方：商品名稱、規格描述（如「24入/箱」）
   - 右側中間：兩種價格並列——「一人享」團購價（`--color-primary` 標示）與「揪團價」超值價（`--color-secondary` 標示，更低）、原價（刪除線小字）
   - 底部：Group_Progress 成團進度條 + 文字（如「3/5 人已參加」）+ 團長門市名稱小字
   - 右下角：「+1 跟團」按鈕（`--color-primary` 背景白字，`--radius-full` 膠囊按鈕）
6. THE Group_Progress SHALL 以 ProgressBar 元件呈現，進度色為 `--color-primary`，底色為 `--color-primary-light`，高度 6px，`--radius-full` 圓角。
7. WHEN 商品標示為「一人即享」時，THE GroupBuy_Hub SHALL 在該卡片右上角顯示「👤 一人即享」Badge（`--color-secondary` 背景白字），代表不需等待成團即可購買，進度條不顯示。
8. WHEN 使用者點擊「+1 跟團」按鈕時，THE GroupBuy_Hub SHALL 透過 `emit('join-group', { productId, groupId, storeId })` 通知父元件，並以動畫更新進度條（`transition: width 0.3s ease`）。
9. WHEN 團購已滿團（集體揪團達標）時，THE GroupBuy_Hub SHALL 將「+1 跟團」按鈕替換為「已成團 ✓」標示（`--color-text-disabled` 灰字），禁用互動。
10. THE GroupBuy_Hub SHALL 在每張卡片底部標示取貨方式：「🏪 {門市名稱} 取貨付款」，強調門市取貨模式。
11. THE GroupBuy_Hub SHALL 透過 `defineProps<{ groups: GroupBuyItem[]; currentStore: StoreInfo }>()` 接收資料，`GroupBuyItem` 型別包含 `id`、`productName`、`spec`、`soloPrice`（一人即享價）、`groupPrice`（揪團超值價）、`originalPrice`、`currentMembers`、`targetMembers`、`isSoloBuy`、`category`、`storeId`、`storeName`、`deadline`。`StoreInfo` 包含 `id`、`name`、`address`。

---

### 需求 4：AI Agent 跨模組智慧推薦聯動

**用戶故事：** 身為消費者，我希望透過主頁面右下角的 AI Agent 對話，系統能自動分析我的需求關鍵字並推薦適合的商品與頻道，直接導航至預模組對應區塊。

#### 驗收標準

1. THE Booking_Module SHALL 不建立獨立的 AI 對話元件，AI 對話功能由全站主頁面右下角懸浮的 AI Agent 統一提供。
2. THE Booking_Module SHALL 建立 `frontend/app/composables/useBookingAgent.ts`，封裝預模組的 AI 推薦邏輯，供全站 Agent 呼叫。
3. THE useBookingAgent SHALL 提供 `matchKeywords(input: string): BookingRecommendation` 方法，內建關鍵字匹配規則：
   - 關鍵字包含「衛生紙/洗衣精/日用品/箱購/補貨」→ 推薦 i划算 + 對應商品
   - 關鍵字包含「禮盒/送禮/節慶/中秋/過年/限量」→ 推薦 i預購 + 對應商品
   - 關鍵字包含「團購/揪團/辦公室/同事」→ 推薦 i划算
   - 無匹配時 → 返回熱門商品推薦
4. THE BookingRecommendation 型別 SHALL 包含：`channel: 'preorder' | 'groupbuy'`、`message: string`（AI 回應文字）、`products: RecommendedProduct[]`（最多 3 件推薦商品）。
5. THE Booking_Module 頁面 SHALL 監聽從 AI Agent 傳入的導航事件（透過 `useBookingState` 的 `agentNavigation` 狀態），當收到推薦指令時自動滾動至對應區塊（i預購 或 i划算）。
6. THE Booking_Module 頁面頂部 SHALL 顯示一個輕量級「智慧推薦提示區」，當 AI Agent 推送推薦時，以卡片形式顯示推薦摘要（推薦頻道 Badge + 推薦商品 1~3 件 + 「前往查看」按鈕），點擊後滾動至對應區塊。
7. THE 智慧推薦提示區 SHALL 可被使用者關閉（X 按鈕），關閉後不再顯示直到下次 Agent 推送。

---

### 需求 5：預購/團購訂單追蹤（Order Tracker）

**用戶故事：** 身為消費者，我希望能即時查看預購與團購訂單的處理進度，包括成團狀態、備貨狀態與可取貨時間，方便安排取貨。

#### 驗收標準

1. THE Order_Tracker SHALL 在 `frontend/app/components/booking/OrderTracker.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Order_Tracker SHALL 以 DashboardCard 元件包裝，標題為「我的訂單」，右上角顯示訂單數量 Badge。
3. THE Order_Tracker SHALL 提供篩選 Tab：「全部」「進行中」「可取貨」「已完成」，選中 Tab 以 `--color-primary` 底線標示。
4. THE Order_Tracker SHALL 以垂直列表顯示訂單卡片，每張卡片包含：
   - 訂單類型標籤：「i預購」（`--color-secondary` Pill）或「i划算」（`--color-primary` Pill）
   - 商品名稱與規格摘要
   - 訂單狀態以水平步驟條（Step Indicator）呈現：
     - i划算：「待成團 → 已成團 → 備貨中 → 可取貨」
     - i預購：「已預購 → 生產中 → 配送中 → 可取貨」
   - 目前步驟以 `--color-primary` 實心圓標示，已完成步驟以勾選圖示標示，未完成為空心圓
   - 附加資訊：成團進度（i划算）或到貨倒數（i預購，格式：「預計 MM/DD 到貨」）
5. WHEN 訂單狀態為「可取貨」時，THE Order_Tracker SHALL 在該卡片底部顯示「📍 前往取貨」按鈕（`--color-primary` 背景白字），點擊 `emit('go-pickup', orderId)`。
6. WHEN 訂單狀態為「待成團」時，THE Order_Tracker SHALL 顯示 Group_Progress 進度條與「邀請好友」分享按鈕（外框按鈕樣式）。
7. THE Order_Tracker SHALL 支援空狀態：當無訂單時顯示插圖文字「還沒有訂單，去逛逛吧！」與「前往 i預購」/「前往 i划算」兩個導航按鈕。
8. THE Order_Tracker SHALL 透過 `defineProps<{ orders: BookingOrder[] }>()` 接收訂單資料，型別包含 `id`、`type: 'preorder' | 'groupbuy'`、`productName`、`spec`、`status`、`currentStep`、`totalSteps`、`estimatedDate`、`groupProgress`（可選）。
9. THE Order_Tracker SHALL 透過 `defineEmits<{ 'go-pickup': [orderId: string]; 'invite-friend': [orderId: string]; 'view-detail': [orderId: string] }>()` 定義事件。

---

### 需求 6：取貨提醒與門市地圖（Pickup Reminder）

**用戶故事：** 身為消費者，我希望收到取貨通知時能一目了然取貨門市的位置與營業時間，並能快速導航前往，避免錯過取貨期限。

#### 驗收標準

1. THE Pickup_Reminder SHALL 在 `frontend/app/components/booking/PickupReminder.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Pickup_Reminder SHALL 以 DashboardCard 元件包裝，標題為「取貨提醒」，右上角顯示待取件數量 Badge（紅底白字圓形）。
3. THE Pickup_Reminder SHALL 顯示待取貨清單，每筆取貨項目包含：
   - 商品名稱與取貨編號
   - 取貨門市名稱
   - 取貨期限（格式：「請於 MM/DD 前取貨」），即將到期（≤ 2 天）以 `--color-accent-red` 標示
   - 「導航前往」按鈕（`--color-primary` 外框按鈕）
4. WHEN 使用者點擊「導航前往」按鈕時，THE Pickup_Reminder SHALL 展開門市地圖區塊，顯示：
   - 門市地圖（以 iframe embed OpenStreetMap 或 CSS 模擬地圖區域，含降級方案）
   - 門市詳細資訊：名稱、地址、營業時間、電話
   - 「🚶 步行導航」與「🚗 開車導航」兩個快捷按鈕
5. WHEN 使用者點擊導航按鈕時，THE Pickup_Reminder SHALL 透過 `emit('navigate-to-store', { storeId, mode: 'walk' | 'drive' })` 通知父元件，可與行模組的路線規劃聯動。
6. THE Pickup_Reminder SHALL 在無待取貨項目時顯示空狀態：「目前沒有待取貨商品 🎉」。
7. THE Pickup_Reminder SHALL 透過 `defineProps<{ pickups: PickupItem[] }>()` 接收資料，型別包含 `id`、`orderId`、`productName`、`pickupCode`、`store: PickupStore`、`deadline`、`status: 'pending' | 'expiring' | 'expired'`。
8. THE Pickup_Reminder SHALL 透過 `defineEmits<{ 'navigate-to-store': [payload: { storeId: string; mode: string }]; 'confirm-pickup': [pickupId: string] }>()` 定義事件。
9. WHEN 取貨期限已過時，THE Pickup_Reminder SHALL 將該項目以灰階 + 刪除線呈現，並顯示「已逾期」Badge（紅底白字）。

---

### 需求 7：收藏清單 / 願望清單（Wishlist Panel）

**用戶故事：** 身為消費者，我希望能收藏有興趣但還不想馬上購買的商品，當商品降價或即將截止預購時收到提醒，方便日後購買。

#### 驗收標準

1. THE Wishlist_Panel SHALL 在 `frontend/app/components/booking/WishlistPanel.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Wishlist_Panel SHALL 以 DashboardCard 元件包裝，標題為「我的收藏」，右上角顯示收藏數量。
3. THE Wishlist_Panel SHALL 以垂直列表顯示收藏商品卡片，每張卡片包含：
   - 左側：商品圖片區（60×60px CSS 色塊模擬）
   - 中間：商品名稱、來源頻道標籤（「i預購」/「i划算」）、目前價格
   - 右側：「🛒 立即購買」按鈕與「🗑️」移除圖示按鈕
4. WHEN 收藏商品有價格變動（降價）時，THE Wishlist_Panel SHALL 在該卡片顯示「🔥 降價了！」Badge（紅底白字），並以刪除線顯示原價，新價格以 `--color-primary` 強調。
5. WHEN 收藏商品的預購/團購即將截止（≤ 3 天）時，THE Wishlist_Panel SHALL 在該卡片顯示「⏰ 即將截止」Badge（`--color-secondary` 背景白字）。
6. WHEN 使用者點擊「立即購買」按鈕時，THE Wishlist_Panel SHALL 透過 `emit('buy-now', { productId, channel })` 通知父元件。
7. WHEN 使用者點擊移除圖示時，THE Wishlist_Panel SHALL 以滑動動畫（`transition: transform 0.3s, opacity 0.3s`）移除該項目，並透過 `emit('remove-item', productId)` 通知父元件。
8. THE Wishlist_Panel SHALL 支援空狀態：「還沒有收藏商品，去逛逛吧 💚」。
9. THE Wishlist_Panel SHALL 提供排序選項：「最近加入」（預設）、「即將截止」、「價格低到高」，以下拉選單或 Pill Tab 呈現。
10. THE Wishlist_Panel SHALL 透過 `defineProps<{ items: WishlistItem[] }>()` 接收資料，型別包含 `id`、`productId`、`productName`、`channel: 'preorder' | 'groupbuy'`、`currentPrice`、`originalPrice`、`hasPriceDrop`、`deadline`、`addedAt`。
11. THE Wishlist_Panel SHALL 透過 `defineEmits<{ 'buy-now': [payload: { productId: string; channel: string }]; 'remove-item': [productId: string] }>()` 定義事件。

---

### 需求 8：功能區塊快捷導航列（Booking Nav）

**用戶故事：** 身為使用者，我希望在預模組頁面能快速跳轉到不同功能區塊，不需要一直滾動頁面。

#### 驗收標準

1. THE Booking_Module SHALL 在頁面頂部建立 sticky 快捷導航列。
2. THE 導航列 SHALL 為橫向可滾動 Tab 列，包含：「i預購」「i划算」「訂單」「取貨」「收藏」五個 Tab。
3. THE 導航列 SHALL 設定 `position: sticky; top: 50px; z-index: 50`，純白背景，底部 1px `--color-border` 分隔線。
4. WHEN Tab 被選中時，SHALL 以 `--color-primary` 文字色 + 2px 底線標示；未選中 Tab 以 `--color-text-disabled` 顯示。
5. WHEN 使用者點擊 Tab 時，SHALL 以 `scrollIntoView({ behavior: 'smooth' })` 平滑捲動至對應區塊。
6. THE 各功能區塊 SHALL 以 `ref` 標記（preorderRef、groupbuyRef、orderRef、pickupRef、wishlistRef），供導航列捲動定位使用。

---

### 需求 9：預模組 Mock 資料與 Demo 控制

**用戶故事：** 身為 Hackathon 展示者，我希望預模組頁面預設有完整的 Mock 資料與狀態控制，方便在 Demo 時展示各種使用情境。

#### 驗收標準

1. THE Booking_Module SHALL 預設以下 Mock 資料：
   - i預購商品：至少 4 筆，涵蓋節慶禮盒 2 筆（含 1 筆已截止）、名店美食 1 筆、限量預購 1 筆
   - i划算團購：至少 4 筆，涵蓋日用箱購 2 筆、生鮮食材 1 筆、一人即享 1 筆（含不同成團進度）
   - 訂單：至少 3 筆，涵蓋「待成團」「備貨中」「可取貨」各 1 筆
   - 取貨提醒：至少 2 筆，含 1 筆即將到期（≤ 2 天）
   - 收藏清單：至少 3 筆，含 1 筆降價、1 筆即將截止
2. THE Booking_Module SHALL 提供 Demo 控制面板（固定於右下角），包含以下按鈕：
   - 「🛒 模擬跟團」：隨機增加某團購的成團人數
   - 「📦 模擬到貨」：將某筆進行中訂單切換為「可取貨」狀態
   - 「🔄 重設」：將所有 Mock 狀態恢復為預設值
3. THE Demo 控制面板 SHALL 採用 `position: fixed; bottom: 20px; right: 20px; z-index: 999` 定位，與其他模組一致。

---

### 需求 10：視覺一致性與無障礙規範

**用戶故事：** 身為使用者，我希望預模組的視覺風格與其他模組一致，且所有互動元素都具備基本無障礙支援。

#### 驗收標準

1. THE Booking_Module SHALL 使用與其他模組相同的 Design System CSS 變數（`--radius-lg`、`--shadow-card`、`--space-4` 等），確保卡片圓角、陰影、間距視覺一致。
2. THE Booking_Module 所有子元件 SHALL 使用 `--text-base`（15px）作為主要文字大小、`--text-sm`（13px）作為次要文字大小、`--text-xs`（11px）作為標籤文字大小。
3. THE Booking_Module 所有可互動元件（按鈕、Tab、卡片） SHALL 設定觸控目標 ≥ 44×44px，確保行動裝置易用性。
4. THE Booking_Module 所有表單按鈕與互動元件 SHALL 使用語意化 `<button>` 標籤，並設定適當的 `aria-label` 屬性。
5. WHEN 可互動元件獲得鍵盤焦點時，THE Booking_Module SHALL 顯示可見的焦點外框（`outline: 2px solid var(--color-primary)`）。
6. THE Booking_Module SHALL 確保所有文字與背景色組合的對比度符合 WCAG 2.1 AA 標準（對比度 ≥ 4.5:1）。
7. THE Booking_Module 所有狀態變更（訂單更新、成團通知） SHALL 使用 `aria-live="polite"` 通知螢幕閱讀器。
8. THE Booking_Module 所有可互動元件 SHALL 提供 hover 時 `opacity: 0.85` 的視覺回饋（`transition: 0.15s ease`）。

---

### 需求 11：元件自動引入與目錄規範

**用戶故事：** 身為前端開發者，我希望預模組元件遵循 Nuxt 4 自動引入慣例與既有目錄結構，確保團隊協作順暢。

#### 驗收標準

1. THE Booking_Module SHALL 將所有預模組專屬元件存放於 `frontend/app/components/booking/` 目錄下。
2. THE Booking_Module SHALL 採用 PascalCase 命名元件檔案：`PreOrderShelf.vue`、`GroupBuyHub.vue`、`OrderTracker.vue`、`PickupReminder.vue`、`WishlistPanel.vue`。
3. THE Booking_Module SHALL 利用 Nuxt 4 元件自動引入機制，所有 `components/booking/` 下的元件無需手動 `import` 即可在 template 中使用。
4. THE Booking_Module 頁面檔案 SHALL 位於 `frontend/app/pages/booking/index.vue`，對應路由 `/booking`。
5. THE Booking_Module 所有元件 SHALL 使用 Vue 3 `<script setup lang="ts">` 語法，確保 TypeScript 型別安全。
6. THE Booking_Module 若需共享狀態，SHALL 建立 `frontend/app/composables/useBookingState.ts`，使用 Nuxt `useState` composable 管理跨元件共享狀態。

---

### 需求 12：跨模組整合

**用戶故事：** 身為使用者，我希望預模組能與行模組聯動，讓取貨時能直接規劃路線前往門市。

#### 驗收標準

1. THE Pickup_Reminder 「導航前往」功能 SHALL 能與行模組的 Route_Planner 聯動，將門市地址作為目的地帶入路線規劃。
2. THE AI_Chat_Match 推薦結果中若涉及取貨，SHALL 顯示門市距離資訊（模擬，如「最近門市：步行 5 分鐘」）。
3. THE Booking_Module SHALL 共用全站 TicketWallet 元件的設計模式（DashboardCard 包裝、篩選 Tab、卡片列表），確保 UX 一致性。
4. THE Booking_Module 購買完成後 SHALL 能將訂單資訊傳遞至 Order_Tracker，形成完整的購買 → 追蹤 → 取貨閉環。
