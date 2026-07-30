'use strict';

/**
 * 語音辨識輸入送交 LLM 前的長度上限（Requirement 9.5）
 */
const LLM_INPUT_MAX_LENGTH = 1000;

/**
 * 使用者訊息傳送前的長度上限（Requirement 1.6, 1.7）
 */
const MESSAGE_MAX_LENGTH = 500;

/**
 * 禁用詞彙表（含仇恨言論、色情、暴力煽動相關詞彙的最小詞庫）
 * 僅作為 MVP 階段的最小防護清單，非完整的內容審核方案。
 */
const DISALLOWED_WORDS = [
  // 仇恨言論
  '仇恨言論',
  '種族歧視',
  '殺光',
  'hate speech',
  // 色情
  '色情',
  '成人影片',
  '裸體',
  'porn',
  'sex video',
  // 暴力煽動
  '暴力煽動',
  '恐怖攻擊',
  '殺死你',
  '炸彈製作',
  'kill you',
  'make a bomb',
];

/**
 * HTML 標籤特徵偵測（Requirement 1.6, 1.7）
 */
const HTML_TAG_PATTERN = /<\/?[a-zA-Z!][^>]*>/;

/**
 * 程式碼片段特徵偵測（Requirement 1.6, 1.7）
 * 涵蓋常見程式碼片段特徵：程式碼區塊標記、函式宣告、箭頭函式、
 * script 標籤、常見指令呼叫等。
 */
const CODE_SNIPPET_PATTERNS = [
  /```/, // markdown code fence
  /<script[\s>]/i,
  /\bfunction\s*\(/,
  /=>\s*{/,
  /\bconsole\.(log|error|warn)\s*\(/,
  /\bimport\s+.+\s+from\s+['"]/,
  /\brequire\s*\(\s*['"]/,
  /;\s*$/m,
  /\bSELECT\s+.+\s+FROM\s+/i,
];

/**
 * 截斷輸入文字至最多 1000 個字元，供送交 LLM_Gateway 前使用（Requirement 9.5）。
 * @param {string} text - 原始輸入文字
 * @returns {string} 長度不超過 1000 字元的文字（保留前綴）
 */
function truncateForLLM(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }
  if (text.length <= LLM_INPUT_MAX_LENGTH) {
    return text;
  }
  return text.slice(0, LLM_INPUT_MAX_LENGTH);
}

/**
 * 檢查輸入文字是否包含禁用內容類別的詞彙（仇恨言論、色情、暴力煽動等，Requirement 9.6）。
 * @param {string} text - 待檢查的文字
 * @returns {boolean} true 表示包含禁用內容
 */
function containsDisallowedContent(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }
  const normalized = text.toLowerCase();
  return DISALLOWED_WORDS.some((word) => normalized.includes(word.toLowerCase()));
}

/**
 * 檢查文字是否包含 HTML 標籤特徵。
 * @param {string} text - 待檢查的文字
 * @returns {boolean} true 表示疑似包含 HTML 標籤
 */
function containsHtml(text) {
  return HTML_TAG_PATTERN.test(text);
}

/**
 * 檢查文字是否包含程式碼片段特徵。
 * @param {string} text - 待檢查的文字
 * @returns {boolean} true 表示疑似包含程式碼片段
 */
function containsCodeSnippet(text) {
  return CODE_SNIPPET_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * 訊息傳送前的驗證閘門：檢查 500 字元上限、HTML/程式碼片段特徵、
 * 以及禁用內容類別（Requirement 1.6, 1.7, 9.5, 9.6）。
 * 前端可用此邏輯做即時提示，後端在送交 Chat_Assistant/LLM_Gateway 前仍需再次呼叫本函式做最終把關。
 * @param {string} text - 使用者原始輸入文字
 * @returns {{ allowed: boolean, reason: string | null }} 驗證結果；
 *   allowed 為 false 時，reason 為 'TOO_LONG' | 'HTML_CONTENT' | 'CODE_SNIPPET' | 'DISALLOWED_CONTENT'
 */
function validateMessageBeforeSend(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  if (text.length > MESSAGE_MAX_LENGTH) {
    return { allowed: false, reason: 'TOO_LONG' };
  }

  if (containsHtml(text)) {
    return { allowed: false, reason: 'HTML_CONTENT' };
  }

  if (containsCodeSnippet(text)) {
    return { allowed: false, reason: 'CODE_SNIPPET' };
  }

  if (containsDisallowedContent(text)) {
    return { allowed: false, reason: 'DISALLOWED_CONTENT' };
  }

  return { allowed: true, reason: null };
}

module.exports = {
  LLM_INPUT_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  truncateForLLM,
  containsDisallowedContent,
  containsHtml,
  containsCodeSnippet,
  validateMessageBeforeSend,
};
