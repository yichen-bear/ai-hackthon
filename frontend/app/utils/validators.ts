/**
 * 認證表單驗證函式
 * Auth form validation utility functions
 *
 * 這些函式被 login.vue 使用，同時匯出供 Property-Based Testing 驗證
 */

/**
 * 驗證 email 格式
 * - 必須包含 @
 * - @ 後必須有域名部分（含至少一個 .）
 * - 總長度不超過 254 字元
 * - 不可為空字串
 *
 * Validates: Requirements 1.5, 3.6
 */
export function validateEmail(email: string): boolean {
  if (!email || email.length === 0) {
    return false
  }

  if (email.length > 254) {
    return false
  }

  // 基本格式檢查：local@domain.tld
  const atIndex = email.indexOf('@')
  if (atIndex < 1) {
    return false
  }

  const domain = email.slice(atIndex + 1)
  if (domain.length === 0) {
    return false
  }

  // 域名必須包含至少一個點
  if (!domain.includes('.')) {
    return false
  }

  // 點不能在域名開頭或結尾
  if (domain.startsWith('.') || domain.endsWith('.')) {
    return false
  }

  return true
}

/**
 * 驗證密碼長度
 * - 最少 8 字元
 * - 最多 72 字元
 *
 * Validates: Requirements 1.5, 3.6
 */
export function validatePassword(password: string): boolean {
  if (!password) {
    return false
  }

  return password.length >= 8 && password.length <= 72
}
