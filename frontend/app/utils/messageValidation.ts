/**
 * 前端訊息傳送前驗證邏輯
 *
 * 對應後端 `backend/utils/inputGuard.js` 的 `validateMessageBeforeSend`，
 * 供 Chat_Page 在「傳送文字訊息前」與「語音輸入文字填入輸入框前」做即時檢查，
 * 減少無效請求。後端仍會在收到訊息時再次執行相同的最終把關（Requirement 1.6, 1.7, 9.6）。
 */

/** 使用者訊息傳送前的長度上限（對應後端 MESSAGE_MAX_LENGTH） */
export const MESSAGE_MAX_LENGTH = 500

/**
 * 禁用詞彙表（含仇恨言論、色情、暴力煽動相關詞彙的最小詞庫）
 * 僅作為前端即時提示用的最小防護清單，非完整的內容審核方案；
 * 最終仍以後端 `inputGuard.js` 的判定結果為準。
 */
const DISALLOWED_WORDS = [
  '仇恨言論',
  '種族歧視',
  '殺光',
  'hate speech',
  '色情',
  '成人影片',
  '裸體',
  'porn',
  'sex video',
  '暴力煽動',
  '恐怖攻擊',
  '殺死你',
  '炸彈製作',
  'kill you',
  'make a bomb',
]

const HTML_TAG_PATTERN = /<\/?[a-zA-Z!][^>]*>/

const CODE_SNIPPET_PATTERNS = [
  /```/,
  /<script[\s>]/i,
  /\bfunction\s*\(/,
  /=>\s*{/,
  /\bconsole\.(log|error|warn)\s*\(/,
  /\bimport\s+.+\s+from\s+['"]/,
  /\brequire\s*\(\s*['"]/,
  /;\s*$/m,
  /\bSELECT\s+.+\s+FROM\s+/i,
]

export function containsHtml(text: string): boolean {
  return HTML_TAG_PATTERN.test(text)
}

export function containsCodeSnippet(text: string): boolean {
  return CODE_SNIPPET_PATTERNS.some((pattern) => pattern.test(text))
}

export function containsDisallowedContent(text: string): boolean {
  const normalized = text.toLowerCase()
  return DISALLOWED_WORDS.some((word) => normalized.includes(word.toLowerCase()))
}

export type MessageValidationReason =
  | 'TOO_LONG'
  | 'HTML_CONTENT'
  | 'CODE_SNIPPET'
  | 'DISALLOWED_CONTENT'

export interface MessageValidationResult {
  allowed: boolean
  reason: MessageValidationReason | null
}

/**
 * 訊息傳送前的驗證閘門：檢查 500 字元上限、HTML/程式碼片段特徵、
 * 以及禁用內容類別（Requirement 1.6, 1.7, 9.5, 9.6）。
 */
export function validateMessageBeforeSend(text: string): MessageValidationResult {
  if (text.length > MESSAGE_MAX_LENGTH) {
    return { allowed: false, reason: 'TOO_LONG' }
  }

  if (containsHtml(text)) {
    return { allowed: false, reason: 'HTML_CONTENT' }
  }

  if (containsCodeSnippet(text)) {
    return { allowed: false, reason: 'CODE_SNIPPET' }
  }

  if (containsDisallowedContent(text)) {
    return { allowed: false, reason: 'DISALLOWED_CONTENT' }
  }

  return { allowed: true, reason: null }
}

/** 供 UI 顯示的錯誤訊息文案 */
export const MESSAGE_VALIDATION_ERROR_TEXT: Record<MessageValidationReason, string> = {
  TOO_LONG: `訊息長度不可超過 ${MESSAGE_MAX_LENGTH} 字元`,
  HTML_CONTENT: '訊息不可包含 HTML 標籤',
  CODE_SNIPPET: '訊息不可包含程式碼片段',
  DISALLOWED_CONTENT: '訊息包含不允許的內容，請修改後再試',
}
