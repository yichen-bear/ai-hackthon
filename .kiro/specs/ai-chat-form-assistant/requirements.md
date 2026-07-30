# Requirements Document

## Introduction

本文件定義「AI 智能表單助手」的需求規格。此功能於現有網頁（Nuxt 4 前端 + Express/Prisma 後端）新增一個 AI 聊天助手，讓使用者可透過語音或文字與助手互動，完成以下核心場景：

1. 語音輸入（STT）與語音輸出（TTS），讓使用者可用語音提問、助手回覆可轉語音播放
2. 意圖判斷，將使用者需求比對到 `pms_form` 中最合適的表單（需求單/估價單/預約單）
3. 依 `pms_form_topic` 逐題引導使用者完成對話式填表
4. 將填表結果寫入 `pms_form_feedback`，聯絡資訊欄位必須沿用既有加解密機制
5. 在使用者僅想諮詢問題（服務內容、注意事項等）時提供一般問答，不強迫進入填表流程

系統使用 Groq API 提供的兩個 LLM 模型（`llama-3.1-8b-instant` 為快速模型、`llama-3.3-70b-versatile` 為進階模型），依信心分數與額度狀況動態切換，並具備 429 錯誤重試與降級邏輯。

## Glossary

- **Chat_Assistant**: 本功能新增的 AI 聊天助手後端服務，負責協調 STT/TTS、LLM 呼叫、意圖判斷、對話狀態管理與資料庫寫入
- **Chat_Session**: 一次使用者與 Chat_Assistant 之間的對話狀態，包含已選定表單、已收集欄位、對話歷史
- **STT_Module**: 前端使用瀏覽器原生 Web Speech API（SpeechRecognition）將語音轉為文字的功能
- **TTS_Module**: 前端使用瀏覽器原生 SpeechSynthesis 將文字轉為語音播放的功能
- **Fast_Model**: Groq 模型 `llama-3.1-8b-instant`，用於意圖判斷、日常問答、簡單欄位擷取
- **Smart_Model**: Groq 模型 `llama-3.3-70b-versatile`，用於複雜表單邏輯，於 Fast_Model 信心分數低時升級呼叫
- **LLM_Gateway**: Chat_Assistant 中負責呼叫 Groq API（OpenAI 相容格式）、處理模型選擇、429 重試與降級的模組
- **PmsForm**: 現有 Prisma 模型，代表表單主檔（對應資料表 `pms_form`）
- **PmsFormTopic**: 現有 Prisma 模型，代表表單題目（對應資料表 `pms_form_topic`）
- **PmsFormFeedback**: 現有 Prisma 模型，代表表單提交結果（對應資料表 `pms_form_feedback`）
- **Contact_Encryption_Utility**: 現有程式碼 `backend/utils/crypto.js` 中提供的 `encryptField`／`decryptField`（AES-256-GCM）與 `hashEmail`（SHA-256）函式，用於加密與雜湊聯絡資訊欄位
- **Rate_Limiter**: Chat_Assistant 中限制同一使用者或 IP 在單位時間內 LLM 呼叫次數的模組
- **Structured_Response**: LLM_Gateway 回傳的結構化 JSON，包含 `action`、`matched_form_id`、`reply_text`、`collected_fields` 等欄位
- **Chat_Page**: 取代原本 `AiChatOverlay.vue` 覆蓋層元件的獨立聊天頁面，承載對話式表單助手介面

## Assumptions and Open Questions

以下事項在需求撰寫階段尚未獲得使用者/專案負責人確認，於設計與實作前必須釐清。本節僅列出假設與待確認事項，不代表已決議的行為；相關驗收標準已標註為「待確認前的暫行假設」。

1. **代碼對照表**：`pms_form.type`／`pms_form.sub_type`（2 碼）與 `pms_form_topic.type`（2 碼）目前沒有已知的代碼對照文件。暫行假設：`pms_form_topic.type` 至少包含文字、數字、單選、多選、日期、上傳圖片等類型，實際代碼值需與現有前端表單頁面程式碼比對確認後再定案。
2. **`feedbackNo` 產生規則**：16 碼字串的產生規則（前綴、序號、日期編碼等）尚未確認。暫行假設：由 Chat_Assistant 產生一個具唯一性的 16 碼字串，正式規則待確認。
3. **`pms_form_feedback.serviceId` 來源**：與 `cms_homepage_service` 的對應關係在 schema 上未明確定義。暫行假設：此欄位需在設計階段確認資料來源，MVP 階段可能需要退回人工指定或以 `PmsForm.serviceVendorId` 反查。
4. **`platformCode` 的值**：`pms_form_feedback.platform_code` 目前沒有代表「AI 聊天助手」來源的既有代碼。暫行假設：需新增一個代碼值代表此管道，正式代碼待確認。
5. **未登入使用者的處理方式**：`pms_form_feedback.inbr_account_id` 為必填 UUID，代表提交表單需要已登入會員。暫行假設：Chat_Assistant 允許未登入使用者進行問答與填表對話，但在送出（寫入 `pms_form_feedback`）前必須要求登入；未登入使用者無法完成送出動作。
6. **既有加解密函式位置**：已確認位於 `backend/utils/crypto.js`，提供 `encryptField`（AES-256-GCM 加密）、`decryptField`（解密）、`hashEmail`（SHA-256 雜湊，僅適用 email）。暫行假設：`contactMobileHash`、`contactLandlineHash`、`contactAddressDetailHash` 等非 email 雜湊欄位目前沒有對應的既有雜湊函式，是否可直接套用與 `hashEmail` 相同的雜湊演算法（SHA-256、大小寫/去空白正規化規則）尚待確認，避免自行發明不一致的雜湊邏輯。
7. **`isRead`／`status` 初始值**：新建 `pms_form_feedback` 資料時這兩個欄位應填入的初始代碼值尚未確認。
8. **縣市/區域限制邏輯**：`pms_topic_county_district_relation` 所定義的表單題目縣市/區域限制，確認 MVP 階段可以跳過，後續版本再補齊。
9. **Chat_Page 路由與 `AiChatOverlay.vue` 去留**：新聊天頁面的確切路由路徑/名稱，以及 `AiChatOverlay.vue` 是否應移除或改為 Chat_Page 內部使用的子元件，屬於待設計階段確認的開放問題。

## Requirements

### Requirement 1: 語音輸入轉文字

**User Story:** 作為使用者，我想要用語音向助手提問，以便不需要打字就能與表單助手互動。

#### Acceptance Criteria

1. WHERE 使用者的瀏覽器支援 Web Speech API 的 SpeechRecognition，THE STT_Module SHALL 提供語音輸入按鈕供使用者啟動語音辨識。
2. WHEN 使用者點擊語音輸入按鈕並開始說話，THE STT_Module SHALL 啟動語音辨識，並於取得最終辨識結果後將文字填入訊息輸入框；單次語音輸入時間上限為 60 秒，超過時系統 SHALL 自動停止辨識。
3. WHILE STT_Module 正在進行語音辨識，THE STT_Module SHALL 顯示聆聽中的視覺狀態指示（例如按鈕外觀改變或顯示動畫圖示），並於辨識完成或停止後將按鈕恢復為可再次啟動的狀態。
4. IF 使用者的瀏覽器不支援 SpeechRecognition，THEN THE STT_Module SHALL 停用語音輸入按鈕並顯示視覺提示（例如按鈕呈灰階且無法點擊），同時保留文字輸入框供使用者以文字方式繼續互動。
5. IF 語音辨識啟動後 5 秒內未偵測到語音輸入，或辨識過程中發生錯誤，THEN THE STT_Module SHALL 停止辨識並顯示錯誤提示訊息，同時允許使用者重新點擊語音輸入按鈕重試或改以文字輸入框繼續操作。
6. WHEN STT_Module 產生的文字準備傳送至 Chat_Assistant 前，THE Chat_Assistant SHALL 檢查該文字長度是否超過 500 個字元，以及是否包含不允許的內容（如 HTML 標籤或程式碼片段）。
7. IF 傳送前的文字超過 500 個字元上限，或包含不允許的內容，THEN THE Chat_Assistant SHALL 阻止該文字傳送並顯示錯誤提示訊息，同時保留使用者原始輸入內容於輸入框中供其修改。

### Requirement 2: 文字轉語音輸出

**User Story:** 作為使用者，我想要讓助手的回覆可以用語音播放，以便在不方便閱讀畫面時也能理解回覆內容。

#### Acceptance Criteria

1. WHERE 使用者的瀏覽器支援 SpeechSynthesis API（即 `window.speechSynthesis` 物件存在），THE TTS_Module SHALL 在每則助手回覆訊息旁提供一個對應的播放按鈕，用於將該則回覆的文字轉換為語音播放。
2. WHEN 使用者點擊某則助手回覆的播放按鈕，THE TTS_Module SHALL 停止目前正在播放的其他語音（如有），開始朗讀該則回覆的文字內容，並將該播放按鈕的圖示變更為停止圖示。
3. WHEN 語音正在播放時使用者再次點擊同一則回覆的播放/停止按鈕，THE TTS_Module SHALL 立即停止該語音播放，並將該按鈕的圖示還原為播放圖示。
4. WHEN 語音播放至結尾且未被使用者中斷，THE TTS_Module SHALL 將對應播放按鈕的圖示還原為播放圖示。
5. IF 使用者的瀏覽器不支援 SpeechSynthesis API，THEN THE TTS_Module SHALL 隱藏所有語音播放按鈕並僅顯示文字回覆內容。
6. IF 語音播放過程中發生錯誤（例如瀏覽器語音合成服務中斷或朗讀失敗），THEN THE TTS_Module SHALL 停止該語音播放、將對應按鈕圖示還原為播放圖示，並保留原始文字回覆內容不變。

### Requirement 3: 表單意圖判斷與比對

**User Story:** 作為使用者，我想要描述我的需求，讓助手自動找到對應的表單，以便我不需要自己在網站上尋找正確的表單。

#### Acceptance Criteria

1. WHEN 使用者在 Chat_Session 中尚未選定表單並輸入需求描述,THE Chat_Assistant SHALL 呼叫 LLM_Gateway，並在請求中提供 `pms_form` 中所有 `isEnable` 等於 "1" 且 `isDeleted` 等於 "0" 的表單名稱與簡述清單。
2. WHEN LLM_Gateway 回傳的 Structured_Response 包含的 `matched_form_id` 對應到一筆 `isEnable` 等於 "1" 且 `isDeleted` 等於 "0" 的 `pms_form` 紀錄,THE Chat_Assistant SHALL 將該表單設定為目前 Chat_Session 的作業表單。
3. IF Structured_Response 包含的 `matched_form_id` 不對應任何 `isEnable` 等於 "1" 且 `isDeleted` 等於 "0" 的 `pms_form` 紀錄,THEN THE Chat_Assistant SHALL 視為未比對到表單，並依照本需求中「無法比對到表單」的回覆方式處理，且 Chat_Session 保持未選定表單狀態。
4. IF 使用者描述的需求無法比對到任何啟用中且未刪除的表單,THEN THE Chat_Assistant SHALL 保持 Chat_Session 處於未選定表單狀態，並回覆說明無法找到符合的表單，同時詢問使用者提供更多描述或選擇其他服務。
5. IF Structured_Response 的 `action` 為 `need_clarification`,THEN THE Chat_Assistant SHALL 回覆澄清問題給使用者，並保持 Chat_Session 處於未選定表單狀態。
6. WHEN Chat_Assistant 已選定表單且使用者輸入新的需求描述導致比對結果指向不同表單,THE Chat_Assistant SHALL 在切換表單前向使用者提出確認訊息，說明切換表單將放棄目前已收集的填寫進度，並等待使用者明確回覆是否切換。
7. IF 使用者確認要切換為新比對到的表單,THEN THE Chat_Assistant SHALL 清除 Chat_Session 中原表單已收集的欄位，並將新比對到的表單設定為目前的作業表單。
8. IF 使用者拒絕切換表單或未針對確認訊息明確回覆,THEN THE Chat_Assistant SHALL 保留目前作業表單與已收集欄位不變，並繼續依原表單引導使用者完成尚未回答的題目。

### Requirement 4: 對話式表單填寫引導

**User Story:** 作為使用者，我想要讓助手依序引導我回答表單的每個題目，以便我可以用自然對話的方式完成填表，不需要閱讀整份表單。

#### Acceptance Criteria

1. WHEN Chat_Session 已選定表單,THE Chat_Assistant SHALL 依 `PmsFormGroup` 與其下 `PmsFormTopic` 的 `sort` 排序，依序向使用者提出尚未回答的題目。
2. WHEN Chat_Assistant 向使用者提出一個 `PmsFormTopic` 題目,THE Chat_Assistant SHALL 依該題目的 `type` 代碼決定提問形式（文字、數字、單選、多選、日期或上傳圖片）。
3. WHEN 使用者回答一個題目,THE Chat_Assistant SHALL 呼叫 LLM_Gateway 從使用者回覆中擷取對應欄位值，並更新 Chat_Session 中已收集欄位。
4. IF 使用者回答的內容無法被解析為該題目要求的格式，或違反該題目定義的限制條件（例如非 `PmsTopicOption` 清單中的選項、上傳圖片數量超出 `minimumMediasUpload`/`maximumMediasUpload` 範圍、日期超出 `startDateOffsetDays`/`endDateOffsetDays` 允許區間）,THEN THE Chat_Assistant SHALL 回覆說明格式或限制要求並重新請使用者回答同一題目。
5. IF 一個 `PmsFormTopic` 的 `isRequired` 等於 "1" 且使用者嘗試跳過該題目,THEN THE Chat_Assistant SHALL 拒絕跳過並提示該題目為必填。
6. WHEN 表單所有 `isRequired` 等於 "1" 的題目皆已收集到有效答案,THE Chat_Assistant SHALL 產生已收集欄位的摘要並請使用者確認後再送出。
7. IF 使用者對已收集欄位的摘要表示拒絕或要求修改，THEN THE Chat_Assistant SHALL 依使用者指出的題目重新引導使用者回答，並在更新後重新產生摘要供使用者再次確認。
8. WHILE 使用者處於填表流程中,THE Chat_Assistant SHALL 允許使用者提出與填表無關的問題，並在回答後回到目前未完成的題目繼續引導。
9. IF Chat_Assistant 呼叫 LLM_Gateway 擷取欄位值時發生逾時或呼叫失敗,THEN THE Chat_Assistant SHALL 回覆說明目前無法處理該回覆並請使用者重新回答同一題目，且不遺失 Chat_Session 中已收集的其他欄位。

### Requirement 5: 一般問答

**User Story:** 作為使用者，我想要直接問助手關於服務內容或注意事項的問題，以便在不需要填表的情況下也能得到協助。

#### Acceptance Criteria

1. WHEN Structured_Response 的 `action` 屬性值為 `answer_question`,THE Chat_Assistant SHALL 將該回應中的 `reply_text` 內容原樣回覆給使用者，且使 Chat_Session 於回覆前後所處的填表階段（例如：尚未選定表單、已選定表單、填寫中）維持不變。
2. IF Structured_Response 的 `action` 屬性值為 `answer_question` 但其 `reply_text` 為空字串或未提供,THEN THE Chat_Assistant SHALL 回覆一則說明目前無法提供答案的訊息，並保持 Chat_Session 現有的填表階段不變。
3. WHEN 使用者的訊息經判定為詢問服務內容、注意事項或條款（對應 Structured_Response 的 `action` 為 `answer_question`）,THE Chat_Assistant SHALL 依序以下列來源作為回覆依據：已選定表單的 `introContent`、`noticeContent`、`termsContent`；若尚未選定表單，則以可選表單清單的名稱與簡介摘要作為回覆依據。
4. IF 已選定表單的 `introContent`、`noticeContent`、`termsContent` 皆為空或未設定，且無其他可選表單清單可提供,THEN THE Chat_Assistant SHALL 回覆一則說明目前無相關資訊可提供的訊息，且不強制要求使用者選定或填寫表單。
5. WHILE Chat_Session 尚未選定任何表單,THE Chat_Assistant SHALL 持續回覆使用者的問答訊息，且不自動將 Chat_Session 轉換至已選定表單或填寫欄位的階段，除非使用者訊息中明確表達選擇特定表單或開始填寫的意圖。

### Requirement 6: 表單送出結果的組合、加密與寫入

**User Story:** 作為使用者，我想要在確認填表內容後由助手幫我送出，以便完成需求單/估價單/預約單的提交。

#### Acceptance Criteria

1. WHEN 使用者對 Chat_Assistant 提出的送出前摘要表示確認，THE Chat_Assistant SHALL 將 Chat_Session 中除聯絡資訊欄位（`contactName`、`contactMobile`、`contactLandline`、`contactEmail`、`contactAddressDetail`）以外的所有已收集題目答案，組合為以題目識別對應答案值的 `feedbackContent` JSON 結構。
2. IF 使用者在送出確認時尚未登入會員帳號,THEN THE Chat_Assistant SHALL 拒絕送出並提示使用者需要登入後才能完成提交；THE Chat_Assistant SHALL 保留 Chat_Session 中已收集的欄位，供使用者完成登入後沿用並重新嘗試送出，不要求重新填寫。
3. WHEN Chat_Assistant 組合聯絡資訊欄位（`contactName`、`contactMobile`、`contactLandline`、`contactEmail`、`contactAddressDetail`）準備寫入 `pms_form_feedback`,THE Chat_Assistant SHALL 使用 Contact_Encryption_Utility 現有的 `encryptField` 與對應雜湊邏輯產生加密值與雜湊值，不得使用其他自行實作的加密或雜湊方式；若使用者未提供 `contactMobile`、`contactLandline` 或 `contactAddressDetail` 之值,THE Chat_Assistant SHALL 將對應欄位與其雜湊欄位保持為 null 且不進行加密；`contactAddressCounty` 與 `contactAddressDistrict` 為代碼值，THE Chat_Assistant SHALL 排除於加密與雜湊範圍之外，直接寫入對應代碼。
4. WHEN Chat_Assistant 建立新的 `PmsFormFeedback` 紀錄,THE Chat_Assistant SHALL 使用 Prisma 參數化查詢寫入資料庫。
5. IF 資料庫寫入 `pms_form_feedback` 失敗，或聯絡資訊欄位的加密／雜湊處理過程發生失敗,THEN THE Chat_Assistant SHALL 中止該次送出、不得建立部分寫入的 `PmsFormFeedback` 紀錄，並回覆使用者送出失敗，同時保留已收集欄位允許使用者重新嘗試送出。
6. WHEN `PmsFormFeedback` 紀錄成功建立,THE Chat_Assistant SHALL 回覆使用者送出成功的確認訊息。

### Requirement 7: Groq 雙模型策略與 429 重試/降級

**User Story:** 作為系統維運者，我想要讓系統依任務複雜度選擇合適的模型並在額度受限時自動降級，以便在效能與成本之間取得平衡並維持服務可用性。

#### Acceptance Criteria

1. WHEN Chat_Assistant 需要進行意圖判斷、一般問答或簡單欄位擷取,THE LLM_Gateway SHALL 優先呼叫 Fast_Model。
2. IF Fast_Model 回傳的 Structured_Response 信心分數低於系統設定的門檻值（0 至 1 之間的可設定數值）,THEN THE LLM_Gateway SHALL 改用 Smart_Model 重新呼叫以取得回覆。
3. IF 呼叫 Smart_Model 收到 HTTP 429 回應,THEN THE LLM_Gateway SHALL 依系統設定的重試策略進行重試，最大重試次數不超過 3 次，且每次重試之間隔不少於 500 毫秒。
4. IF 對 Smart_Model 的重試已達到第 3 點所定義之最大重試次數且仍持續收到 HTTP 429 回應,THEN THE LLM_Gateway SHALL 自動改用 Fast_Model 處理該次請求並繼續對話流程，且不遺失該次請求已產生之對話內容。
5. IF 呼叫 Fast_Model 收到 HTTP 429 回應,THEN THE LLM_Gateway SHALL 依第 3 點所定義之重試策略進行重試。
6. IF 對 Fast_Model 的重試已達到最大重試次數且仍持續收到 HTTP 429 回應,THEN THE Chat_Assistant SHALL 回覆使用者一則指出目前服務忙碌並請稍後再試的訊息，且不中斷或清除既有 Chat_Session 狀態。
7. THE LLM_Gateway SHALL 使用 OpenAI 相容格式（`openai` npm package，`baseURL` 設定為 `https://api.groq.com/openai/v1`）呼叫 Groq API。

### Requirement 8: 呼叫頻率限制

**User Story:** 作為系統維運者，我想要限制單一使用者或 IP 的 LLM 呼叫頻率，以便避免額度濫用或無限迴圈對話造成的成本失控。

#### Acceptance Criteria

1. THE Rate_Limiter SHALL 針對每個識別碼（若使用者已登入，以使用者識別碼為準；若未登入，以來源 IP 為識別碼）在可設定的時間窗口（預設 60 秒，可設定範圍 1 秒至 3600 秒）內，記錄該識別碼發送的 LLM 呼叫次數。
2. IF 同一識別碼在目前時間窗口內的 LLM 呼叫次數達到或超過可設定的呼叫上限（預設每時間窗口 20 次，可設定範圍 1 次至 1000 次）,THEN THE Rate_Limiter SHALL 拒絕該識別碼的新請求（不轉發至 LLM 服務），並回覆包含「已達呼叫頻率限制」提示及以秒為單位之可重新嘗試等待時間的錯誤訊息。
3. IF Rate_Limiter 拒絕某次請求,THEN THE Rate_Limiter SHALL 不將該次被拒絕的請求計入該識別碼的呼叫次數計數器。
4. WHEN 識別碼目前時間窗口的結束時間已到達,THE Rate_Limiter SHALL 將該識別碼的呼叫次數計數器重置為零，並以重置時間點為起點開始新的時間窗口計算。

### Requirement 9: 安全性與機密資訊保護

**User Story:** 作為系統維運者，我想要確保 API 金鑰與個資不會外洩，以便符合資訊安全規範並保護使用者隱私。

#### Acceptance Criteria

1. THE Chat_Assistant SHALL 僅在後端程式碼中使用 `GROQ_API_KEY` 環境變數，不得將其暴露於前端程式碼或瀏覽器可存取的任何內容中。
2. WHEN Chat_Assistant 將使用者輸入或收集欄位寫入資料庫,THE Chat_Assistant SHALL 使用 Prisma 參數化查詢執行資料庫操作。
3. THE Chat_Assistant SHALL 透過 HTTPS 傳輸包含聯絡資訊等個資欄位的請求與回應。
4. WHEN Chat_Assistant 記錄一般應用程式日誌,THE Chat_Assistant SHALL 排除明文個資欄位（姓名、電話、Email、地址）於日誌內容之外。
5. WHEN Chat_Assistant 接收語音辨識轉換後的文字輸入,THE Chat_Assistant SHALL 在送交 LLM_Gateway 前，將該輸入文字截斷或限制為最多 1000 個字元。
6. IF 語音辨識轉換後的文字輸入包含系統定義之禁用內容類別（例如仇恨言論、色情、暴力煽動相關詞彙）,THEN THE Chat_Assistant SHALL 拒絕該輸入、回傳指出內容不符規則的錯誤訊息,且不得將該輸入送交 LLM_Gateway。

### Requirement 10: AI 聊天入口轉場效果

**User Story:** 作為使用者，我想要點擊 AI 聊天按鈕後看到畫面從下方往上填滿顏色並轉換成全新的聊天頁面，以便獲得更沉浸的進場體驗，而不是原本的覆蓋層彈出方式。

#### Acceptance Criteria

1. THE 前端應用程式 SHALL 新增一個獨立的聊天頁面路由（置於 `frontend/app/pages/` 下，例如 `pages/ai-chat/index.vue`），取代原本由 `AiChatOverlay.vue` 覆蓋層呈現聊天介面的方式，該頁面承載 Requirement 1 至 9 所定義的對話式助手功能。
2. WHEN 使用者點擊 `BottomActionBar.vue` 中的「AI 聊天」圓形按鈕，THE 前端應用程式 SHALL 導覽至新的聊天頁面，而非切換覆蓋層的顯示狀態。
3. WHEN 導覽至聊天頁面時，THE 前端應用程式 SHALL 播放一個由畫面下緣往上擴張的色塊填滿轉場效果，直到該色塊完全覆蓋可視範圍後，再顯示聊天頁面內容。
4. IF 使用者的作業系統或瀏覽器已啟用 `prefers-reduced-motion` 偏好設定，THEN THE 前端應用程式 SHALL 跳過填滿轉場動畫，直接導覽至聊天頁面。
5. WHEN 使用者在聊天頁面中觸發返回或關閉操作，THE 前端應用程式 SHALL 導覽回先前所在頁面。

**Implementation Consideration（非硬性規定，供設計階段參考）：** 可使用 Nuxt 的 `definePageMeta({ pageTransition })` 或 View Transitions API 實作填滿轉場效果，具體 CSS/動畫技術於設計階段決定。

## Non-Functional Notes

- 環境變數需求：`GROQ_API_KEY`、`GROQ_MODEL_FAST`（預設 `llama-3.1-8b-instant`）、`GROQ_MODEL_SMART`（預設 `llama-3.3-70b-versatile`）、`DATABASE_URL`。
- MVP 階段可跳過 `pms_topic_county_district_relation` 所定義的縣市/區域限制邏輯（見 Assumptions and Open Questions 第 8 項）。
