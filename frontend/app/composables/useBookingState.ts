/**
 * useBookingState - 預模組頁面級狀態管理
 * 管理 AI Agent 推薦、門市選擇、區塊滾動等跨元件共享狀態
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

const DEFAULT_STORE: StoreInfo = {
  id: 'store-xinyi',
  name: '7-11 信義門市',
  address: '台北市信義區信義路五段 7 號',
  phone: '02-2345-6789',
  hours: '24小時',
  lat: 25.0330,
  lng: 121.5654,
}

export function useBookingState() {
  const agentRecommendation = useState<BookingRecommendation | null>('booking-agent-rec', () => null)
  const currentStore = useState<StoreInfo>('booking-current-store', () => DEFAULT_STORE)

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

  return {
    agentRecommendation,
    currentStore,
    scrollToSection,
    dismissRecommendation,
    setAgentRecommendation,
    switchStore,
  }
}
