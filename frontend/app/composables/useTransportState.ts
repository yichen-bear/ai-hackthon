/**
 * 行模組頁面級狀態管理
 * 供各元件間共享目的地、起點、推播忽略等狀態
 */

export function useTransportState() {
  // 共享的起迄點（由 ContextPush / FavoriteRoutes 帶入）
  const sharedOrigin = useState<string>('transport-origin', () => '')
  const sharedDestination = useState<string>('transport-destination', () => '')

  // 已忽略的推播 ID（session 級別，頁面刷新後重置）
  const dismissedSuggestions = useState<Set<string>>(
    'transport-dismissed',
    () => new Set()
  )

  /**
   * 將目的地帶入 RoutePlanner
   */
  function setRouteDestination(destination: string, origin?: string) {
    sharedDestination.value = destination
    if (origin) {
      sharedOrigin.value = origin
    }
  }

  /**
   * 將目的地帶入 RideService
   */
  function setRideDestination(destination: string) {
    sharedDestination.value = destination
  }

  /**
   * 忽略某筆推播（本次 session 不再顯示）
   */
  function dismissSuggestion(suggestionId: string) {
    dismissedSuggestions.value.add(suggestionId)
  }

  /**
   * 捲動至指定功能區塊
   * 需配合頁面中的 ref 標記使用
   */
  function scrollToSection(
    section: 'route' | 'ride' | 'ticket' | 'sharing' | 'parking',
    refs: Record<string, HTMLElement | null>
  ) {
    const targetRef = refs[section]
    if (targetRef) {
      targetRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return {
    sharedOrigin,
    sharedDestination,
    dismissedSuggestions,
    setRouteDestination,
    setRideDestination,
    dismissSuggestion,
    scrollToSection,
  }
}
