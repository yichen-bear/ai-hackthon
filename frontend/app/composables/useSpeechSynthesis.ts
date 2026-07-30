/**
 * TTS_Module composable
 * 封裝瀏覽器原生 SpeechSynthesis API，管理「目前播放中的訊息 id」以確保同一時間只播放一則語音。
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

/** 播放狀態：目前正在播放中的訊息 id，null 代表無任何語音正在播放 */
export type PlaybackState = string | null

/** 播放狀態機事件 */
export type PlaybackEvent =
  | { type: 'play'; id: string }
  | { type: 'stop' }
  | { type: 'naturalEnd'; id: string }
  | { type: 'error'; id: string }

/**
 * 純函式：TTS 播放互斥狀態機
 *
 * 規則：
 * - `play(id)`：若目前播放中的訊息就是 `id`（使用者再次點擊同一則），視為停止 → 回傳 null。
 *   否則（目前無播放中訊息，或播放中訊息為其他 id）切換為新的 `id`（原播放訊息視為已停止）。
 * - `stop`：無條件回到 null。
 * - `naturalEnd(id)` / `error(id)`：僅在目前播放中訊息「就是」該 `id` 時才將狀態還原為 null；
 *   若事件對應的 id 已不是目前播放中的訊息（過期事件），狀態維持不變，避免舊事件覆蓋新的播放狀態。
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6
 * Design: Correctness Property 3 - TTS 播放互斥狀態機
 */
export function reducePlaybackState(state: PlaybackState, event: PlaybackEvent): PlaybackState {
  switch (event.type) {
    case 'play':
      return state === event.id ? null : event.id
    case 'stop':
      return null
    case 'naturalEnd':
    case 'error':
      return state === event.id ? null : state
    default:
      return state
  }
}

/**
 * TTS_Module composable
 *
 * @returns `{ isSupported, playingMessageId, speak, stop }`
 * - `isSupported`: 瀏覽器是否支援 `window.speechSynthesis`
 * - `playingMessageId`: 響應式，目前播放中的訊息 id（null 代表無播放中）
 * - `speak(id, text)`: 播放/停止指定訊息的語音（互斥：開始播放前會先停止其他播放）
 * - `stop()`: 停止目前播放中的語音
 */
export function useSpeechSynthesis() {
  const isSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  const playingMessageId = ref<PlaybackState>(null)

  function cancelSynthesis() {
    if (isSupported) {
      window.speechSynthesis.cancel()
    }
  }

  function stop() {
    cancelSynthesis()
    playingMessageId.value = reducePlaybackState(playingMessageId.value, { type: 'stop' })
  }

  function speak(id: string, text: string) {
    if (!isSupported) {
      return
    }

    const nextState = reducePlaybackState(playingMessageId.value, { type: 'play', id })
    playingMessageId.value = nextState

    // 無論如何都先停止目前瀏覽器內任何正在播放的語音（互斥要求）
    cancelSynthesis()

    // toggle 結果為 null，代表使用者是在停止目前正在播放的同一則訊息，不需要再啟動新播放
    if (nextState === null) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.onend = () => {
      playingMessageId.value = reducePlaybackState(playingMessageId.value, {
        type: 'naturalEnd',
        id,
      })
    }

    utterance.onerror = () => {
      playingMessageId.value = reducePlaybackState(playingMessageId.value, {
        type: 'error',
        id,
      })
    }

    window.speechSynthesis.speak(utterance)
  }

  return {
    isSupported,
    playingMessageId,
    speak,
    stop,
  }
}
