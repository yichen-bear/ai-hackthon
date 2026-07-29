# 需求文件：樂模組（Entertainment Module）

## 簡介

「樂」模組為「AI 生活助手」六大模組之一，專注於娛樂生活整合服務。涵蓋 ibon 票務中心（統一獅球賽、展演門票、門市體驗活動）、AI 週末/休閒提案（情境式智慧推薦）、跨模組導流（購票後串聯行模組交通規劃與食模組優惠）、OPEN POINT 娛樂化（點數抽獎與小遊戲）、以及在地社區與興趣社群（社區活動、社大課程、興趣媒合與留言板）等功能。模組頁面位於 `frontend/app/pages/entertainment/index.vue`，元件存放於 `frontend/app/components/entertainment/` 目錄下。

本模組遵循既有設計系統規範，採用作用域 Token 覆寫策略（`.entertainment-module` class），使用粉紅色（`#ec4899`）作為模組主題色，並以 Mock 資料預設狀態供 Demo 展示。

---

## 詞彙表

- **Entertainment_Module**：樂模組頁面整體，包含所有樂模組子元件與作用域 Token 覆寫
- **Ticket_Center**：ibon 票務中心元件，整合統一獅球賽門票、展演門票與門市體驗活動購票
- **Ticket_Card**：電子票券卡片元件，購票後生成含 QR Code 的電子票券，統一展示於票券夾
- **AI_Weekend_Planner**：AI 週末/休閒提案元件，監聽用戶對話意圖並主動推薦活動與內嵌購票卡片
- **Cross_Module_Link**：跨模組導流元件，購票成功後提供一鍵跳轉至行模組（交通規劃）與食模組（憑票優惠）
- **Points_Game**：OPEN POINT 娛樂化元件，提供點數抽獎轉盤、小遊戲與任務獎勵系統
- **Achievement_Wall**：成就徽章牆元件，蒐集娛樂相關成就徽章
- **Community_Events**：在地社區活動元件，顯示社區活動報名與社區大學課程瀏覽
- **Interest_Match**：興趣媒合元件，依用戶興趣標籤推薦同好活動
- **Community_Board**：社群留言板元件，提供活動討論、心得分享與揪團功能
- **Event_Item**：活動物件，含活動名稱、時間、地點、票價、類型與剩餘票數
- **Store_Experience**：門市體驗活動物件，含活動名稱、門市、時段、費用與人數限制

---

## 需求

### 需求 1：樂模組頁面結構與作用域 Token 覆寫

**用戶故事：** 身為前端開發者，我希望樂模組頁面遵循與其他模組相同的作用域 Token 覆寫策略，讓模組擁有獨立主題色且視覺風格一致。

#### 驗收標準

1. THE Entertainment_Module SHALL 在 `frontend/app/pages/entertainment/index.vue` 建立頁面，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Entertainment_Module SHALL 以 `.entertainment-module` class 包裹最外層容器，並在該作用域內覆寫以下 CSS Token：
   - `--color-primary: #ec4899`（粉紅主色）
   - `--color-primary-light: #fdf2f8`（粉紅淡底）
   - `--color-secondary: #8b5cf6`（紫色次色，代表娛樂/社交）
   - `--color-secondary-light: #f5f3ff`（紫色淡底）
3. THE Entertainment_Module SHALL 包含 `.entertainment-page` 內容容器，設定 `display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4)` 佈局。
4. THE Entertainment_Module SHALL 依序排列子元件：AI 休閒提案區（頂部，AI 推送時顯示）、Ticket_Center（ibon 票務中心）、Cross_Module_Link（跨模組導流）、Points_Game（OPEN POINT 娛樂化）、Community_Events（社區活動）、Interest_Match（興趣媒合）、Community_Board（社群留言板）、Achievement_Wall（成就徽章牆）。
5. THE Entertainment_Module SHALL 使用 `<main role="main">` 語意標籤包裹主內容區域。
6. THE Entertainment_Module SHALL 沿用全站 Container（max-width: 430px 置中）與 `default.vue` Layout 結構。

---

### 需求 2：ibon 票務中心（Ticket Center）

**用戶故事：** 身為消費者，我希望在樂模組統一瀏覽統一獅球賽門票、展演門票與門市體驗活動，並能快速購票，購票後生成電子票券方便入場。

#### 驗收標準

1. THE Ticket_Center SHALL 在 `frontend/app/components/entertainment/TicketCenter.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Ticket_Center SHALL 以 DashboardCard 元件包裝，標題為「ibon 票務」，右上角顯示「🎫 展演與賽事」副標籤。
3. THE Ticket_Center SHALL 提供分類 Tab 列：「統一獅⚾」「展覽演出🎭」「門市體驗☕」，橫向可滾動，選中 Tab 以 `--color-primary` 底色白字，未選中白底灰字。
4. THE Ticket_Center「統一獅⚾」Tab SHALL 顯示球賽列表卡片，每張卡片包含：
   - 對戰資訊（如「統一獅 vs 中信兄弟」）
   - 比賽日期與時間
   - 場館名稱（如「台南亞太國際棒球訓練中心」）
   - 剩餘票數標示（如「剩餘 120 張」），低於 50 張以 `--color-accent-red` 警示
   - 票價區間（如「$300 ~ $1,200」）
   - 「選位購票」按鈕（`--color-primary` 背景白字）
5. THE Ticket_Center「展覽演出🎭」Tab SHALL 顯示展演活動卡片，每張卡片包含：
   - 活動封面圖區（以 CSS 漸層色塊模擬，高度 140px）
   - 活動名稱（最多 2 行，ellipsis 截斷）
   - 展演類型標籤 Badge：「展覽」「演唱會」「音樂劇」「舞台劇」
   - 日期區間與場館地點
   - 票價與「立即購票」按鈕
6. THE Ticket_Center「門市體驗☕」Tab SHALL 顯示門市體驗活動卡片，每張卡片包含：
   - 活動名稱（如「星巴克咖啡拉花教室」「7-11 手作甜點體驗」）
   - 舉辦門市與地址
   - 活動時段與費用
   - 人數限制（如「限額 12 人，剩 3 位」）
   - 「報名參加」按鈕
7. WHEN 使用者點擊購票/報名按鈕時，THE Ticket_Center SHALL 展開購票 overlay，包含：
   - 票種/場次選擇（如球賽座位區域、展演場次時間）
   - 數量選擇器（1~4 張）
   - 總金額計算
   - 「確認購票」按鈕
8. WHEN 使用者點擊「確認購票」後，THE Ticket_Center SHALL 透過 `emit('ticket-purchased', { eventId, eventType, ticketType, quantity, totalAmount })` 通知父元件，並生成 Ticket_Card 電子票券。
9. THE Ticket_Center SHALL 透過 `defineProps<{ events: EventItem[]; experiences: StoreExperience[] }>()` 接收資料。`EventItem` 型別包含 `id`、`type: 'baseball' | 'exhibition' | 'concert' | 'theater'`、`title`、`date`、`time`、`venue`、`priceRange`、`remainingTickets`、`coverImage`。`StoreExperience` 型別包含 `id`、`name`、`storeName`、`storeAddress`、`timeSlot`、`fee`、`maxParticipants`、`currentParticipants`。
10. WHEN 活動已售完或報名額滿時，THE Ticket_Center SHALL 將該卡片以灰階 + `opacity: 0.5` 呈現，按鈕替換為「已售完」或「已額滿」標示。

---

### 需求 3：電子票券卡片（Ticket Card）

**用戶故事：** 身為消費者，我希望購票後能在 APP 內直接查看電子票券，入場時出示 QR Code 即可驗票，不需列印紙本。

#### 驗收標準

1. THE Ticket_Card SHALL 在 `frontend/app/components/entertainment/TicketCard.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Ticket_Card SHALL 以卡片形式呈現，視覺風格仿照行模組 TicketWallet 的票券卡片，包含：
   - 頂部色帶（以 `--color-primary` 為底色），顯示活動類型圖示與標籤（如「⚾ 統一獅」「🎭 展覽」「☕ 體驗」）
   - 活動名稱（粗體）
   - 日期時間與場館地點
   - 票種與座位資訊（如「內野 A 區 第3排 12號」）
   - QR Code 區域（以 CSS 模擬 120×120px 方塊 + 條碼圖案）
   - 票券狀態標示：「未使用」（`--color-primary`）/「已使用」（灰色）/「已過期」（紅色）
3. THE Ticket_Card SHALL 支援展開/收合模式：預設收合僅顯示活動名稱 + 日期 + 狀態，點擊展開顯示完整資訊與 QR Code。
4. THE Ticket_Card SHALL 透過 `defineProps<{ ticket: EntertainmentTicket }>()` 接收資料。`EntertainmentTicket` 型別包含 `id`、`eventType: 'baseball' | 'exhibition' | 'concert' | 'experience'`、`eventName`、`date`、`time`、`venue`、`seatInfo`、`ticketType`、`qrCode`、`status: 'unused' | 'used' | 'expired'`、`purchaseDate`。
5. WHEN 票券狀態為「已使用」或「已過期」時，THE Ticket_Card SHALL 在 QR Code 上方覆蓋半透明遮罩並顯示狀態文字。
6. THE Entertainment_Module 頁面 SHALL 在 Ticket_Center 下方設置「我的票券」區塊，以 DashboardCard 包裝，使用篩選 Tab（全部/未使用/已使用），列出所有已購票券的 Ticket_Card。

---

### 需求 4：AI 週末/休閒提案（AI Weekend Planner）

**用戶故事：** 身為消費者，我希望當我在 AI 客服對話中提到休閒相關意圖時，系統能自動推薦熱門活動並附帶購票入口，讓我不需要自己搜尋就能找到好活動。

#### 驗收標準

1. THE AI_Weekend_Planner SHALL 在 `frontend/app/components/entertainment/AiSuggestion.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE AI_Weekend_Planner SHALL 以 DashboardCard 元件包裝，標題為「AI 為你推薦」，左側顯示「🤖」圖示，右上角顯示「✨ 個人化」副標籤。
3. THE AI_Weekend_Planner SHALL 顯示 AI 推薦情境卡片，每張卡片包含：
   - AI 推薦理由文字（如「偵測到你說『這週末想出去走走』，為你推薦以下活動：」）
   - 推薦活動列表（1~3 筆），每筆包含：活動封面縮圖、名稱、日期地點摘要、票價
   - 每筆活動附帶「🎫 購票」CTA 按鈕（`--color-primary` 膠囊按鈕）
   - 底部「換一批推薦」文字按鈕
4. THE AI_Weekend_Planner SHALL 支援多種推薦情境：
   - 週末休閒：偵測「週末/放假/出去玩/無聊」→ 推薦近期熱門活動
   - 約會場景：偵測「約會/另一半/浪漫」→ 推薦展覽、音樂劇
   - 親子活動：偵測「小孩/親子/家庭」→ 推薦門市體驗、親子展覽
   - 朋友聚會：偵測「朋友/聚會/一群人」→ 推薦球賽、演唱會
5. THE Entertainment_Module SHALL 建立 `frontend/app/composables/useEntertainmentAgent.ts`，封裝樂模組的 AI 推薦邏輯，提供 `matchIntent(input: string): EntertainmentRecommendation` 方法。
6. THE EntertainmentRecommendation 型別 SHALL 包含：`scenario: 'weekend' | 'date' | 'family' | 'friends'`、`message: string`（AI 回應文字）、`events: RecommendedEvent[]`（最多 3 筆推薦活動）。
7. WHEN 使用者點擊推薦活動的「購票」按鈕時，THE AI_Weekend_Planner SHALL 透過 `emit('go-purchase', { eventId, eventType })` 通知父元件，滾動至 Ticket_Center 對應區塊。
8. THE AI_Weekend_Planner SHALL 可被使用者關閉（X 按鈕），關閉後不再顯示直到下次 AI 推送新推薦。
9. WHEN 無 AI 推薦時，THE AI_Weekend_Planner SHALL 顯示預設狀態：「告訴 AI 助手你的休閒需求，獲得個人化推薦 💡」與「試試說：『這週末想看展覽』」提示文字。

---

### 需求 5：跨模組導流（Cross Module Link）

**用戶故事：** 身為消費者，我希望購票成功後能一鍵規劃前往活動地點的交通，並享受憑票優惠，讓整個娛樂體驗一氣呵成。

#### 驗收標準

1. THE Cross_Module_Link SHALL 在 `frontend/app/components/entertainment/CrossModuleLink.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Cross_Module_Link SHALL 在購票成功後自動顯示於票券卡片下方，以橫向卡片列呈現可用的跨模組服務。
3. THE Cross_Module_Link SHALL 提供以下導流選項卡片：
   - 「🚗 規劃交通」：顯示活動場館地址，點擊跳轉至行模組路線規劃，自動帶入場館作為目的地
   - 「🚕 預約叫車」：顯示活動日期時間，點擊跳轉至行模組叫車服務，預設目的地為場館
   - 「☕ 憑票優惠」：顯示可用優惠（如「持票至 7-11 享咖啡第二杯半價」「星巴克憑票折 $30」），點擊跳轉至食模組
4. WHEN 使用者點擊「規劃交通」時，THE Cross_Module_Link SHALL 透過 `navigateTo('/transport')` 跳轉，並透過 `useTransportState` composable 的 `setRouteDestination(venue)` 帶入目的地。
5. WHEN 使用者點擊「預約叫車」時，THE Cross_Module_Link SHALL 透過 `navigateTo('/transport')` 跳轉，並透過 `useTransportState` composable 的 `setRideDestination(venue)` 帶入目的地。
6. WHEN 使用者點擊「憑票優惠」時，THE Cross_Module_Link SHALL 透過 `emit('go-food-coupon', { ticketId, couponType })` 通知父元件，可跳轉至食模組優惠頁面。
7. THE Cross_Module_Link SHALL 透過 `defineProps<{ ticket: EntertainmentTicket; coupons: TicketCoupon[] }>()` 接收資料。`TicketCoupon` 型別包含 `id`、`ticketId`、`description`、`discount`、`storeName`、`validUntil`。
8. THE Cross_Module_Link SHALL 僅在有未使用票券時顯示，無票券時隱藏。
9. EACH 導流卡片 SHALL 包含目標模組的主色圖示（行模組琥珀色、食模組紅色），讓用戶一目了然跳轉目標。

---

### 需求 6：OPEN POINT 娛樂化（Points Game）

**用戶故事：** 身為消費者，我希望能用 OPEN POINT 點數參與抽獎和小遊戲，增加娛樂體驗的趣味性，同時有機會獲得門票或商品獎勵。

#### 驗收標準

1. THE Points_Game SHALL 在 `frontend/app/components/entertainment/PointsGame.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Points_Game SHALL 以 DashboardCard 元件包裝，標題為「OPEN POINT 樂園」，右上角顯示用戶目前點數（如「🪙 2,450 點」）。
3. THE Points_Game SHALL 提供以下遊戲區塊：
   - **幸運轉盤**：圓形轉盤 UI，分為 6~8 格獎品區域，每次消耗 50 點，點擊「轉！」按鈕啟動旋轉動畫
   - **每日刮刮卡**：3×3 格刮刮區域，用戶滑動/點擊刮開，每日免費 1 次，額外需 30 點/次
   - **娛樂問答**：3 題快問快答（如電影/音樂冷知識），全對可獲得獎勵點數
4. THE 幸運轉盤 SHALL 包含以下視覺效果：
   - 轉盤以 CSS `conic-gradient` 繪製，各格交替使用 `--color-primary` 與 `--color-primary-light`
   - 點擊後以 `CSS animation` 旋轉 3~5 秒（`ease-out` 緩停）
   - 停止後以彈跳動畫顯示中獎結果 overlay
5. THE Points_Game 獎品 SHALL 包含：「統一獅門票 1 張」「星巴克買一送一券」「OPEN POINT 100 點」「7-11 購物金 $50」「謝謝參加」。
6. WHEN 用戶點數不足時，THE Points_Game SHALL 將遊戲按鈕以 disabled 樣式呈現，並顯示「點數不足」提示。
7. WHEN 用戶獲得獎品時，THE Points_Game SHALL 透過 `emit('prize-won', { prizeId, prizeName, prizeType })` 通知父元件。
8. THE Points_Game SHALL 提供「任務獎勵」區塊，以清單列出可完成任務：
   - 「首次購票」→ +100 點
   - 「分享活動給朋友」→ +50 點
   - 「完成週末提案」→ +30 點
   - 「留言板首次發文」→ +20 點
   各任務顯示完成狀態勾選與獎勵點數。
9. THE Points_Game SHALL 透過 `defineProps<{ userPoints: number; dailyFreeUsed: boolean; tasks: PointTask[] }>()` 接收資料。`PointTask` 型別包含 `id`、`name`、`reward`、`completed`、`description`。

---

### 需求 7：成就徽章牆（Achievement Wall）

**用戶故事：** 身為消費者，我希望蒐集各種娛樂相關的成就徽章，激勵自己多參與活動，也能向朋友展示自己的娛樂足跡。

#### 驗收標準

1. THE Achievement_Wall SHALL 在 `frontend/app/components/entertainment/AchievementWall.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Achievement_Wall SHALL 以 DashboardCard 元件包裝，標題為「娛樂成就」，右上角顯示已解鎖數量（如「5/12」）。
3. THE Achievement_Wall SHALL 以網格方式（3 欄）顯示徽章，每個徽章包含：
   - 圓形圖示區（48×48px），已解鎖顯示彩色 emoji + `--color-primary-light` 底色，未解鎖顯示灰色鎖頭 + 灰底
   - 徽章名稱（如「球場初心者」「展覽達人」「社交蝴蝶」）
   - 解鎖條件描述（如「參加首場球賽」「累計看 5 場展覽」）
4. THE Achievement_Wall SHALL 預設以下徽章（Mock）：
   - 🏟️「球場初心者」— 參加首場統一獅球賽（已解鎖）
   - 🎨「藝文愛好者」— 累計看 3 場展覽（已解鎖）
   - 🎵「音樂狂熱」— 參加 2 場演唱會（未解鎖）
   - ☕「體驗玩家」— 參加 3 次門市體驗（未解鎖）
   - 🎯「點數高手」— 累計獲得 1000 點獎勵（已解鎖）
   - 🤝「社交蝴蝶」— 揪團成功 3 次（未解鎖）
   - 📝「分享達人」— 留言板發文 10 則（未解鎖）
   - 🎓「終身學習」— 報名 2 堂社大課程（未解鎖）
5. THE Achievement_Wall SHALL 透過 `defineProps<{ badges: EntertainmentBadge[] }>()` 接收資料。`EntertainmentBadge` 型別包含 `id`、`icon`、`name`、`description`、`unlocked`、`unlockedAt`（可選）。
6. WHEN 使用者點擊已解鎖徽章時，SHALL 以 tooltip 或小彈窗顯示解鎖日期與詳細描述。

---

### 需求 8：在地社區活動與社大課程（Community Events）

**用戶故事：** 身為消費者，我希望能瀏覽並報名社區活動與社區大學課程，豐富生活並認識在地鄰里。

#### 驗收標準

1. THE Community_Events SHALL 在 `frontend/app/components/entertainment/CommunityEvents.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Community_Events SHALL 以 DashboardCard 元件包裝，標題為「在地活動」，右上角顯示「📍 社區生活」副標籤。
3. THE Community_Events SHALL 提供分類 Tab 列：「社區活動🏘️」「社大課程📚」，選中 Tab 以 `--color-primary` 底色白字。
4. THE Community_Events「社區活動🏘️」Tab SHALL 以垂直列表顯示活動卡片，每張卡片包含：
   - 活動名稱（如「中秋社區烤肉大會」「里民健走活動」）
   - 舉辦日期與時間
   - 地點（如「信義區仁愛里活動中心」）
   - 主辦單位（里辦公室/管委會）
   - 費用（免費或收費）
   - 報名人數 / 上限人數（如「32/50 人」）
   - 「我要報名」按鈕（`--color-primary` 背景白字）
5. THE Community_Events「社大課程📚」Tab SHALL 以垂直列表顯示課程卡片，每張卡片包含：
   - 課程名稱（如「生活攝影入門」「手沖咖啡實作」「瑜伽與冥想」）
   - 授課教師
   - 上課時間（如「每週三 19:00~21:00」）
   - 學分數與堂數（如「2 學分 / 18 堂」）
   - 費用（如「學分費 $2,000 + 材料費 $500」）
   - 報名狀態：「招生中」（`--color-primary`）/ 「即將額滿」（`--color-secondary`）/ 「已額滿」（灰色）
   - 「報名」按鈕
6. WHEN 使用者點擊「我要報名」或「報名」按鈕時，THE Community_Events SHALL 透過 `emit('register', { eventId, type: 'community' | 'course' })` 通知父元件。
7. THE Community_Events SHALL 透過 `defineProps<{ communityEvents: CommunityEvent[]; courses: CommunityCoursе[] }>()` 接收資料。`CommunityEvent` 型別包含 `id`、`name`、`date`、`time`、`location`、`organizer`、`fee`、`currentParticipants`、`maxParticipants`。`CommunityCourse` 型別包含 `id`、`name`、`instructor`、`schedule`、`credits`、`sessions`、`fee`、`status: 'open' | 'almost-full' | 'full'`。
8. WHEN 活動已額滿時，THE Community_Events SHALL 將「報名」按鈕替換為「已額滿」標示，禁用互動。

---

### 需求 9：興趣媒合（Interest Match）

**用戶故事：** 身為消費者，我希望系統能根據我的興趣標籤推薦合適的活動與同好社群，擴大社交圈並找到志同道合的夥伴。

#### 驗收標準

1. THE Interest_Match SHALL 在 `frontend/app/components/entertainment/InterestMatch.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Interest_Match SHALL 以 DashboardCard 元件包裝，標題為「興趣媒合」，右上角顯示「🎯 為你配對」副標籤。
3. THE Interest_Match SHALL 在頂部顯示用戶興趣標籤列（Pill 標籤），可新增/移除，已選標籤以 `--color-primary` 填充白字，可選標籤以外框樣式呈現。
4. THE Interest_Match SHALL 預設提供以下興趣標籤供選擇：「攝影」「登山」「桌遊」「手作」「咖啡」「閱讀」「音樂」「運動」「料理」「旅行」「電影」「舞蹈」。
5. THE Interest_Match SHALL 依據用戶已選興趣標籤，以垂直列表顯示媒合推薦卡片，每張卡片包含：
   - 活動/社群名稱（如「週六攝影散步團」「桌遊之夜 - 信義場」）
   - 匹配度標示（如「🎯 興趣匹配 85%」，以 `--color-primary` 標示）
   - 活動日期時間與地點
   - 參與人數（如「已有 8 人加入」）
   - 匹配的興趣標籤 Pill（高亮顯示與用戶重疊的標籤）
   - 「加入」按鈕（`--color-primary` 背景白字膠囊按鈕）
6. WHEN 使用者點擊「加入」按鈕時，THE Interest_Match SHALL 透過 `emit('join-group', { groupId, matchScore })` 通知父元件。
7. WHEN 使用者未選擇任何興趣標籤時，THE Interest_Match SHALL 顯示引導狀態：「選擇你的興趣標籤，我們幫你找到同好！」。
8. THE Interest_Match SHALL 透過 `defineProps<{ userInterests: string[]; matchedGroups: MatchedGroup[] }>()` 接收資料。`MatchedGroup` 型別包含 `id`、`name`、`matchScore`、`date`、`time`、`location`、`participants`、`tags`、`type: 'activity' | 'community'`。

---

### 需求 10：社群留言板（Community Board）

**用戶故事：** 身為消費者，我希望能在留言板上分享活動心得、討論即將到來的活動，並與其他用戶揪團一起參加。

#### 驗收標準

1. THE Community_Board SHALL 在 `frontend/app/components/entertainment/CommunityBoard.vue` 建立元件，使用 Vue 3 `<script setup lang="ts">` 語法。
2. THE Community_Board SHALL 以 DashboardCard 元件包裝，標題為「社群討論」，右上角顯示「💬 聊聊」副標籤。
3. THE Community_Board SHALL 提供分類 Tab：「熱門🔥」「揪團🙋」「心得📝」，選中 Tab 以 `--color-primary` 底色白字。
4. THE Community_Board SHALL 以垂直列表顯示貼文卡片，每張貼文包含：
   - 發文者頭像（圓形 36px CSS 色塊模擬）與暱稱
   - 發文時間（相對時間，如「2 小時前」）
   - 貼文內容（最多 3 行，超出以「...查看更多」截斷）
   - 貼文標籤：「揪團」（`--color-secondary` Pill）/「心得」（`--color-primary` Pill）/「討論」（灰色 Pill）
   - 互動列：「❤️ {數量}」按讚 +「💬 {數量}」留言 +「🔗 分享」
5. THE Community_Board「揪團🙋」Tab 的貼文卡片 SHALL 額外包含：
   - 揪團活動名稱與日期
   - 目前人數 / 目標人數（如「3/6 人」）
   - 「+1 參加」按鈕（`--color-primary` 膠囊按鈕）
   - 成團進度條（複用 Group_Progress 樣式）
6. THE Community_Board SHALL 在列表頂部提供「發文」輸入區：
   - 輸入框 placeholder：「分享活動心得或發起揪團...」
   - 標籤選擇：「揪團」/「心得」/「討論」
   - 「發佈」按鈕（`--color-primary` 背景白字）
7. WHEN 使用者點擊「發佈」按鈕時，THE Community_Board SHALL 透過 `emit('post-created', { content, tags, groupInfo? })` 通知父元件，並以動畫將新貼文插入列表頂部。
8. WHEN 使用者點擊「+1 參加」時，THE Community_Board SHALL 透過 `emit('join-team', { postId })` 通知父元件，更新人數與進度條。
9. THE Community_Board SHALL 透過 `defineProps<{ posts: BoardPost[] }>()` 接收資料。`BoardPost` 型別包含 `id`、`author`、`avatar`、`content`、`tags`、`createdAt`、`likes`、`comments`、`type: 'discussion' | 'team-up' | 'review'`、`teamInfo?: { eventName: string; date: string; current: number; target: number }`。
10. THE Community_Board SHALL 支援空狀態：「還沒有人發文，成為第一個分享的人吧！」。

---

### 需求 11：功能區塊快捷導航列（Entertainment Nav）

**用戶故事：** 身為使用者，我希望在樂模組頁面能快速跳轉到不同功能區塊，不需要一直滾動頁面。

#### 驗收標準

1. THE Entertainment_Module SHALL 在頁面頂部建立 sticky 快捷導航列。
2. THE 導航列 SHALL 為橫向可滾動 Tab 列，包含：「票務」「推薦」「點數」「社區」「社群」五個 Tab。
3. THE 導航列 SHALL 設定 `position: sticky; top: 50px; z-index: 50`，純白背景，底部 1px `--color-border` 分隔線。
4. WHEN Tab 被選中時，SHALL 以 `--color-primary` 文字色 + `--color-primary-light` 背景 + `--radius-full` 膠囊樣式標示；未選中 Tab 以 `--color-text-disabled` 顯示。
5. WHEN 使用者點擊 Tab 時，SHALL 以 `scrollIntoView({ behavior: 'smooth' })` 平滑捲動至對應區塊。
6. THE 各功能區塊 SHALL 以 `ref` 標記（ticketRef、recommendRef、pointsRef、communityRef、boardRef），供導航列捲動定位使用。

---

### 需求 12：樂模組 Mock 資料與 Demo 控制

**用戶故事：** 身為 Hackathon 展示者，我希望樂模組頁面預設有完整的 Mock 資料與狀態控制，方便在 Demo 時展示各種使用情境。

#### 驗收標準

1. THE Entertainment_Module SHALL 預設以下 Mock 資料：
   - 球賽活動：至少 2 筆（含 1 筆即將開賽、1 筆下週賽程）
   - 展演活動：至少 3 筆（展覽 1 筆、演唱會 1 筆、音樂劇 1 筆）
   - 門市體驗：至少 2 筆（星巴克咖啡教室 1 筆、7-11 手作體驗 1 筆）
   - 已購票券：至少 2 筆（含 1 筆未使用、1 筆已使用）
   - 憑票優惠券：至少 2 筆
   - OPEN POINT：用戶預設 2,450 點，任務 4 筆（2 筆已完成、2 筆未完成）
   - 成就徽章：至少 8 筆（3 筆已解鎖、5 筆未解鎖）
   - 社區活動：至少 2 筆
   - 社大課程：至少 3 筆（含 1 筆即將額滿）
   - 興趣媒合：至少 3 筆推薦社群
   - 留言板貼文：至少 4 筆（含 1 筆揪團、1 筆心得、2 筆討論）
2. THE Entertainment_Module SHALL 提供 Demo 控制面板（固定於右下角），包含以下按鈕：
   - 「🤖 AI 推薦」：模擬 AI 偵測到用戶說「週末想出去玩」，觸發推薦區塊顯示
   - 「🎫 模擬購票」：模擬購買一張統一獅門票，觸發票券生成與跨模組導流顯示
   - 「🎰 模擬抽獎」：觸發轉盤旋轉並隨機中獎
   - 「🔄 重設」：將所有 Mock 狀態恢復為預設值
3. THE Demo 控制面板 SHALL 採用 `position: fixed; bottom: 20px; right: 20px; z-index: 999` 定位，與其他模組一致。

---

### 需求 13：視覺一致性與無障礙規範

**用戶故事：** 身為使用者，我希望樂模組的視覺風格與其他模組一致，且所有互動元素都具備基本無障礙支援。

#### 驗收標準

1. THE Entertainment_Module SHALL 使用與其他模組相同的 Design System CSS 變數（`--radius-lg`、`--shadow-card`、`--space-4` 等），確保卡片圓角、陰影、間距視覺一致。
2. THE Entertainment_Module 所有子元件 SHALL 使用 `--text-base`（15px）作為主要文字大小、`--text-sm`（13px）作為次要文字大小、`--text-xs`（11px）作為標籤文字大小。
3. THE Entertainment_Module 所有可互動元件（按鈕、Tab、卡片） SHALL 設定觸控目標 ≥ 44×44px，確保行動裝置易用性。
4. THE Entertainment_Module 所有表單按鈕與互動元件 SHALL 使用語意化 `<button>` 標籤，並設定適當的 `aria-label` 屬性。
5. WHEN 可互動元件獲得鍵盤焦點時，THE Entertainment_Module SHALL 顯示可見的焦點外框（`outline: 2px solid var(--color-primary)`）。
6. THE Entertainment_Module SHALL 確保所有文字與背景色組合的對比度符合 WCAG 2.1 AA 標準（對比度 ≥ 4.5:1）。
7. THE Entertainment_Module 所有狀態變更（購票成功、抽獎結果、揪團更新） SHALL 使用 `aria-live="polite"` 通知螢幕閱讀器。
8. THE Entertainment_Module 所有可互動元件 SHALL 提供 hover 時 `opacity: 0.85` 的視覺回饋（`transition: 0.15s ease`）。

---

### 需求 14：元件自動引入與目錄規範

**用戶故事：** 身為前端開發者，我希望樂模組元件遵循 Nuxt 4 自動引入慣例與既有目錄結構，確保團隊協作順暢。

#### 驗收標準

1. THE Entertainment_Module SHALL 將所有樂模組專屬元件存放於 `frontend/app/components/entertainment/` 目錄下。
2. THE Entertainment_Module SHALL 採用 PascalCase 命名元件檔案：`TicketCenter.vue`、`TicketCard.vue`、`AiSuggestion.vue`、`CrossModuleLink.vue`、`PointsGame.vue`、`AchievementWall.vue`、`CommunityEvents.vue`、`InterestMatch.vue`、`CommunityBoard.vue`。
3. THE Entertainment_Module SHALL 利用 Nuxt 4 元件自動引入機制，所有 `components/entertainment/` 下的元件無需手動 `import` 即可在 template 中使用。
4. THE Entertainment_Module 頁面檔案 SHALL 位於 `frontend/app/pages/entertainment/index.vue`，對應路由 `/entertainment`。
5. THE Entertainment_Module 所有元件 SHALL 使用 Vue 3 `<script setup lang="ts">` 語法，確保 TypeScript 型別安全。
6. THE Entertainment_Module 若需共享狀態，SHALL 建立 `frontend/app/composables/useEntertainmentState.ts`，使用 Nuxt `useState` composable 管理跨元件共享狀態。

---

### 需求 15：跨模組整合

**用戶故事：** 身為使用者，我希望樂模組能與行模組、食模組、預模組聯動，讓購票、交通、用餐與優惠形成完整體驗閉環。

#### 驗收標準

1. THE Cross_Module_Link「規劃交通」功能 SHALL 能與行模組的 Route_Planner 聯動，將活動場館地址作為目的地帶入路線規劃。
2. THE Cross_Module_Link「預約叫車」功能 SHALL 能與行模組的 Ride_Service 聯動，將活動場館作為目的地帶入叫車服務。
3. THE Cross_Module_Link「憑票優惠」功能 SHALL 能與食模組聯動，提供持票至指定門市的折扣優惠資訊。
4. THE AI_Weekend_Planner 推薦結果中若涉及門市體驗活動，SHALL 顯示門市距離資訊（模擬，如「最近門市：步行 5 分鐘」）。
5. THE Entertainment_Module SHALL 共用全站 TicketWallet 元件的設計模式（DashboardCard 包裝、篩選 Tab、卡片列表），確保票券 UX 一致性。
6. THE Entertainment_Module 購票完成後 SHALL 能將票券資訊傳遞至 Ticket_Card 並顯示於「我的票券」區塊，形成完整的購票 → 入場 → 優惠閉環。
7. THE Points_Game 任務系統 SHALL 能追蹤跨模組行為（如「購票後規劃交通」），作為任務完成條件。
