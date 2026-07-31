<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_VALIDATION_ERROR_TEXT,
  validateMessageBeforeSend,
} from '~/utils/messageValidation'

definePageMeta({
  layout: 'blank',
  pageTransition: { name: 'chat-fill', mode: 'out-in' },
})

const router = useRouter()

const { session, isLoading, error: sessionError, sendMessage, submitFeedback } = useChatSession()
const {
  isSupported: sttSupported,
  isListening,
  isTranscribing,
  start: startListening,
  stop: stopListening,
  transcript,
  error: sttError,
} = useWhisperSpeechRecognition()
const { isSupported: ttsSupported, playingMessageId, speak, stop: stopSpeaking } = useSpeechSynthesis()

const inputText = ref('')
const inlineError = ref<string | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
/** 追蹤最後一次送出是否為語音輸入，用於判斷是否自動播放 AI 回應 */
const lastInputWasVoice = ref(false)

/** 目前顯示的選項按鈕（選擇題時由後端回傳） */
interface ChoiceOption {
  id: number
  name: string
}
const currentOptions = ref<ChoiceOption[]>([])
/** 目前題目類型：'03' 單選 / '04' 多選 */
const currentTopicType = ref<string | null>(null)
/** 目前題目是否為必填 */
const currentTopicRequired = ref(true)
/** 多選模式下已勾選的選項 id */
const multiSelectIds = ref<Set<number>>(new Set())

/** 已儲存的常用地址（地址題目時由後端回傳） */
interface SavedAddress {
  id: number
  label: string
  fullAddress: string
}
const savedAddresses = ref<SavedAddress[]>([])

/** 範例問題：幫助使用者快速開始對話 */
const examplePrompts = [
  '我想要清洗冷氣',
  '洗衣機需要清洗估價',
  '我家冰箱想清洗，怎麼填單？',
  '有哪些服務可以申請？',
]

const messages = computed(() => session.value.messages)

/** 是否顯示「回到底部」按鈕 */
const showScrollButton = ref(false)

/** 監聽滾動位置 */
function handleScroll() {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  // 如果距離底部超過 100px，顯示按鈕
  showScrollButton.value = scrollHeight - scrollTop - clientHeight > 100
}

/** 監聽訊息變化，自動捲到底部 */
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

/** 當 awaitingSubmitConfirmation 為 true 時，自動觸發表單送出 */
watch(() => session.value.awaitingSubmitConfirmation, async (awaiting) => {
  if (awaiting) {
    try {
      await submitFeedback()
      // 送出成功後，加一則成功訊息
      session.value = {
        ...session.value,
        awaitingSubmitConfirmation: false,
        stage: 'submitted',
      }
    } catch {
      // 錯誤由 sessionError 處理
      session.value = { ...session.value, awaitingSubmitConfirmation: false }
    }
  }
})

/** 語音辨識完成後，驗證文字後自動送出（不需手動按傳送） */
watch(transcript, (text) => {
  if (!text) {
    return
  }
  handleVoiceResult(text)
})

async function handleVoiceResult(text: string) {
  const truncated = text.length > MESSAGE_MAX_LENGTH ? text.slice(0, MESSAGE_MAX_LENGTH) : text
  const result = validateMessageBeforeSend(truncated)

  if (!result.allowed && result.reason) {
    inlineError.value = MESSAGE_VALIDATION_ERROR_TEXT[result.reason]
    inputText.value = truncated
    return
  }

  inlineError.value = null
  inputText.value = truncated

  // 語音辨識完成後自動送出
  await doSend(truncated, 'voice')
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

/**
 * 核心送出邏輯，同時處理手動傳送與語音自動傳送
 */
async function doSend(text: string, mode: 'text' | 'voice') {
  if (!text.trim() || isLoading.value) {
    return
  }

  const result = validateMessageBeforeSend(text.trim())
  if (!result.allowed && result.reason) {
    inlineError.value = MESSAGE_VALIDATION_ERROR_TEXT[result.reason]
    return
  }

  inlineError.value = null
  lastInputWasVoice.value = mode === 'voice'
  // 送出時立即清除輸入框與選項按鈕
  inputText.value = ''
  currentOptions.value = []
  currentTopicType.value = null
  currentTopicRequired.value = true
  multiSelectIds.value = new Set()
  savedAddresses.value = []

  try {
    const response = await sendMessage(text.trim(), mode)
    await scrollToBottom()

    // 從 replyMeta 取出選項資訊
    if (response?.replyMeta?.options && Array.isArray(response.replyMeta.options)) {
      currentOptions.value = response.replyMeta.options as ChoiceOption[]
      currentTopicType.value = (response.replyMeta.topicType as string) || null
      currentTopicRequired.value = response.replyMeta.topicRequired !== false
      multiSelectIds.value = new Set()
      await scrollToBottom()
    }

    // 從 replyMeta 取出已儲存地址
    if (response?.replyMeta?.savedAddresses && Array.isArray(response.replyMeta.savedAddresses)) {
      savedAddresses.value = response.replyMeta.savedAddresses as SavedAddress[]
      await scrollToBottom()
    }

    // 語音輸入時自動播放 AI 回應語音
    if (mode === 'voice' && ttsSupported && response) {
      const assistantMessages = session.value.messages.filter(m => m.role === 'assistant')
      const lastAssistantMsg = assistantMessages[assistantMessages.length - 1]
      if (lastAssistantMsg) {
        speak(lastAssistantMsg.id, lastAssistantMsg.text)
      }
    }
  } catch {
    // sessionError 已由 useChatSession 設定，於畫面顯示即可
  }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isLoading.value) {
    return
  }

  await doSend(text, 'text')
}

/** 單選：點擊選項按鈕直接送出該選項名稱 */
async function handleOptionClick(option: ChoiceOption) {
  if (isLoading.value) return

  if (currentTopicType.value === '04') {
    // 多選：toggle 勾選狀態
    const newSet = new Set(multiSelectIds.value)
    if (newSet.has(option.id)) {
      newSet.delete(option.id)
    } else {
      newSet.add(option.id)
    }
    multiSelectIds.value = newSet
  } else {
    // 單選：直接送出
    await doSend(option.name, 'text')
  }
}

/** 跳過非必填題目 */
async function handleSkipTopic() {
  if (isLoading.value) return
  await doSend('跳過', 'text')
}

/** 多選：確認送出已勾選的選項 */
async function handleMultiSelectConfirm() {
  if (isLoading.value || multiSelectIds.value.size === 0) return

  const selectedNames = currentOptions.value
    .filter(opt => multiSelectIds.value.has(opt.id))
    .map(opt => opt.name)

  await doSend(selectedNames.join('、'), 'text')
}

function handleMicClick() {
  if (!sttSupported.value) {
    return
  }
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

function handlePlayback(messageId: string, text: string) {
  if (!ttsSupported) {
    return
  }
  speak(messageId, text)
}

async function handleSubmit() {
  try {
    await submitFeedback()
  } catch {
    // sessionError 已由 useChatSession 設定，於畫面顯示即可
  }
}

function goBack() {
  stopSpeaking()
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}
</script>

<template>
  <div class="chat-page">
    <!-- Header -->
    <header class="chat-page__header">
      <button
        class="chat-page__back"
        type="button"
        aria-label="返回"
        @click="goBack"
      >
        ← 返回
      </button>
      <h1 class="chat-page__title">小統 AI 助理</h1>
      <span class="chat-page__header-spacer" aria-hidden="true" />
    </header>

    <!-- 聊天訊息區域 -->
    <div ref="messagesContainer" class="chat-page__messages" @scroll="handleScroll">
      <div v-if="messages.length === 0" class="chat-page__welcome">
        <p class="chat-page__placeholder">
          嗨！我是小統，您的 AI 助手。有什麼需要幫忙的嗎？可以直接描述您想辦理的服務，或用語音輸入。
        </p>
        <p class="chat-page__suggestion-label">試試以下問題：</p>
        <div class="chat-page__suggestions">
          <button
            v-for="suggestion in examplePrompts"
            :key="suggestion"
            class="chat-page__suggestion-btn"
            type="button"
            @click="doSend(suggestion, 'text')"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="chat-message"
        :class="`chat-message--${message.role}`"
      >
        <div class="chat-message__bubble">
          <p class="chat-message__text">{{ message.text }}</p>
        </div>
        <ClientOnly>
          <button
            v-if="message.role === 'assistant' && ttsSupported"
            class="chat-message__play"
            type="button"
            :aria-label="playingMessageId === message.id ? '停止播放語音' : '播放語音'"
            @click="handlePlayback(message.id, message.text)"
          >
            {{ playingMessageId === message.id ? '⏹' : '▶' }}
          </button>
        </ClientOnly>
      </div>

      <p v-if="isLoading" class="chat-page__loading">助理思考中...</p>
      <p v-else-if="isTranscribing" class="chat-page__loading">語音辨識中...</p>

      <!-- 選擇題選項按鈕 -->
      <div v-if="currentOptions.length > 0 && !isLoading" class="chat-page__options">
        <button
          v-for="option in currentOptions"
          :key="option.id"
          class="chat-page__option-btn"
          :class="{ 'chat-page__option-btn--selected': currentTopicType === '04' && multiSelectIds.has(option.id) }"
          type="button"
          @click="handleOptionClick(option)"
        >
          <span v-if="currentTopicType === '04'" class="chat-page__option-check">
            {{ multiSelectIds.has(option.id) ? '☑' : '☐' }}
          </span>
          {{ option.name }}
        </button>
        <!-- 非必填題目顯示「都不用」跳過按鈕 -->
        <button
          v-if="!currentTopicRequired"
          class="chat-page__option-btn chat-page__option-btn--skip"
          type="button"
          @click="handleSkipTopic"
        >
          都不用
        </button>
        <button
          v-if="currentTopicType === '04' && multiSelectIds.size > 0"
          class="chat-page__option-confirm"
          type="button"
          :disabled="isLoading"
          @click="handleMultiSelectConfirm"
        >
          確認選擇 ({{ multiSelectIds.size }})
        </button>
      </div>

      <!-- 已儲存的常用地址快速填入按鈕 -->
      <div v-if="savedAddresses.length > 0 && !isLoading" class="chat-page__addresses">
        <p class="chat-page__addresses-label">快速填入常用地址：</p>
        <button
          v-for="addr in savedAddresses"
          :key="addr.id"
          class="chat-page__address-btn"
          type="button"
          @click="doSend(addr.fullAddress, 'text')"
        >
          <span class="chat-page__address-label">{{ addr.label }}</span>
          <span class="chat-page__address-detail">{{ addr.fullAddress }}</span>
        </button>
      </div>
    </div>

    <!-- 回到底部按鈕 -->
    <button
      v-if="showScrollButton"
      class="chat-page__scroll-btn"
      type="button"
      aria-label="捲動到最新訊息"
      @click="scrollToBottom"
    >
      ↓
    </button>

    <!-- 送出確認（stage 為 confirming 時顯示） -->
    <div v-if="session.stage === 'confirming'" class="chat-page__confirm-bar">
      <button
        class="chat-page__confirm-btn"
        type="button"
        :disabled="isLoading"
        @click="handleSubmit"
      >
        確認送出
      </button>
    </div>

    <!-- 錯誤訊息 -->
    <p v-if="inlineError" class="chat-page__error" role="alert">{{ inlineError }}</p>
    <p v-else-if="sttError" class="chat-page__error" role="alert">{{ sttError }}</p>
    <p v-else-if="sessionError" class="chat-page__error" role="alert">{{ sessionError }}</p>

    <!-- 輸入區域 -->
    <div class="chat-page__input-area">
      <ClientOnly>
        <button
          v-if="sttSupported"
          class="chat-page__mic"
          type="button"
          :class="{ 'chat-page__mic--active': isListening, 'chat-page__mic--transcribing': isTranscribing }"
          :aria-label="isTranscribing ? '辨識中' : isListening ? '停止語音輸入' : '開始語音輸入'"
          :disabled="isTranscribing"
          @click="handleMicClick"
        >
          {{ isTranscribing ? '⏳' : isListening ? '⏹' : '🎤' }}
        </button>
      </ClientOnly>
      <input
        v-model="inputText"
        class="chat-page__input"
        type="text"
        placeholder="輸入訊息..."
        :maxlength="MESSAGE_MAX_LENGTH"
        @keyup.enter="handleSend"
      />
      <button
        class="chat-page__send"
        type="button"
        aria-label="傳送訊息"
        :disabled="!inputText.trim() || isLoading"
        @click="handleSend"
      >
        ➤
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--color-bg-page, #fafaf9);
  position: relative;
}

/* ── Header ── */
.chat-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e7e5e4);
  background-color: var(--color-bg-card, #ffffff);
  flex-shrink: 0;
}

.chat-page__back {
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  padding: 6px 8px;
}

.chat-page__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.chat-page__header-spacer {
  width: 48px;
}

/* ── 聊天訊息區域 ── */
.chat-page__messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-page__placeholder {
  font-size: 14px;
  color: var(--color-text-primary, #1c1917);
  text-align: left;
  margin: 0;
}

/* ── 歡迎畫面與範例問題 ── */
.chat-page__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
  padding: 20px;
}

.chat-page__suggestion-label {
  font-size: 13px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}

.chat-page__suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 320px;
}

.chat-page__suggestion-btn {
  padding: 12px 16px;
  border: 1px solid var(--color-border, #e7e5e4);
  border-radius: 12px;
  background-color: var(--color-bg-card, #ffffff);
  color: var(--color-text-primary, #1c1917);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.chat-page__suggestion-btn:hover {
  border-color: var(--color-primary, #3b82f6);
  background-color: #f0f9ff;
}

.chat-page__loading {
  font-size: 13px;
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  margin: 0;
}

.chat-message {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  max-width: 85%;
}

.chat-message--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-message--assistant {
  align-self: flex-start;
}

.chat-message__bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
}

.chat-message--user .chat-message__bubble {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.chat-message--assistant .chat-message__bubble {
  background-color: var(--color-bg-card, #ffffff);
  color: var(--color-text-primary, #1c1917);
  border: 1px solid var(--color-border, #e7e5e4);
  border-bottom-left-radius: 4px;
}

.chat-message__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message__play {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: #f5f5f4;
  border-radius: 50%;
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-message__play:hover {
  background-color: #e7e5e4;
}

/* ── 回到底部按鈕 ── */
.chat-page__scroll-btn {
  position: absolute;
  bottom: 140px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-bg-card, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 18px;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background-color 0.15s;
}

.chat-page__scroll-btn:hover {
  background-color: #f5f5f4;
}

/* ── 送出確認列 ── */
.chat-page__confirm-bar {
  padding: 8px 20px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.chat-page__confirm-btn {
  padding: 0.6em 2em;
  border: none;
  border-radius: 50em;
  background-color: var(--color-secondary, #22c55e);
  color: #ffffff;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
}

.chat-page__confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 錯誤訊息 ── */
.chat-page__error {
  margin: 0;
  padding: 4px 20px;
  font-size: 13px;
  color: var(--color-accent-red, #e11d48);
  flex-shrink: 0;
}

/* ── 輸入區域 ── */
.chat-page__input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border, #e7e5e4);
  background-color: var(--color-bg-card, #ffffff);
  flex-shrink: 0;
}

.chat-page__mic {
  width: 40px;
  height: 40px;
  border: none;
  background-color: #f5f5f4;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.15s;
}

.chat-page__mic--active {
  background-color: var(--color-accent-red-light, #ffe4e6);
  color: var(--color-accent-red, #e11d48);
}

.chat-page__mic--transcribing {
  background-color: #fef3c7;
  color: #d97706;
  cursor: wait;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.chat-page__input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--color-border, #d6d3d1);
  border-radius: 20px;
  font-size: 14px;
  background-color: #fafaf9;
  color: var(--color-text-primary, #1c1917);
  outline: none;
}

.chat-page__input:focus {
  border-color: var(--color-primary, #3b82f6);
}

.chat-page__send {
  width: 40px;
  height: 40px;
  border: none;
  background-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.15s;
}

.chat-page__send:hover:not(:disabled) {
  background-color: #2563eb;
}

.chat-page__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 選擇題選項按鈕 ── */
.chat-page__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
  align-self: flex-start;
}

.chat-page__option-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: 1px solid var(--color-primary, #3b82f6);
  border-radius: 20px;
  background-color: #ffffff;
  color: var(--color-primary, #3b82f6);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.chat-page__option-btn:hover {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
}

.chat-page__option-btn--selected {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
}

.chat-page__option-btn--skip {
  border-color: var(--color-text-secondary, #78716c);
  color: var(--color-text-secondary, #78716c);
}

.chat-page__option-btn--skip:hover {
  background-color: var(--color-text-secondary, #78716c);
  color: #ffffff;
}

.chat-page__option-check {
  font-size: 14px;
}

.chat-page__option-confirm {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background-color: var(--color-secondary, #22c55e);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-page__option-confirm:hover:not(:disabled) {
  background-color: #16a34a;
}

.chat-page__option-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 常用地址快速填入 ── */
.chat-page__addresses {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
  align-self: flex-start;
}

.chat-page__addresses-label {
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}

.chat-page__address-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid var(--color-border, #e7e5e4);
  border-radius: 10px;
  background-color: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background-color 0.15s;
}

.chat-page__address-btn:hover {
  border-color: var(--color-primary, #3b82f6);
  background-color: #f0f9ff;
}

.chat-page__address-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary, #3b82f6);
}

.chat-page__address-detail {
  font-size: 13px;
  color: var(--color-text-primary, #1c1917);
}
</style>
