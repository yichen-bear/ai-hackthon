/**
 * 樂模組頁面級狀態管理
 * 供各元件間共享 AI 推薦、票券、點數、興趣等狀態
 */

import type { EntertainmentTicket, EntertainmentRecommendation } from '~/types/entertainment'

type EntertainmentNavKey = 'ticket' | 'recommend' | 'points' | 'community' | 'board'

export function useEntertainmentState() {
  // AI Agent 推薦結果
  const aiRecommendation = useState<EntertainmentRecommendation | null>(
    'entertainment-ai-recommendation',
    () => null
  )

  // 已購票券列表
  const purchasedTickets = useState<EntertainmentTicket[]>(
    'entertainment-tickets',
    () => []
  )

  // 用戶 OPEN POINT 點數
  const userPoints = useState<number>(
    'entertainment-user-points',
    () => 2450
  )

  // 用戶興趣標籤
  const userInterests = useState<string[]>(
    'entertainment-user-interests',
    () => ['攝影', '登山', '桌遊']
  )

  // 最近購票觸發的跨模組導流票券
  const crossModuleTicket = useState<EntertainmentTicket | null>(
    'entertainment-cross-module-ticket',
    () => null
  )

  // Section refs 供捲動用（由頁面層管理）
  const sectionRefs: Record<EntertainmentNavKey, HTMLElement | null> = {
    ticket: null,
    recommend: null,
    points: null,
    community: null,
    board: null,
  }

  /**
   * 捲動至指定功能區塊
   */
  function scrollToSection(section: EntertainmentNavKey) {
    const target = sectionRefs[section]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  /**
   * 設定 section ref（供頁面層呼叫）
   */
  function setSectionRef(key: EntertainmentNavKey, el: HTMLElement | null) {
    sectionRefs[key] = el
  }

  /**
   * 關閉 AI 推薦提示
   */
  function dismissRecommendation() {
    aiRecommendation.value = null
  }

  /**
   * 購票後觸發跨模組導流
   */
  function triggerCrossModule(ticket: EntertainmentTicket) {
    crossModuleTicket.value = ticket
  }

  return {
    aiRecommendation,
    purchasedTickets,
    userPoints,
    userInterests,
    crossModuleTicket,
    sectionRefs,
    scrollToSection,
    setSectionRef,
    dismissRecommendation,
    triggerCrossModule,
  }
}
