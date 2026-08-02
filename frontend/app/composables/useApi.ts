/**
 * useApi - 提供帶有 baseURL 的 $fetch wrapper
 *
 * 所有 API 呼叫都應透過此 composable，確保：
 * 1. 請求打到正確的後端 URL
 * 2. credentials: 'include' 預設帶入（cookie 認證）
 */

// 後端 API base URL — 部署時直接指向 EC2
const API_BASE_URL = 'https://50.112.104.252'

export function useApi() {
  /**
   * 帶有 baseURL 的 fetch wrapper
   * 用法與 $fetch 完全一致，只是 URL 會自動加上 apiBase 前綴
   */
  const apiFetch: typeof $fetch = $fetch.create({
    baseURL: API_BASE_URL,
    credentials: 'include',
  })

  return { apiFetch, baseURL: API_BASE_URL }
}
