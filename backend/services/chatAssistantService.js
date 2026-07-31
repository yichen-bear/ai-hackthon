'use strict';

const crypto = require('crypto');
const { encryptField, hashContactField, hashEmail } = require('../utils/crypto');
const defaultFormMatchingService = require('./formMatchingService');
const defaultLlmGateway = require('./llmGateway');
const defaultPrisma = require('../utils/prismaClient');
const { truncateForLLM, containsDisallowedContent, validateMessageBeforeSend } = require('../utils/inputGuard');
const { TOPIC_TYPE } = require('../constants/formCodes');

/**
 * @typedef {object} FieldValue
 * @property {number} topicId - 對應的 `PmsFormTopic.id`
 * @property {(string|Array<string>|number)} value - 依題目 type 而定的答案值
 */

/**
 * @typedef {object} ChatMessage
 * @property {string} id - 訊息識別碼
 * @property {('user'|'assistant')} role - 訊息角色
 * @property {string} text - 訊息文字內容
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {object} PendingFormSwitch
 * @property {number} newFormId - 待確認切換的新表單 id
 */

/**
 * @typedef {('selecting_form'|'filling'|'confirming'|'submitted')} ChatSessionStage
 */

/**
 * @typedef {object} ChatSession
 * @property {(number|null)} selectedFormId - 目前作業表單 id，尚未選定時為 null
 * @property {(PendingFormSwitch|null)} pendingFormSwitch - 等待使用者確認的表單切換請求，無則為 null
 * @property {Record<string, FieldValue>} collectedFields - 已收集欄位，鍵為 `PmsFormTopic.id`
 * @property {(number|null)} currentTopicId - 目前引導中的題目 id
 * @property {boolean} awaitingSubmitConfirmation - 是否處於等待送出確認狀態
 * @property {Array<ChatMessage>} messages - 對話歷史
 * @property {ChatSessionStage} stage - 目前所處階段
 */

/**
 * 套用表單比對結果：若 `matchedFormId` 存在於 `validFormIds` 集合內，
 * 將其設定為 `session.selectedFormId`；否則保持為 `null`。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session（套用前尚未選定表單）
 * @param {(number|null|undefined)} matchedFormId - LLM 比對結果的 `matched_form_id`
 * @param {Array<number>} validFormIds - 目前啟用中且未刪除的表單 id 集合
 * @returns {ChatSession} 套用比對結果後的新 Chat_Session 物件
 */
function applyMatchResult(session, matchedFormId, validFormIds) {
  const validIds = Array.isArray(validFormIds) ? validFormIds : [];
  const isValidMatch =
    matchedFormId !== null &&
    matchedFormId !== undefined &&
    validIds.includes(matchedFormId);

  return {
    ...session,
    selectedFormId: isValidMatch ? matchedFormId : null,
  };
}

/**
 * @typedef {object} StructuredResponse
 * @property {('match_form'|'need_clarification'|'answer_question'|'extract_field'|'confirm_switch'|'error')} action - LLM 結構化回應動作
 * @property {(number|null|undefined)} [matched_form_id] - 比對到的表單 id
 * @property {string} reply_text - 回覆文字（可能為空字串）
 * @property {Record<string, (string|Array<string>|number)>} [collected_fields] - 擷取到的欄位
 * @property {number} confidence - 信心分數 0..1
 */

/**
 * 套用「非推進」類型的 Structured_Response：當 `action` 為 `need_clarification`
 * 或 `answer_question`（包含 `reply_text` 為空字串的情況）時，`session.stage`
 * 必須保持不變，因為這類回應僅是澄清或問答，不會使流程往下一階段推進。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {StructuredResponse} structuredResponse - LLM_Gateway 回傳的結構化回應
 * @returns {ChatSession} 套用後的新 Chat_Session 物件（`stage` 不變）
 */
function applyNonAdvancingResponse(session, structuredResponse) {
  const isNonAdvancingAction =
    structuredResponse &&
    (structuredResponse.action === 'need_clarification' ||
      structuredResponse.action === 'answer_question');

  if (!isNonAdvancingAction) {
    return { ...session };
  }

  return {
    ...session,
    stage: session.stage,
  };
}

/**
 * 提出表單切換請求：當已選定表單且使用者輸入比對到不同的表單時，
 * Chat_Assistant 在切換前需先向使用者提出確認，因此僅設定
 * `session.pendingFormSwitch` 指向新比對到的表單，`selectedFormId`
 * 與 `collectedFields` 皆維持不變（等待使用者明確回覆後再由
 * `resolveFormSwitch` 套用實際切換）。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session（已選定表單）
 * @param {number} newFormId - 比對到的新表單 id
 * @returns {ChatSession} 設定 `pendingFormSwitch` 後的新 Chat_Session 物件
 */
function requestFormSwitch(session, newFormId) {
  return {
    ...session,
    pendingFormSwitch: { newFormId },
  };
}

/**
 * 解析使用者對表單切換確認訊息的回覆：
 * 若 `isConfirmed` 為 `true`，清空 `session.collectedFields`，
 * 將 `session.selectedFormId` 切換為 `session.pendingFormSwitch.newFormId`，
 * 並清除 `pendingFormSwitch`；
 * 若 `isConfirmed` 為 `false`（使用者拒絕切換或未針對確認訊息明確回覆），
 * 保留原本的 `selectedFormId` 與 `collectedFields` 完全不變，
 * 僅清除 `pendingFormSwitch`（結束等待確認狀態，繼續依原表單引導）。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session（`pendingFormSwitch` 指向待確認的表單）
 * @param {boolean} isConfirmed - 使用者是否確認切換表單
 * @returns {ChatSession} 套用切換決策後的新 Chat_Session 物件
 */
function resolveFormSwitch(session, isConfirmed) {
  if (isConfirmed && session.pendingFormSwitch) {
    return {
      ...session,
      selectedFormId: session.pendingFormSwitch.newFormId,
      collectedFields: {},
      pendingFormSwitch: null,
    };
  }

  return {
    ...session,
    pendingFormSwitch: null,
  };
}

/**
 * @typedef {object} FieldExtractionResult
 * @property {boolean} success - 欄位擷取呼叫是否成功（false 代表逾時或失敗）
 * @property {Record<string, FieldValue>} [fields] - 擷取成功時取得的新欄位值，鍵為 `PmsFormTopic.id`
 */

/**
 * 套用欄位擷取結果：呼叫成功時，將 `extractionResult.fields` 合併進
 * `session.collectedFields`（既有欄位保留，僅新增/覆寫擷取到的欄位）；
 * 呼叫逾時或失敗時，`session.collectedFields` 必須完全保持不變，
 * 不遺失任何既有已收集的欄位。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {FieldExtractionResult} extractionResult - 欄位擷取呼叫的結果
 * @returns {ChatSession} 套用欄位擷取結果後的新 Chat_Session 物件
 */
function applyFieldExtraction(session, extractionResult) {
  const succeeded = Boolean(extractionResult && extractionResult.success === true);

  if (!succeeded) {
    return { ...session };
  }

  const newFields = (extractionResult && extractionResult.fields) || {};

  return {
    ...session,
    collectedFields: {
      ...session.collectedFields,
      ...newFields,
    },
  };
}

/**
 * 判斷某筆已收集欄位是否為「有效值」（非 undefined/null，字串非空白，陣列非空）
 * @param {*} fieldValue - `collectedFields` 中的單筆值，可能是 `FieldValue` 物件或原始值
 * @returns {boolean} 是否視為有效值
 */
function hasValidCollectedValue(fieldValue) {
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  const value = Object.prototype.hasOwnProperty.call(fieldValue, 'value')
    ? fieldValue.value
    : fieldValue;

  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }

  return true;
}

/**
 * 判斷是否所有 `isRequired === '1'` 的題目皆在 `collectedFields` 中存在有效值。
 * 當且唯當所有必填題目皆有有效值時回傳 `true`。
 * 純函式。
 * @param {Array<object>} topics - `PmsFormTopic` 陣列，各筆含 `id`、`isRequired`
 * @param {Record<string, FieldValue>} collectedFields - 已收集欄位，鍵為 `PmsFormTopic.id`
 * @returns {boolean} 必填欄位是否皆已收集到有效值
 */
function isCollectionComplete(topics, collectedFields) {
  if (!Array.isArray(topics)) {
    return true;
  }

  const fields = collectedFields || {};
  const requiredTopics = topics.filter((topic) => topic && topic.isRequired === '1');

  return requiredTopics.every((topic) => hasValidCollectedValue(fields[String(topic.id)]));
}

/**
 * 套用必填完整度檢查：當 `isCollectionComplete(topics, session.collectedFields)` 為 `true` 時，
 * 將 `session.stage` 轉為 `'confirming'`；否則 `stage` 保持不變（不會自動轉為 `confirming`，
 * 也不會將已經是 `confirming` 的階段自動轉走，交由其他函式，例如 `resolveFormSwitch`
 * 或呼叫端邏輯，處理使用者要求修改後轉回引導階段的情形）。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {Array<object>} topics - 目前作業表單的 `PmsFormTopic` 陣列
 * @returns {ChatSession} 套用完整度檢查後的新 Chat_Session 物件
 */
function applyCompletionCheck(session, topics) {
  const complete = isCollectionComplete(topics, session.collectedFields);

  if (!complete) {
    return { ...session };
  }

  return {
    ...session,
    stage: 'confirming',
  };
}

/**
 * 套用離題問答回應：當使用者在填表流程中提出與填表無關的問題時，
 * Chat_Assistant 僅回覆問答內容，不會移動目前引導中的題目指標。
 * 套用前後 `session.currentTopicId` 必須保持不變。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {string} replyText - 離題問答的回覆文字（訊息記錄由呼叫端組裝並附加至 `messages`）
 * @returns {ChatSession} 套用後的新 Chat_Session 物件（`currentTopicId` 不變）
 */
function applyOffTopicAnswer(session, replyText) {
  return {
    ...session,
    currentTopicId: session.currentTopicId,
  };
}

/**
 * 預設的「服務忙碌」錯誤訊息文字（Requirement 7.6）。
 */
const SERVICE_BUSY_MESSAGE_TEXT = '目前服務忙碌，請稍後再試。';

/**
 * 套用「服務忙碌」錯誤處理：當 Fast_Model 與 Smart_Model 皆重試耗盡仍收到 429 時，
 * 於 `session.messages` 新增一則系統錯誤訊息（`role: 'assistant'`），
 * 除此之外 `collectedFields`、`selectedFormId`、`currentTopicId`、`stage`
 * 皆與套用前完全相同，不清除或變更既有 Chat_Session 狀態。
 * 純函式，不會修改傳入的 `session`，回傳一個新的 session 物件。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @returns {ChatSession} 新增系統錯誤訊息後的新 Chat_Session 物件
 */
function applyServiceBusyError(session) {
  const errorMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    text: SERVICE_BUSY_MESSAGE_TEXT,
    createdAt: new Date().toISOString(),
  };

  return {
    ...session,
    messages: [...(session.messages || []), errorMessage],
  };
}

/**
 * 聯絡資訊相關欄位鍵名，這些欄位不應出現在送出表單時組裝的 `feedbackContent` 中，
 * 而是另行組裝至聯絡資訊專屬欄位（見 `buildContactFields`）。
 */
const CONTACT_FIELD_KEYS = [
  'contactName',
  'contactMobile',
  'contactLandline',
  'contactEmail',
  'contactAddressDetail',
];

/**
 * 組裝送出表單時的 `feedbackContent`：恰好排除聯絡資訊相關的五個鍵
 * （`contactName`/`contactMobile`/`contactLandline`/`contactEmail`/`contactAddressDetail`），
 * 其餘 `collectedFields` 內容原樣保留於回傳的新物件中。
 * 純函式，不會修改傳入的 `collectedFields`。
 * @param {Record<string, FieldValue>} collectedFields - 已收集欄位，鍵為 `PmsFormTopic.id` 或聯絡資訊鍵名
 * @returns {Record<string, FieldValue>} 排除聯絡資訊欄位後的新物件
 */
function buildFeedbackContent(collectedFields) {
  const fields = collectedFields || {};

  return Object.keys(fields).reduce((result, key) => {
    if (!CONTACT_FIELD_KEYS.includes(key)) {
      result[key] = fields[key];
    }
    return result;
  }, {});
}

/**
 * 檢查使用者是否已登入，用於送出表單前的把關（Requirement 6.2）。
 * 未登入（`userId` 為 `null`/`undefined`）時拒絕送出，並回傳 `code: 'AUTH_REQUIRED'`；
 * 無論允許或拒絕，回傳的 `session` 皆與傳入的 `session` 保持完全相同
 * （`collectedFields` 在拒絕前後完全不變，符合 Requirement 6.2 的欄位保留要求）。
 * 純函式，不會修改傳入的 `session`。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {(string|number|null|undefined)} userId - 目前使用者識別碼（已登入時來自 `req.user.sub`），未登入時為 `null`/`undefined`
 * @returns {{ allowed: boolean, code: (string|null), session: ChatSession }} 檢查結果；`allowed` 為 `false` 時 `code` 為 `'AUTH_REQUIRED'`
 */
function assertLoggedInForSubmit(session, userId) {
  const isLoggedIn = userId !== null && userId !== undefined;

  return {
    allowed: isLoggedIn,
    code: isLoggedIn ? null : 'AUTH_REQUIRED',
    session: { ...session },
  };
}

/**
 * @typedef {object} ContactInput
 * @property {string} [contactName] - 聯絡人姓名
 * @property {string} [contactMobile] - 聯絡手機
 * @property {string} [contactLandline] - 聯絡市話
 * @property {string} [contactEmail] - 聯絡 email
 * @property {string} [contactAddressCounty] - 聯絡地址縣市代碼
 * @property {string} [contactAddressDistrict] - 聯絡地址鄉鎮市區代碼
 * @property {string} [contactAddressDetail] - 聯絡地址詳細地址
 */

/**
 * @typedef {object} ContactFields
 * @property {(Buffer|null)} contactName
 * @property {(string|null)} contactNameHash
 * @property {(Buffer|null)} contactMobile
 * @property {(string|null)} contactMobileHash
 * @property {(Buffer|null)} contactLandline
 * @property {(string|null)} contactLandlineHash
 * @property {(Buffer|null)} contactEmail
 * @property {(string|null)} contactEmailHash
 * @property {(string|null)} contactAddressCounty
 * @property {(string|null)} contactAddressDistrict
 * @property {(Buffer|null)} contactAddressDetail
 * @property {(string|null)} contactAddressDetailHash
 */

/**
 * 判斷聯絡資訊輸入中的某個欄位是否「有提供值」（非 undefined/null 且非空字串）。
 * @param {*} value - 欲檢查的欄位值
 * @returns {boolean} 是否視為已提供
 */
function isContactValueProvided(value) {
  return value !== undefined && value !== null && value !== '';
}

/**
 * 組裝 `contactInput` 中某個「加密 + 雜湊」欄位對（例如 contactName/contactNameHash）。
 * 未提供值時，兩者皆為 `null`，且不呼叫 `encryptField`。
 * @param {*} value - 原始欄位值
 * @param {(value: string) => string} hashFn - 對應的雜湊函式（`hashContactField` 或 `hashEmail`）
 * @returns {{ encrypted: (Buffer|null), hash: (string|null) }} 加密與雜湊結果
 */
function buildEncryptedFieldPair(value, hashFn) {
  if (!isContactValueProvided(value)) {
    return { encrypted: null, hash: null };
  }

  return {
    encrypted: encryptField(value),
    hash: hashFn(value),
  };
}

/**
 * 組裝送出表單時聯絡資訊相關的加密/雜湊欄位（Requirement 6.3）。
 * 對於 `contactName`/`contactMobile`/`contactLandline`/`contactEmail`/`contactAddressDetail`，
 * 若輸入中未提供值，該欄位與其對應雜湊欄位皆保持 `null`，且不會呼叫 `encryptField`。
 * `contactAddressCounty`/`contactAddressDistrict` 為代碼值，直接原樣寫入（不加密、不雜湊）。
 * 純函式，不會修改傳入的 `contactInput`。
 * @param {ContactInput} contactInput - 聯絡資訊輸入
 * @returns {ContactFields} 組裝完成的聯絡資訊欄位物件
 */
function buildContactFields(contactInput) {
  const input = contactInput || {};

  const name = buildEncryptedFieldPair(input.contactName, hashContactField);
  const mobile = buildEncryptedFieldPair(input.contactMobile, hashContactField);
  const landline = buildEncryptedFieldPair(input.contactLandline, hashContactField);
  const email = buildEncryptedFieldPair(input.contactEmail, hashEmail);
  const addressDetail = buildEncryptedFieldPair(input.contactAddressDetail, hashContactField);

  return {
    contactName: name.encrypted,
    contactNameHash: name.hash,
    contactMobile: mobile.encrypted,
    contactMobileHash: mobile.hash,
    contactLandline: landline.encrypted,
    contactLandlineHash: landline.hash,
    contactEmail: email.encrypted,
    contactEmailHash: email.hash,
    contactAddressCounty: isContactValueProvided(input.contactAddressCounty)
      ? input.contactAddressCounty
      : null,
    contactAddressDistrict: isContactValueProvided(input.contactAddressDistrict)
      ? input.contactAddressDistrict
      : null,
    contactAddressDetail: addressDetail.encrypted,
    contactAddressDetailHash: addressDetail.hash,
  };
}

/**
 * 預設的 `platformCode` 值（MVP 暫行決策 #4），代表「AI 聊天助手」管道，可透過環境變數
 * `AI_CHAT_PLATFORM_CODE` 覆寫。
 */
const DEFAULT_PLATFORM_CODE = '09';

/** `feedbackNo` 碰撞重試的最大次數（MVP 暫行決策 #2）。 */
const FEEDBACK_NO_MAX_RETRIES = 5;

/** 新建 `PmsFormFeedback` 紀錄的初始 `isRead` 值（MVP 暫行決策 #7：未讀）。 */
const INITIAL_IS_READ = '0';

/** 新建 `PmsFormFeedback` 紀錄的初始 `status` 值（MVP 暫行決策 #7：待處理）。 */
const INITIAL_STATUS = '01';

/**
 * 產生一組 `feedbackNo` 候選值：`YYYYMMDD` + 8 碼隨機 base36 字元（共 16 碼）（MVP 暫行決策 #2）。
 * @param {Date} [now] - 可注入的「現在時間」，供測試使用
 * @returns {string} 16 碼候選 `feedbackNo`
 */
function generateFeedbackNoCandidate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  let randomPart = '';
  while (randomPart.length < 8) {
    randomPart += Math.random().toString(36).slice(2);
  }
  randomPart = randomPart.slice(0, 8);

  return `${datePart}${randomPart}`;
}

/**
 * 產生一個尚未存在於 `PmsFormFeedback` 資料表中的唯一 `feedbackNo`（MVP 暫行決策 #2）。
 * 每次產生候選值後查詢資料庫確認是否已存在，若碰撞則重新產生，最多重試
 * `FEEDBACK_NO_MAX_RETRIES` 次；若重試耗盡仍碰撞，拋出錯誤中止送出流程（不建立紀錄）。
 * @param {object} prismaClient - 可注入的 Prisma Client（供測試以 mock 取代）
 * @param {Date} [now] - 可注入的「現在時間」，供測試使用
 * @returns {Promise<string>} 唯一的 16 碼 `feedbackNo`
 */
async function generateUniqueFeedbackNo(prismaClient, now = new Date()) {
  for (let attempt = 0; attempt < FEEDBACK_NO_MAX_RETRIES; attempt += 1) {
    const candidate = generateFeedbackNoCandidate(now);
    // eslint-disable-next-line no-await-in-loop
    const existing = await prismaClient.pmsFormFeedback.findUnique({
      where: { feedbackNo: candidate },
    });
    if (!existing) {
      return candidate;
    }
  }
  throw new Error('無法產生唯一的 feedbackNo，已達最大重試次數');
}

/**
 * 依 MVP 暫行決策 #3：以 `PmsForm.serviceVendorId` 反查 `CmsHomepageServiceVendor` →
 * `CmsHomepageService`，取第一筆符合的 `service.id`；查無對應時使用環境變數
 * `AI_CHAT_DEFAULT_SERVICE_ID` 作為預設值。
 * @param {number} serviceVendorId - `PmsForm.serviceVendorId`
 * @param {object} prismaClient - 可注入的 Prisma Client（供測試以 mock 取代）
 * @returns {Promise<number|null>} 反查到的 `serviceId`；查無對應且無預設值時回傳 `null`
 */
async function resolveServiceId(serviceVendorId, prismaClient) {
  const services = await prismaClient.cmsHomepageService.findMany({
    where: { serviceVendorId },
    select: { id: true },
    take: 1,
  });

  if (services.length > 0) {
    return services[0].id;
  }

  const fallback = process.env.AI_CHAT_DEFAULT_SERVICE_ID;
  if (fallback === undefined || fallback === null || fallback === '') {
    return null;
  }
  const parsed = Number(fallback);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * 從 `session.collectedFields` 中取出聯絡資訊輸入（`ContactInput` 形狀），供
 * `buildContactFields` 使用。`collectedFields` 中聯絡資訊鍵的值可能是原始字串，
 * 也可能是 `FieldValue`（`{ topicId, value }`）形狀，兩者皆支援。
 * @param {Record<string, *>} collectedFields - 已收集欄位
 * @returns {ContactInput} 聯絡資訊輸入物件
 */
function extractContactInputFromCollectedFields(collectedFields) {
  const fields = collectedFields || {};
  const contactKeys = [
    ...CONTACT_FIELD_KEYS,
    'contactAddressCounty',
    'contactAddressDistrict',
  ];

  return contactKeys.reduce((result, key) => {
    const rawField = fields[key];
    if (rawField === undefined) {
      return result;
    }
    const value = Object.prototype.hasOwnProperty.call(rawField || {}, 'value')
      ? rawField.value
      : rawField;
    result[key] = value;
    return result;
  }, {});
}

/**
 * 組裝送出表單時完整的 `PmsFormFeedback` 寫入資料（Requirement 6.3, 6.4, 6.5, 6.6, 9.2）。
 * 所有資料組裝與驗證皆在此函式內完成，呼叫端（`submitFeedback`）僅需將回傳結果直接
 * 傳入 `prisma.pmsFormFeedback.create`，確保「資料組裝與驗證必須在寫入資料庫之前全部完成」。
 * @param {ChatSession} session - 目前的 Chat_Session（已收集 `feedbackContent` 與聯絡資訊欄位）
 * @param {(string|number)} userId - 已登入使用者識別碼，對應 `PmsFormFeedback.inbrAccountId`
 * @param {object} [prismaClient] - 可注入的 Prisma Client（預設使用共用單一實例），供測試以 mock 取代
 * @returns {Promise<object>} 可直接傳入 `prisma.pmsFormFeedback.create({ data })` 的 `data` 物件
 */
async function buildFormFeedbackPayload(session, userId, prismaClient = defaultPrisma) {
  const collectedFields = session.collectedFields || {};

  const form = await prismaClient.pmsForm.findUnique({
    where: { id: session.selectedFormId },
    select: { serviceVendorId: true, type: true },
  });

  if (!form) {
    throw new Error(`找不到 id 為 ${session.selectedFormId} 的表單，無法組裝送出資料`);
  }

  const feedbackContent = buildFeedbackContent(collectedFields);
  const contactInput = extractContactInputFromCollectedFields(collectedFields);
  const contactFields = buildContactFields(contactInput);

  const serviceId = await resolveServiceId(form.serviceVendorId, prismaClient);
  const platformCode = process.env.AI_CHAT_PLATFORM_CODE || DEFAULT_PLATFORM_CODE;
  const feedbackNo = await generateUniqueFeedbackNo(prismaClient);

  return {
    feedbackNo,
    serviceId,
    platformCode,
    formId: session.selectedFormId,
    feedbackContent,
    formType: form.type,
    isRead: INITIAL_IS_READ,
    status: INITIAL_STATUS,
    ...contactFields,
    inbrAccountId: userId,
  };
}

/**
 * 送出表單：檢查登入狀態、組裝並驗證所有資料，僅在全部完成後才呼叫
 * `prisma.pmsFormFeedback.create` 建立紀錄；任一步驟失敗時中止且不建立紀錄
 * （Requirement 6.5），並保留 `session.collectedFields` 不變。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {(string|number|null|undefined)} userId - 目前使用者識別碼，未登入時為 `null`/`undefined`
 * @param {object} [prismaClient] - 可注入的 Prisma Client（預設使用共用單一實例），供測試以 mock 取代
 * @returns {Promise<{success: boolean, code?: string, feedbackNo?: string}>} 送出結果
 */
async function submitFeedback(session, userId, prismaClient = defaultPrisma) {
  const authResult = assertLoggedInForSubmit(session, userId);
  if (!authResult.allowed) {
    return { success: false, code: authResult.code };
  }

  let payload;
  try {
    payload = await buildFormFeedbackPayload(session, userId, prismaClient);
  } catch (error) {
    return { success: false, code: 'SUBMIT_FAILED' };
  }

  try {
    const now = new Date();
    const created = await prismaClient.pmsFormFeedback.create({
      data: {
        ...payload,
        creTime: now,
        updTime: now,
      },
    });
    return { success: true, feedbackNo: created.feedbackNo };
  } catch (error) {
    return { success: false, code: 'SUBMIT_FAILED' };
  }
}

/**
 * 使用者輸入送出前驗證失敗時，對應各拒絕原因（`validateMessageBeforeSend`/`containsDisallowedContent`
 * 回傳的 reason）所顯示給使用者的提示文字。
 */
const GUARD_REJECTION_MESSAGES = {
  TOO_LONG: '您的訊息長度超過 500 個字元上限，請縮短內容後再試一次。',
  HTML_CONTENT: '訊息中包含不允許的 HTML 標籤內容，請以一般文字重新輸入。',
  CODE_SNIPPET: '訊息中包含不允許的程式碼片段內容，請以一般文字重新輸入。',
  DISALLOWED_CONTENT: '您的訊息包含不允許的內容，請修改後重新傳送。',
};

/**
 * 產生一則新的 `ChatMessage` 並附加至 `session.messages` 末端。
 * 純函式，不會修改傳入的 `session`。
 * @param {ChatSession} session - 目前的 Chat_Session
 * @param {('user'|'assistant')} role - 訊息角色
 * @param {string} text - 訊息文字內容
 * @returns {ChatSession} 附加訊息後的新 Chat_Session 物件
 */
function appendMessage(session, role, text) {
  const message = {
    id: crypto.randomUUID(),
    role,
    text: typeof text === 'string' ? text : '',
    createdAt: new Date().toISOString(),
  };

  return {
    ...session,
    messages: [...(session.messages || []), message],
  };
}

/**
 * 附加一則使用者訊息至 `session.messages`。
 * @param {ChatSession} session
 * @param {string} text
 * @returns {ChatSession}
 */
function appendUserMessage(session, text) {
  return appendMessage(session, 'user', text);
}

/**
 * 附加一則助手訊息至 `session.messages`。
 * @param {ChatSession} session
 * @param {string} text
 * @returns {ChatSession}
 */
function appendAssistantMessage(session, text) {
  return appendMessage(session, 'assistant', text);
}

/**
 * 套用傳送前驗證閘門拒絕的處理：附加一則說明拒絕原因的助手訊息，
 * 不呼叫任何 LLM_Gateway（Requirement 1.6/1.7、9.6）。
 * @param {ChatSession} session
 * @param {string} reason - `validateMessageBeforeSend`/`containsDisallowedContent` 判定的拒絕原因
 * @returns {ChatSession}
 */
function applyInputGuardRejection(session, reason) {
  const text = GUARD_REJECTION_MESSAGES[reason] || '您的訊息無法送出，請修改後重新嘗試。';
  return appendAssistantMessage(session, text);
}

/**
 * 將 `PmsFormGroup`/`PmsFormTopic` 巢狀結構（`getFormWithTopics` 回傳格式）展平為單一題目陣列，
 * 每筆題目附加 `group.sort` 供 `selectNextTopic` 排序使用。
 * @param {object|null} form - `getFormWithTopics` 回傳的表單物件
 * @returns {Array<object>} 展平後的題目陣列
 */
function flattenTopics(form) {
  if (!form || !Array.isArray(form.groups)) {
    return [];
  }
  return form.groups.flatMap((group) =>
    (group.topics || []).map((topic) => ({ ...topic, group: { sort: group.sort } }))
  );
}

/**
 * 依題目 `type` 代碼組成適合的提問文字（Requirement 4.2）。
 * @param {object|null} topic - `PmsFormTopic`（可含 `options`）
 * @returns {string} 提問文字
 */
function buildTopicQuestionText(topic) {
  if (!topic) {
    return '';
  }
  const base = topic.title || '';
  switch (topic.type) {
    case TOPIC_TYPE.SINGLE_CHOICE: {
      const options = (topic.options || []).map((option) => option.optionName).join('、');
      return options ? `${base}（請選擇一項：${options}）` : base;
    }
    case TOPIC_TYPE.MULTIPLE_CHOICE: {
      const options = (topic.options || []).map((option) => option.optionName).join('、');
      return options ? `${base}（可多選，請列出所有您選擇的項目：${options}）` : base;
    }
    case TOPIC_TYPE.DATE:
      return `${base}（請提供日期，例如 2024-01-01）`;
    case TOPIC_TYPE.IMAGE_UPLOAD:
      return `${base}（請上傳圖片）`;
    case TOPIC_TYPE.NUMBER:
      return `${base}（請提供數字）`;
    default:
      return base;
  }
}

/**
 * 組成已收集欄位的摘要文字，供 Requirement 4.6 的送出前確認訊息使用。
 * @param {Array<object>} topics - 目前作業表單的題目陣列
 * @param {Record<string, FieldValue>} collectedFields - 已收集欄位
 * @returns {string} 摘要文字
 */
function buildSummaryText(topics, collectedFields) {
  const lines = (topics || [])
    .map((topic) => {
      const field = (collectedFields || {})[String(topic.id)];
      if (!field) {
        return null;
      }

      // 安全取出原始值：支援 FieldValue 物件格式 { topicId, value } 或直接值
      let rawValue;
      if (field !== null && typeof field === 'object' && !Array.isArray(field) && 'value' in field) {
        rawValue = field.value;
      } else {
        rawValue = field;
      }

      // null/undefined 代表跳過，顯示「無」
      if (rawValue === null || rawValue === undefined) {
        return `・${topic.title}：無`;
      }

      // 對有選項的題目，將 option id 轉換為選項名稱顯示
      const options = Array.isArray(topic.options) ? topic.options : [];
      let displayValue;

      if (options.length > 0) {
        if (Array.isArray(rawValue)) {
          displayValue = rawValue
            .map((v) => {
              const opt = options.find((o) => o.id === v || o.id === Number(v));
              return opt ? opt.optionName : String(v);
            })
            .join('、');
        } else {
          const opt = options.find((o) => o.id === rawValue || o.id === Number(rawValue));
          displayValue = opt ? opt.optionName : String(rawValue);
        }
      } else {
        if (Array.isArray(rawValue)) {
          displayValue = rawValue.join('、');
        } else if (typeof rawValue === 'object') {
          displayValue = JSON.stringify(rawValue);
        } else {
          displayValue = String(rawValue);
        }
      }

      return `・${topic.title}：${displayValue}`;
    })
    .filter(Boolean);

  return [
    '以下是您目前填寫的內容，請確認是否正確：',
    lines.join('\n'),
    '如果都沒問題，請回覆「確認送出」；如需修改，請告訴我要修改的項目。',
  ].join('\n');
}

/**
 * 依 Requirement 5.3/5.4 的來源優先順序，組成一般問答的備援回覆文字：
 * 已選定表單時優先使用該表單的 `introContent`/`noticeContent`/`termsContent`；
 * 尚未選定表單時使用可選表單清單摘要；皆無資料時回覆「目前無相關資訊」訊息。
 * @param {object|null} form - 已選定的表單（含 `introContent`/`noticeContent`/`termsContent`），或 null
 * @param {Array<{id:number,name:string,introContent:(string|null)}>|null} forms - 可選表單清單
 * @returns {string} 備援問答回覆文字
 */
function buildQaFallbackText(form, forms) {
  if (form) {
    const content = form.introContent || form.noticeContent || form.termsContent;
    if (content) {
      return content;
    }
  }
  if (Array.isArray(forms) && forms.length > 0) {
    const summary = forms
      .map((f) => (f.introContent ? `${f.name}：${f.introContent}` : f.name))
      .join('\n');
    return `目前提供以下服務項目，歡迎詢問或告訴我您的需求：\n${summary}`;
  }
  return '目前沒有相關資訊可提供，若您有其他問題歡迎告訴我。';
}

/**
 * 將 `session.messages` 對話歷史轉換為 LLM_Gateway 所需的 `messages` 陣列，並於最前方附加系統提示。
 * @param {ChatSession} session
 * @param {string} systemPrompt - 依目前對話狀態組成的系統提示
 * @returns {Array<{role: string, content: string}>}
 */
function toLlmMessages(session, systemPrompt) {
  const history = (session.messages || []).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.text,
  }));
  return [{ role: 'system', content: systemPrompt }, ...history];
}

/**
 * 組成表單比對/問答階段（`selectedFormId` 為 null）的系統提示。
 * @param {Array<{id:number,name:string,introContent:(string|null)}>} forms - 啟用中且未刪除的表單清單
 * @returns {string}
 */
function buildMatchingSystemPrompt(forms) {
  const formList = forms
    .map((form) => `- id: ${form.id}, name: ${form.name}${form.introContent ? `, intro: ${form.introContent}` : ''}`)
    .join('\n');

  return [
    '你是「小統」，一位親切友善的 AI 助手。你的工作是透過聊天對話方式協助使用者填寫表單或回答服務相關問題。請用溫暖、有耐心的語氣與使用者對話，像朋友一樣幫忙。你負責判斷使用者需求是否對應以下其中一份表單，或僅是一般問答。',
    '重要：這是純文字聊天介面，不可使用「點擊這裡」、「請按連結」等指引，因為使用者無法點擊任何東西。若使用者的需求對應到某份表單，直接在 reply_text 中告知使用者你會協助填寫，並將 action 設為 match_form。',
    '可選表單清單：',
    formList || '（目前無啟用中的表單）',
    '請以 JSON 格式回覆，且只回覆 JSON，不要包含其他文字，格式為：',
    '{"action":"match_form"|"need_clarification"|"answer_question","matched_form_id":數字或null,"reply_text":"要回覆給使用者的文字","confidence":0到1之間的數字}',
    '若使用者描述明確對應某份表單，請將 action 設為 match_form 並填入該表單的 id；',
    '若描述不夠明確需要進一步詢問，請將 action 設為 need_clarification；',
    '若使用者僅是詢問服務內容、注意事項等問題而非要求填表，請將 action 設為 answer_question 並在 reply_text 回答。',
  ].join('\n');
}

/**
 * 組成欄位擷取階段的系統提示。
 * @param {object} topic - 目前引導中的 `PmsFormTopic`
 * @returns {string}
 */
function buildExtractionSystemPrompt(topic) {
  const lines = [
    '你是「小統」，一位親切友善的 AI 助手，正透過聊天對話方式引導使用者回答以下題目。請用溫暖、有耐心的語氣對話。注意：這是純文字聊天介面，不可使用「點擊」、「連結」等指引。',
    `題目 id：${topic.id}`,
    `題目內容：${topic.title}`,
    topic.remark ? `補充說明：${topic.remark}` : '',
    `題目類型代碼：${topic.type}`,
  ];

  // 對單選/多選題目，附上選項清單讓 LLM 可以回傳正確的選項 id
  const options = Array.isArray(topic.options) ? topic.options : [];
  if (options.length > 0) {
    const optionList = options.map((opt) => `  - id: ${opt.id}, 名稱: ${opt.optionName}`).join('\n');
    lines.push(`可選選項：\n${optionList}`);
    lines.push('注意：若使用者選擇了某個選項，請在 collected_fields 中填入該選項的「id」（數字），而非選項名稱。');
  }

  lines.push(
    '請以 JSON 格式回覆，且只回覆 JSON，不要包含其他文字，格式為：',
    `{"action":"extract_field"|"answer_question"|"match_form"|"error","reply_text":"要回覆給使用者的文字","collected_fields":{"${topic.id}":擷取到的答案},"confidence":0到1之間的數字}`,
    '若使用者的訊息是在回答此題目，請將 action 設為 extract_field 並將擷取到的答案放入 collected_fields；',
    '若使用者提出與此題目無關的問題，請將 action 設為 answer_question 並在 reply_text 回答；',
    '若使用者的訊息顯示想改填另一份表單，請將 action 設為 match_form 並提供 matched_form_id。',
  );

  return lines.filter(Boolean).join('\n');
}

/**
 * 組成表單切換確認階段的系統提示。
 * @returns {string}
 */
function buildSwitchConfirmationSystemPrompt() {
  return [
    '使用者目前正在等待確認是否要切換至另一份表單，切換將清除目前已填寫的內容。',
    '請判斷使用者的回覆是否明確表示「確認切換」。',
    '請以 JSON 格式回覆，且只回覆 JSON，不要包含其他文字，格式為：',
    '{"action":"confirm_switch","reply_text":"要回覆給使用者的文字","collected_fields":{"confirmed":true或false},"confidence":0到1之間的數字}',
    '若使用者的回覆內容含糊或未明確表態，請將 confirmed 設為 false。',
  ].join('\n');
}

/**
 * 處理 `session.pendingFormSwitch` 存在時的確認解析（Requirement 3.6-3.8）：
 * 呼叫 LLM_Gateway 判斷使用者是否確認切換，並套用 `resolveFormSwitch`。
 * @param {ChatSession} session
 * @param {object} llmGateway - `services/llmGateway.js`（或其相容 mock）
 * @returns {Promise<ChatSession>}
 */
async function resolveFormSwitchWithLlm(session, llmGateway) {
  const systemPrompt = buildSwitchConfirmationSystemPrompt();
  const messages = toLlmMessages(session, systemPrompt);
  const structured = await llmGateway.requestStructuredResponse({ messages });

  const confirmedField = structured.collected_fields && structured.collected_fields.confirmed;
  const isConfirmed = structured.action === 'confirm_switch' && confirmedField === true;
  const isExplicitlyDenied = structured.action === 'confirm_switch' && confirmedField === false;

  const updated = resolveFormSwitch(session, isConfirmed);

  let replyText;
  if (isConfirmed) {
    replyText = structured.reply_text || '已為您切換表單，我們重新開始填寫新的表單內容。';
  } else if (isExplicitlyDenied) {
    replyText = structured.reply_text || '好的，將繼續協助您完成原本的表單。';
  } else {
    replyText = structured.reply_text || '請明確回覆「是」確認切換表單，或「否」繼續填寫原表單。';
  }

  return appendAssistantMessage(updated, replyText);
}

/**
 * 處理 `session.selectedFormId` 為 null 時的表單比對/問答分派（Requirement 3.1-3.5, 5.1-5.5）。
 * @param {ChatSession} session
 * @param {object} formMatchingService - `services/formMatchingService.js`（或其相容 mock）
 * @param {object} llmGateway - `services/llmGateway.js`（或其相容 mock）
 * @returns {Promise<ChatSession>}
 */
async function handleFormMatchingOrQA(session, formMatchingService, llmGateway) {
  const forms = await formMatchingService.listActiveForms();
  const validFormIds = forms.map((form) => form.id);
  const systemPrompt = buildMatchingSystemPrompt(forms);
  const messages = toLlmMessages(session, systemPrompt);
  const structured = await llmGateway.requestStructuredResponse({ messages });

  if (structured.action === 'match_form') {
    const matched = applyMatchResult(session, structured.matched_form_id, validFormIds);

    if (matched.selectedFormId !== null && matched.selectedFormId !== undefined) {
      const form = await formMatchingService.getFormWithTopics(matched.selectedFormId);
      const topics = flattenTopics(form);
      const nextTopic = formMatchingService.selectNextTopic(topics, matched.collectedFields);
      const updated = {
        ...matched,
        currentTopicId: nextTopic ? nextTopic.id : null,
        stage: nextTopic ? 'filling' : matched.stage,
      };
      const replyText =
        structured.reply_text && structured.reply_text.trim() !== ''
          ? nextTopic
            ? `${structured.reply_text}\n\n首先請回答：${buildTopicQuestionText(nextTopic)}`
            : structured.reply_text
          : nextTopic
            ? `好的，我來協助您填寫表單。\n\n首先請回答：${buildTopicQuestionText(nextTopic)}`
            : '所有題目皆已完成，感謝您的填寫。';
      return appendAssistantMessage(updated, replyText);
    }

    const notMatched = applyNonAdvancingResponse(matched, structured);
    const replyText =
      structured.reply_text ||
      '很抱歉，我找不到符合您需求的表單，可以請您提供更多描述，或告訴我您想諮詢的服務內容嗎？';
    return appendAssistantMessage(notMatched, replyText);
  }

  if (structured.action === 'need_clarification') {
    const updated = applyNonAdvancingResponse(session, structured);
    return appendAssistantMessage(updated, structured.reply_text || '可以請您提供更多描述嗎？');
  }

  if (structured.action === 'answer_question') {
    const updated = applyNonAdvancingResponse(session, structured);
    const replyText =
      structured.reply_text && structured.reply_text.trim() !== ''
        ? structured.reply_text
        : buildQaFallbackText(null, forms);
    return appendAssistantMessage(updated, replyText);
  }

  // structured.action === 'error'（LLM 呼叫/parse 失敗）：保留 session 狀態，回覆通用錯誤訊息
  return appendAssistantMessage({ ...session }, '目前無法處理您的訊息，請稍後再試或換個方式描述。');
}

/**
 * 處理已選定表單且非 pending 表單切換時的欄位擷取/離題問答/表單切換偵測分派（Requirement 4.1-4.9）。
 * @param {ChatSession} session
 * @param {object} formMatchingService - `services/formMatchingService.js`（或其相容 mock）
 * @param {object} llmGateway - `services/llmGateway.js`（或其相容 mock）
 * @returns {Promise<ChatSession>}
 */
async function handleFieldExtractionOrOffTopic(session, formMatchingService, llmGateway) {
  const form = await formMatchingService.getFormWithTopics(session.selectedFormId);

  if (!form) {
    return appendAssistantMessage(
      {
        ...session,
        selectedFormId: null,
        pendingFormSwitch: null,
        currentTopicId: null,
        stage: 'selecting_form',
      },
      '很抱歉，找不到該表單的資訊，請重新描述您的需求，讓我為您重新尋找合適的表單。'
    );
  }

  const topics = flattenTopics(form);
  const currentTopic = session.currentTopicId
    ? topics.find((topic) => topic.id === session.currentTopicId)
    : formMatchingService.selectNextTopic(topics, session.collectedFields);

  if (!currentTopic) {
    return applyCompletionCheck(session, topics);
  }

  // 若使用者輸入為「跳過」/「都不用」且題目非必填，直接跳過此題不呼叫 LLM
  const lastUserMsg = (session.messages || []).filter((m) => m.role === 'user').pop();
  const skipKeywords = ['跳過', '都不用', '不用', '不需要', '沒有'];
  const isSkipRequest = lastUserMsg && typeof lastUserMsg.text === 'string'
    && skipKeywords.includes(lastUserMsg.text.trim());

  if (isSkipRequest && currentTopic.isRequired !== '1') {
    let updated = applyFieldExtraction(session, {
      success: true,
      fields: {
        [String(currentTopic.id)]: { topicId: currentTopic.id, value: null },
      },
    });

    const nextTopic = formMatchingService.selectNextTopic(topics, updated.collectedFields);
    updated = { ...updated, currentTopicId: nextTopic ? nextTopic.id : null };

    if (!nextTopic) {
      updated = applyCompletionCheck(updated, topics);
    }

    const replyText =
      updated.stage === 'confirming'
        ? buildSummaryText(topics, updated.collectedFields)
        : nextTopic
          ? `好的，已跳過此題。\n\n接下來請回答：${buildTopicQuestionText(nextTopic)}`
          : '好的，已跳過此題。所有題目皆已完成。';

    return appendAssistantMessage(updated, replyText);
  }

  // 若使用者只是簡短的確認/應答語，重新提問目前題目（不視為答案）
  const ackKeywords = ['好', '好啊', '好的', 'ok', 'OK', '嗯', '是', '可以', '沒問題', '了解', '知道了', '繼續'];
  const isAckOnly = lastUserMsg && typeof lastUserMsg.text === 'string'
    && ackKeywords.includes(lastUserMsg.text.trim());

  if (isAckOnly) {
    const replyText = `請回答：${buildTopicQuestionText(currentTopic)}`;
    return appendAssistantMessage(session, replyText);
  }

  // 若使用者的輸入精確匹配目前題目的某個選項名稱，直接接受（不經 LLM）
  const topicOptions = Array.isArray(currentTopic.options) ? currentTopic.options : [];
  if (topicOptions.length > 0 && lastUserMsg && typeof lastUserMsg.text === 'string') {
    const userText = lastUserMsg.text.trim();
    const matchedOption = topicOptions.find(
      (opt) => opt.optionName && opt.optionName.trim() === userText
    );

    if (matchedOption) {
      let updated = applyFieldExtraction(session, {
        success: true,
        fields: {
          [String(currentTopic.id)]: { topicId: currentTopic.id, value: matchedOption.id },
        },
      });

      const nextTopic2 = formMatchingService.selectNextTopic(topics, updated.collectedFields);
      updated = { ...updated, currentTopicId: nextTopic2 ? nextTopic2.id : null };

      if (!nextTopic2) {
        updated = applyCompletionCheck(updated, topics);
      }

      const replyText =
        updated.stage === 'confirming'
          ? buildSummaryText(topics, updated.collectedFields)
          : nextTopic2
            ? `好的，您選擇了${matchedOption.optionName}。\n\n接下來請回答：${buildTopicQuestionText(nextTopic2)}`
            : `好的，您選擇了${matchedOption.optionName}。所有題目皆已完成。`;

      return appendAssistantMessage(updated, replyText);
    }
  }

  const systemPrompt = buildExtractionSystemPrompt(currentTopic);
  const messages = toLlmMessages(session, systemPrompt);
  const structured = await llmGateway.requestStructuredResponse({ messages });

  if (structured.action === 'answer_question') {
    const replyText =
      structured.reply_text && structured.reply_text.trim() !== ''
        ? structured.reply_text
        : buildQaFallbackText(form, null);
    const updated = applyOffTopicAnswer(session, replyText);
    return appendAssistantMessage(updated, replyText);
  }

  if (structured.action === 'match_form') {
    const forms = await formMatchingService.listActiveForms();
    const validFormIds = forms.map((f) => f.id);
    if (
      structured.matched_form_id !== null &&
      structured.matched_form_id !== undefined &&
      structured.matched_form_id !== session.selectedFormId &&
      validFormIds.includes(structured.matched_form_id)
    ) {
      const updated = requestFormSwitch(session, structured.matched_form_id);
      const replyText =
        structured.reply_text ||
        '偵測到您可能想填寫另一份表單，切換將會清除目前已填寫的內容，是否要切換？（請回覆「是」或「否」）';
      return appendAssistantMessage(updated, replyText);
    }
    const replyText = structured.reply_text || buildTopicQuestionText(currentTopic);
    const updated = applyOffTopicAnswer(session, replyText);
    return appendAssistantMessage(updated, replyText);
  }

  if (structured.action === 'error') {
    const updated = applyFieldExtraction(session, { success: false });
    return appendAssistantMessage(
      updated,
      `目前無法處理您的回覆，請重新回答：${buildTopicQuestionText(currentTopic)}`
    );
  }

  // structured.action === 'extract_field'（預期的正常路徑）
  const rawAnswer = structured.collected_fields ? structured.collected_fields[String(currentTopic.id)] : undefined;
  const validation = formMatchingService.validateAnswerAgainstTopic(currentTopic, rawAnswer);

  if (!validation.valid) {
    const updated = applyFieldExtraction(session, { success: false });
    return appendAssistantMessage(
      updated,
      `${validation.errorMessage || '答案格式不符合要求'}，請重新回答：${buildTopicQuestionText(currentTopic)}`
    );
  }

  let updated = applyFieldExtraction(session, {
    success: true,
    fields: {
      [String(currentTopic.id)]: { topicId: currentTopic.id, value: validation.normalizedValue },
    },
  });

  const nextTopic = formMatchingService.selectNextTopic(topics, updated.collectedFields);
  updated = { ...updated, currentTopicId: nextTopic ? nextTopic.id : null };

  // 只有當所有題目都回答完畢（nextTopic === null）才進入確認階段
  if (!nextTopic) {
    updated = applyCompletionCheck(updated, topics);
  }

  const replyText =
    updated.stage === 'confirming'
      ? buildSummaryText(topics, updated.collectedFields)
      : nextTopic
        ? buildTopicQuestionText(nextTopic)
        : (structured.reply_text || '所有題目皆已完成，感謝您的填寫。');

  return appendAssistantMessage(updated, replyText);
}

/**
 * 組成確認階段的系統提示：使用者可能要求修改某欄位、確認送出，或提出一般問題。
 * @param {Array<object>} topics - 目前表單的題目陣列
 * @param {Record<string, *>} collectedFields - 已收集欄位
 * @returns {string}
 */
function buildConfirmingSystemPrompt(topics, collectedFields) {
  const fieldSummary = (topics || [])
    .map((topic) => {
      const field = (collectedFields || {})[String(topic.id)];
      if (!field) return null;

      // 安全取出值
      let rawValue;
      if (field !== null && typeof field === 'object' && !Array.isArray(field) && 'value' in field) {
        rawValue = field.value;
      } else {
        rawValue = field;
      }

      // 將選項 ID 轉名稱
      const options = Array.isArray(topic.options) ? topic.options : [];
      let displayValue;
      if (rawValue === null || rawValue === undefined) {
        displayValue = '跳過';
      } else if (options.length > 0) {
        if (Array.isArray(rawValue)) {
          displayValue = rawValue.map((v) => {
            const opt = options.find((o) => o.id === v || o.id === Number(v));
            return opt ? opt.optionName : String(v);
          }).join('、');
        } else {
          const opt = options.find((o) => o.id === rawValue || o.id === Number(rawValue));
          displayValue = opt ? opt.optionName : String(rawValue);
        }
      } else if (typeof rawValue === 'object') {
        displayValue = JSON.stringify(rawValue);
      } else {
        displayValue = Array.isArray(rawValue) ? rawValue.join('、') : String(rawValue);
      }

      return `- id: ${topic.id}, 題目: ${topic.title}, 目前答案: ${displayValue}`;
    })
    .filter(Boolean)
    .join('\n');

  return [
    '使用者已完成所有題目的填寫，目前在確認階段。以下是已填寫的內容：',
    fieldSummary || '（無已填寫內容）',
    '',
    '使用者可能：',
    '1. 要求修改某個欄位（action: "edit_field"）',
    '2. 確認送出（action: "confirm_submit"）',
    '3. 提出一般問題（action: "answer_question"）',
    '',
    '請以 JSON 格式回覆，且只回覆 JSON，不要包含其他文字，格式為：',
    '{"action":"edit_field"|"confirm_submit"|"answer_question","edit_topic_id":要修改的題目id或null,"reply_text":"要回覆給使用者的文字","confidence":0到1之間的數字}',
    '若使用者明確表示要修改某個欄位，請將 action 設為 edit_field 並將 edit_topic_id 設為該題目的 id；',
    '若使用者表示確認無誤要送出，請將 action 設為 confirm_submit；',
    '若使用者提出其他問題，請將 action 設為 answer_question 並在 reply_text 回答。',
  ].join('\n');
}

/**
 * 處理 `session.stage === 'confirming'` 時的使用者輸入：
 * 呼叫 LLM 判斷使用者是要修改欄位、確認送出，還是問問題。
 * 若要修改，將對應欄位從 `collectedFields` 中移除並將 stage 改回 'filling'，
 * 重新引導該題目。
 * @param {ChatSession} session
 * @param {object} formMatchingService
 * @param {object} llmGateway
 * @returns {Promise<ChatSession>}
 */
async function handleConfirmingStage(session, formMatchingService, llmGateway) {
  const form = await formMatchingService.getFormWithTopics(session.selectedFormId);
  if (!form) {
    return appendAssistantMessage(session, '找不到表單資訊，請重新操作。');
  }

  const topics = flattenTopics(form);

  // 若使用者直接說「確認送出」，標記 session 為待送出狀態（前端會觸發 submitFeedback）
  const lastUserMsg = (session.messages || []).filter((m) => m.role === 'user').pop();
  const confirmKeywords = ['確認送出', '確認', '送出', '沒問題', '確定', '都對了', '正確'];
  const isDirectConfirm = lastUserMsg && typeof lastUserMsg.text === 'string'
    && confirmKeywords.includes(lastUserMsg.text.trim());

  if (isDirectConfirm) {
    // 保持 stage 為 confirming，讓前端顯示確認按鈕並自動觸發送出
    const updated = { ...session, awaitingSubmitConfirmation: true };
    return appendAssistantMessage(updated, '好的，正在為您送出表單...');
  }

  const systemPrompt = buildConfirmingSystemPrompt(topics, session.collectedFields);
  const messages = toLlmMessages(session, systemPrompt);
  const structured = await llmGateway.requestStructuredResponse({ messages });

  if (structured.action === 'edit_field') {
    const editTopicId = structured.edit_topic_id;
    const targetTopic = editTopicId ? topics.find((t) => t.id === editTopicId) : null;

    if (targetTopic) {
      // 移除該欄位的已收集值，讓 selectNextTopic 重新引導
      const updatedFields = { ...session.collectedFields };
      delete updatedFields[String(editTopicId)];

      const updated = {
        ...session,
        collectedFields: updatedFields,
        currentTopicId: editTopicId,
        stage: 'filling',
      };

      // 固定格式提問，不使用 LLM 的 reply_text（避免 LLM 亂說）
      const replyText = `好的，請重新選擇：${buildTopicQuestionText(targetTopic)}`;
      return appendAssistantMessage(updated, replyText);
    }

    // LLM 給的 topic id 無效，請使用者再說一次
    const replyText = structured.reply_text || '請告訴我您想修改哪一個項目？';
    return appendAssistantMessage(session, replyText);
  }

  if (structured.action === 'confirm_submit') {
    // 標記為待送出，前端會自動觸發
    const updated = { ...session, awaitingSubmitConfirmation: true };
    const replyText = structured.reply_text || '好的，正在為您送出表單...';
    return appendAssistantMessage(updated, replyText);
  }

  // answer_question 或其他
  const replyText = structured.reply_text && structured.reply_text.trim() !== ''
    ? structured.reply_text
    : '如果需要修改任何項目請告訴我，或回覆「確認送出」完成提交。';
  return appendAssistantMessage(session, replyText);
}

/**
 * Chat_Assistant 主分派函式：依 design.md 的 5 步分派規則整合表單比對/問答、欄位擷取、
 * 表單切換確認，一律允許使用者以離題問答插話。
 *
 * 分派順序：
 * 1. 傳送前檢查（Requirement 1.6/1.7、9.5、9.6）：語音輸入先截斷至 1000 字元，
 *    再檢查長度上限（500 字元）與不允許內容，任一檢查未通過即中止，不呼叫 LLM_Gateway。
 * 2. 若 `session.pendingFormSwitch` 存在 → 呼叫 LLM_Gateway 解析使用者是否確認切換表單。
 * 3. 否則若 `session.selectedFormId` 為 null → 呼叫 LLM_Gateway 進行表單比對／一般問答判斷。
 * 4. 否則（已選定表單且無待確認切換）→ 依目前題目呼叫 LLM_Gateway 進行欄位擷取，
 *    並允許使用者以離題問答插話或觸發表單切換偵測。
 * 5. 任一步驟中 LLM_Gateway 拋出 `ServiceBusyError`（兩模型皆重試耗盡仍 429）時，
 *    套用 `applyServiceBusyError`，不清除既有 Chat_Session 狀態。
 *
 * @param {ChatSession} session - 目前的 Chat_Session（前端整包送出的狀態）
 * @param {string} userInput - 使用者本次輸入的原始文字（文字輸入或語音辨識結果）
 * @param {('text'|'voice')} inputMode - 輸入來源模式
 * @param {object} [deps] - 可注入的相依模組，供測試以 mock 取代
 * @param {object} [deps.formMatchingService] - 預設為 `services/formMatchingService.js`
 * @param {object} [deps.llmGateway] - 預設為 `services/llmGateway.js`
 * @returns {Promise<{session: ChatSession, blocked?: boolean, reason?: string}>}
 *   套用後的新 Chat_Session；若傳送前檢查未通過，額外回傳 `blocked: true` 與 `reason`
 */
async function handleMessage(session, userInput, inputMode, deps = {}) {
  const formMatchingService = deps.formMatchingService || defaultFormMatchingService;
  const llmGateway = deps.llmGateway || defaultLlmGateway;

  const originalInput = typeof userInput === 'string' ? userInput : '';
  const preparedInput = inputMode === 'voice' ? truncateForLLM(originalInput) : originalInput;

  const guardResult = validateMessageBeforeSend(preparedInput);
  if (!guardResult.allowed) {
    return {
      session: applyInputGuardRejection(session, guardResult.reason),
      blocked: true,
      reason: guardResult.reason,
    };
  }

  if (containsDisallowedContent(preparedInput)) {
    return {
      session: applyInputGuardRejection(session, 'DISALLOWED_CONTENT'),
      blocked: true,
      reason: 'DISALLOWED_CONTENT',
    };
  }

  let workingSession = appendUserMessage(session, preparedInput);

  try {
    if (workingSession.pendingFormSwitch) {
      workingSession = await resolveFormSwitchWithLlm(workingSession, llmGateway);
    } else if (workingSession.selectedFormId === null || workingSession.selectedFormId === undefined) {
      workingSession = await handleFormMatchingOrQA(workingSession, formMatchingService, llmGateway);
    } else if (workingSession.stage === 'confirming') {
      workingSession = await handleConfirmingStage(workingSession, formMatchingService, llmGateway);
    } else {
      workingSession = await handleFieldExtractionOrOffTopic(workingSession, formMatchingService, llmGateway);
    }
  } catch (error) {
    const isServiceBusy =
      error &&
      (error.name === 'ServiceBusyError' ||
        (llmGateway.ServiceBusyError && error instanceof llmGateway.ServiceBusyError));
    if (isServiceBusy) {
      workingSession = applyServiceBusyError(workingSession);
    } else {
      throw error;
    }
  }

  return { session: workingSession };
}

module.exports = {
  applyMatchResult,
  applyNonAdvancingResponse,
  requestFormSwitch,
  resolveFormSwitch,
  applyFieldExtraction,
  isCollectionComplete,
  applyCompletionCheck,
  applyOffTopicAnswer,
  applyServiceBusyError,
  buildFeedbackContent,
  assertLoggedInForSubmit,
  buildContactFields,
  buildFormFeedbackPayload,
  submitFeedback,
  handleMessage,
};
