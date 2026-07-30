# Implementation Plan: AI 智能表單助手

## Overview

依 design.md 的架構，實作分為後端（Groq LLM 閘道、Rate Limiter、表單比對/驗證、Chat_Assistant 分派邏輯、聯絡資訊加解密、路由）與前端（獨立聊天頁面、STT/TTS composables、Chat_Session 狀態管理、BottomActionBar 導覽變更、填滿轉場效果）兩條線，並以 fast-check 撰寫 24 個 Correctness Properties 對應的屬性測試（後端用 jest，前端用 vitest）。任務依「純函式優先、由下而上組裝、最後串接路由/UI」的順序編排，讓每一步都可獨立驗證。

## Tasks

- [x] 1. 建立後端共用常數與輸入防護工具
  - [x] 1.1 建立 `backend/constants/formCodes.js`
    - 定義 `pms_form_topic.type` 暫行代碼常數（文字=`01`、數字=`02`、單選=`03`、多選=`04`、日期=`05`、上傳圖片=`06`）並 export
    - _Requirements: 4.2（設計 MVP 決策 #1）_

  - [x] 1.2 於 `backend/utils/crypto.js` 新增 `hashContactField` 函式
    - 沿用與 `hashEmail` 相同的 SHA-256 正規化規則（trim 後取 SHA-256 hex），不修改既有 `hashEmail`/`encryptField`/`decryptField` 行為
    - _Requirements: 6.3_

  - [x]* 1.3 為 `crypto.js` 補充加解密往返屬性測試
    - **Property 16: 聯絡資訊加解密往返與未提供值的 null 處理**（本任務僅涵蓋 `encryptField(decryptField)` 往返部分）
    - **Validates: Requirements 6.3**
    - 檔案：`backend/__tests__/utils/crypto.property.test.js`

  - [x] 1.4 建立 `backend/utils/inputGuard.js`：`truncateForLLM(text)` 與 `containsDisallowedContent(text)`
    - `truncateForLLM` 截斷輸入至最多 1000 字元
    - `containsDisallowedContent` 檢查禁用詞彙表（含仇恨言論、色情、暴力煽動相關詞彙的最小詞庫）
    - 另新增 `validateMessageBeforeSend(text)`（500 字元上限、HTML/程式碼片段特徵檢測，供 Requirement 1.6/1.7 前端與後端共用邏輯參考，後端做最終把關）
    - _Requirements: 1.6, 1.7, 9.5, 9.6_

  - [x]* 1.5 撰寫 `inputGuard.js` 屬性測試
    - **Property 2: 輸入文字驗證閘門** — **Validates: Requirements 1.6, 1.7**
    - **Property 23: 語音輸入截斷保持前綴且不超過上限** — **Validates: Requirements 9.5**
    - **Property 24: 禁用內容判定阻止 LLM 呼叫** — **Validates: Requirements 9.6**
    - 檔案：`backend/__tests__/utils/inputGuard.property.test.js`（三個屬性各自獨立 test case）

  - [x] 1.6 建立 `backend/utils/piiLogging.js`：`maskPiiForLogging(obj)`
    - 排除 `contactName`/`contactMobile`/`contactLandline`/`contactEmail`/`contactAddressDetail` 明文值，以遮罩標記取代
    - _Requirements: 9.4_

  - [x]* 1.7 撰寫 `piiLogging.js` 屬性測試
    - **Property 22: 日誌遮罩排除明文個資欄位**
    - **Validates: Requirements 9.4**
    - 檔案：`backend/__tests__/utils/piiLogging.property.test.js`

- [x] 2. 實作後端 Rate_Limiter 中介層
  - [x] 2.1 建立 `backend/middleware/aiChatRateLimiter.js`
    - 純函式 `checkAndConsume(state, identifier, now, windowSeconds, maxCalls) -> { allowed, state, retryAfterSeconds }`
    - Express middleware 包裝：讀取 `AI_CHAT_RATE_WINDOW_SECONDS`（預設 60）、`AI_CHAT_RATE_MAX_CALLS`（預設 20）；識別碼取 `req.user?.sub` 或 `req.ip`；拒絕時回 429 並帶 `retryAfterSeconds`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x]* 2.2 撰寫 `aiChatRateLimiter` 屬性測試
    - **Property 21: 呼叫頻率限制計數與時間窗口**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    - 檔案：`backend/__tests__/middleware/aiChatRateLimiter.property.test.js`

- [x] 3. 實作 LLM_Gateway（Groq 雙模型策略與 429 重試/降級）
  - [x] 3.1 建立 `backend/services/llmGateway.js` 核心純函式
    - `shouldEscalateToSmartModel(confidence, threshold)`
    - `retryWithBackoff(callFn, { maxRetries: 3, minIntervalMs: 500, sleepFn })`（`sleepFn` 可注入以供測試 mock 計時器）
    - `parseStructuredResponse(rawContent)`：parse 失敗回傳 `{ action: 'error' }`
    - _Requirements: 7.2, 7.3, 7.5_

  - [x]* 3.2 撰寫 `shouldEscalateToSmartModel` 屬性測試
    - **Property 18: 信心分數門檻決定模型升級**
    - **Validates: Requirements 7.2**
    - 檔案：`backend/__tests__/services/llmGateway.property.test.js`

  - [x] 3.3 實作 `callFastModel`/`callSmartModel`/`requestStructuredResponse`
    - 使用 `openai` npm package，`baseURL: 'https://api.groq.com/openai/v1'`，`apiKey: process.env.GROQ_API_KEY`
    - `requestStructuredResponse({ messages, forceSmart })` 依 design.md 5 步流程整合 `retryWithBackoff`、信心分數升級、Smart→Fast 降級、`ServiceBusyError`
    - _Requirements: 7.1, 7.4, 7.6, 7.7_

  - [x]* 3.4 撰寫 429 重試與降級序列屬性測試
    - **Property 19: 429 重試與降級序列**
    - **Validates: Requirements 7.3, 7.4, 7.5**
    - 檔案：`backend/__tests__/services/llmGateway.property.test.js`（新增獨立 test case，mock 計時器與 Groq 呼叫）

- [x] 4. 實作表單比對與答案驗證服務
  - [x] 4.1 建立 `backend/services/formMatchingService.js`：`listActiveForms()`、`getFormWithTopics(formId)`
    - `listActiveForms()` 查詢 `pms_form` where `isEnable = '1' AND isDeleted = '0'`
    - `getFormWithTopics(formId)` 依 `PmsFormGroup.sort`、`PmsFormTopic.sort` 取得表單、群組、題目、選項
    - _Requirements: 3.1, 4.1_

  - [x]* 4.2 撰寫 `listActiveForms` 屬性測試
    - **Property 4: 可選表單清單即為啟用未刪除之子集合**
    - **Validates: Requirements 3.1**
    - 檔案：`backend/__tests__/services/formMatchingService.property.test.js`（以 mock Prisma Client 注入任意資料集合）

  - [x] 4.3 實作 `validateAnswerAgainstTopic(topic, rawAnswer)` 純函式
    - 依 `topic.type`（`formCodes.js` 常數）與限制條件（`PmsTopicOption`、`minimumMediasUpload`/`maximumMediasUpload`、`startDateOffsetDays`/`endDateOffsetDays`、`isRequired`）驗證答案，回傳 `{ valid, normalizedValue, errorMessage }`
    - _Requirements: 4.2, 4.4, 4.5_

  - [x]* 4.4 撰寫 `validateAnswerAgainstTopic` 屬性測試
    - **Property 11: 答案驗證正確反映題目限制條件**
    - **Validates: Requirements 4.4, 4.5**
    - 檔案：`backend/__tests__/services/formMatchingService.property.test.js`

  - [x] 4.5 實作 `selectNextTopic(topics, collectedFields)` 純函式
    - 回傳未回答題目中依 `group.sort` 再依 `topic.sort` 排序後的最小者；全部回答完回傳 `null`
    - _Requirements: 4.1_

  - [x]* 4.6 撰寫 `selectNextTopic` 屬性測試
    - **Property 9: 下一題選擇規則**
    - **Validates: Requirements 4.1**
    - 檔案：`backend/__tests__/services/formMatchingService.property.test.js`

- [ ] 5. Checkpoint - 確認純函式邏輯層測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. 實作 Chat_Assistant 核心狀態轉換邏輯（純函式）
  - [x] 6.1 建立 `backend/services/chatAssistantService.js`：Chat_Session 型別輔助與 `applyMatchResult(session, matchedFormId, validFormIds)`
    - 套用表單比對結果：`matched_form_id` 存在於有效集合內則設定 `selectedFormId`，否則保持 `null`
    - _Requirements: 3.2, 3.3, 3.4_

  - [x]* 6.2 撰寫 `applyMatchResult` 屬性測試
    - **Property 5: 表單比對結果套用規則**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 6.3 實作 `applyNonAdvancingResponse(session, structuredResponse)`
    - 針對 `action` 為 `need_clarification` 或 `answer_question`（含 `reply_text` 為空）的回應，保持 `session.stage` 不變
    - _Requirements: 3.5, 5.1, 5.2, 5.5_

  - [x]* 6.4 撰寫 `applyNonAdvancingResponse` 屬性測試
    - **Property 6: 非推進動作保持 Chat_Session 階段不變**
    - **Validates: Requirements 3.5, 5.1, 5.2, 5.5**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 6.5 實作 `requestFormSwitch(session, newFormId)` 與 `resolveFormSwitch(session, isConfirmed)`
    - `requestFormSwitch`：設定 `pendingFormSwitch`，不變更 `selectedFormId`/`collectedFields`
    - `resolveFormSwitch`：確認時清空 `collectedFields` 並切換 `selectedFormId`；拒絕/未回覆時保留原狀態
    - _Requirements: 3.6, 3.7, 3.8_

  - [x]* 6.6 撰寫表單切換屬性測試
    - **Property 7: 表單切換需經確認且不立即變更已收集欄位** — **Validates: Requirements 3.6**
    - **Property 8: 表單切換確認決策** — **Validates: Requirements 3.7, 3.8**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`（兩個屬性各自獨立 test case）

  - [x] 6.7 實作欄位擷取套用邏輯 `applyFieldExtraction(session, extractionResult)`
    - 成功時合併新值至 `collectedFields`（其餘不變）；逾時/失敗時 `collectedFields` 完全不變
    - _Requirements: 4.3, 4.9_

  - [x]* 6.8 撰寫欄位擷取屬性測試
    - **Property 10: 欄位擷取成功時更新、失敗時保留**
    - **Validates: Requirements 4.3, 4.9**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 6.9 實作必填完整度判斷 `isCollectionComplete(topics, collectedFields)` 與 `applyCompletionCheck(session, topics)`
    - 當且唯當所有 `isRequired === '1'` 題目皆有有效值時，`stage` 轉為 `confirming`；使用者要求修改時可轉回引導、收集完整後再轉回 `confirming`
    - _Requirements: 4.6, 4.7_

  - [x]* 6.10 撰寫完整度判斷屬性測試
    - **Property 12: 必填欄位完整度決定摘要階段**
    - **Validates: Requirements 4.6, 4.7**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 6.11 實作離題問答處理 `applyOffTopicAnswer(session, replyText)`
    - 套用回應前後 `session.currentTopicId` 保持不變
    - _Requirements: 4.8_

  - [x]* 6.12 撰寫離題問答屬性測試
    - **Property 13: 離題問答不移動題目指標**
    - **Validates: Requirements 4.8**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 6.13 實作 `handleMessage(session, userInput, inputMode)` 主分派函式
    - 依 design.md 分派規則整合：`selectedFormId` 為 null → 比對/問答；已選定且非 pending 切換 → 欄位擷取；`pendingFormSwitch` 存在 → 解析確認；一律允許離題問答插話
    - 內部呼叫 `formMatchingService`、`llmGateway`、`inputGuard`（Requirement 1.6/1.7、9.5/9.6 的傳送前檢查）
    - _Requirements: 3.1, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x]* 6.14 撰寫 `handleMessage` 單元測試（具體案例）
    - 涵蓋一般問答資料來源選擇（已選定/未選定表單使用 `introContent`/`noticeContent`/`termsContent` 或表單清單摘要）、`type` 對應提問形式映射等非屬性測試分支
    - _Requirements: 5.3, 5.4_

- [ ] 7. Checkpoint - 確認 Chat_Assistant 狀態轉換邏輯測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 實作表單送出（feedbackContent 組裝、加解密、寫入）
  - [x] 8.1 實作 `buildFeedbackContent(collectedFields)`
    - 恰好排除 `contactName`/`contactMobile`/`contactLandline`/`contactEmail`/`contactAddressDetail` 五個鍵
    - _Requirements: 6.1_

  - [x]* 8.2 撰寫 `buildFeedbackContent` 屬性測試
    - **Property 14: feedbackContent 恰好排除聯絡資訊欄位**
    - **Validates: Requirements 6.1**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 8.3 實作未登入送出拒絕邏輯 `assertLoggedInForSubmit(session, userId)`
    - 未登入時拒絕並保留 `collectedFields` 不變（拒絕前後完全相同）
    - _Requirements: 6.2_

  - [x]* 8.4 撰寫未登入送出屬性測試
    - **Property 15: 未登入送出被拒且不清空已收集欄位**
    - **Validates: Requirements 6.2**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 8.5 實作 `buildContactFields(contactInput)`：組裝聯絡資訊加密/雜湊欄位
    - 使用 `encryptField`/`hashContactField`/`hashEmail`；未提供值的欄位與其雜湊欄位保持 `null` 且不呼叫 `encryptField`；`contactAddressCounty`/`contactAddressDistrict` 直接寫入代碼值
    - _Requirements: 6.3_

  - [x]* 8.6 撰寫聯絡資訊組裝屬性測試
    - **Property 16: 聯絡資訊加解密往返與未提供值的 null 處理**（本任務涵蓋未提供值 null 處理與代碼值直寫部分，與任務 1.3 的往返部分共同構成完整 Property 16 覆蓋）
    - **Validates: Requirements 6.3**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

  - [x] 8.7 實作 `buildFormFeedbackPayload(session, userId)` 與 `submitFeedback(session, userId)`
    - `buildFormFeedbackPayload`：組合 `feedbackContent`、聯絡資訊欄位、`serviceId`（`PmsForm.serviceVendorId` 反查，查無則用 `AI_CHAT_DEFAULT_SERVICE_ID`）、`platformCode`（`AI_CHAT_PLATFORM_CODE`，預設 `09`）、`feedbackNo`（`YYYYMMDD` + 8 碼隨機 base36，碰撞重試最多 5 次）、`isRead`/`status` 初始值
    - `submitFeedback`：資料組裝與驗證需在呼叫 `prisma.pmsFormFeedback.create` 之前全部完成；任一步驟失敗中止且不建立紀錄，使用 Prisma 參數化查詢
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 9.2_

  - [x]* 8.8 撰寫送出原子性屬性測試
    - **Property 17: 送出失敗具原子性且保留已收集欄位**
    - **Validates: Requirements 6.5**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`（以 mock Prisma 模擬加密/寫入失敗，驗證 `create` 呼叫時序與 `collectedFields` 不變）

  - [x] 8.9 實作「服務忙碌」錯誤處理套用邏輯 `applyServiceBusyError(session)`
    - 除新增一則系統錯誤訊息外，`collectedFields`、`selectedFormId`、`currentTopicId`、`stage` 皆與套用前相同
    - _Requirements: 7.6_

  - [x]* 8.10 撰寫服務忙碌屬性測試
    - **Property 20: 兩模型皆忙碌時 Chat_Session 狀態不受影響**
    - **Validates: Requirements 7.6**
    - 檔案：`backend/__tests__/services/chatAssistantService.property.test.js`

- [ ] 9. Checkpoint - 確認送出流程與加解密邏輯測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. 串接後端路由與應用程式入口
  - [x] 10.1 建立 `backend/routes/aiChat.js`
    - `POST /api/ai-chat/message`：套用 `aiChatRateLimiter`、`inputGuard`（長度/禁用內容檢查，觸發時不呼叫 `chatAssistantService`），呼叫 `chatAssistantService.handleMessage`，回傳 `{ session, replyText, replyMeta }`
    - `POST /api/ai-chat/submit`：呼叫 `chatAssistantService.buildFormFeedbackPayload`/`submitFeedback`，未登入回覆業務層 `success: false, code: 'AUTH_REQUIRED'`（非中介層硬性 401）
    - 所有一般應用程式日誌呼叫 `maskPiiForLogging`
    - _Requirements: 1.6, 1.7, 6.2, 8.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 10.2 於 `backend/index.js` 掛載 `aiChatRouter` 至 `/api/ai-chat`
    - 沿用既有 `cors`/`express.json`/`cookieParser` 設定，不變更現有 `/api/auth` 掛載
    - _Requirements: 9.1, 9.3_

  - [ ]* 10.3 撰寫 `aiChat.js` 路由整合測試
    - 使用 `supertest` 涵蓋：Rate_Limiter 429 回應格式、輸入驗證阻擋、`/submit` 未登入業務錯誤碼、成功訊息/送出流程（mock `chatAssistantService`/Prisma）
    - _Requirements: 1.6, 1.7, 6.2, 8.2, 9.5, 9.6_

- [ ] 11. Checkpoint - 確認後端路由整合測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. 實作前端 STT_Module（`useSpeechRecognition.ts`）
  - [x] 12.1 建立 `frontend/app/composables/useSpeechRecognition.ts`
    - 特徵檢測 `window.SpeechRecognition`/`webkitSpeechRecognition`；狀態機純函式部分獨立導出（例如 `reduceListeningState(state, event)`）供測試使用
    - 60 秒逾時計時器、5 秒無語音偵測計時器、錯誤事件處理；回傳 `{ isSupported, isListening, start, stop, transcript, error }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x]* 12.2 撰寫 STT 狀態機屬性測試
    - **Property 1: STT 監聽狀態機終將恢復可用**
    - **Validates: Requirements 1.3**
    - 檔案：`frontend/app/composables/useSpeechRecognition.property.test.ts`

  - [x]* 12.3 撰寫 STT 單元測試
    - 涵蓋瀏覽器不支援時停用按鈕分支、5 秒無語音/辨識錯誤時的錯誤提示分支
    - _Requirements: 1.4, 1.5_

- [x] 13. 實作前端 TTS_Module（`useSpeechSynthesis.ts`）
  - [x] 13.1 建立 `frontend/app/composables/useSpeechSynthesis.ts`
    - 特徵檢測 `window.speechSynthesis`；互斥播放狀態純函式部分獨立導出（例如 `reducePlaybackState(state, event)`）供測試使用
    - 回傳 `{ isSupported, playingMessageId, speak(id, text), stop() }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 13.2 撰寫 TTS 互斥狀態機屬性測試
    - **Property 3: TTS 播放互斥狀態機**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.6**
    - 檔案：`frontend/app/composables/useSpeechSynthesis.property.test.ts`

  - [x]* 13.3 撰寫 TTS 單元測試
    - 涵蓋瀏覽器不支援時隱藏播放按鈕分支
    - _Requirements: 2.5_

- [ ] 14. Checkpoint - 確認前端 STT/TTS composables 測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. 實作前端 Chat_Session 狀態管理（`useChatSession.ts`）
  - [x] 15.1 建立 `frontend/app/composables/useChatSession.ts`
    - 定義 `ChatSession`/`FieldValue`/`ChatMessage` TypeScript 介面
    - 導出 `createInitialSession()`、`isAwaitingFormSwitch(session)` 等純函式
    - 管理狀態物件與呼叫 `$fetch('/api/ai-chat/message')`、`$fetch('/api/ai-chat/submit')`，每次請求整包送出目前 session、以回傳結果覆寫本地狀態
    - _Requirements: 3.6, 3.7, 3.8, 4.6, 4.7, 6.2_

  - [x]* 15.2 撰寫 `useChatSession` 單元測試
    - 涵蓋 `createInitialSession()` 初始值、`isAwaitingFormSwitch()` 判斷、`/message`/`/submit` 呼叫時整包送出目前 session 內容（mock `$fetch`）
    - _Requirements: 3.6, 6.2_

- [ ] 16. Checkpoint - 確認前端狀態管理測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. 建立 Chat_Page 頁面與轉場效果
  - [x] 17.1 建立 `frontend/app/pages/ai-chat/index.vue`
    - `definePageMeta({ pageTransition: { name: 'chat-fill', mode: 'out-in' } })`
    - 重構 `AiChatOverlay.vue` 的訊息呈現/輸入區塊為頁面內容，掛載 `useSpeechRecognition`、`useSpeechSynthesis`、`useChatSession`
    - 語音輸入文字填入訊息輸入框前套用 500 字元/禁用內容前端檢查（呼叫共用驗證邏輯或於送出前由後端把關並顯示錯誤）
    - 每則助手回覆旁提供播放/停止按鈕（依 `isSupported` 顯示/隱藏）
    - 返回/關閉操作呼叫 `useRouter().back()`（無 history 則導回 `/`）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1, 10.5_

  - [x] 17.2 新增填滿轉場 CSS（`chat-fill` transition）
    - 於全域 CSS（`frontend/app/assets/css/design-system.css` 或頁面 scoped style）定義 `.chat-fill-enter-active`/`.chat-fill-enter-from`/`.chat-fill-enter-to` 等 class，實作由下緣往上擴張的色塊填滿效果（clip-path 或 transform scale）
    - 透過 `@media (prefers-reduced-motion: reduce)` 將 transition 設為 `none`，跳過動畫直接導覽
    - _Requirements: 10.3, 10.4_

  - [x] 17.3 修改 `frontend/app/components/nav/BottomActionBar.vue`
    - 移除 `showAiChat` ref 與 `<ChatAiChatOverlay>` 掛載
    - `openAiChat()` 改為呼叫 `navigateTo('/ai-chat')`
    - _Requirements: 10.2_

  - [x]* 17.4 撰寫 `BottomActionBar.vue` 單元測試
    - 驗證點擊「AI 聊天」按鈕呼叫 `navigateTo('/ai-chat')` 而非切換覆蓋層狀態（mock `navigateTo`）
    - _Requirements: 10.2_

- [x] 18. 最終整合與 Checkpoint
  - [ ] 18.1 於 `.env.example`（或既有環境變數文件，若不存在則於 `backend/.env` 註解）補充所需環境變數說明
    - `GROQ_API_KEY`、`GROQ_MODEL_FAST`（預設 `llama-3.1-8b-instant`）、`GROQ_MODEL_SMART`（預設 `llama-3.3-70b-versatile`）、`AI_CHAT_RATE_WINDOW_SECONDS`、`AI_CHAT_RATE_MAX_CALLS`、`AI_CHAT_CONFIDENCE_THRESHOLD`、`AI_CHAT_DEFAULT_SERVICE_ID`、`AI_CHAT_PLATFORM_CODE`
    - _Requirements: 7.1, 7.7, 8.1, 8.2_

  - [ ]* 18.2 撰寫端到端整合測試（後端）
    - 涵蓋完整訊息往返流程：表單比對 → 逐題填寫 → 摘要確認 → 送出成功，全程 mock Groq SDK 與 Prisma Client
    - _Requirements: 3.1, 4.1, 4.6, 6.1, 6.4, 6.6_

- [ ] 19. 最終 Checkpoint - 確認所有後端與前端測試全部通過
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 標記 `*` 的子任務為選填測試任務，可視時間安排跳過以加快 MVP 交付。
- 所有任務均引用具體需求子條款以便追溯。
- Checkpoint 任務用於在關鍵里程碑後確認測試通過，如有疑問應詢問使用者。
- 屬性測試涵蓋 design.md 所定義的全部 24 個 Correctness Properties；Property 16 分兩個子任務（1.3 加解密往返、8.6 null 處理與代碼值直寫）共同完整覆蓋。
- Requirement 10（轉場動畫視覺效果）與 6.4/9.1/9.2/9.3（實作方式/部署配置要求）依 design.md 說明不適合屬性測試，改用具體案例測試或程式碼審查覆蓋。
- 外部依賴（Groq API、Prisma、瀏覽器 Speech API）一律以 mock/stub 注入，屬性測試與單元測試不觸發真實網路或資料庫呼叫。

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "1.6", "2.1", "3.1", "12.1", "13.1"] },
    { "id": 1, "tasks": ["1.2", "1.5", "1.7", "2.2", "3.2", "4.1", "12.2", "12.3", "13.2", "13.3"] },
    { "id": 2, "tasks": ["1.3", "3.3", "4.3", "4.5", "15.1"] },
    { "id": 3, "tasks": ["3.4", "4.2", "4.4", "4.6", "15.2"] },
    { "id": 4, "tasks": ["6.1", "6.3", "6.7", "6.9", "6.11", "17.2", "17.3"] },
    { "id": 5, "tasks": ["6.2", "6.4", "6.6", "6.8", "6.10", "6.12", "8.1", "8.3", "8.5", "8.9", "17.1", "17.4"] },
    { "id": 6, "tasks": ["6.13", "8.2", "8.4", "8.6", "8.10"] },
    { "id": 7, "tasks": ["6.14", "8.7"] },
    { "id": 8, "tasks": ["8.8", "10.1"] },
    { "id": 9, "tasks": ["10.2"] },
    { "id": 10, "tasks": ["10.3", "18.1"] },
    { "id": 11, "tasks": ["18.2"] }
  ]
}
```
