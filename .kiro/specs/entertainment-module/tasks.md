# 實作計畫：樂模組（Entertainment Module）

## 概覽

依照 requirements.md 與 design.md，以漸進式步驟實作樂模組頁面、專屬元件與 AI Agent 推薦邏輯。
技術棧：Nuxt 4 + Vue 3 + TypeScript（`<script setup lang="ts">`）。
樂模組元件放在 `frontend/app/components/entertainment/`，頁面放在 `frontend/app/pages/entertainment/index.vue`。
Composables 放在 `frontend/app/composables/`。

---

## 任務

- [ ] 1. 樂模組基礎架構與頁面骨架
  - [ ] 1.1 建立 `frontend/app/pages/entertainment/index.vue` 頁面骨架
    - 最外層容器加上 `class="entertainment-module"`
    - 在 `<style scoped>` 中定義 `.entertainment-module` Token 覆寫：
      - `--color-primary: #ec4899`（粉紅主色）
      - `--color-primary-light: #fdf2f8`（粉紅淡底）
      - `--color-secondary: #8b5cf6`（紫色次色）
      - `--color-secondary-light: #f5f3ff`（紫色淡底）
    - 頁面內容以 `display: flex; flex-direction: column; gap: var(--space-4)` 垂直堆疊
    - 加入 `<main role="main" aria-label="樂模組">` 語意標籤
    - 沿用全站 Container（max-width: 430px 置中）
    - _需求: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ] 1.2 建立 `frontend/app/composables/useEntertainmentState.ts`
    - 定義 `aiRecommendation: Ref<EntertainmentRecommendation | null>` 狀態
    - 定義 `purchasedTickets: Ref<EntertainmentTicket[]>` 票券列表
    - 定義 `userPoints: Ref<number>` 用戶點數（預設 2450）
    - 定義 `userInterests: Ref<string[]>` 用戶興趣標籤
    - 定義 `scrollToSection(section: EntertainmentNavKey)` 方法
    - 定義 `dismissRecommendation()` 方法
    - 定義 `triggerCrossModule(ticket: EntertainmentTicket)` 方法
    - 使用 Nuxt `useState` composable 管理跨元件共享
    - _需求: 4.5, 11.6, 14.6_

  - [ ] 1.3 建立 `frontend/app/composables/useEntertainmentAgent.ts`
    - 定義 `INTENT_RULES` 意圖匹配規則常量
    - 實作 `matchIntent(input: string): EntertainmentRecommendation` 方法
    - 規則：週末休閒→weekend、約會→date、親子→family、朋友→friends
    - 無匹配時返回預設推薦（scenario = 'weekend'，推薦熱門活動）
    - 確保任何輸入都返回有效 EntertainmentRecommendation（scenario、message、events 0~3 筆）
    - _需求: 4.4, 4.5, 4.6_

  - [ ] 1.4 建立功能區塊快捷導航列（EntertainmentNav）
    - 在 `entertainment/index.vue` 內建立 sticky 導航列
    - 橫向可滾動 Tab：「票務」「推薦」「點數」「社區」「社群」
    - `position: sticky; top: 50px; z-index: 50`，純白背景，底部 1px border
    - 選中 Tab：`--color-primary` 文字 + `--color-primary-light` 背景 + `--radius-full` 膠囊
    - 未選中 Tab：`--color-text-disabled`
    - 點擊 Tab 以 `scrollIntoView({ behavior: 'smooth' })` 捲動至對應區塊
    - 各元件區塊以 `ref` 標記（ticketRef、recommendRef、pointsRef、communityRef、boardRef）
    - _需求: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 2. ibon 票務中心元件
  - [ ] 2.1 建立 `frontend/app/components/entertainment/TicketCenter.vue`
    - 以 `defineProps<{ events: EventItem[]; experiences: StoreExperience[] }>()` 接收屬性
    - 以 `defineEmits<{ 'ticket-purchased': [payload: { eventId: string; eventType: string; ticketType: string; quantity: number; totalAmount: number; venue: string; venueAddress: string; date: string; time: string }] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「ibon 票務」，右上角「🎫 展演與賽事」副標籤
    - 分類 Tab 列：「統一獅⚾」「展覽演出🎭」「門市體驗☕」
      - 橫向可滾動、選中以 `--color-primary` 底色 + 白字、未選中白底灰字
    - 「統一獅⚾」Tab 球賽列表卡片：
      - 對戰資訊（如「統一獅 vs 中信兄弟」）
      - 比賽日期時間 + 場館名稱
      - 剩餘票數（低於 50 張以 `--color-accent-red` 警示）
      - 票價區間 + 「選位購票」按鈕
    - 「展覽演出🎭」Tab 展演卡片：
      - 封面圖區（CSS gradient，高度 140px）
      - 活動名稱（max 2 行 ellipsis）+ 類型標籤 Badge
      - 日期區間 + 場館 + 票價 + 「立即購票」按鈕
    - 「門市體驗☕」Tab 體驗卡片：
      - 活動名稱 + 門市與地址
      - 時段 + 費用 + 人數（如「限額 12 人，剩 3 位」）
      - 「報名參加」按鈕
    - 已售完/額滿：卡片灰階 + `opacity: 0.5` + 按鈕替換為「已售完」/「已額滿」
    - 點擊購票按鈕展開購票 overlay（backdrop + slide-up）：
      - 票種/場次選擇 + 數量選擇器（1~4）+ 總金額計算
      - 「確認購票」按鈕 → 成功動畫（1.5s）→ emit
    - 觸控目標 ≥ 44×44px
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 13.3_

- [ ] 3. 電子票券卡片元件
  - [ ] 3.1 建立 `frontend/app/components/entertainment/TicketCard.vue`
    - 以 `defineProps<{ ticket: EntertainmentTicket }>()` 接收屬性
    - 以 `defineEmits<{ 'ticket-use': [ticketId: string] }>()` 定義事件
    - 卡片頂部色帶（`--color-primary` 底色）+ 活動類型圖示與標籤（⚾/🎭/☕）
    - 活動名稱（粗體）+ 日期時間 + 場館地點
    - 票種 + 座位資訊 + 數量
    - QR Code 區域（CSS 模擬 120×120px 方塊 + 條碼圖案）
    - 票券狀態標示：
      - 「未使用」→ `--color-primary` 色
      - 「已使用」→ 灰色 + QR Code 半透明遮罩 + 「已使用」文字
      - 「已過期」→ 紅色 + QR Code 半透明遮罩 + 「已過期」文字
    - 支援展開/收合模式：
      - 收合：活動名稱 + 日期 + 狀態（單行卡片）
      - 展開：完整資訊 + QR Code（點擊切換）
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.2 在 `entertainment/index.vue` 中建立「我的票券」區塊
    - 以 DashboardCard 包裝，標題「我的票券」，右上角票券數量
    - 篩選 Tab：「全部」「未使用」「已使用」
    - 列出所有 purchasedTickets 的 TicketCard
    - 空狀態：「還沒有票券，去看看有什麼活動吧！」+ 跳轉按鈕
    - _需求: 3.6_

- [ ] 4. AI 週末/休閒提案元件
  - [ ] 4.1 建立 `frontend/app/components/entertainment/AiSuggestion.vue`
    - 以 `defineProps<{ recommendation: EntertainmentRecommendation | null }>()` 接收屬性
    - 以 `defineEmits<{ 'go-purchase': [payload: { eventId: string; eventType: string }]; 'dismiss': []; 'refresh': [] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「AI 為你推薦」，左側「🤖」圖示，右上角「✨ 個人化」副標籤
    - 有推薦時顯示：
      - AI 推薦理由文字（如「偵測到你說『週末想出去走走』，為你推薦：」）
      - 推薦活動列表（1~3 筆橫向卡片）：封面縮圖 + 名稱 + 日期地點 + 票價
      - 每筆活動附帶「🎫 購票」CTA 膠囊按鈕（`--color-primary`）
      - 底部「換一批推薦」文字按鈕
      - 右上角「✕」關閉按鈕
    - 無推薦時顯示預設狀態：
      - 「告訴 AI 助手你的休閒需求，獲得個人化推薦 💡」
      - 提示文字：「試試說：『這週末想看展覽』」
    - 點擊「購票」→ emit('go-purchase') → 父元件滾動至 TicketCenter
    - 點擊「✕」→ emit('dismiss') → 隱藏區塊
    - _需求: 4.1, 4.2, 4.3, 4.7, 4.8, 4.9_

- [ ] 5. 跨模組導流元件
  - [ ] 5.1 建立 `frontend/app/components/entertainment/CrossModuleLink.vue`
    - 以 `defineProps<{ ticket: EntertainmentTicket; coupons: TicketCoupon[] }>()` 接收屬性
    - 以 `defineEmits<{ 'go-transport': [payload: { venue: string; venueAddress: string; date: string }]; 'go-ride': [payload: { venue: string; venueAddress: string }]; 'go-food-coupon': [payload: { ticketId: string; couponType: string }] }>()` 定義事件
    - 購票成功後自動顯示於票券卡片下方
    - 橫向卡片列（3 張導流卡片）：
      - 「🚗 規劃交通」：場館地址 + 點擊跳轉行模組路線規劃（`navigateTo('/transport')` + `useTransportState().setRouteDestination(venueAddress)`）
      - 「🚕 預約叫車」：活動日期時間 + 點擊跳轉行模組叫車（`navigateTo('/transport')` + `useTransportState().setRideDestination(venueAddress)`）
      - 「☕ 憑票優惠」：優惠描述 + 點擊 emit 跳轉食模組
    - 各卡片包含目標模組主色圖示（行=琥珀、食=紅色）
    - 無票券時整個元件隱藏（`v-if`）
    - 場館地址缺失時隱藏交通/叫車卡片
    - 優惠券為空時隱藏優惠卡片
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [ ] 6. OPEN POINT 娛樂化元件
  - [ ] 6.1 建立 `frontend/app/components/entertainment/PointsGame.vue`
    - 以 `defineProps<{ userPoints: number; dailyFreeUsed: boolean; tasks: PointTask[]; prizes?: Prize[] }>()` 接收屬性
    - 以 `defineEmits<{ 'prize-won': [payload: { prizeId: string; prizeName: string; prizeType: string }]; 'task-complete': [taskId: string]; 'points-spent': [amount: number] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「OPEN POINT 樂園」，右上角「🪙 {userPoints} 點」
    - 幸運轉盤區塊：
      - 圓形轉盤 UI（CSS `conic-gradient`，6 格獎品，交替 `--color-primary` 與 `--color-primary-light`）
      - 中央指針標示
      - 「轉！(50點)」按鈕（`--color-primary` 背景白字）
      - 點擊後旋轉動畫：`cubic-bezier(0.17, 0.67, 0.12, 0.99)`，4 秒，至少轉 4 圈
      - 停止後彈跳動畫顯示中獎結果 overlay
      - 點數不足：按鈕 disabled + 「點數不足」tooltip
    - 每日刮刮卡區塊（簡化版）：
      - 「每日免費 1 次」標示
      - 已使用：「明天再來！」文字
    - 任務獎勵區塊：
      - 垂直清單，每筆任務顯示：圖示 + 名稱 + 描述 + 獎勵點數
      - 已完成：✅ 勾選 + 灰色文字
      - 未完成：☐ 空框 + 正常文字
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [ ] 7. 成就徽章牆元件
  - [ ] 7.1 建立 `frontend/app/components/entertainment/AchievementWall.vue`
    - 以 `defineProps<{ badges: EntertainmentBadge[] }>()` 接收屬性
    - 以 DashboardCard 包裝，標題「娛樂成就」，右上角已解鎖數量（如「3/8」）
    - 3 欄網格顯示徽章：
      - 圓形圖示區（48×48px）
      - 已解鎖：彩色 emoji + `--color-primary-light` 底色
      - 未解鎖：灰色鎖頭「🔒」+ 灰底
      - 徽章名稱 + 解鎖條件描述（`--text-xs`）
    - 點擊已解鎖徽章：顯示 tooltip 或小彈窗（解鎖日期 + 詳細描述）
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 8. 在地社區活動與社大課程元件
  - [ ] 8.1 建立 `frontend/app/components/entertainment/CommunityEvents.vue`
    - 以 `defineProps<{ communityEvents: CommunityEvent[]; courses: CommunityCourse[] }>()` 接收屬性
    - 以 `defineEmits<{ 'register': [payload: { eventId: string; type: 'community' | 'course' }] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「在地活動」，右上角「📍 社區生活」副標籤
    - 分類 Tab 列：「社區活動🏘️」「社大課程📚」，選中以 `--color-primary` 底色白字
    - 「社區活動🏘️」Tab 垂直列表卡片：
      - 活動名稱 + 日期時間 + 地點
      - 主辦單位 + 費用（免費 or 收費）
      - 報名人數/上限（如「32/50 人」）
      - 「我要報名」按鈕（`--color-primary` 背景白字）
    - 「社大課程📚」Tab 垂直列表卡片：
      - 課程名稱 + 授課教師
      - 上課時間 + 學分/堂數 + 費用
      - 報名狀態 Badge：「招生中」（`--color-primary`）/ 「即將額滿」（`--color-secondary`）/ 「已額滿」（灰色）
      - 「報名」按鈕
    - 已額滿：按鈕替換為「已額滿」灰色標示，禁用互動
    - 觸控目標 ≥ 44×44px
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 13.3_

- [ ] 9. 興趣媒合元件
  - [ ] 9.1 建立 `frontend/app/components/entertainment/InterestMatch.vue`
    - 以 `defineProps<{ userInterests: string[]; matchedGroups: MatchedGroup[] }>()` 接收屬性
    - 以 `defineEmits<{ 'join-group': [payload: { groupId: string; matchScore: number }]; 'update-interests': [interests: string[]] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「興趣媒合」，右上角「🎯 為你配對」副標籤
    - 頂部興趣標籤列（Pill 標籤）：
      - 已選標籤：`--color-primary` 填充白字
      - 可選標籤：外框樣式
      - 可新增/移除（點擊切換）
      - 預設可選：攝影/登山/桌遊/手作/咖啡/閱讀/音樂/運動/料理/旅行/電影/舞蹈
    - 媒合推薦列表（垂直卡片）：
      - 活動/社群名稱
      - 匹配度「🎯 興趣匹配 {score}%」（`--color-primary` 標示）
      - 日期時間 + 地點 + 參與人數
      - 匹配的興趣標籤 Pill（高亮）
      - 「加入」膠囊按鈕（`--color-primary` 背景白字）
    - 未選擇興趣：引導狀態「選擇你的興趣標籤，我們幫你找到同好！」
    - 推薦列表依 matchScore 降序排列
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [ ] 10. 社群留言板元件
  - [ ] 10.1 建立 `frontend/app/components/entertainment/CommunityBoard.vue`
    - 以 `defineProps<{ posts: BoardPost[] }>()` 接收屬性
    - 以 `defineEmits<{ 'post-created': [payload: { content: string; tags: string[]; teamInfo?: { eventName: string; date: string; current: number; target: number } }]; 'join-team': [postId: string]; 'like-post': [postId: string] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「社群討論」，右上角「💬 聊聊」副標籤
    - 分類 Tab：「熱門🔥」「揪團🙋」「心得📝」，選中以 `--color-primary` 底色白字
    - 頂部發文輸入區：
      - 輸入框 placeholder：「分享活動心得或發起揪團...」
      - 標籤選擇按鈕列：「揪團」/「心得」/「討論」
      - 「發佈」按鈕（`--color-primary` 背景白字），內容為空時 disabled
    - 貼文卡片列表（垂直）：
      - 發文者頭像（圓形 36px CSS gradient）+ 暱稱
      - 發文時間（相對時間：「2 小時前」）
      - 貼文內容（max 3 行，超出「...查看更多」截斷）
      - 貼文標籤 Pill：「揪團」（`--color-secondary`）/「心得」（`--color-primary`）/「討論」（灰色）
      - 互動列：「❤️ {n}」按讚 + 「💬 {n}」留言 + 「🔗 分享」
    - 揪團貼文額外包含：
      - 揪團活動名稱 + 日期
      - 目前/目標人數（如「3/6 人」）
      - 進度條（複用 ProgressBar 樣式）
      - 「+1 參加」膠囊按鈕（`--color-primary`）
      - 已成團：按鈕替換為「已成團 ✓」灰字禁用
    - 發佈成功：新貼文以 slide-down 動畫插入列表頂部，輸入框清空
    - 空狀態：「還沒有人發文，成為第一個分享的人吧！」
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [ ] 11. 頁面組裝與資料流串接
  - [ ] 11.1 在 `entertainment/index.vue` 中組裝所有元件並串接資料流
    - 元件依佈局順序插入：AiSuggestion → TicketCenter → 我的票券(TicketCard 列表) → CrossModuleLink → PointsGame → AchievementWall → CommunityEvents → InterestMatch → CommunityBoard
    - AI 提案區（頂部，條件顯示）：
      - 監聽 `useEntertainmentState().aiRecommendation`
      - 有推薦時顯示 AiSuggestion，無推薦時顯示預設引導
      - 點擊推薦活動「購票」→ scrollToSection('ticket')
      - 點擊「✕」→ dismissRecommendation()
    - TicketCenter `ticket-purchased` → 生成 EntertainmentTicket 加入 purchasedTickets + 顯示 CrossModuleLink
    - CrossModuleLink `go-transport` → navigateTo('/transport') + 帶入目的地
    - CrossModuleLink `go-ride` → navigateTo('/transport') + 帶入叫車目的地
    - PointsGame `prize-won` → 更新 userPoints + toast 通知
    - PointsGame `points-spent` → 扣減 userPoints
    - CommunityEvents `register` → toast 「報名成功」
    - InterestMatch `join-group` → toast 「加入成功」
    - InterestMatch `update-interests` → 更新 userInterests
    - CommunityBoard `post-created` → 新貼文插入列表頂部
    - CommunityBoard `join-team` → 更新對應貼文 teamInfo.current
    - _需求: 1.4, 4.7, 5.4, 5.5, 15.1, 15.2, 15.6_

  - [ ] 11.2 準備完整 Mock 資料
    - mockEvents: 5 筆活動（球賽 2 筆 + 展覽 1 筆 + 演唱會 1 筆 + 音樂劇 1 筆）
    - mockExperiences: 2 筆門市體驗（星巴克 + 7-11）
    - mockTickets: 2 筆已購票券（1 筆未使用 + 1 筆已使用）
    - mockCoupons: 2 筆憑票優惠券
    - mockPrizes: 6 筆轉盤獎品（機率總和 = 1）
    - mockTasks: 4 筆任務（2 筆已完成 + 2 筆未完成）
    - mockBadges: 8 筆成就徽章（3 筆已解鎖 + 5 筆未解鎖）
    - mockCommunityEvents: 2 筆社區活動
    - mockCourses: 3 筆社大課程（含 1 筆即將額滿）
    - mockMatchedGroups: 3 筆興趣媒合推薦
    - mockPosts: 4 筆留言板貼文（1 筆揪團 + 1 筆心得 + 2 筆討論）
    - userPoints 預設 2450，userInterests 預設 ['攝影', '登山', '桌遊']
    - _需求: 12.1_

  - [ ] 11.3 建立 Demo 控制面板
    - 固定於右下角（`position: fixed; bottom: 20px; right: 20px; z-index: 999`）
    - 「🤖 AI 推薦」按鈕：模擬 AI 偵測「週末想出去玩」，設定 aiRecommendation 觸發 AiSuggestion 顯示
    - 「🎫 模擬購票」按鈕：模擬購買統一獅門票，生成票券 + 顯示 CrossModuleLink + 扣點數
    - 「🎰 模擬抽獎」按鈕：觸發轉盤旋轉動畫 + 隨機中獎
    - 「🔄 重設」按鈕：恢復所有 Mock 狀態為預設值
    - _需求: 12.2, 12.3_

- [ ] 12. 無障礙驗收與觸控優化
  - [ ] 12.1 為所有元件補充無障礙屬性與觸控優化
    - 所有可互動按鈕觸控目標 ≥ 44×44px
    - 所有 `<button>` 均有 `aria-label` 或可見文字
    - 所有狀態變更（購票成功、抽獎結果、揪團更新）使用 `aria-live="polite"` 通知螢幕閱讀器
    - 可互動元件 hover 時 `opacity: 0.85`（`transition: 0.15s ease`）
    - 鍵盤焦點外框 `outline: 2px solid var(--color-primary)`
    - 文字與背景色對比度 ≥ 4.5:1（WCAG 2.1 AA）
    - Tab 導航列加入 `aria-label="功能區塊導航"`
    - 購票 overlay 加入 `role="dialog"` + `aria-modal="true"`
    - _需求: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [ ] 13. 屬性測試與單元測試
  - [ ] 13.1 為 `useEntertainmentAgent` 撰寫屬性測試與例子測試
    - Property 6：matchIntent 任意輸入返回有效 EntertainmentRecommendation（100 次迭代）
    - 例子：「週末想出去玩」→ weekend、「約會」→ date、「小孩」→ family、「朋友聚會」→ friends、空字串→預設 weekend
    - **Validates: 需求 4.4, 4.5, 4.6**

  - [ ] 13.2 為 TicketCenter 撰寫例子測試
    - Tab 切換正確顯示對應列表、售完灰階、購票 overlay 展開、確認購票 emit payload 正確、數量×票價計算、額滿按鈕禁用
    - **Validates: 需求 2.3, 2.8, 2.9, 2.10**

  - [ ] 13.3 為 PointsGame 撰寫例子測試與屬性測試
    - Property 2：獎品機率總和 = 1（正規化後）
    - Property 3：點數消耗後餘額 ≥ 0
    - 例子：點數足夠→旋轉觸發、點數不足→disabled、中獎 emit 正確、任務列表渲染
    - **Validates: 需求 6.5, 6.6, 6.7**

  - [ ] 13.4 為 CommunityBoard 撰寫例子測試
    - Tab 篩選正確、發文 emit 正確、空內容 disabled、揪團進度條渲染、「+1 參加」更新人數、已成團禁用、空狀態
    - Property 4：揪團進度 Clamp（100 次迭代）
    - **Validates: 需求 10.5, 10.7, 10.8**

  - [ ] 13.5 為 InterestMatch 撰寫例子測試
    - 標籤新增/移除 emit、匹配列表依分數排序、加入 emit、未選擇興趣引導狀態
    - Property 5：匹配度排序不變式（100 次迭代）
    - **Validates: 需求 9.5, 9.6, 9.7**

  - [ ] 13.6 為 TicketCard 撰寫例子測試
    - 展開/收合切換、三種狀態樣式（unused/used/expired）、QR Code 遮罩顯示
    - Property 1：票券狀態不可逆性
    - **Validates: 需求 3.3, 3.5**

  - [ ] 13.7 為 CrossModuleLink 撰寫例子測試
    - 三種導流卡片條件顯示、點擊跳轉 emit payload、無地址時隱藏交通卡片、無優惠時隱藏優惠卡片
    - **Validates: 需求 5.4, 5.5, 5.8**

- [ ] 14. 最終檢查點 — 全面整合驗證
  - [ ] 所有元件已建立且無 TypeScript 編譯錯誤（nuxt build 通過）
  - [ ] `entertainment/index.vue` 頁面可正常渲染所有元件
  - [ ] 作用域 Token 覆寫生效（粉紅主色 `#ec4899`、紫色次色 `#8b5cf6`）
  - [ ] Container 以 430px 置中顯示
  - [ ] 功能導航列 sticky 定位正確
  - [ ] AiSuggestion 條件顯示/關閉/換批正常
  - [ ] TicketCenter 三個 Tab 切換、購票 overlay、售完灰階正常
  - [ ] TicketCard 展開/收合、狀態樣式、QR Code 正常
  - [ ] CrossModuleLink 購票後顯示、導流跳轉正常
  - [ ] PointsGame 轉盤旋轉、點數扣減、任務列表正常
  - [ ] AchievementWall 徽章網格、解鎖/未解鎖樣式正常
  - [ ] CommunityEvents Tab 切換、報名、額滿禁用正常
  - [ ] InterestMatch 標籤選擇、匹配排序、加入按鈕正常
  - [ ] CommunityBoard 發文、揪團進度、Tab 篩選正常
  - [ ] Demo 控制面板四個按鈕功能正常
  - [ ] 所有測試通過

---

## 備註

- 每個任務均標注對應需求編號，確保可追溯性
- 模擬資料（Mock Data）用於展示用途，後續可替換為後端 API 回應
- AI 對話功能由全站右下角懸浮 Agent 統一處理，樂模組僅提供 `useEntertainmentAgent` composable 封裝推薦邏輯
- 跨模組導流依賴行模組的 `useTransportState` composable，需確認該 composable 已匯出 `setRouteDestination` 與 `setRideDestination` 方法
- 樂模組 Token 覆寫策略與其他模組一致（`.entertainment-module { --token }`），子元件自動繼承
- 轉盤動畫使用純 CSS animation，不依賴第三方動畫庫
- 票券卡片 QR Code 以 CSS 模擬（gradient + 方塊圖案），可後續替換為真實 QR Code 產生器
- 測試配置：vitest + @vue/test-utils + happy-dom + fast-check
- 複用全站 DashboardCard、ProgressBar、StatusBadge 元件，確保視覺一致性
- 社群留言板的相對時間計算使用簡易實作（分鐘/小時/天），不引入 dayjs

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"], "description": "頁面骨架 + composables" },
    { "id": 1, "tasks": ["1.4", "2.1", "3.1"], "description": "導航列 + 票務中心 + 票券卡片" },
    { "id": 2, "tasks": ["3.2", "4.1", "5.1"], "description": "我的票券區 + AI 提案 + 跨模組導流" },
    { "id": 3, "tasks": ["6.1", "7.1", "8.1"], "description": "OPEN POINT + 成就牆 + 社區活動" },
    { "id": 4, "tasks": ["9.1", "10.1"], "description": "興趣媒合 + 社群留言板" },
    { "id": 5, "tasks": ["11.1", "11.2", "11.3"], "description": "頁面組裝 + Mock 資料 + Demo 控制" },
    { "id": 6, "tasks": ["12.1"], "description": "無障礙驗收" },
    { "id": 7, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7"], "description": "測試" },
    { "id": 8, "tasks": ["14"], "description": "最終整合驗證" }
  ]
}
```
