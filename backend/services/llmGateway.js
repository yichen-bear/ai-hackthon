'use strict';

const OpenAI = require('openai');

/**
 * Groq API 呼叫時發生「兩個模型皆重試耗盡仍 429」情形拋出的錯誤，
 * 由上層（Chat_Assistant）轉換為「服務忙碌」訊息，不清除 Chat_Session
 */
class ServiceBusyError extends Error {
  constructor(message = '服務忙碌，請稍後再試') {
    super(message);
    this.name = 'ServiceBusyError';
  }
}

let cachedClient = null;

/**
 * 取得（並快取）OpenAI SDK client 實例，指向 Groq 的 OpenAI 相容端點
 * 每次呼叫皆重新讀取 `process.env.GROQ_API_KEY`（僅在尚未建立快取時），供測試以 jest.mock('openai') 替換
 * @returns {OpenAI}
 */
function getClient() {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return cachedClient;
}

/**
 * 呼叫指定的 Groq 模型並回傳原始回覆文字內容
 * @param {string} model - Groq 模型名稱
 * @param {Array<{role: string, content: string}>} messages - 對話訊息陣列
 * @returns {Promise<string>} LLM 回傳的原始內容字串
 */
async function callModel(model, messages) {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
  });
  return completion?.choices?.[0]?.message?.content ?? '';
}

/**
 * 呼叫 Fast_Model（`GROQ_MODEL_FAST`，預設 `llama-3.1-8b-instant`）
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>} 原始回覆內容字串
 */
async function callFastModel(messages) {
  const model = process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant';
  return callModel(model, messages);
}

/**
 * 呼叫 Smart_Model（`GROQ_MODEL_SMART`，預設 `llama-3.3-70b-versatile`）
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>} 原始回覆內容字串
 */
async function callSmartModel(messages) {
  const model = process.env.GROQ_MODEL_SMART || 'llama-3.3-70b-versatile';
  return callModel(model, messages);
}

/**
 * 呼叫 Smart_Model，若重試耗盡仍收到 429 則降級呼叫 Fast_Model（訊息內容完全相同）；
 * 若 Fast_Model 重試亦耗盡仍 429，拋出 `ServiceBusyError`
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<object>} Structured_Response
 */
async function callSmartThenDowngradeToFast(messages) {
  try {
    const rawContent = await retryWithBackoff(() => callSmartModel(messages));
    return parseStructuredResponse(rawContent);
  } catch (error) {
    if (!isRateLimitError(error)) {
      throw error;
    }
    try {
      const rawContent = await retryWithBackoff(() => callFastModel(messages));
      return parseStructuredResponse(rawContent);
    } catch (fastError) {
      if (isRateLimitError(fastError)) {
        throw new ServiceBusyError();
      }
      throw fastError;
    }
  }
}

/**
 * 依 design.md 5 步流程取得 Structured_Response：
 * 1. 呼叫 Fast_Model（除非 `forceSmart`）
 * 2. 若信心分數 < `AI_CHAT_CONFIDENCE_THRESHOLD`（預設 0.6），改呼叫 Smart_Model
 * 3. 任一模型 429 時以 `retryWithBackoff` 重試（最多 3 次、間隔 ≥500ms）
 * 4. Smart_Model 重試耗盡仍 429 → 降級呼叫 Fast_Model（訊息內容相同）
 * 5. Fast_Model 重試耗盡仍 429 → 拋出 `ServiceBusyError`
 * @param {object} params
 * @param {Array<{role: string, content: string}>} params.messages - 對話訊息陣列
 * @param {boolean} [params.forceSmart=false] - 是否強制直接呼叫 Smart_Model（略過 Fast_Model 與信心分數判斷）
 * @returns {Promise<object>} Structured_Response
 * @throws {ServiceBusyError} 當所有可用模型皆重試耗盡仍 429 時
 */
async function requestStructuredResponse({ messages, forceSmart = false }) {
  const threshold = Number.parseFloat(
    process.env.AI_CHAT_CONFIDENCE_THRESHOLD ?? '0.6'
  );

  if (forceSmart) {
    return callSmartThenDowngradeToFast(messages);
  }

  let rawContent;
  try {
    rawContent = await retryWithBackoff(() => callFastModel(messages));
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new ServiceBusyError();
    }
    throw error;
  }

  const structured = parseStructuredResponse(rawContent);

  const confidence =
    typeof structured.confidence === 'number' ? structured.confidence : 1;

  if (structured.action !== 'error' && shouldEscalateToSmartModel(confidence, threshold)) {
    return callSmartThenDowngradeToFast(messages);
  }

  return structured;
}

/**
 * 判斷是否應將任務升級至 Smart_Model 處理
 * 規則：confidence < threshold 時升級
 * @param {number} confidence - Fast_Model 回傳的信心分數（0~1）
 * @param {number} threshold - 系統設定的信心分數門檻值（0~1）
 * @returns {boolean} true 表示應升級呼叫 Smart_Model
 */
function shouldEscalateToSmartModel(confidence, threshold) {
  return confidence < threshold;
}

/**
 * 判斷一個錯誤是否為 HTTP 429（Too Many Requests）錯誤
 * 相容多種常見的 HTTP client 錯誤形狀（例如 openai SDK 的 error.status / error.statusCode / error.response.status）
 * @param {*} error - callFn 拋出的錯誤
 * @returns {boolean} true 表示為 429 錯誤
 */
function isRateLimitError(error) {
  if (!error) {
    return false;
  }
  const status =
    error.status ??
    error.statusCode ??
    error.response?.status ??
    error.code;
  return status === 429 || status === '429';
}

/**
 * 對可能因 429（Too Many Requests）失敗的呼叫進行重試，並在重試之間等待最短間隔
 * @param {Function} callFn - 需重試的非同步呼叫函式，回傳 Promise
 * @param {object} [options]
 * @param {number} [options.maxRetries=3] - 最大重試次數（不含第一次呼叫）
 * @param {number} [options.minIntervalMs=500] - 每次重試之間的最短間隔（毫秒）
 * @param {Function} [options.sleepFn] - 可注入的等待函式 `(ms) => Promise<void>`，預設使用真實 `setTimeout`，供測試 mock 計時器
 * @returns {Promise<*>} `callFn` 成功時的回傳值
 * @throws {*} 當重試已達 `maxRetries` 次仍失敗（且皆為 429 錯誤）時，拋出最後一次的錯誤；若中途遇到非 429 錯誤則立即拋出該錯誤
 */
async function retryWithBackoff(callFn, options = {}) {
  const {
    maxRetries = 3,
    minIntervalMs = 500,
    sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  let attempt = 0;
  // attempt 0 為第一次呼叫，之後每次重試 attempt 遞增，最多重試 maxRetries 次
  // 總呼叫次數 = 1（第一次）+ maxRetries（重試）
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await callFn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= maxRetries) {
        throw error;
      }
      attempt += 1;
      await sleepFn(minIntervalMs);
    }
  }
}

/**
 * 將 LLM 回傳的原始內容字串 parse 為 Structured_Response 物件
 * parse 失敗（非合法 JSON、非物件、或缺少必要欄位 `action`）時回傳 `{ action: 'error' }`，
 * 交由呼叫端視為呼叫失敗處理
 * @param {string} rawContent - LLM 回傳的原始字串內容
 * @returns {{action: string, matched_form_id?: (number|null), reply_text?: string, collected_fields?: object, confidence?: number}} Structured_Response 物件
 */
function parseStructuredResponse(rawContent) {
  if (typeof rawContent !== 'string' || rawContent.trim() === '') {
    return { action: 'error' };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    return { action: 'error' };
  }

  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    typeof parsed.action !== 'string' ||
    parsed.action.trim() === ''
  ) {
    return { action: 'error' };
  }

  return parsed;
}

module.exports = {
  shouldEscalateToSmartModel,
  retryWithBackoff,
  parseStructuredResponse,
  isRateLimitError,
  ServiceBusyError,
  callFastModel,
  callSmartModel,
  requestStructuredResponse,
};
