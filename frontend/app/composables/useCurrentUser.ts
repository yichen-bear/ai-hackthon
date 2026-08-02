/**
 * useCurrentUser - 提供當前登入使用者資訊
 * 
 * 場景對應：
 * - i二手刊登/私訊 → maskedName (脫敏)
 * - 社群聊天 → communityNickname (暱稱)
 * - 會員中心 → name (實名)
 * 
 * 若尚未登入，使用 demo 帳號（沈湘淇）作為預設值
 */

import { maskName } from '~/utils/maskName'

export interface CurrentUser {
  id: string
  name: string            // 真名（會員中心用）
  maskedName: string      // 脫敏名（i二手用）
  nickname: string        // 社群暱稱（興趣社群用）
  email?: string
  phone?: string
}

// Demo 預設帳號
const DEMO_USER: CurrentUser = {
  id: '00000000-0000-0000-0000-000000000001',
  name: '沈湘淇',
  maskedName: '沈O淇',
  nickname: '淇淇愛登山',
}

export function useCurrentUser() {
  const { state, fetchUser } = useAuth()

  const currentUser = computed<CurrentUser>(() => {
    const user = state.value.user
    if (!user || !user.userId) return DEMO_USER

    const name = user.name || '使用者'
    return {
      id: user.userId,
      name,
      maskedName: user.maskedName || maskName(name),
      nickname: user.communityNickname || name,
      email: (user as any).email,
      phone: (user as any).phone,
    }
  })

  // 初始化時嘗試取得使用者資料
  async function init() {
    if (!state.value.isAuthenticated && !state.value.isLoading) {
      try { await fetchUser() } catch { /* 未登入使用 demo */ }
    }
  }

  return {
    currentUser,
    isAuthenticated: computed(() => state.value.isAuthenticated),
    init,
  }
}
