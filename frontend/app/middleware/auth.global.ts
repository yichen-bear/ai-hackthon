/**
 * 全域路由守衛 middleware
 * 每次路由變更前檢查認證狀態，依角色做存取控制
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.4
 */

/**
 * 純決策函式 — 不依賴 Nuxt 內部，方便單元測試與屬性測試
 *
 * @param path - 目標路由路徑
 * @param isAuthenticated - 是否已認證
 * @param role - 用戶角色 ('member' | 'vendor')，未認證時為 undefined
 * @returns 若需要 redirect 則回傳 { redirect: string }；否則回傳 null（允許導航）
 */
export function getRouteDecision(
  path: string,
  isAuthenticated: boolean,
  role?: string
): { redirect: string } | null {
  const isLoginPage = path === '/login'
  const isAdminPath = path.startsWith('/admin')

  // 目標是 /login 頁面
  if (isLoginPage) {
    if (isAuthenticated && role === 'member') {
      return { redirect: '/' }
    }
    if (isAuthenticated && role === 'vendor') {
      return { redirect: '/admin' }
    }
    // 未認證用戶 → 允許存取 /login
    return null
  }

  // 未認證用戶存取受保護頁面 → redirect 至 /login
  if (!isAuthenticated) {
    return { redirect: `/login?redirect=${path}` }
  }

  // 已認證 member 存取 /admin/* → redirect 至 /
  if (role === 'member' && isAdminPath) {
    return { redirect: '/' }
  }

  // 已認證 vendor 存取非 /admin 頁面 → redirect 至 /admin
  if (role === 'vendor' && !isAdminPath) {
    return { redirect: '/admin' }
  }

  // 其他情況：允許導航
  return null
}

/** 標記是否已完成初始化 fetchUser */
let initialized = false

export default defineNuxtRouteMiddleware(async (to, _from) => {
  const { state, fetchUser } = useAuth()

  // 首次載入時透過 fetchUser 檢查 cookie 是否帶有效 token
  if (!initialized) {
    initialized = true
    try {
      await fetchUser()
    } catch {
      // Token 解析異常視為未認證狀態，繼續往下走
    }
  }

  const { isAuthenticated, user } = state.value
  const role = user?.role

  const decision = getRouteDecision(to.path, isAuthenticated, role)

  if (decision) {
    return navigateTo(decision.redirect)
  }
})
