<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_VALIDATION_ERROR_TEXT,
  validateMessageBeforeSend,
} from '~/utils/messageValidation'

definePageMeta({
  layout: 'blank',
})

const router = useRouter()

const { session, isLoading, error: sessionError, sendMessage, submitFeedback, resetSession } = useChatSession()
const {
  isSupported: sttSupported,
  isListening,
  isTranscribing,
  start: startListening,
  stop: stopListening,
  transcript,
  error: sttError,
  language: sttLanguage,
} = useWhisperSpeechRecognition()
const { isSupported: ttsSupported, playingMessageId, speak, stop: stopSpeaking } = useSpeechSynthesis()

const inputText = ref('')
const inlineError = ref<string | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const inputTextarea = ref<HTMLTextAreaElement | null>(null)
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
/** 已上傳的圖片 URL（用於在聊天中顯示圖片預覽） */
const uploadedImages = ref<Map<string, string[]>>(new Map())

/** 追蹤最近一次上傳的圖片 URL（用於摘要中顯示） */
const lastUploadedUrls = ref<string[]>([])

/** 使用者是否選擇了自行填寫（此時不顯示跳過按鈕） */
const isManualInput = ref(false)

/** 定位中 */
const isLocating = ref(false)

/** 是否顯示「是否繼續」快捷按鈕（用於確認/繼續選購情境） */
const showConfirmButtons = ref(false)

/** 已儲存的常用地址（地址題目時由後端回傳） */
interface SavedAddress {
  id: number
  label: string
  fullAddress: string
}
const savedAddresses = ref<SavedAddress[]>([])

/** 目前題目是否為地址題或圖片上傳題或備註題 */
const isAddressTopic = ref(false)
const isImageTopic = ref(false)
const isRemarkTopic = ref(false)

/** 聯絡欄位自動帶入：當題目為姓名/電話/信箱時，從登入者資料預填 */
interface AutoFillInfo {
  label: string
  value: string
}
const autoFillSuggestion = ref<AutoFillInfo | null>(null)

/** 取得登入者資料用於自動帶入 */
async function getAutoFillForTopic(topicTitle: string): Promise<AutoFillInfo | null> {
  if (!topicTitle) return null

  const isNameTopic = topicTitle.includes('姓名') || topicTitle.includes('聯絡人')
  const isPhoneTopic = topicTitle.includes('手機') || topicTitle.includes('電話') || topicTitle.includes('聯絡電話')
  const isEmailTopic = topicTitle.includes('信箱') || topicTitle.includes('email') || topicTitle.includes('Email')

  if (!isNameTopic && !isPhoneTopic && !isEmailTopic) return null

  try {
    const res = await $fetch<{ name?: string; email?: string; phone?: string }>('/api/auth/me', {
      credentials: 'include',
    })

    if (isNameTopic && res.name) return { label: '姓名', value: res.name }
    if (isPhoneTopic && res.phone) return { label: '電話', value: res.phone }
    if (isEmailTopic && res.email) return { label: 'Email', value: res.email }
  } catch {
    // 未登入或取得失敗，不自動帶入
  }
  return null
}

/** 範例問題：幫助使用者快速開始對話 */
const examplePrompts = [
  '我想要清洗冷氣',
  '我需要居家清潔服務',
  '我想要預購商品，怎麼填單？',
  '有哪些服務可以申請？',
]

const messages = computed(() => session.value.messages)

/** 去除 HTML 標籤，保留純文字 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

/** 偵測訊息是否含有確認/繼續選購相關的詢問 */
function isConfirmationQuestion(text: string): boolean {
  const patterns = [
    '是否確認',
    '是否繼續',
    '要繼續',
    '還要',
    '繼續選購',
    '繼續購物',
    '還需要',
    '是否還要',
    '是否要繼續',
    '確認嗎',
    '對嗎',
    '或結帳',
    '還是結帳',
  ]
  return patterns.some(p => text.includes(p))
}

/** 偵測最新助手訊息是否含有建議值（如飲水量計算結果） */
const suggestedValue = ref<string | null>(null)

function detectSuggestedValue(text: string): string | null {
  // 匹配 "建議每日飲水量為 XXXml" 模式
  const waterMatch = text.match(/建議每日飲水量為\s*(\d+)\s*ml/)
  if (waterMatch) return waterMatch[1]
  // 匹配 "建議看診科別為「XXX」" 模式
  const deptMatch = text.match(/建議看診科別為「([^」]+)」/)
  if (deptMatch) return deptMatch[1]
  return null
}

/** 渲染摘要中的值：若為圖片上傳則顯示圖片 */
function renderSummaryValue(value: string): string {
  if (!value) return '—'
  if (value.includes('已上傳') && value.includes('張圖片') && lastUploadedUrls.value.length > 0) {
    const imgs = lastUploadedUrls.value.map(url => `<img src="${url}" class="chat-summary-img" alt="上傳的圖片" />`).join('')
    return `<div class="chat-summary-images">${imgs}</div>`
  }
  return value
}

/** 格式化摘要文字為 HTML（用於更好的視覺呈現） */
function formatSummaryHtml(text: string): string {
  const stripped = stripHtml(text)
  const lines = stripped.split('\n').filter(l => l.trim())
  let html = ''
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('・') || trimmed.startsWith('▸')) {
      if (!inList) {
        html += '<ul class="chat-summary-list">'
        inList = true
      }
      const content = trimmed.replace(/^[・▸]\s*/, '')
      const [label, ...valueParts] = content.split('：')
      const value = valueParts.join('：')
      html += `<li><span class="chat-summary-label">${label}</span><span class="chat-summary-value">${renderSummaryValue(value)}</span></li>`
    } else {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      if (trimmed.includes('以下是您') || trimmed.includes('填寫的內容')) {
        html += `<p class="chat-summary-title">📋 您填寫的內容</p>`
      } else if (trimmed.includes('如果都沒問題') || trimmed.includes('確認送出')) {
        // 隱藏提示文字（由 UI 按鈕取代）
      } else if (trimmed) {
        html += `<p>${trimmed}</p>`
      }
    }
  }
  if (inList) html += '</ul>'
  return html
}

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
      const response = await submitFeedback()
      if (response?.success) {
        session.value = {
          ...session.value,
          awaitingSubmitConfirmation: false,
          stage: 'submitted',
          messages: [
            ...session.value.messages,
            {
              id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              role: 'assistant' as const,
              text: '已成功送出表單！感謝您的填寫，我們會盡快為您處理。',
              createdAt: new Date().toISOString(),
            },
          ],
        }
      } else {
        session.value = { ...session.value, awaitingSubmitConfirmation: false }
      }
    } catch {
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
  // 語音辨識結果填入輸入框，讓使用者確認後再送出
  inputText.value = truncated
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
  isAddressTopic.value = false
  isImageTopic.value = false
  isRemarkTopic.value = false
  showConfirmButtons.value = false
  autoFillSuggestion.value = null
  isManualInput.value = false
  suggestedValue.value = null

  try {
    const response = await sendMessage(text.trim(), mode)
    await scrollToBottom()

    // 從 replyMeta 取出選項資訊
    if (response?.replyMeta?.options && Array.isArray(response.replyMeta.options)) {
      currentOptions.value = response.replyMeta.options as ChoiceOption[]
      currentTopicType.value = (response.replyMeta.topicType as string) || null
      multiSelectIds.value = new Set()
      await scrollToBottom()
    }

    // 不管有沒有選項，都更新必填狀態（用於顯示跳過按鈕）
    if (response?.replyMeta) {
      currentTopicRequired.value = response.replyMeta.topicRequired !== false
    }

    // 判斷是否為地址題或圖片上傳題或備註題
    const title = (response?.replyMeta?.topicTitle as string) || ''
    isAddressTopic.value = title.includes('地址')
    isImageTopic.value = title.includes('照片') || title.includes('圖片') || title.includes('上傳')
    isRemarkTopic.value = title.includes('備註')

    // 地址題：主動取得已儲存地址
    if (isAddressTopic.value) {
      try {
        const addrRes = await $fetch<{ success: boolean; data: any[] }>('/api/member/addresses', {
          credentials: 'include',
        })
        if (addrRes?.success && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
          savedAddresses.value = addrRes.data.map((addr: any) => ({
            id: addr.id,
            label: addr.label || (addr.type === 'mailing' ? '通訊地址' : '近期地址'),
            fullAddress: `${addr.countyName || ''}${addr.districtName || ''}${addr.addressDetail || ''}`,
          }))
        }
      } catch {
        // 未登入或取得失敗，不影響主流程
      }
      await scrollToBottom()
    }

    // 判斷聯絡欄位是否可自動帶入（只在 AI 當前正在問這題時才顯示）
    autoFillSuggestion.value = null
    suggestedValue.value = null
    const latestAiMsg = session.value.messages.filter(m => m.role === 'assistant').pop()
    const aiIsAsking = latestAiMsg && !latestAiMsg.text.includes('已經成功') && !latestAiMsg.text.includes('已記錄') && !latestAiMsg.text.includes('好的，您')
    if (title && aiIsAsking) {
      const suggestion = await getAutoFillForTopic(title)
      if (suggestion) {
        autoFillSuggestion.value = suggestion
        await scrollToBottom()
      }
    }

    // 偵測 AI 回覆是否含有建議值
    if (latestAiMsg && aiIsAsking) {
      const detected = detectSuggestedValue(latestAiMsg.text)
      if (detected) {
        suggestedValue.value = detected
        await scrollToBottom()
      }
    }

    // 偵測最後一則助手訊息是否為確認類問題（如繼續選購），顯示快捷按鈕
    const latestAssistantMsg = session.value.messages.filter(m => m.role === 'assistant').pop()
    if (latestAssistantMsg && isConfirmationQuestion(latestAssistantMsg.text)) {
      showConfirmButtons.value = true
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
  // 重設 textarea 高度
  if (inputTextarea.value) {
    inputTextarea.value.style.height = 'auto'
  }
}

/** Enter 送出，Shift+Enter 換行 */
function handleEnterKey(e: KeyboardEvent) {
  if (e.shiftKey) return // 允許 Shift+Enter 換行
  e.preventDefault()
  handleSend()
}

/** 自動調整 textarea 高度 */
function autoResizeTextarea() {
  const el = inputTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

/** 失焦時收合 textarea（若文字只有一行則恢復最小高度） */
function collapseTextarea() {
  const el = inputTextarea.value
  if (!el) return
  // 保持自適應，不強制收合（讓使用者能看到已輸入的內容）
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
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
    const response = await submitFeedback()
    if (response?.success) {
      // 送出成功：更新 stage 並顯示成功訊息
      session.value = {
        ...session.value,
        stage: 'submitted',
        awaitingSubmitConfirmation: false,
        messages: [
          ...session.value.messages,
          {
            id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            role: 'assistant' as const,
            text: '已成功送出表單！感謝您的填寫，我們會盡快為您處理。',
            createdAt: new Date().toISOString(),
          },
        ],
      }
    }
  } catch {
    // sessionError 已由 useChatSession 設定，於畫面顯示即可
  }
}

/** 新對話確認彈窗 */
const showNewChatModal = ref(false)

/** 定位目前位置 */
async function handleGetLocation() {
  if (!navigator.geolocation) {
    inlineError.value = '您的瀏覽器不支援定位功能'
    return
  }

  inlineError.value = null
  isLocating.value = true

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    })

    const { latitude, longitude } = position.coords

    // 使用 Nominatim 免費逆地理編碼
    const res = await $fetch<any>(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-TW`
    )

    const address = res?.display_name || `${latitude}, ${longitude}`
    // 反轉地址順序：Nominatim 回傳為小到大（號→路→區→市→國），改為大到小（國→市→區→路→號）
    const reversedAddress = address.split(',').map((s: string) => s.trim()).reverse().join('')
    // 填入輸入框，讓使用者確認後再送出
    inputText.value = reversedAddress
    await nextTick()
    autoResizeTextarea()
  } catch (err: any) {
    if (err.code === 1) {
      inlineError.value = '定位權限被拒絕，請在瀏覽器設定中允許'
    } else {
      inlineError.value = '無法取得定位，請手動輸入地址'
    }
  } finally {
    isLocating.value = false
  }
}

/** 開啟相機拍照 */
function handleOpenCamera() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = () => handleImageSelected(input.files)
  input.click()
}

/** 從圖庫選擇 */
function handleOpenGallery() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = () => handleImageSelected(input.files)
  input.click()
}

/** 處理選取的圖片 — 上傳到後端，取得 URL 後在對話中顯示圖片 */
async function handleImageSelected(files: FileList | null) {
  if (!files || files.length === 0) return

  const uploadedUrls: string[] = []

  for (const file of Array.from(files)) {
    try {
      const base64 = await fileToBase64(file)
      const res = await $fetch<{ url: string; filename: string }>('/api/upload', {
        method: 'POST',
        body: { image: base64, filename: file.name },
      })
      if (res?.url) {
        uploadedUrls.push(res.url)
      }
    } catch {
      // 單張上傳失敗不中斷整體流程
    }
  }

  if (uploadedUrls.length > 0) {
    // 記錄最近上傳的圖片 URL
    lastUploadedUrls.value = [...lastUploadedUrls.value, ...uploadedUrls]
    // 先送出訊息，拿到 message id 後再關聯圖片
    const msgText = `已上傳 ${uploadedUrls.length} 張圖片`
    await doSend(msgText, 'text')
    // 找到剛剛送出的 user 訊息，綁定圖片
    const userMsgs = session.value.messages.filter(m => m.role === 'user')
    const lastUserMsg = userMsgs[userMsgs.length - 1]
    if (lastUserMsg) {
      uploadedImages.value.set(lastUserMsg.id, uploadedUrls)
    }
    await scrollToBottom()
  } else {
    inlineError.value = '圖片上傳失敗，請重試'
  }
}

/** 將 File 轉為 base64 data URI */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function handleNewChat() {
  if (messages.value.length === 0) {
    // 沒有對話紀錄，直接重置
    resetSession()
    return
  }
  showNewChatModal.value = true
}

function confirmNewChat() {
  showNewChatModal.value = false
  resetSession()
  currentOptions.value = []
  currentTopicType.value = null
  currentTopicRequired.value = true
  multiSelectIds.value = new Set()
  savedAddresses.value = []
  showConfirmButtons.value = false
  inlineError.value = null
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
      <h1 class="chat-page__title">統統 AI 助理</h1>
      <button
        class="chat-page__new-chat"
        type="button"
        aria-label="新對話"
        @click="handleNewChat"
      >
        + 新對話
      </button>
    </header>

    <!-- 聊天訊息區域 -->
    <div ref="messagesContainer" class="chat-page__messages" @scroll="handleScroll">
      <div v-if="messages.length === 0" class="chat-page__welcome">
        <p class="chat-page__placeholder">
          嗨！我是統統，您的 AI 助手。<br>有什麼需要幫忙的嗎？可以直接描述您想辦理的服務，或用語音輸入。
        </p>

        <!-- 語言選擇 -->
        <div class="chat-page__lang-selector">
          <p class="chat-page__lang-label">語音辨識語言</p>
          <div class="chat-page__lang-options">
            <button
              class="chat-page__lang-btn"
              :class="{ 'chat-page__lang-btn--active': sttLanguage === 'mandarin' }"
              type="button"
              @click="sttLanguage = 'mandarin'"
            >
              🗣️ 國語
            </button>
            <button
              class="chat-page__lang-btn"
              :class="{ 'chat-page__lang-btn--active': sttLanguage === 'taiwanese' }"
              type="button"
              @click="sttLanguage = 'taiwanese'"
            >
              🗣️ 台語
            </button>
          </div>
        </div>

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
          <template v-if="message.role === 'assistant' && session.stage === 'confirming' && message.text.includes('以下是您')">
            <div class="chat-message__summary" v-html="formatSummaryHtml(message.text)"></div>
          </template>
          <p v-else class="chat-message__text">{{ stripHtml(message.text) }}</p>
          <!-- 圖片預覽 -->
          <div v-if="uploadedImages.get(message.id)" class="chat-message__images">
            <img
              v-for="(imgUrl, idx) in uploadedImages.get(message.id)"
              :key="idx"
              :src="imgUrl"
              alt="上傳的圖片"
              class="chat-message__img"
            />
          </div>
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

      <div v-if="isLoading" class="chat-page__loading">
        <div class="spinner">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <span>助理思考中...</span>
      </div>
      <div v-else-if="isTranscribing" class="chat-page__loading">
        <div class="spinner">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <span>語音辨識中...</span>
      </div>

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
        <button
          v-if="currentTopicType === '04' && multiSelectIds.size > 0"
          class="chat-page__option-confirm"
          type="button"
          :disabled="isLoading"
          @click="handleMultiSelectConfirm"
        >
          確認選擇 ({{ multiSelectIds.size }})
        </button>
        <button
          v-if="!currentTopicRequired && currentOptions.length > 2"
          class="chat-page__option-btn chat-page__option-btn--skip"
          type="button"
          @click="handleSkipTopic"
        >
          都不用
        </button>
      </div>

      <!-- 是否繼續/確認 快捷按鈕 -->
      <div v-if="showConfirmButtons && !isLoading" class="chat-page__quick-actions">
        <button
          class="chat-page__quick-btn chat-page__quick-btn--yes"
          type="button"
          @click="doSend('是，我要繼續選購', 'text')"
        >
          繼續選購
        </button>
        <button
          class="chat-page__quick-btn chat-page__quick-btn--no"
          type="button"
          @click="doSend('不用了，我要結帳', 'text')"
        >
          結帳送出
        </button>
      </div>

      <!-- 地址題：定位 + 常用地址按鈕 -->
      <div v-if="isAddressTopic && !isLoading" class="chat-page__address-actions">
        <button class="chat-page__action-btn" type="button" :disabled="isLocating" @click="handleGetLocation">
          <template v-if="isLocating">
            <div class="spinner spinner--small">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            定位中...
          </template>
          <template v-else>
            📍 定位目前位置
          </template>
        </button>
        <button
          v-for="addr in savedAddresses"
          :key="addr.id"
          class="chat-page__action-btn"
          type="button"
          @click="doSend(addr.fullAddress, 'text')"
        >
          🏠 {{ addr.label }}
        </button>
      </div>

      <!-- 非必填題目：跳過按鈕（備註/說明類欄位） -->
      <div v-if="!currentTopicRequired && isRemarkTopic && currentOptions.length === 0 && !isLoading && !isManualInput" class="chat-page__skip-area">
        <button
          class="chat-page__skip-btn"
          type="button"
          @click="handleSkipTopic"
        >
          跳過此題
        </button>
      </div>

      <!-- 聯絡欄位自動帶入建議 -->
      <div v-if="autoFillSuggestion && !isLoading" class="chat-page__autofill">
        <p class="chat-page__autofill-label">偵測到您的{{ autoFillSuggestion.label }}：</p>
        <div class="chat-page__autofill-value">{{ autoFillSuggestion.value }}</div>
        <div class="chat-page__autofill-actions">
          <button
            class="chat-page__autofill-btn chat-page__autofill-btn--use"
            type="button"
            @click="doSend(autoFillSuggestion!.value, 'text')"
          >
            使用此資料
          </button>
          <button
            class="chat-page__autofill-btn chat-page__autofill-btn--edit"
            type="button"
            @click="autoFillSuggestion = null"
          >
            自行輸入
          </button>
        </div>
      </div>

      <!-- AI 建議值快速填入（如飲水量） -->
      <div v-if="suggestedValue && !isLoading && !autoFillSuggestion" class="chat-page__autofill">
        <div class="chat-page__autofill-actions">
          <button
            class="chat-page__autofill-btn chat-page__autofill-btn--use"
            type="button"
            @click="doSend(suggestedValue!, 'text')"
          >
            使用建議值：{{ suggestedValue }}
          </button>
          <button
            class="chat-page__autofill-btn chat-page__autofill-btn--edit"
            type="button"
            @click="suggestedValue = null"
          >
            自行輸入
          </button>
        </div>
      </div>

      <!-- 圖片上傳題：相機和圖庫按鈕 -->
      <div v-if="isImageTopic && !isLoading" class="chat-page__action-buttons">
        <button class="chat-page__action-btn" type="button" @click="handleOpenCamera">
          📷 開啟相機
        </button>
        <button class="chat-page__action-btn" type="button" @click="handleOpenGallery">
          🖼️ 從圖庫選擇
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
      <p class="chat-page__confirm-hint">確認資料無誤後，按下方按鈕送出</p>
      <div class="chat-page__confirm-actions">
        <button
          class="chat-page__confirm-btn chat-page__confirm-btn--edit"
          type="button"
          :disabled="isLoading"
          @click="doSend('我想修改', 'text')"
        >
          修改內容
        </button>
        <button
          class="chat-page__confirm-btn chat-page__confirm-btn--submit"
          type="button"
          :disabled="isLoading"
          @click="handleSubmit"
        >
          確認送出
        </button>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <p v-if="inlineError" class="chat-page__error" role="alert">{{ inlineError }}</p>
    <p v-else-if="sttError" class="chat-page__error" role="alert">{{ sttError }}</p>
    <p v-else-if="sessionError" class="chat-page__error" role="alert">{{ sessionError }}</p>

    <!-- 輸入區域 -->
    <div v-if="session.stage !== 'submitted'" class="chat-page__input-area">
      <!-- 語言切換小按鈕 -->
      <button
        class="chat-page__lang-toggle"
        type="button"
        :title="sttLanguage === 'taiwanese' ? '目前：台語（點擊切換）' : '目前：國語（點擊切換）'"
        @click="sttLanguage = sttLanguage === 'taiwanese' ? 'mandarin' : 'taiwanese'"
      >
        {{ sttLanguage === 'taiwanese' ? '台' : '國' }}
      </button>
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
      <textarea
        ref="inputTextarea"
        v-model="inputText"
        class="chat-page__input"
        placeholder="輸入訊息..."
        :maxlength="MESSAGE_MAX_LENGTH"
        rows="1"
        @keydown.enter.exact="handleEnterKey"
        @input="autoResizeTextarea"
        @focus="autoResizeTextarea"
        @blur="collapseTextarea"
      ></textarea>
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

    <!-- 送出完成：開始新對話按鈕 -->
    <div v-if="session.stage === 'submitted'" class="chat-page__submitted-bar">
      <button
        class="chat-page__new-chat-btn"
        type="button"
        @click="confirmNewChat"
      >
        開始新對話
      </button>
    </div>

    <!-- 新對話確認彈窗 -->
    <div v-if="showNewChatModal" class="chat-modal-overlay" @click.self="showNewChatModal = false">
      <div class="chat-modal">
        <p class="chat-modal__title">開始新對話</p>
        <p class="chat-modal__desc">目前的對話紀錄將會清除，確定要開始新對話嗎？</p>
        <div class="chat-modal__actions">
          <button class="chat-modal__btn chat-modal__btn--cancel" @click="showNewChatModal = false">取消</button>
          <button class="chat-modal__btn chat-modal__btn--confirm" @click="confirmNewChat">確定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  max-width: 430px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--color-bg-page, #fafaf9);
  position: relative;
}
</style>

<style>
/* 隱藏 blank layout 的底部導覽列和 padding */
.app-container:has(.chat-page) {
  padding-bottom: 0 !important;
}
.app-container:has(.chat-page) > :last-child:not(.chat-page) {
  display: none !important;
}
</style>

<style scoped>

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

.chat-page__new-chat {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-primary, #3b82f6);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.15s;
}

.chat-page__new-chat:hover {
  background-color: #eff6ff;
}

/* ── 新對話確認彈窗 ── */
.chat-modal-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}

.chat-modal {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px 20px;
  width: 100%;
  max-width: 300px;
  text-align: center;
}

.chat-modal__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 8px;
}

.chat-modal__desc {
  font-size: 14px;
  color: var(--color-text-secondary, #78716c);
  margin: 0 0 20px;
  line-height: 1.5;
}

.chat-modal__actions {
  display: flex;
  gap: 10px;
}

.chat-modal__btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-modal__btn--cancel {
  background-color: #f5f5f4;
  color: var(--color-text-secondary, #78716c);
}

.chat-modal__btn--cancel:hover {
  background-color: #e7e5e4;
}

.chat-modal__btn--confirm {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
}

.chat-modal__btn--confirm:hover {
  background-color: #2563eb;
}

/* ── 聊天訊息區域 ── */
.chat-page__messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
}

/* Chrome / Edge / Safari 專屬：自訂捲軸外觀 */
.chat-page__messages::-webkit-scrollbar {
  width: 4px;               /* 讓垂直捲軸變得很細 */
  height: 4px;
}

.chat-page__messages::-webkit-scrollbar-track {
  background: transparent;   /* 軌道（背景）完全透明 */
}

.chat-page__messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12); /* 滑塊顏色極淡 */
  border-radius: 20px;             /* 圓角讓它更柔和 */
  transition: background 0.2s;
}

.chat-page__messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25); /* 滑鼠懸停時稍微加深一點點 */
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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

.chat-message__images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.chat-message__img {
  width: 100%;
  max-width: 200px;
  border-radius: 10px;
  object-fit: cover;
  cursor: pointer;
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
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  background-color: var(--color-bg-card, #ffffff);
  border-top: 1px solid var(--color-border, #e7e5e4);
}

.chat-page__confirm-hint {
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}

.chat-page__confirm-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.chat-page__confirm-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;
}

.chat-page__confirm-btn--edit {
  background-color: #f5f5f4;
  color: var(--color-text-secondary, #78716c);
  border: 1px solid var(--color-border, #e7e5e4);
}

.chat-page__confirm-btn--edit:hover:not(:disabled) {
  background-color: #e7e5e4;
}

.chat-page__confirm-btn--submit {
  background-color: var(--color-secondary, #22c55e);
  color: #ffffff;
}

.chat-page__confirm-btn--submit:hover:not(:disabled) {
  background-color: #16a34a;
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

/* ── 送出完成：新對話按鈕 ── */
.chat-page__submitted-bar {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border, #e7e5e4);
  background-color: var(--color-bg-card, #ffffff);
  flex-shrink: 0;
}

.chat-page__new-chat-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-page__new-chat-btn:hover {
  background-color: #2563eb;
}

/* ── 輸入區域 ── */
.chat-page__input-area {
  display: flex;
  align-items: flex-end;
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
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #d6d3d1);
  border-radius: 20px;
  font-size: 14px;
  background-color: #fafaf9;
  color: var(--color-text-primary, #1c1917);
  outline: none;
  resize: none;
  line-height: 1.4;
  font-family: inherit;
  overflow-y: hidden;
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

/* ── 是否繼續/確認 快捷按鈕 ── */
.chat-page__quick-actions {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  align-self: flex-start;
}

.chat-page__quick-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, transform 0.1s;
}

.chat-page__quick-btn:active {
  transform: scale(0.96);
}

.chat-page__quick-btn--yes {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
}

.chat-page__quick-btn--yes:hover {
  background-color: #2563eb;
}

.chat-page__quick-btn--no {
  background-color: var(--color-secondary, #22c55e);
  color: #ffffff;
}

.chat-page__quick-btn--no:hover {
  background-color: #16a34a;
}

/* ── 摘要文字格式化 ── */
.chat-message__summary {
  font-size: 14px;
  line-height: 1.6;
}

.chat-message__summary :deep(.chat-summary-title) {
  font-weight: 600;
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-text-primary, #1c1917);
}

.chat-message__summary :deep(.chat-summary-list) {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-message__summary :deep(.chat-summary-list li) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px;
  background-color: #fafaf9;
  border-radius: 6px;
  border-left: 3px solid var(--color-primary, #3b82f6);
}

.chat-message__summary :deep(.chat-summary-label) {
  font-size: 11px;
  color: var(--color-text-secondary, #78716c);
  font-weight: 500;
}

.chat-message__summary :deep(.chat-summary-value) {
  font-size: 14px;
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
}

.chat-message__summary :deep(.chat-summary-images) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.chat-message__summary :deep(.chat-summary-img) {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
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

/* ── 地址定位 / 圖片上傳 操作按鈕 ── */
.chat-page__address-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
  align-self: flex-start;
}

.chat-page__action-buttons {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  align-self: flex-start;
  flex-wrap: wrap;
}

.chat-page__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid var(--color-primary, #3b82f6);
  border-radius: 20px;
  background-color: #ffffff;
  color: var(--color-primary, #3b82f6);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.chat-page__action-btn:hover:not(:disabled) {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
}

.chat-page__action-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

/* ── 非必填跳過按鈕 ── */
.chat-page__skip-area {
  padding: 4px 0;
  align-self: flex-start;
}

.chat-page__skip-btn {
  padding: 8px 18px;
  border: 1px solid #d6d3d1;
  border-radius: 20px;
  background-color: #f5f5f4;
  color: var(--color-text-secondary, #78716c);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-page__skip-btn:hover {
  background-color: #e7e5e4;
}

/* ── 聯絡欄位自動帶入 ── */
.chat-page__autofill {
  align-self: flex-start;
  background-color: var(--color-bg-card, #ffffff);
  border: 1px solid var(--color-border, #e7e5e4);
  border-radius: 12px;
  padding: 12px 14px;
  max-width: 85%;
}

.chat-page__autofill-label {
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  margin: 0 0 4px;
}

.chat-page__autofill-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin-bottom: 10px;
  padding: 6px 10px;
  background-color: #f8fafc;
  border-radius: 6px;
}

.chat-page__autofill-actions {
  display: flex;
  gap: 8px;
}

.chat-page__autofill-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}

.chat-page__autofill-btn--use {
  background-color: var(--color-primary, #3b82f6);
  color: #ffffff;
}

.chat-page__autofill-btn--use:hover {
  background-color: #2563eb;
}

.chat-page__autofill-btn--edit {
  background-color: #f5f5f4;
  color: var(--color-text-secondary, #78716c);
  border: 1px solid #d6d3d1;
}

.chat-page__autofill-btn--edit:hover {
  background-color: #e7e5e4;
}

/* ── 語言選擇器（歡迎畫面） ── */
.chat-page__lang-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 320px;
}

.chat-page__lang-label {
  font-size: 13px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}

.chat-page__lang-options {
  display: flex;
  gap: 10px;
}

.chat-page__lang-btn {
  padding: 10px 20px;
  border: 2px solid var(--color-border, #e7e5e4);
  border-radius: 12px;
  background-color: var(--color-bg-card, #ffffff);
  color: var(--color-text-primary, #1c1917);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.chat-page__lang-btn:hover {
  border-color: var(--color-primary, #3b82f6);
}

.chat-page__lang-btn--active {
  border-color: var(--color-primary, #3b82f6);
  background-color: #eff6ff;
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

/* ── 語言切換小按鈕（輸入列） ── */
.chat-page__lang-toggle {
  width: 32px;
  height: 32px;
  border: 1.5px solid var(--color-border, #d6d3d1);
  border-radius: 8px;
  background-color: #fafaf9;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.chat-page__lang-toggle:hover {
  background-color: #eff6ff;
  border-color: var(--color-primary, #3b82f6);
}

/* ── 3D Cube Spinner ── */
.spinner {
  width: 22px;
  height: 22px;
  animation: spinner-y0fdc1 2s infinite ease;
  transform-style: preserve-3d;
  position: relative;
}

.spinner > div {
  background-color: rgba(249, 115, 22, 0.2);
  height: 100%;
  position: absolute;
  width: 100%;
  border: 2px solid #f97316;
}

.spinner div:nth-of-type(1) {
  transform: translateZ(-11px) rotateY(180deg);
}

.spinner div:nth-of-type(2) {
  transform: rotateY(-270deg) translateX(50%);
  transform-origin: top right;
}

.spinner div:nth-of-type(3) {
  transform: rotateY(270deg) translateX(-50%);
  transform-origin: center left;
}

.spinner div:nth-of-type(4) {
  transform: rotateX(90deg) translateY(-50%);
  transform-origin: top center;
}

.spinner div:nth-of-type(5) {
  transform: rotateX(-90deg) translateY(50%);
  transform-origin: bottom center;
}

.spinner div:nth-of-type(6) {
  transform: translateZ(11px);
}

.spinner--small {
  width: 14px;
  height: 14px;
}

.spinner--small > div {
  border-width: 1.5px;
}

.spinner--small div:nth-of-type(1) {
  transform: translateZ(-7px) rotateY(180deg);
}

.spinner--small div:nth-of-type(6) {
  transform: translateZ(7px);
}

@keyframes spinner-y0fdc1 {
  0% {
    transform: rotate(45deg) rotateX(-25deg) rotateY(25deg);
  }
  50% {
    transform: rotate(45deg) rotateX(-385deg) rotateY(25deg);
  }
  100% {
    transform: rotate(45deg) rotateX(-385deg) rotateY(385deg);
  }
}
</style>
