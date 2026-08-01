# Requirements Document

## Introduction

本功能將醫療模組的門診掛號流程從「撥打電話預約」升級為「AI 自動填入預約表單」。病患端在診所詳情頁點擊按鈕後進入預約表單頁，填寫個人資料與選擇就診日期時段後提交至後端儲存。診所端管理後台從資料庫即時讀取預約掛號資料，取代現有的寫死 mock 資料。

## Glossary

- **Booking_System**: 門診掛號預約系統，負責處理病患端表單提交與診所端預約管理
- **Patient_Form**: 病患端預約表單頁面，用於收集掛號所需個人資料與就診時段
- **Admin_Panel**: 診所端管理後台（admin/medical.vue），用於查看與管理預約掛號
- **PmsFormFeedback**: 資料庫模型，用於儲存表單回饋資料（formId: 1020）
- **Session**: 門診時段，分為早診、午診、晚診三種
- **TopicId**: feedbackContent JSON 中用於標識各欄位的數字鍵值

## Requirements

### Requirement 1: 預約表單入口替換

**User Story:** As a 病患, I want 在診所詳情頁直接開啟預約表單, so that 不需要撥打電話即可完成掛號預約。

#### Acceptance Criteria

1. WHEN 病患開啟診所詳情頁, THE Booking_System SHALL 顯示「AI 自動填入預約表單」按鈕取代原有的「撥打電話預約」連結
2. WHEN 病患點擊「AI 自動填入預約表單」按鈕, THE Booking_System SHALL 導航至 Patient_Form 預約表單頁面
3. THE Booking_System SHALL 將當前診所名稱傳遞至 Patient_Form 供表單預填使用

### Requirement 2: 預約表單欄位與預填

**User Story:** As a 病患, I want 表單自動預填假值以加快填寫速度, so that 我可以快速完成預約且必要時修改資料。

#### Acceptance Criteria

1. THE Patient_Form SHALL 顯示以下欄位：姓名、電話、年齡、身分證字號、日期選擇、門診時段選擇
2. WHEN Patient_Form 載入時, THE Booking_System SHALL 預填年齡欄位為 25 至 65 之間的隨機整數
3. WHEN Patient_Form 載入時, THE Booking_System SHALL 預填身分證字號欄位為格式「一個大寫英文字母 + 9 位數字」的隨機值
4. THE Patient_Form SHALL 允許病患修改所有預填欄位的值
5. THE Patient_Form SHALL 提供日曆元件供病患選擇就診日期
6. THE Patient_Form SHALL 提供早診、午診、晚診三個 Session 選項供病患選擇

### Requirement 3: 表單驗證

**User Story:** As a 病患, I want 在提交前收到欄位錯誤提示, so that 確保掛號資料完整正確。

#### Acceptance Criteria

1. WHEN 病患提交表單時姓名欄位為空, THEN THE Patient_Form SHALL 顯示「請填寫姓名」錯誤訊息且阻止提交
2. WHEN 病患提交表單時電話欄位為空, THEN THE Patient_Form SHALL 顯示「請填寫電話」錯誤訊息且阻止提交
3. WHEN 病患提交表單時未選擇日期, THEN THE Patient_Form SHALL 顯示「請選擇就診日期」錯誤訊息且阻止提交
4. WHEN 病患提交表單時未選擇門診時段, THEN THE Patient_Form SHALL 顯示「請選擇門診時段」錯誤訊息且阻止提交

### Requirement 4: 表單提交與資料儲存

**User Story:** As a 病患, I want 提交預約表單後資料被保存至資料庫, so that 診所端可以收到我的掛號請求。

#### Acceptance Criteria

1. WHEN 病患提交有效表單, THE Booking_System SHALL 發送 POST 請求至 /api/diagnosis/appointment，body 包含 patientName、phone、nationalId、age、date、session 以及 clinicName 欄位
2. WHEN 後端收到 POST /api/diagnosis/appointment 請求, THE Booking_System SHALL 將 age 儲存至 feedbackContent 的 topicId 4036
3. WHEN 後端收到 POST /api/diagnosis/appointment 請求, THE Booking_System SHALL 將 date 儲存至 feedbackContent 的 topicId 4037
4. WHEN 後端收到 POST /api/diagnosis/appointment 請求, THE Booking_System SHALL 將 session 儲存至 feedbackContent 的 topicId 4038
5. WHEN 後端成功建立掛號記錄, THE Booking_System SHALL 回傳 HTTP 201 狀態碼與 feedbackNo 及 appointmentNumber
6. WHEN 病患收到成功回應, THE Patient_Form SHALL 顯示預約成功提示並返回診所詳情頁

### Requirement 5: 診所端預約掛號資料讀取

**User Story:** As a 診所管理者, I want 從資料庫讀取即時預約掛號資料, so that 不再依賴寫死的假資料來管理預約。

#### Acceptance Criteria

1. THE Booking_System SHALL 提供 GET /api/diagnosis/appointments endpoint 回傳所有 formId 為 1020 的掛號記錄
2. WHEN Admin_Panel 載入預約掛號管理功能, THE Admin_Panel SHALL 呼叫 GET /api/diagnosis/appointments 取得掛號資料
3. THE GET /api/diagnosis/appointments endpoint SHALL 回傳每筆記錄的 id、name、age、phone、nationalId、date、session、clinicName、status、createdAt 欄位
4. THE Admin_Panel SHALL 以現有卡片格式顯示從 API 取得的掛號資料，取代 mockAppointments 寫死資料

### Requirement 6: 預約狀態管理

**User Story:** As a 診所管理者, I want 批准或管理預約掛號, so that 我可以確認病患的看診排程。

#### Acceptance Criteria

1. WHEN 診所管理者點擊「批准預約」按鈕, THE Admin_Panel SHALL 更新該筆預約的狀態為 approved
2. THE Admin_Panel SHALL 依照待確認、已確認、已完成三種狀態篩選顯示預約記錄
3. WHEN 病患端提交新預約後, THE Admin_Panel SHALL 在下次載入或重新整理時顯示該筆新預約記錄

### Requirement 7: 錯誤處理

**User Story:** As a 病患, I want 在系統錯誤時收到明確提示, so that 我知道需要重試操作。

#### Acceptance Criteria

1. IF POST /api/diagnosis/appointment 回傳 HTTP 400 錯誤, THEN THE Patient_Form SHALL 顯示後端回傳的錯誤訊息
2. IF POST /api/diagnosis/appointment 回傳 HTTP 500 錯誤, THEN THE Patient_Form SHALL 顯示「系統錯誤，請稍後再試」訊息
3. IF GET /api/diagnosis/appointments 回傳錯誤, THEN THE Admin_Panel SHALL 顯示錯誤提示並提供重試按鈕
