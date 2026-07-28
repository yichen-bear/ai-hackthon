# 實作計畫：預模組（Booking Module）

## 概覽

依照 requirements.md 與 design.md，以漸進式步驟實作預模組頁面、專屬元件與 AI Agent 推薦邏輯。
技術棧：Nuxt 4 + Vue 3 + TypeScript（`<script setup lang="ts">`）。
預模組元件放在 `frontend/app/components/booking/`，頁面放在 `frontend/app/pages/booking/index.vue`。
Composables 放在 `frontend/app/composables/`。

---

## 任務

- [x] 1. 預模組基礎架構與頁面骨架
  - [x] 1.1 建立 `frontend/app/pages/booking/index.vue` 頁面骨架
    - 最外層容器加上 `class="booking-module"`
    - 在 `<style scoped>` 中定義 `.booking-module` Token 覆寫：
      - `--color-primary: #10b981`（翡翠綠主色）
      - `--color-primary-light: #ecfdf5`（翡翠綠淡底）
      - `--color-secondary: #f59e0b`（琥珀色次色）
      - `--color-secondary-light: #fffbeb`（琥珀色淡底）
    - 頁面內容以 `display: flex; flex-direction: column; gap: var(--space-4)` 垂直堆疊
    - 加入 `<main role="main">` 語意標籤
    - 沿用全站 Container（max-width: 430px 置中）
    - _需求: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [x] 1.2 建立 `frontend/app/composables/useBookingState.ts`
    - 定義 `agentRecommendation: Ref<BookingRecommendation | null>` 狀態
    - 定義 `currentStore: Ref<StoreInfo>` 預設為信義門市
    - 定義 `scrollToSection(section: 'preorder' | 'groupbuy' | 'order' | 'pickup' | 'wishlist')` 方法
    - 定義 `dismissRecommendation()` 方法
    - 使用 Nuxt `useState` composable 管理跨元件共享
    - _需求: 4.5, 8.5, 8.6, 11.6_

  - [x] 1.3 建立 `frontend/app/composables/useBookingAgent.ts`
    - 定義 `KEYWORD_RULES` 關鍵字匹配規則常量
    - 實作 `matchKeywords(input: string): BookingRecommendation` 方法
    - 規則：日用品→i划算、禮盒→i預購、團購→i划算、無匹配→預設熱門推薦
    - 確保任何輸入都返回有效 BookingRecommendation（channel、message、products）
    - _需求: 4.3, 4.4, 4.6_

  - [x] 1.4 建立功能區塊快捷導航列（BookingNav）
    - 在 `booking/index.vue` 內建立 sticky 導航列
    - 橫向可滾動 Tab：「i預購」「i划算」「訂單」「取貨」「收藏」
    - `position: sticky; top: 50px; z-index: 50`，純白背景，底部 1px border
    - 選中 Tab：`--color-primary` 文字 + 2px 底線；未選中：`--color-text-disabled`
    - 點擊 Tab 以 `scrollIntoView({ behavior: 'smooth' })` 捲動至對應區塊
    - 各元件區塊以 `ref` 標記（preorderRef、groupbuyRef、orderRef、pickupRef、wishlistRef）
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 2. i預購虛擬貨架元件
  - [x] 2.1 建立 `frontend/app/components/booking/PreOrderShelf.vue`
    - 以 `defineProps<{ products: PreOrderProduct[] }>()` 接收屬性
    - 以 `defineEmits<{ 'add-preorder': [payload: { productId: string; quantity: number; spec?: string }]; 'add-wishlist': [productId: string] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「i預購」，右上角「🏪 虛擬門市」副標籤
    - 分類 Tab 列：「節慶禮盒🎁」「名店美食🍰」「限量預購⚡」「獨家商品✨」
      - 橫向可滾動、選中以 `--color-primary` 底色 + 白字、未選中白底灰字
    - 2 欄網格商品卡片（Product_Card）：
      - 圖片區（CSS gradient 模擬，高度 120px）
      - 商品名稱（max 2 行 ellipsis）
      - 原價（刪除線）+ 預購價（`--color-primary`）
      - 標籤 Badge：限量（紅底白字）、獨家（`--color-secondary` 底白字）、熱賣（粉底紅字）
      - 預購截止倒數「剩 X 天」
    - 已截止商品：灰階 + `opacity: 0.5` + 「已截止」標籤
    - 點擊卡片展開詳情 overlay（backdrop + slide-up）：
      - 商品描述、規格選擇（specs 陣列）、數量選擇器（1~5）
      - 「加入預購」按鈕（`--color-primary` 背景白字）
      - 「❤️ 加入收藏」按鈕
    - 觸控目標 ≥ 44×44px
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 10.3_

- [x] 3. i划算門市店長開團元件
  - [x] 3.1 建立 `frontend/app/components/booking/GroupBuyHub.vue`
    - 以 `defineProps<{ groups: GroupBuyItem[]; currentStore: StoreInfo }>()` 接收屬性
    - 以 `defineEmits<{ 'join-group': [payload: { productId: string; groupId: string; storeId: string }]; 'switch-store': [] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「i划算」，右上角「🛒 門市團購」副標籤
    - 頂部「📍 附近門市團購」區塊：顯示 `currentStore.name` + 「切換門市」按鈕
    - 分類 Tab 列：「日用箱購🧻」「生鮮食材🥬」「飲品量販🥤」「一人即享👤」
    - 垂直列表商品卡片：
      - 左側：商品圖片（80×80px CSS 色塊）
      - 右側上方：商品名稱 + 規格
      - 右側中間：雙價格——「一人享」soloPrice（`--color-primary`）+ 「揪團」groupPrice（`--color-secondary`）+ 原價（刪除線）
      - 底部：ProgressBar 成團進度 + 文字「X/Y 人已參加」+ 團長門市名稱小字
      - 右下角：「+1 跟團」膠囊按鈕（`--color-primary` 背景白字，`--radius-full`）
    - 一人即享商品：「👤 一人即享」Badge（`--color-secondary`），不顯示進度條
    - 已滿團：按鈕替換為「已成團 ✓」灰字禁用
    - 每張卡片底部：「🏪 {storeName} 取貨付款」
    - 跟團按鈕點擊：進度條動畫（`transition: width 0.3s ease`）+ emit
    - 觸控目標 ≥ 44×44px
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 10.3_

- [x] 4. 訂單追蹤元件
  - [x] 4.1 建立 `frontend/app/components/booking/OrderTracker.vue`
    - 以 `defineProps<{ orders: BookingOrder[] }>()` 接收屬性
    - 以 `defineEmits<{ 'go-pickup': [orderId: string]; 'invite-friend': [orderId: string]; 'view-detail': [orderId: string] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「我的訂單」，右上角訂單數量 Badge
    - 篩選 Tab：「全部」「進行中」「可取貨」「已完成」，選中以 `--color-primary` 底線
    - 訂單卡片列表：
      - 訂單類型 Pill：「i預購」（`--color-secondary`）或「i划算」（`--color-primary`）
      - 商品名稱 + 規格摘要
      - 水平步驟條（Step Indicator）：
        - i划算 步驟：待成團 → 已成團 → 備貨中 → 可取貨
        - i預購 步驟：已預購 → 生產中 → 配送中 → 可取貨
        - 已完成：`--color-primary` 實心 + ✓
        - 目前步驟：`--color-primary` 實心 + 脈動動畫
        - 未完成：`--color-border` 空心圓
      - 附加資訊：成團進度條（待成團時）或到貨倒數（i預購）
    - 「可取貨」訂單底部：「📍 前往取貨」按鈕（`--color-primary` 背景白字）
    - 「待成團」訂單：ProgressBar + 「邀請好友」外框按鈕
    - 空狀態：「還沒有訂單，去逛逛吧！」+ 導航按鈕
    - 觸控目標 ≥ 44×44px
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 10.3_

- [x] 5. 取貨提醒與門市地圖元件
  - [x] 5.1 建立 `frontend/app/components/booking/PickupReminder.vue`
    - 以 `defineProps<{ pickups: PickupItem[] }>()` 接收屬性
    - 以 `defineEmits<{ 'navigate-to-store': [payload: { storeId: string; mode: string }]; 'confirm-pickup': [pickupId: string] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「取貨提醒」，右上角待取件數 Badge（紅底白字圓形）
    - 待取貨清單：
      - 商品名稱 + 取貨編號
      - 取貨門市名稱
      - 取貨期限：「請於 MM/DD 前取貨」
      - 即將到期（≤ 2 天）以 `--color-accent-red` 標示
      - 已逾期：灰階 + 刪除線 + 「已逾期」Badge（紅底白字）
      - 「導航前往」按鈕（`--color-primary` 外框按鈕）
    - 點擊「導航前往」展開門市地圖區塊：
      - 門市地圖（CSS 模擬地圖區域 + 定位標記，含降級方案）
      - 門市詳細資訊：名稱、地址、營業時間、電話
      - 「🚶 步行導航」+「🚗 開車導航」快捷按鈕
    - 空狀態：「目前沒有待取貨商品 🎉」
    - 導航按鈕 emit `navigate-to-store`（可與行模組聯動）
    - 觸控目標 ≥ 44×44px
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 10.3, 12.1_

- [x] 6. 收藏清單元件
  - [x] 6.1 建立 `frontend/app/components/booking/WishlistPanel.vue`
    - 以 `defineProps<{ items: WishlistItem[] }>()` 接收屬性
    - 以 `defineEmits<{ 'buy-now': [payload: { productId: string; channel: string }]; 'remove-item': [productId: string] }>()` 定義事件
    - 以 DashboardCard 包裝，標題「我的收藏」，右上角收藏數量
    - 排序選項：「最近加入」（預設）、「即將截止」、「價格低到高」（Pill Tab 切換）
    - 垂直列表收藏卡片：
      - 左側：商品圖片（60×60px CSS 色塊）
      - 中間：商品名稱 + 來源頻道標籤（「i預購」/「i划算」）+ 目前價格
      - 右側：「🛒 立即購買」按鈕 + 「🗑️」移除圖示按鈕
    - 降價商品：「🔥 降價了！」Badge（紅底白字）+ 原價刪除線 + 新價 `--color-primary`
    - 即將截止商品（≤ 3 天）：「⏰ 即將截止」Badge（`--color-secondary` 背景白字）
    - 移除動畫：`transition: transform 0.3s, opacity 0.3s` 滑動收起
    - 空狀態：「還沒有收藏商品，去逛逛吧 💚」
    - 觸控目標 ≥ 44×44px
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 10.3_

- [x] 7. 頁面組裝與資料流串接
  - [x] 7.1 在 `booking/index.vue` 中組裝所有元件並串接資料流
    - 5 個主要元件依佈局順序插入（PreOrderShelf → GroupBuyHub → OrderTracker → PickupReminder → WishlistPanel）
    - AI Agent 推薦提示區（頂部，條件顯示）：
      - 監聽 `useBookingState().agentRecommendation`
      - 顯示推薦頻道 Badge + 推薦商品 + 「前往查看」按鈕 + 「✕」關閉按鈕
      - 點擊「前往查看」→ `scrollToSection()` 滾動至對應區塊
      - 點擊「✕」→ `dismissRecommendation()`
    - PreOrderShelf `add-preorder` → 新增訂單至 orders 列表
    - GroupBuyHub `join-group` → 更新對應團購 currentMembers + 可能新增訂單
    - OrderTracker `go-pickup` → scrollToSection('pickup')
    - PickupReminder `navigate-to-store` → 跨模組聯動（log/toast 模擬）
    - WishlistPanel `buy-now` → scrollToSection 至對應頻道區塊
    - WishlistPanel `remove-item` → 從 wishlist 移除
    - _需求: 1.4, 4.5, 4.7, 12.4_

  - [x] 7.2 準備完整 Mock 資料
    - mockProducts: 4 筆 i預購商品（含 1 筆已截止）
    - mockGroups: 4 筆 i划算團購（含 1 筆一人即享、不同成團進度）
    - mockOrders: 3 筆訂單（待成團 / 備貨中 / 可取貨）
    - mockPickups: 2 筆取貨提醒（含 1 筆即將到期）
    - mockWishlist: 3 筆收藏（含 1 筆降價、1 筆即將截止）
    - mockStores: 3 筆門市資訊
    - _需求: 9.1_

  - [x] 7.3 建立 Demo 控制面板
    - 固定於右下角（`position: fixed; bottom: 20px; right: 20px; z-index: 999`）
    - 「🛒 模擬跟團」按鈕：隨機增加某團購 currentMembers
    - 「📦 模擬到貨」按鈕：將某筆進行中訂單切換為「可取貨」+ 新增取貨提醒
    - 「🔄 重設」按鈕：恢復所有 Mock 狀態為預設值
    - _需求: 9.2, 9.3_

- [x] 8. 無障礙驗收與觸控優化
  - [x] 8.1 為所有元件補充無障礙屬性與觸控優化
    - 所有可互動按鈕觸控目標 ≥ 44×44px
    - 所有 `<button>` 均有 `aria-label` 或可見文字
    - 所有狀態變更使用 `aria-live="polite"` 通知螢幕閱讀器
    - 可互動元件 hover 時 `opacity: 0.85`（`transition: 0.15s ease`）
    - 鍵盤焦點外框 `outline: 2px solid var(--color-primary)`
    - 文字與背景色對比度 ≥ 4.5:1（WCAG 2.1 AA）
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 9. 屬性測試與單元測試
  - [x] 9.1 為 `useBookingAgent` 撰寫屬性測試與例子測試
    - Property 5：matchKeywords 任意輸入返回有效 BookingRecommendation（100 次迭代）
    - 例子：衛生紙→i划算、禮盒→i預購、空字串→預設推薦、無匹配→預設推薦
    - **Validates: 需求 4.3, 4.4, 4.6**

  - [x] 9.2 為 GroupBuyHub 撰寫例子測試
    - 門市名稱顯示、雙價格渲染、一人即享 Badge、跟團 emit、已成團按鈕禁用、進度條百分比
    - Property 1：成團進度 Clamp（100 次迭代）
    - **Validates: 需求 3.5, 3.7, 3.8**

  - [x] 9.3 為 OrderTracker 撰寫例子測試
    - 篩選 Tab 切換、步驟條渲染、可取貨按鈕 emit、待成團進度條、空狀態
    - Property 2：訂單步驟進度不變式（100 次迭代）
    - **Validates: 需求 5.3, 5.4, 5.5, 5.7**

  - [x] 9.4 為 WishlistPanel 撰寫例子測試
    - 降價 Badge 顯示、即將截止 Badge、排序切換、移除 emit、空狀態
    - Property 4：排序穩定性（100 次迭代）
    - **Validates: 需求 7.4, 7.5, 7.9**

  - [x] 9.5 為 PickupReminder 撰寫例子測試
    - 即將到期紅字、已逾期灰階、地圖展開、導航 emit、空狀態
    - Property 3：取貨期限狀態一致性（100 次迭代）
    - **Validates: 需求 6.3, 6.9**

- [x] 10. 最終檢查點 — 全面整合驗證
  - [x] 所有元件已建立且無 TypeScript 編譯錯誤（nuxt build 通過）
  - [x] `booking/index.vue` 頁面可正常渲染所有元件
  - [x] 作用域 Token 覆寫生效（翡翠綠主色 `#10b981`、琥珀次色 `#f59e0b`）
  - [x] Container 以 430px 置中顯示
  - [x] 功能導航列 sticky 定位正確
  - [x] AI Agent 推薦提示區條件顯示/關閉正常
  - [x] PreOrderShelf 分類切換、已截止灰階、詳情 overlay 正常
  - [x] GroupBuyHub 門市顯示、雙價格、跟團動畫、一人即享正常
  - [x] OrderTracker 步驟條、篩選、可取貨按鈕正常
  - [x] PickupReminder 地圖展開、導航 emit、到期警示正常
  - [x] WishlistPanel 降價/截止 Badge、排序、移除動畫正常
  - [x] Demo 控制面板三個按鈕功能正常
  - [x] 所有測試通過（69 個，含 37 個預模組測試）

---

## 備註

- 每個任務均標注對應需求編號，確保可追溯性
- 模擬資料（Mock Data）用於展示用途，後續可替換為後端 API 回應
- AI 對話功能由全站右下角懸浮 Agent 統一處理，預模組僅提供 `useBookingAgent` composable 封裝推薦邏輯
- i划算 採用門市店長開團模式，每張商品卡片標示取貨門市，強調線下取貨體驗
- 預模組 Token 覆寫策略與其他模組一致（`.booking-module { --token }`），子元件自動繼承
- 地圖功能（PickupReminder）採用 CSS 模擬 + 降級文字方案，可後續替換為真實地圖 API
- 測試配置：vitest + @vue/test-utils + happy-dom + fast-check
- 複用全站 ProgressBar 元件呈現成團進度，確保視覺一致性

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"], "description": "頁面骨架 + composables", "status": "completed" },
    { "id": 1, "tasks": ["1.4", "2.1", "3.1"], "description": "導航列 + i預購 + i划算", "status": "completed" },
    { "id": 2, "tasks": ["4.1", "5.1", "6.1"], "description": "訂單追蹤 + 取貨提醒 + 收藏清單", "status": "completed" },
    { "id": 3, "tasks": ["7.1", "7.2", "7.3"], "description": "頁面組裝 + Mock 資料 + Demo 控制", "status": "completed" },
    { "id": 4, "tasks": ["8.1"], "description": "無障礙驗收", "status": "completed" },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"], "description": "測試", "status": "completed" },
    { "id": 6, "tasks": ["10"], "description": "最終整合驗證", "status": "completed" }
  ]
}
```
