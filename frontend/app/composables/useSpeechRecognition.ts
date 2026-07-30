/**
 * STT_Module：語音輸入轉文字 composable
 * 封裝瀏覽器原生 Web Speech API（SpeechRecognition / webkitSpeechRecognition）
 *
 * - 特徵檢測：不支援時 isSupported 為 false，start() 為 no-op
 * - 60 秒逾時：單次語音輸入時間上限，超過自動停止辨識
 * - 5 秒無語音偵測：啟動後 5 秒內未偵測到語音則停止並顯示錯誤
 * - 狀態機純函式 reduceListeningState 獨立導出，供 property test 使用
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

/** STT 狀態機的狀態：只會是 idle（可再次啟動）或 listening（聆聽中） */
export type ListeningState = 'idle' | 'listening'

/** 驅動狀態機轉換的事件 */
export type ListeningEvent =
  | { type: 'START' }
  | { type: 'FINAL_RESULT' }
  | { type: 'TIMEOUT' }
  | { type: 'NO_SPEECH' }
  | { type: 'ERROR' }
  | { type: 'STOP' }

/**
 * 純函式狀態機：由目前狀態與事件計算下一狀態
 *
 * 規則：
 * - idle 收到 START -> listening
 * - listening 收到 FINAL_RESULT | TIMEOUT | NO_SPEECH | ERROR | STOP -> idle
 * - 其他組合維持原狀態不變（例如 idle 收到終止類事件、listening 再收到 START）
 *
 * Property 1: 任一事件序列結束後最終會回到 idle，且任一時刻只會是 idle 或 listening。
 */
export function reduceListeningState(state: ListeningState, event: ListeningEvent): ListeningState {
  if (state === 'idle') {
    return event.type === 'START' ? 'listening' : 'idle'
  }

  // state === 'listening'
  switch (event.type) {
    case 'FINAL_RESULT':
    case 'TIMEOUT':
    case 'NO_SPEECH':
    case 'ERROR':
    case 'STOP':
      return 'idle'
    case 'START':
    default:
      return 'listening'
  }
}

const MAX_LISTENING_DURATION_MS = 60_000
const NO_SPEECH_TIMEOUT_MS = 5_000

/** 取得瀏覽器原生 SpeechRecognition 建構函式（含 webkit 前綴相容） */
function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition
}

/** 最小化的 SpeechRecognition 型別介面（避免依賴 DOM lib 中不一致的宣告） */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
}

/**
 * STT_Module composable
 *
 * @returns `{ isSupported, isListening, start, stop, transcript, error }`
 */
export function useSpeechRecognition() {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor()
  const isSupported = ref<boolean>(!!SpeechRecognitionCtor)

  const state = ref<ListeningState>('idle')
  const isListening = computed(() => state.value === 'listening')
  const transcript = ref<string>('')
  const error = ref<string | null>(null)

  let recognition: SpeechRecognitionLike | null = null
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null
  let noSpeechTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (maxDurationTimer !== null) {
      clearTimeout(maxDurationTimer)
      maxDurationTimer = null
    }
    if (noSpeechTimer !== null) {
      clearTimeout(noSpeechTimer)
      noSpeechTimer = null
    }
  }

  function transition(event: ListeningEvent) {
    state.value = reduceListeningState(state.value, event)
  }

  function stopInternal(event: ListeningEvent) {
    clearTimers()
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        // 忽略停止時的例外（例如已經停止）
      }
    }
    transition(event)
  }

  /** 啟動語音辨識；不支援時為 no-op */
  function start() {
    if (!isSupported.value || !SpeechRecognitionCtor) {
      return
    }
    if (state.value === 'listening') {
      return
    }

    error.value = null
    transcript.value = ''

    try {
      recognition = new SpeechRecognitionCtor()
      recognition.lang = 'zh-TW'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onspeechstart = () => {
        if (noSpeechTimer !== null) {
          clearTimeout(noSpeechTimer)
          noSpeechTimer = null
        }
      }

      recognition.onresult = (event: any) => {
        const result = event?.results?.[event.results.length - 1]
        const text = result?.[0]?.transcript ?? ''
        transcript.value = text
        stopInternal({ type: 'FINAL_RESULT' })
      }

      recognition.onerror = () => {
        error.value = '語音辨識發生錯誤，請重試或改用文字輸入'
        stopInternal({ type: 'ERROR' })
      }

      recognition.onend = () => {
        // 若尚未透過 onresult/onerror 轉為 idle，代表辨識自行結束（例如未偵測到語音）
        if (state.value === 'listening') {
          stopInternal({ type: 'STOP' })
        }
      }

      recognition.start()
      transition({ type: 'START' })

      maxDurationTimer = setTimeout(() => {
        stopInternal({ type: 'TIMEOUT' })
      }, MAX_LISTENING_DURATION_MS)

      noSpeechTimer = setTimeout(() => {
        error.value = '未偵測到語音輸入，請重試或改用文字輸入'
        stopInternal({ type: 'NO_SPEECH' })
      }, NO_SPEECH_TIMEOUT_MS)
    } catch {
      error.value = '無法啟動語音辨識，請改用文字輸入'
      recognition = null
      clearTimers()
      state.value = 'idle'
    }
  }

  /** 手動停止語音辨識 */
  function stop() {
    if (state.value !== 'listening') {
      return
    }
    stopInternal({ type: 'STOP' })
  }

  onBeforeUnmount(() => {
    clearTimers()
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        // 忽略卸載時的例外
      }
    }
  })

  return {
    isSupported,
    isListening,
    start,
    stop,
    transcript,
    error,
  }
}
