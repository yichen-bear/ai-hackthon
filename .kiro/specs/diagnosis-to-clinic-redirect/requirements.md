# Requirements Document

## Introduction

本功能將 DiagnosisFlow 元件中 AI 診斷結果頁面的「預約掛號」按鈕行為從內部掛號流程改為跳轉至門診掛號 tab。點擊按鈕後，系統帶入 AI 診斷出的推薦科別，自動切換到門診掛號 tab 並以該科別篩選附近診所，同時顯示 AI 推薦提示標籤。原有 DiagnosisFlow 中的 booking/confirm/success 步驟程式碼將完全移除。

## Glossary

- **DiagnosisFlow**: 前端 Vue 元件，負責 AI 智慧症狀分析的輸入、分析、結果展示流程（`frontend/app/components/medical/DiagnosisFlow.vue`）
- **MedicalPage**: 醫療模組頁面（`frontend/app/pages/medical/index.vue`），包含多個 tab 切換功能
- **ClinicTab**: MedicalPage 中 key 為 `clinic` 的門診掛號 tab
- **DeptPillBar**: ClinicTab 中的科別篩選按鈕列（pill bar）
- **AIRecommendBadge**: 顯示 AI 推薦科別的提示標籤元件，含關閉按鈕
- **RecommendedDept**: AI 診斷結果中的推薦科別字串（來自 `DiagnosisResult.department`）
- **SearchNearby**: `useNearbyClinic` composable 提供的搜尋附近醫療資源函式

## Requirements

### Requirement 1: 移除 DiagnosisFlow 內部掛號流程

**User Story:** As a developer, I want the internal booking/confirm/success steps removed from DiagnosisFlow, so that the component only handles diagnosis and delegates clinic navigation to the parent page.

#### Acceptance Criteria

1. THE DiagnosisFlow SHALL only define the following flow steps: `input`, `analyzing`, and `result`
2. THE DiagnosisFlow SHALL not contain any template, script logic, or style related to booking, confirm, or success steps
3. THE DiagnosisFlow SHALL not import or reference `ClinicInfo` or `AppointmentPayload` types from `useDiagnosis`

### Requirement 2: DiagnosisFlow emit 推薦科別事件

**User Story:** As a user, I want to click the booking button on the AI diagnosis result and be redirected to the clinic tab with my recommended department pre-selected, so that I can quickly find relevant clinics.

#### Acceptance Criteria

1. WHEN the user clicks the booking button on the diagnosis result step, THE DiagnosisFlow SHALL emit a `go-to-clinic` event with the RecommendedDept value as payload
2. THE DiagnosisFlow SHALL emit the `go-to-clinic` event using the `department` field from the current `diagnosisResult`

### Requirement 3: MedicalPage 接收事件並跳轉門診掛號 tab

**User Story:** As a user, I want the medical page to respond to the diagnosis recommendation by switching to the clinic tab and filtering by the recommended department, so that I see relevant clinics immediately.

#### Acceptance Criteria

1. WHEN MedicalPage receives the `go-to-clinic` event from DiagnosisFlow, THE MedicalPage SHALL set `activeTab` to `clinic`
2. WHEN MedicalPage receives the `go-to-clinic` event from DiagnosisFlow, THE MedicalPage SHALL set `selectedDept` to the received department value
3. WHEN MedicalPage receives the `go-to-clinic` event from DiagnosisFlow, THE MedicalPage SHALL call SearchNearby with the received department value as keyword parameter
4. WHEN MedicalPage receives the `go-to-clinic` event from DiagnosisFlow, THE MedicalPage SHALL set `currentAppointmentView` to `list`

### Requirement 4: 顯示 AI 推薦提示標籤

**User Story:** As a user, I want to see a visual indicator that the current clinic filter was set by AI recommendation, so that I understand why a specific department is pre-selected.

#### Acceptance Criteria

1. WHEN MedicalPage receives the `go-to-clinic` event, THE MedicalPage SHALL display the AIRecommendBadge showing the text format「AI 建議科別：{department}」
2. THE AIRecommendBadge SHALL include a close button (X icon) on the right side
3. WHEN the user clicks the close button on the AIRecommendBadge, THE MedicalPage SHALL hide the AIRecommendBadge
4. WHILE the AIRecommendBadge is visible, THE DeptPillBar SHALL highlight the pill matching the AI-recommended department as active

### Requirement 5: 科別 pill 選中狀態同步

**User Story:** As a user, I want the department pill bar to reflect the AI-recommended department as selected after redirection, so that the UI is consistent.

#### Acceptance Criteria

1. WHEN MedicalPage sets `selectedDept` to the AI-recommended department, THE DeptPillBar SHALL visually activate the corresponding department pill
2. WHEN the user manually selects a different department pill after AI redirection, THE MedicalPage SHALL update `selectedDept` to the newly selected department
3. WHEN the user manually selects a different department pill after AI redirection, THE MedicalPage SHALL hide the AIRecommendBadge
