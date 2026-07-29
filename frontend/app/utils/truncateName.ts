/**
 * 截斷用戶名稱
 * - null/undefined → 回傳「訪客」
 * - 超過 maxLen 字元 → 截斷為前 maxLen 字元 + "…"
 * - 其餘 → 完整回傳
 */
export function truncateName(name: string | undefined | null, maxLen: number = 20): string {
  if (!name) return '訪客'
  if (name.length > maxLen) return name.slice(0, maxLen) + '…'
  return name
}
