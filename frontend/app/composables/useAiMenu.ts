/**
 * AI 菜單生成 composable
 * 呼叫後端 POST /api/food/menu，根據餐廳資訊取得 AI 生成的菜單
 */

export interface MenuItem {
  name: string
  price: number
  calories: number
  qty: number
}

interface MenuResponse {
  success: boolean
  items: { name: string; price: number; calories: number }[]
  fromCache: boolean
  error?: string
}

export function useAiMenu() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const menuItems = ref<MenuItem[]>([])
  const fromCache = ref(false)

  /**
   * 根據餐廳資訊取得 AI 生成的菜單
   */
  async function fetchMenu(params: {
    restaurantId: string
    name: string
    tag: string
    priceAvg: number
    priceMin?: number
    priceMax?: number
  }) {
    loading.value = true
    error.value = null
    menuItems.value = []

    try {
      const data = await $fetch<MenuResponse>('http://localhost:3001/api/food/menu', {
        method: 'POST',
        body: {
          restaurantId: params.restaurantId,
          name: params.name,
          tag: params.tag,
          priceAvg: params.priceAvg,
          priceMin: params.priceMin,
          priceMax: params.priceMax,
        },
      })

      if (!data.success) {
        error.value = data.error || '菜單載入失敗'
        return
      }

      // 加上 qty = 0 供前端點餐用
      menuItems.value = data.items.map((item) => ({
        ...item,
        qty: 0,
      }))
      fromCache.value = data.fromCache
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err) {
        const fetchErr = err as { data?: { error?: string } }
        error.value = fetchErr.data?.error || '伺服器錯誤，請稍後再試'
      } else {
        error.value = '網路連線失敗，請確認後端服務是否啟動'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置狀態
   */
  function reset() {
    loading.value = false
    error.value = null
    menuItems.value = []
    fromCache.value = false
  }

  return {
    loading,
    error,
    menuItems,
    fromCache,
    fetchMenu,
    reset,
  }
}
