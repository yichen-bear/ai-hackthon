# Implementation Plan: 門診掛號預約模組（Clinic Appointment Booking）

## Overview

將醫療模組的門診掛號流程從「撥打電話預約」升級為「AI 自動填入預約表單」。實作順序為：後端 API 擴充 → 病患端表單 UI → 管理後台 API 整合。

## Tasks

- [x] 1. 後端 API 擴充與新增
  - [x] 1.1 擴充 POST /api/diagnosis/appointment 新增 age、date、session 欄位
    - 在 `backend/routes/diagnosis.js` 的 POST `/appointment` handler 中，從 `req.body` 解構新增 `age`, `date`, `session`
    - 在 `feedbackContent` 物件中新增 topicId 4036（age）、4037（date）、4038（session）
    - 既有欄位邏輯不變，新欄位為可選
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 1.2 新增 GET /api/diagnosis/appointments endpoint
    - 在 `backend/routes/diagnosis.js` 新增 `router.get('/appointments', ...)` handler
    - 查詢 `PmsFormFeedback` WHERE `formId=1020`，按 `creTime` 降序排列
    - 解析 `feedbackContent` 組裝回應格式：id, name, age, phone, nationalId（遮蔽）, date, session, clinicName, status, createdAt
    - 身分證遮蔽邏輯：前 4 碼 + `***` + 後 3 碼
    - _Requirements: 5.1, 5.3_

  - [ ]* 1.3 Write property tests for backend endpoints
    - **Property 3: 掛號資料儲存 Round-Trip**
    - **Property 4: 成功建立回應格式不變式**
    - **Property 5: GET 回應欄位完整性**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 5.3**

- [x] 2. Checkpoint - 確認後端 API 正常運作
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 病患端預約表單 UI
  - [x] 3.1 新增 'booking' view 狀態與入口按鈕
    - 在 `frontend/app/pages/medical/index.vue` 中將 `AppointmentView` type 擴充為 `'list' | 'form' | 'detail' | 'booking'`
    - 在診所詳情（detail view）中，將「撥打電話預約」連結替換為「AI 自動填入預約表單」按鈕
    - 按鈕點擊時切換 `currentAppointmentView` 為 `'booking'`，並將當前診所名稱保存至 reactive 變數
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 實作預約表單 UI 與預填邏輯
    - 在 `frontend/app/pages/medical/index.vue` 新增 booking view 的 template section
    - 表單欄位：姓名、電話、年齡、身分證字號、日期（`<input type="date">`）、門診時段（三個按鈕：早診/午診/晚診）
    - 預填邏輯：`generateRandomAge()` 產生 25-65 隨機整數、`generateRandomNationalId()` 產生 A-Z + 9 位數字格式
    - 診所名稱由進入 booking view 時帶入，顯示但不可編輯
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.3 實作表單驗證與提交邏輯
    - 驗證規則：姓名不為空、電話不為空、日期已選擇、時段已選擇
    - 驗證失敗時顯示對應紅色錯誤文字於欄位下方，阻止提交
    - 驗證通過後呼叫 `$fetch('/api/diagnosis/appointment', { method: 'POST', body: {...} })`
    - 成功：顯示 toast「預約成功！掛號號碼：${appointmentNumber}」，切回 detail view
    - 400 錯誤：顯示後端 message
    - 500/其他錯誤：顯示「系統錯誤，請稍後再試」
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.6, 7.1, 7.2_

  - [ ]* 3.4 Write property tests for pre-fill generators
    - **Property 1: 年齡預填值域不變式**
    - **Property 2: 身分證字號格式不變式**
    - **Validates: Requirements 2.2, 2.3**

- [x] 4. Checkpoint - 確認病患端表單功能正常
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 管理後台 API 整合
  - [x] 5.1 移除 mockAppointments 並整合 GET API
    - 在 `frontend/app/pages/admin/medical.vue` 中移除 `mockAppointments` 硬編碼資料
    - 新增 `appointments` ref 與 `fetchAppointments()` async 函式，呼叫 `$fetch('/api/diagnosis/appointments')`
    - 狀態映射：`'01'` → `'pending'`、`'02'` → `'approved'`、`'03'` → `'completed'`
    - `onMounted` 時自動載入，新增「重新整理」按鈕觸發 `fetchAppointments()`
    - 錯誤處理：GET 失敗時顯示錯誤提示 + 重試按鈕
    - _Requirements: 5.2, 5.4, 6.2, 6.3, 7.3_

  - [x] 5.2 實作批准預約功能（本地狀態更新）
    - 將 `approveAppointment()` 改為更新 `appointments` ref 中對應記錄的 status 為 `'approved'`
    - 更新 `appointmentCounts` computed 與 `filteredAppointments` computed 使用新的狀態值
    - Hackathon 方案：前端本地更新 + toast 提示，不做 PATCH API
    - _Requirements: 6.1, 6.2_

  - [ ]* 5.3 Write property test for status filtering
    - **Property 6: 狀態篩選正確性**
    - **Validates: Requirements 6.2**

- [x] 6. Final Checkpoint - 全模組整合確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Hackathon scope: 批准預約僅做前端本地狀態更新，不實作 PATCH API
- 所有前端程式碼使用 TypeScript + `<script setup lang="ts">`
- 後端程式碼使用 CommonJS（`require()`）

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] }
  ]
}
```
