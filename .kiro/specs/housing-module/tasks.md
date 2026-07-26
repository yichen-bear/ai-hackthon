# Implementation Plan: Housing Module（住模組）

## Overview

實作住模組的完整頁面，包含社區公告與公設故障回報、包裹管理（溫層分類 + 快速操作）、AI 垃圾分類與垃圾車倒數/回收預約、水電修繕雙狀態追蹤（報修表單 ↔ 派工追蹤卡片），以及 Demo 控制面板。遵循食模組與醫模組建立的架構模式：mobile-first 430px 容器、CSS Token 作用域覆寫、Vue refs + props 狀態管理、mock 資料驅動。

## Tasks

- [x] 1. Implement CommunityService component (simplest, list rendering)
  - [x] 1.1 Create `frontend/app/components/housing/CommunityService.vue`
    - Create component with `<script setup lang="ts">` syntax
    - Define props via `defineProps`: `announcements` (array of `{ id: string, title: string, date: string, summary: string }`)
    - Define emits via `defineEmits`: `'report-malfunction'`
    - Wrap content in `UiDashboardCard` with title "📢 社區公告"
    - Render announcement list (max 3 items via `.slice(0, 3)`), each showing title, date, and summary
    - Add 1px `--color-border` separator between items
    - Add empty state text "目前暫無社區公告" when array is empty
    - Add "📷 公設故障回報" button with `--color-secondary` background, white text, `--radius-md` rounded corners
    - Button click emits `'report-malfunction'`
    - Set `aria-label="公設故障回報"` on the button
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.4_

  - [ ]* 1.2 Write property test for CommunityService announcement list cap
    - **Property 5: 社區公告列表上限為 3 則**
    - **Validates: Requirements 5.3**

  - [ ]* 1.3 Write unit tests for CommunityService
    - Test announcements render correctly with title, date, summary
    - Test separator lines between items
    - Test empty state displays when announcements is empty
    - Test emit `report-malfunction` fires on button click
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [x] 2. Implement ParcelDashboard component (list + toggle logic)
  - [x] 2.1 Create `frontend/app/components/housing/ParcelDashboard.vue`
    - Create component with `<script setup lang="ts">` syntax
    - Define props via `defineProps`: `parcels` (array of `{ id: string, name: string, type: 'frozen' | 'refrigerated' | 'normal', urgent: boolean }`)
    - Wrap content in `UiDashboardCard` with title "📦 待領包裹"
    - Implement `classifyByType(parcels)` helper to group parcels by type (frozen → refrigerated → normal order)
    - Render each type group with icon/label: ❄️ 冷凍 / 🧊 冷藏 / 📦 常溫; skip groups with no items (v-if)
    - Display Urgency Badge (red pill "需今日領取") for frozen/refrigerated parcels with `role="status"` and `aria-live="polite"`
    - Implement empty state "🎉 目前沒有待領包裹" when parcels array is empty
    - Add three quick action pill buttons: "系統留言"、"代領"、"退貨" with toggle state (internal `actionStates` ref)
    - Active pill: `--color-primary` background + white text; inactive pill: `--color-bg-card` background + `--color-border` border
    - Style urgency badge: `background-color: var(--color-accent-red)`, white text, pill shape (`--radius-full`), `--text-xs` font size
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1, 7.2, 7.4_

  - [ ]* 2.2 Write property test for parcel type classification correctness
    - **Property 1: 包裹溫層分類正確性**
    - **Validates: Requirements 2.3**

  - [ ]* 2.3 Write property test for urgency badge display rules
    - **Property 2: 緊急標示與溫層類型一致性**
    - **Validates: Requirements 2.4**

  - [ ]* 2.4 Write property test for toggle idempotency
    - **Property 3: 快速操作按鈕 Toggle 冪等性**
    - **Validates: Requirements 2.6**

  - [ ]* 2.5 Write unit tests for ParcelDashboard
    - Test parcels grouped by type with correct icons
    - Test urgency badge shown only for frozen/refrigerated
    - Test pill button toggle active/inactive states
    - Test empty state when parcels is empty
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement GarbageAiAssistant component (simulation + form)
  - [x] 4.1 Create `frontend/app/components/housing/GarbageAiAssistant.vue`
    - Create component with `<script setup lang="ts">` syntax
    - Define props via `defineProps`: `truckMinutes` (number)
    - Define emits via `defineEmits`: `'submit-recycling'` with payload `{ itemType: string, date: string }`
    - Wrap content in `UiDashboardCard` with title "🗑️ AI 垃圾分類"
    - Add "📷 拍照辨識垃圾分類" button with `--color-primary` background, white text, `--radius-md` rounded corners, `aria-label="拍照辨識垃圾分類"`
    - Implement mock classification: on click, set `isClassifying = true`, show spinner + "辨識中..." text, disable button; after 500ms setTimeout, display `ClassificationResult` card (itemName: "寶特瓶", category: "資源回收", suggestion text)
    - Display truck countdown: "🚛 垃圾車還有 {truckMinutes} 分鐘到社區" with minutes number styled in `--color-accent-red`
    - Add recycling booking form: "物品類型" select (沙發/床墊/桌椅/家電/其他), "預約日期" date input, "送出預約" button
    - Button click emits `'submit-recycling'` with `{ itemType, date }` form data
    - Set `aria-label` on all interactive elements
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 7.3, 7.4_

  - [ ]* 4.2 Write unit tests for GarbageAiAssistant
    - Test classification button shows loading state during 500ms delay
    - Test classification result card renders after simulation
    - Test truck countdown displays correct minutes with red styling
    - Test form submission emits `submit-recycling` with correct payload
    - _Requirements: 3.4, 3.5, 3.7_

- [x] 5. Implement RepairTracker component (dual-state, most complex)
  - [x] 5.1 Create `frontend/app/components/housing/RepairTracker.vue`
    - Create component with `<script setup lang="ts">` syntax
    - Define props via `defineProps`: `hasActiveRepair` (boolean), `technicianName` (string), `etaMinutes` (number)
    - Define emits via `defineEmits`: `'submit-repair'` with payload `{ faultType: string, photo: string, description: string }`
    - Wrap content in `UiDashboardCard` with title "🔧 水電修繕"（append " · 派工追蹤" when `hasActiveRepair` is true）
    - **State A (form, when `hasActiveRepair === false`)**: fault type select (水管漏水/馬桶堵塞/電路問題/冷氣故障/其他), photo upload button (mock, displays filename), description textarea (optional), submit button with `--color-primary` background; emit `'submit-repair'` on click; disable submit if no fault type selected
    - **State B (dispatch card, when `hasActiveRepair === true`)**: display technician name "👨‍🔧 {technicianName}", location pulse animation (CSS `@keyframes pulse` on a 16px circle with `--color-primary` color), ETA text "⏱️ 預計 {etaMinutes} 分鐘抵達", two action buttons "📞 撥打電話" and "💬 傳送訊息" as outlined buttons (`--color-primary` border + text)
    - Use `v-if` / `v-else` for dual-state rendering (no animation needed)
    - Set `aria-label` on all buttons (e.g., "提交報修", "撥打電話聯繫師傅", "傳送訊息確認抵達")
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.3, 7.4, 7.5_

  - [ ]* 5.2 Write property test for RepairTracker dual-state exclusivity
    - **Property 4: Repair Tracker 雙狀態互斥性**
    - **Validates: Requirements 4.5**

  - [ ]* 5.3 Write unit tests for RepairTracker
    - Test form renders when `hasActiveRepair` is false
    - Test dispatch card renders when `hasActiveRepair` is true
    - Test submit button disabled when no fault type selected
    - Test emit `submit-repair` with correct payload on form submit
    - Test pulse animation element exists in dispatch state
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Assemble housing page and Demo control panel
  - [x] 7.1 Create `frontend/app/pages/housing.vue` with state management, layout, and demo panel
    - Create the page file with `<script setup lang="ts">` syntax
    - Add `.housing-module` wrapper class with scoped token overrides: `--color-primary: #d97706`, `--color-primary-light: #fffbeb`, `--color-secondary: #0d9488`, `--color-secondary-light: #ccfbf1`
    - Add `.housing-page` content container with `display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4)`
    - Declare mock data: `parcels` array (3 items: frozen urgent, refrigerated urgent, normal non-urgent), `announcements` array (2 items with title/date/summary), `technicianName = '王師傅'`, `etaMinutes = ref(15)`
    - Declare reactive state: `hasActiveRepair = ref(true)`, `truckMinutes = ref(8)`
    - Arrange child components in order: `HousingCommunityService` → `HousingParcelDashboard` → `HousingGarbageAiAssistant` → `HousingRepairTracker`
    - Pass props and handle emit events from all child components (console.log for demo)
    - Add Demo control panel (fixed bottom-right, `position: fixed; bottom: 20px; right: 20px; z-index: 999`): "🔧 切換派工狀態" button toggles `hasActiveRepair`, "🔄 重設" button resets all state to defaults
    - Style demo buttons matching medical.vue demo panel pattern (pill shape, shadow, colored backgrounds)
    - Set `<main role="main">` on the page content area
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 7.2 Write unit tests for housing.vue integration
    - Test all four child components are rendered
    - Test demo panel toggle button switches `hasActiveRepair`
    - Test demo panel reset button restores all defaults
    - _Requirements: 1.4, 6.3, 6.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All mock data is hardcoded (no backend API calls needed)
- Follow the food/medical module pattern for structure and naming conventions
- Use Nuxt 4 auto-import for UI components (`UiDashboardCard`)
- Components are ordered from simplest (CommunityService: list rendering) to most complex (RepairTracker: dual-state + animation)
- The page assembly task (7.1) comes last to wire everything together

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3", "2.4", "2.5", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["7.2"] }
  ]
}
```
