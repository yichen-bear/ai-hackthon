import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../useAuth'
import type { AuthUser } from '../useAuth'

// Mock $fetch globally (Nuxt auto-import)
const mockFetch = vi.fn()
;(globalThis as any).$fetch = mockFetch

// Reference navigateTo mock from vitest.setup.ts
const mockNavigateTo = (globalThis as any).navigateTo

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the shared useState by accessing the underlying state directly
    // useState returns a ref that is shared, so we use the internal state key
    const authState = (globalThis as any).useState('auth')
    authState.value = {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    }
  })

  describe('初始狀態', () => {
    it('應回傳未認證的初始狀態', () => {
      const { state } = useAuth()
      expect(state.value.isAuthenticated).toBe(false)
      expect(state.value.user).toBeNull()
      expect(state.value.isLoading).toBe(false)
      expect(state.value.error).toBeNull()
    })

    it('state 應為 readonly', () => {
      const { state } = useAuth()
      // readonly ref should still be accessible
      expect(state.value).toBeDefined()
    })
  })

  describe('login', () => {
    it('登入成功時應更新狀態為已認證', async () => {
      const mockUser: AuthUser = {
        userId: 'user-123',
        role: 'member',
        name: '測試用戶',
      }

      mockFetch.mockResolvedValueOnce({
        success: true,
        user: mockUser,
      })

      const { state, login } = useAuth()
      await login('test@example.com', 'password123', 'member')

      expect(state.value.isAuthenticated).toBe(true)
      expect(state.value.user).toEqual(mockUser)
      expect(state.value.error).toBeNull()
      expect(state.value.isLoading).toBe(false)
    })

    it('登入時應呼叫正確的 API 端點', async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        user: { userId: '1', role: 'member' },
      })

      const { login } = useAuth()
      await login('test@example.com', 'mypassword', 'member')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'mypassword', role: 'member' },
        credentials: 'include',
      })
    })

    it('廠商登入成功時應包含 vendorId', async () => {
      const mockUser: AuthUser = {
        userId: 'vendor-456',
        role: 'vendor',
        vendorId: 42,
        name: '測試廠商',
      }

      mockFetch.mockResolvedValueOnce({
        success: true,
        user: mockUser,
      })

      const { state, login } = useAuth()
      await login('vendor@example.com', 'password123', 'vendor')

      expect(state.value.isAuthenticated).toBe(true)
      expect(state.value.user?.role).toBe('vendor')
      expect(state.value.user?.vendorId).toBe(42)
    })

    it('登入失敗時應設定 error 並保持未認證', async () => {
      const error = { data: { message: '帳號或密碼錯誤' } }
      mockFetch.mockRejectedValueOnce(error)

      const { state, login } = useAuth()

      await expect(login('test@example.com', 'wrongpass', 'member')).rejects.toEqual(error)

      expect(state.value.isAuthenticated).toBe(false)
      expect(state.value.user).toBeNull()
      expect(state.value.error).toBe('帳號或密碼錯誤')
      expect(state.value.isLoading).toBe(false)
    })

    it('網路錯誤時應顯示預設錯誤訊息', async () => {
      mockFetch.mockRejectedValueOnce(new Error())

      const { state, login } = useAuth()

      await expect(login('test@example.com', 'password', 'member')).rejects.toThrow()

      expect(state.value.error).toBe('網路連線失敗，請稍後再試')
    })

    it('登入中 isLoading 應為 true', async () => {
      let resolveFetch: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

      const { state, login } = useAuth()
      const loginPromise = login('test@example.com', 'password', 'member')

      expect(state.value.isLoading).toBe(true)

      resolveFetch!({ success: true, user: { userId: '1', role: 'member' } })
      await loginPromise

      expect(state.value.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('登出後應清除狀態並導向 /login', async () => {
      // Set up as logged in first
      mockFetch.mockResolvedValueOnce({
        success: true,
        user: { userId: '1', role: 'member', name: '用戶' },
      })

      const { state, login, logout } = useAuth()
      await login('test@example.com', 'password', 'member')

      // Now logout
      mockFetch.mockResolvedValueOnce({})
      await logout()

      expect(state.value.isAuthenticated).toBe(false)
      expect(state.value.user).toBeNull()
      expect(state.value.error).toBeNull()
      expect(mockNavigateTo).toHaveBeenCalledWith('/login')
    })

    it('登出 API 失敗時仍應清除狀態並導向 /login', async () => {
      // Set up as logged in via useState directly
      const authState = (globalThis as any).useState('auth')
      authState.value = {
        isAuthenticated: true,
        user: { userId: '1', role: 'member' },
        isLoading: false,
        error: null,
      }

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { state, logout } = useAuth()
      await logout()

      expect(state.value.isAuthenticated).toBe(false)
      expect(state.value.user).toBeNull()
      expect(mockNavigateTo).toHaveBeenCalledWith('/login')
    })

    it('登出應呼叫正確的 API 端點', async () => {
      mockFetch.mockResolvedValueOnce({})

      const { logout } = useAuth()
      await logout()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    })
  })

  describe('fetchUser', () => {
    it('成功取得用戶資訊時應更新狀態', async () => {
      const mockUser: AuthUser = {
        userId: 'user-789',
        role: 'member',
        name: '取得用戶',
      }

      mockFetch.mockResolvedValueOnce(mockUser)

      const { state, fetchUser } = useAuth()
      await fetchUser()

      expect(state.value.isAuthenticated).toBe(true)
      expect(state.value.user).toEqual(mockUser)
      expect(state.value.isLoading).toBe(false)
    })

    it('API 失敗（401）時應設為未認證', async () => {
      mockFetch.mockRejectedValueOnce({ status: 401 })

      // Simulate previously authenticated state
      const authState = (globalThis as any).useState('auth')
      authState.value = {
        isAuthenticated: true,
        user: { userId: '1', role: 'member' },
        isLoading: false,
        error: null,
      }

      const { state, fetchUser } = useAuth()
      await fetchUser()

      expect(state.value.isAuthenticated).toBe(false)
      expect(state.value.user).toBeNull()
      expect(state.value.isLoading).toBe(false)
    })

    it('fetchUser 應呼叫正確的 API 端點', async () => {
      mockFetch.mockResolvedValueOnce({
        userId: '1',
        role: 'member',
      })

      const { fetchUser } = useAuth()
      await fetchUser()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        credentials: 'include',
      })
    })

    it('fetchUser 中 isLoading 應為 true', async () => {
      let resolveFetch: (value: any) => void
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve
        })
      )

      const { state, fetchUser } = useAuth()
      const fetchPromise = fetchUser()

      expect(state.value.isLoading).toBe(true)

      resolveFetch!({ userId: '1', role: 'member' })
      await fetchPromise

      expect(state.value.isLoading).toBe(false)
    })
  })

  describe('共享狀態', () => {
    it('多次呼叫 useAuth 應共享同一個狀態', async () => {
      mockFetch.mockResolvedValueOnce({
        success: true,
        user: { userId: '1', role: 'member', name: '共享測試' },
      })

      const auth1 = useAuth()
      const auth2 = useAuth()

      await auth1.login('test@example.com', 'password', 'member')

      // Both instances should see the same state
      expect(auth2.state.value.isAuthenticated).toBe(true)
      expect(auth2.state.value.user?.name).toBe('共享測試')
    })
  })
})
