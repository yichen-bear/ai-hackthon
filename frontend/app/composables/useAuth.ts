/**
 * 認證狀態管理 composable
 * 使用 Nuxt useState 確保 SSR/CSR 狀態一致
 * 使用 $fetch + credentials: 'include' 確保 cookie 傳送
 */

export interface AuthUser {
  userId: string
  role: 'member' | 'vendor'
  vendorId?: number
  name?: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

const defaultState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
}

export function useAuth() {
  const state = useState<AuthState>('auth', () => ({ ...defaultState }))

  /**
   * 登入
   * POST /api/auth/login → 成功時更新狀態，失敗時設定 error
   */
  async function login(email: string, password: string, role: 'member' | 'vendor'): Promise<void> {
    state.value.isLoading = true
    state.value.error = null

    try {
      const response = await $fetch<{
        success: boolean
        user: AuthUser
        message?: string
      }>('/api/auth/login', {
        method: 'POST',
        body: { email, password, role },
        credentials: 'include',
      })

      if (response.success && response.user) {
        state.value.isAuthenticated = true
        state.value.user = response.user
        state.value.error = null
      }
    } catch (err: any) {
      state.value.isAuthenticated = false
      state.value.user = null

      // 從 $fetch 錯誤中取得伺服器回應的訊息
      const message = err?.data?.message || err?.message || '網路連線失敗，請稍後再試'
      state.value.error = message
      throw err
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * 登出
   * POST /api/auth/logout → 清除狀態 → 導向 /login
   */
  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // 即使 API 失敗也強制登出（清除本地狀態）
    } finally {
      state.value.isAuthenticated = false
      state.value.user = null
      state.value.error = null
      navigateTo('/login')
    }
  }

  /**
   * 取得當前用戶資訊
   * GET /api/auth/me → 更新狀態（用於頁面初始化或路由守衛）
   */
  async function fetchUser(): Promise<void> {
    state.value.isLoading = true

    try {
      const user = await $fetch<AuthUser>('/api/auth/me', {
        credentials: 'include',
      })

      state.value.isAuthenticated = true
      state.value.user = user
      state.value.error = null
    } catch {
      state.value.isAuthenticated = false
      state.value.user = null
    } finally {
      state.value.isLoading = false
    }
  }

  return {
    state: readonly(state) as Readonly<Ref<AuthState>>,
    login,
    logout,
    fetchUser,
  }
}
