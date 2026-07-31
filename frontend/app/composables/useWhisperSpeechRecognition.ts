/**
 * useWhisperSpeechRecognition - 使用 MediaRecorder + Groq Whisper API 進行語音辨識
 *
 * 支援台語（閩南語）、國語（華語）、英語等多語言。
 * 不依賴瀏覽器原生 Web Speech API，改用錄音後上傳到後端進行辨識。
 *
 * 公開介面與原 useSpeechRecognition 相同，方便替換：
 * - isSupported: 瀏覽器是否支援 MediaRecorder
 * - isListening: 是否正在錄音中
 * - start(): 開始錄音
 * - stop(): 停止錄音並送出辨識
 * - transcript: 辨識結果文字
 * - error: 錯誤訊息
 * - isTranscribing: 是否正在辨識中（上傳+等待結果）
 */

const MAX_RECORDING_DURATION_MS = 60_000 // 最長錄音 60 秒

export function useWhisperSpeechRecognition() {
  const isSupported = ref(typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined')

  const isListening = ref(false)
  const isTranscribing = ref(false)
  const transcript = ref('')
  const error = ref<string | null>(null)

  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []
  let recordingTimer: ReturnType<typeof setTimeout> | null = null
  let stream: MediaStream | null = null

  function cleanup() {
    if (recordingTimer) {
      clearTimeout(recordingTimer)
      recordingTimer = null
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    mediaRecorder = null
    audioChunks = []
  }

  /** 開始錄音 */
  async function start() {
    if (!isSupported.value || isListening.value || isTranscribing.value) return

    error.value = null
    transcript.value = ''
    audioChunks = []

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 選擇瀏覽器支援的格式
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      mediaRecorder = new MediaRecorder(stream, { mimeType })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        isListening.value = false

        if (audioChunks.length === 0) {
          error.value = '未錄到任何音訊，請重試'
          cleanup()
          return
        }

        // 組合音檔並上傳辨識
        const audioBlob = new Blob(audioChunks, { type: mimeType })
        cleanup()

        await transcribeAudio(audioBlob, mimeType)
      }

      mediaRecorder.onerror = () => {
        error.value = '錄音發生錯誤，請重試或改用文字輸入'
        isListening.value = false
        cleanup()
      }

      mediaRecorder.start(1000) // 每秒收集一次資料
      isListening.value = true

      // 最長錄音時間限制
      recordingTimer = setTimeout(() => {
        if (isListening.value && mediaRecorder?.state === 'recording') {
          mediaRecorder.stop()
        }
      }, MAX_RECORDING_DURATION_MS)
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        error.value = '麥克風權限被拒絕，請在瀏覽器設定中允許使用麥克風'
      } else if (err.name === 'NotFoundError') {
        error.value = '找不到麥克風裝置'
      } else {
        error.value = '無法啟動錄音，請改用文字輸入'
      }
      isListening.value = false
      cleanup()
    }
  }

  /** 停止錄音（觸發辨識） */
  function stop() {
    if (!isListening.value || !mediaRecorder) return

    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  }

  /** 上傳音檔到後端進行 Whisper 辨識 */
  async function transcribeAudio(audioBlob: Blob, mimeType: string) {
    isTranscribing.value = true

    try {
      const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'wav'
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${ext}`)

      const response = await $fetch<{ success: boolean; text?: string; message?: string }>(
        '/api/speech/transcribe',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (response.success && response.text) {
        transcript.value = response.text
      } else if (response.success && !response.text) {
        error.value = '未偵測到語音內容，請重試'
      } else {
        error.value = response.message || '語音辨識失敗，請重試'
      }
    } catch (err: any) {
      const message = err?.data?.message || err?.message
      if (err?.status === 429) {
        error.value = '語音辨識服務忙碌，請稍後再試'
      } else {
        error.value = message || '語音辨識失敗，請重試或改用文字輸入'
      }
    } finally {
      isTranscribing.value = false
    }
  }

  onBeforeUnmount(() => {
    if (isListening.value && mediaRecorder?.state === 'recording') {
      mediaRecorder.stop()
    }
    cleanup()
  })

  return {
    isSupported,
    isListening,
    isTranscribing,
    start,
    stop,
    transcript,
    error,
  }
}
