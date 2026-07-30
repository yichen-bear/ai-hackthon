/**
 * useBookingState - 預模組頁面級狀態管理
 * 管理 AI Agent 推薦、門市選擇、常用門市、區塊滾動等跨元件共享狀態
 */

export interface StoreInfo {
  id: string
  name: string
  address: string
  phone?: string
  hours?: string
  lat?: number
  lng?: number
}

export interface RecommendedProduct {
  id: string
  name: string
  price: number
  channel: 'preorder' | 'groupbuy'
}

export interface BookingRecommendation {
  channel: 'preorder' | 'groupbuy'
  message: string
  products: RecommendedProduct[]
  keywords: string[]
}

type BookingSection = 'preorder' | 'groupbuy' | 'order' | 'pickup' | 'wishlist'

// ─── 門市清單（可擴展為 API 取得） ───
const ALL_STORES: StoreInfo[] = [
  { id: 'store-xinyi', name: '7-11 信義門市', address: '台北市信義區信義路五段 7 號', phone: '02-2345-6789', hours: '24小時', lat: 25.0330, lng: 121.5654 },
  { id: 'store-songshan', name: '7-11 松山門市', address: '台北市松山區南京東路五段 120 號', phone: '02-2760-1234', hours: '24小時', lat: 25.0500, lng: 121.5770 },
  { id: 'store-daan', name: '7-11 大安門市', address: '台北市大安區復興南路一段 200 號', phone: '02-2700-5678', hours: '24小時', lat: 25.0260, lng: 121.5440 },
  { id: 'store-gongguan', name: '7-11 公館門市', address: '台北市中正區羅斯福路四段 90 號', phone: '02-2368-9012', hours: '24小時', lat: 25.0145, lng: 121.5340 },
  { id: 'store-zhongxiao', name: '7-11 忠孝門市', address: '台北市大安區忠孝東路四段 100 號', phone: '02-2771-3456', hours: '24小時', lat: 25.0416, lng: 121.5500 },
  { id: 'store-neihu', name: '7-11 內湖門市', address: '台北市內湖區瑞光路 300 號', phone: '02-2659-7890', hours: '06:00-24:00', lat: 25.0780, lng: 121.5690 },
]

const DEFAULT_STORE: StoreInfo = ALL_STORES[0]

export function useBookingState() {
  const agentRecommendation = useState<BookingRecommendation | null>('booking-agent-rec', () => null)
  const currentStore = useState<StoreInfo>('booking-current-store', () => DEFAULT_STORE)

  // ─── 常用門市（持久化於 localStorage，最多 3 筆） ───
  const favoriteStores = useState<StoreInfo[]>('booking-favorite-stores', () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('booking-favorite-stores')
      if (saved) {
        try { return JSON.parse(saved) } catch { /* ignore */ }
      }
    }
    return [DEFAULT_STORE]
  })

  // ─── 選定的取貨門市（預設為常用門市第一間） ───
  const selectedPickupStore = useState<StoreInfo>('booking-pickup-store', () => favoriteStores.value[0] || DEFAULT_STORE)

  function scrollToSection(section: BookingSection, refs?: Record<string, HTMLElement | null>) {
    if (refs && refs[section]) {
      refs[section]!.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function dismissRecommendation() {
    agentRecommendation.value = null
  }

  function setAgentRecommendation(rec: BookingRecommendation) {
    agentRecommendation.value = rec
  }

  function switchStore(store: StoreInfo) {
    currentStore.value = store
  }

  /** 設定取貨門市 */
  function setPickupStore(store: StoreInfo) {
    selectedPickupStore.value = store
    // 自動加入常用門市（如果還沒有的話）
    if (!favoriteStores.value.find(s => s.id === store.id)) {
      addFavoriteStore(store)
    }
  }

  /** 新增常用門市（最多保留 3 間） */
  function addFavoriteStore(store: StoreInfo) {
    const exists = favoriteStores.value.find(s => s.id === store.id)
    if (exists) return
    favoriteStores.value = [store, ...favoriteStores.value].slice(0, 3)
    if (import.meta.client) {
      localStorage.setItem('booking-favorite-stores', JSON.stringify(favoriteStores.value))
    }
  }

  /** 移除常用門市 */
  function removeFavoriteStore(storeId: string) {
    favoriteStores.value = favoriteStores.value.filter(s => s.id !== storeId)
    if (import.meta.client) {
      localStorage.setItem('booking-favorite-stores', JSON.stringify(favoriteStores.value))
    }
  }

  return {
    // 原有
    agentRecommendation,
    currentStore,
    scrollToSection,
    dismissRecommendation,
    setAgentRecommendation,
    switchStore,
    // 新增：門市選擇與常用門市
    allStores: ALL_STORES,
    favoriteStores,
    selectedPickupStore,
    setPickupStore,
    addFavoriteStore,
    removeFavoriteStore,
  }
}
