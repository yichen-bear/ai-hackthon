/**
 * useApi - 提供帶有 baseURL 的 $fetch wrapper
 *
 * 所有 API 呼叫都應透過此 composable，確保：
 * 1. 請求打到正確的後端 URL（由 NUXT_PUBLIC_API_BASE 控制）
 * 2. credentials: 'include' 預設帶入（cookie 認證）
 */
export function useApi() {
  const config = useRuntimeConfig()
  // Ensure baseURL is never empty - fallback to EC2 backend
  const baseURL = (config.public.apiBase as string) || 'https://50.112.104.252'

  /**
   * 帶有 baseURL 的 fetch wrapper
   * 用法與 $fetch 完全一致，只是 URL 會自動加上 apiBase 前綴
   */
  const apiFetch: typeof $fetch = $fetch.create({
    baseURL,
    credentials: 'include',
  })

  return { apiFetch, baseURL }
}
