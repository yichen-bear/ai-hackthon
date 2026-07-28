# Implementation Plan: Medical Module（醫 Module）

## Overview

實作醫療模組的完整頁面，包含緊急求助、附近醫療資源/AI 診斷雙狀態卡片、每日健康追蹤、處方管理，以及送藥追蹤。遵循食模組（food module）建立的架構模式：mobile-first 430px 容器、CSS Token 作用域覆寫、BEM-like 命名、Vue refs + props 狀態管理、mock 資料驅動。

## Tasks

- [x] 1. Set up medical module page and shared utilities
  - [x] 1.1 Create `frontend/app/pages/medical.vue` with state management and layout
    - Create the page file with `.medical-module` CSS class wrapper and scoped token overrides (`--color-primary: #2563eb`, `--color-primary-light: #eff6ff`, `--color-secondary: #16a34a`, `--color-secondary-light: #dcfce7`)
    - Declare reactive state: `isAiTriggered` (boolean, default false), `viewMode` ('list' | 'map', default 'list'), `hasDeliveryOrder` (boolean, default false)
    - Import and arrange child components in vertical flex column with `var(--space-4)` gap and padding
    - Pass state as props and handle emits from child components
    - Use `useHead` to set `lang="zh-TW"` on the HTML element
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.2_

  - [x] 1.2 Create `frontend/app/utils/medical-validators.ts` with shared pure logic functions
    - Implement `validateAppointmentForm({ name, phone, condition })` returning `{ valid, errors }`
    - Implement `validatePrescriptionFile(file: File)` returning `{ valid, error? }`
    - Implement `calculateWaterProgress(intake: number, goal: number)` returning `{ percentage, overLimit }`
    - Implement `filterFacilities(facilities, maxCount)` with distance sort and cap at 20
    - Implement `searchDrugs(keyword, database, maxResults)` with cap at 10
    - Implement `getDeliveryStageStatus(currentStage, stageIndex)` returning 'done' | 'current' | 'pending'
    - Export all functions for use by components and tests
    - _Requirements: 4.5, 4.6, 5.1, 5.5, 6.1, 6.3, 7.3_

- [x] 2. Implement SOS emergency section
  - [x] 2.1 Create `frontend/app/components/medical/SosHeader.vue`
    - Red-tone background card with `🚨 緊急求助` title, distinct from DashboardCard
    - One-tap `tel:119` button with minimum 48×48px tap target and `aria-label="撥打 119 急救電話"`
    - Conditional emergency contact button (shown/disabled based on `emergencyContact` prop)
    - GPS coordinates display via `navigator.geolocation.getCurrentPosition` with 10s timeout
    - Fallback text `📍 無法取得位置` on geolocation error/denial
    - BEM naming: `.mc__sos-*`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1_

  - [ ]* 2.2 Write unit tests for SosHeader.vue
    - Test `tel:119` href is rendered correctly
    - Test emergency contact button shows when prop provided, hides when not
    - Test GPS success state displays coordinates
    - Test GPS failure state displays fallback message
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement Medical Resource Card (dual-state)
  - [x] 3.1 Create `frontend/app/components/medical/MedicalResourceCard.vue` — State A (resource list/map)
    - Display title "附近醫療資源" when `isAiTriggered` is false
    - Toggle tabs for list/map mode with emit `update:viewMode`
    - List mode: render mock facilities sorted by distance, each with name, type, distance, and "線上預約" button
    - Map mode: placeholder map view with facility markers
    - Empty state message when no facilities in range
    - Cap displayed entries at 20
    - BEM naming: `.mc__resource-*`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 3.2 Create `frontend/app/components/medical/MedicalResourceCard.vue` — State B (AI diagnosis)
    - Display title "🤖 AI 診斷建議" with dismiss button when `isAiTriggered` is true
    - Show diagnosis result card (conditionName, description, suggestedDepartment)
    - Pre-filled appointment form (name, phone, condition) — all editable
    - Form validation using `validateAppointmentForm` from shared utils
    - Inline error messages below invalid fields without clearing other values
    - Emit `submit-appointment` on valid submission, `dismiss-ai` on dismiss
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1_

  - [ ]* 3.3 Write property test for facility list ordering and cap
    - **Property 3: 設施列表按距離升冪排序**
    - **Property 1: 設施列表上限為 20 筆**
    - **Validates: Requirements 3.3, 3.4, 3.8**

  - [ ]* 3.4 Write property test for appointment form validation
    - **Property 4: 預約表單驗證正確接受與拒絕**
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 3.5 Write unit tests for MedicalResourceCard state switching
    - Test State A renders when `isAiTriggered` is false
    - Test State B renders when `isAiTriggered` is true
    - Test dismiss button emits `dismiss-ai`
    - Test viewMode toggle emits `update:viewMode`
    - Test form submission with valid data emits `submit-appointment`
    - _Requirements: 3.1, 4.1, 4.4, 8.4, 8.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Health Reminders component
  - [x] 5.1 Create `frontend/app/components/medical/HealthReminders.vue`
    - Water intake section using `UiProgressBar` with calculated percentage from `calculateWaterProgress`
    - Label format: `{current} / {goal} ml`
    - `overLimit` prop passed to ProgressBar when intake exceeds goal
    - Vitamin reminder list (1-10 items) showing name and HH:mm time
    - Health tip card with daily tip text (max 200 chars)
    - BEM naming: `.mc__health-*`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1_

  - [ ]* 5.2 Write property test for water intake progress calculation
    - **Property 5: 飲水量進度百分比計算**
    - **Validates: Requirements 5.1, 5.5**

  - [ ]* 5.3 Write unit tests for HealthReminders rendering
    - Test progress bar shows correct percentage and label
    - Test overLimit style triggers when intake > goal
    - Test vitamin list renders correct number of items
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 6. Implement Prescription Manager component
  - [x] 6.1 Create `frontend/app/components/medical/PrescriptionManager.vue`
    - Photo upload section with camera/gallery buttons, file validation using `validatePrescriptionFile`
    - Inline error messages for invalid format or oversized files
    - Chronic medication list (up to 20 items) showing name, dosage, schedule
    - Drug search input: triggers on 1+ characters, shows up to 10 results with name, dosage form, reference image
    - Empty state for no search results
    - BEM naming: `.mc__prescription-*`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1_

  - [ ]* 6.2 Write property test for prescription file validation
    - **Property 6: 處方檔案驗證**
    - **Validates: Requirements 6.1**

  - [ ]* 6.3 Write property test for medication list cap and drug search results cap
    - **Property 7: 慢性病用藥列表上限為 20 筆**
    - **Property 8: 藥物搜尋結果上限為 10 筆且包含必要欄位**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 6.4 Write unit tests for PrescriptionManager interactions
    - Test file upload triggers validation and displays error on invalid file
    - Test search triggers on 1 character input
    - Test empty state displayed when no results
    - _Requirements: 6.1, 6.3, 6.5_

- [x] 7. Implement Medicine Delivery component
  - [x] 7.1 Create `frontend/app/components/medical/MedicineDelivery.vue`
    - Partner card state (when `hasDeliveryOrder` is false): title, description, CTA button
    - Modal overlay simulating external platform on CTA click
    - Order confirmation in modal emits `order-confirmed` and closes modal within 500ms
    - Tracking state (when `hasDeliveryOrder` is true): 4-step progress tracker using `getDeliveryStageStatus`
    - Stage visualization: done/current/pending styles
    - Estimated delivery time display: "預計 N 分鐘送達"
    - BEM naming: `.mc__delivery-*`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1_

  - [ ]* 7.2 Write property test for delivery stage status
    - **Property 9: 送藥追蹤進度階段正確性**
    - **Validates: Requirements 7.3**

  - [ ]* 7.3 Write unit tests for MedicineDelivery state transitions
    - Test partner card renders when `hasDeliveryOrder` is false
    - Test tracking UI renders when `hasDeliveryOrder` is true
    - Test modal opens on CTA click and emits `order-confirmed`
    - Test stage highlighting matches currentStage prop
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 8. Integration and wiring
  - [x] 8.1 Wire all components together in medical.vue and verify end-to-end flow
    - Ensure all emit handlers in medical.vue correctly update reactive state
    - Verify State A → State B transition works via `isAiTriggered`
    - Verify partner card → tracking transition works via `hasDeliveryOrder`
    - Verify list/map toggle works via `viewMode`
    - Add mock AI trigger button (for demo purposes) to simulate `isAiTriggered = true`
    - Confirm all zh-TW text rendering with no English-only labels
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All mock data is hardcoded in components (no backend API calls needed)
- Follow the food module pattern (food.vue, BookingCard.vue) for structure and naming
- Use Nuxt 4 auto-import for UI components (UiDashboardCard, UiProgressBar)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "5.1", "6.1", "7.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["2.2", "3.3", "3.4", "3.5", "5.2", "5.3", "6.2", "6.3", "6.4", "7.2", "7.3"] },
    { "id": 5, "tasks": ["8.1"] }
  ]
}
```
