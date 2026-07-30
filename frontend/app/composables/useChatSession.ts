/**
 * useChatSession - 前端 Chat_Session 狀態管理 composable
 *
 * MVP 設計（design.md 決策 1）：後端 `/api/ai-chat/*` 為無狀態 API，
 * 所有對話狀態（Chat_Session）保存在前端。每次呼叫 `/message`／`/submit`
 * 皆整包送出目前的 session，並以回傳結果完整覆寫本地狀態。
 *
 * Validates: Requirements 3.6, 3.7, 3.8, 4.6, 4.7, 6.2
 */

/** 已收集欄位的單一值，key 為 `PmsFormTopic.id` */
export interface FieldValue {
  topicId: number
  value: string | string[] | number
}

/** 對話訊息（供 UI 呈現與 LLM context） */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

/** 前端保存的完整 Chat_Session 狀態物件（非資料庫模型） */
export interface ChatSession {
  selectedFormId: number | null
  pendingFormSwitch: { newFormId: number } | null
  collectedFields: Record<string, FieldValue>
  currentTopicId: number | null
  awaitingSubmitConfirmation: boolean
  messages: ChatMessage[]
  stage: 'selecting_form' | 'filling' | 'confirming' | 'submitted'
}

/** `POST /api/ai-chat/message` 回應內容 */
export interface ChatMessageResponse {
  session: ChatSession
  replyText: string
  replyMeta?: Record<string, unknown>
}

/** `POST /api/ai-chat/submit` 回應內容 */
export interface ChatSubmitResponse {
  success: boolean
  code?: string
  message?: string
  session?: ChatSession
}

/**
 * 建立初始 Chat_Session：尚未選定表單、無待確認切換、無已收集欄位、
 * 無目前題目、非等待送出確認、無對話歷史、階段為 `selecting_form`。
 */
export function createInitialSession(): ChatSession {
  return {
    selectedFormId: null,
    pendingFormSwitch: null,
    collectedFields: {},
    currentTopicId: null,
    awaitingSubmitConfirmation: false,
    messages: [],
    stage: 'selecting_form',
  }
}

/**
 * 純函式：判斷 Chat_Session 是否正在等待使用者確認表單切換
 * （對應 design.md `pendingFormSwitch` 欄位，Requirement 3.6-3.8）
 */
export function isAwaitingFormSwitch(session: ChatSession): boolean {
  return session.pendingFormSwitch !== null
}

/** 產生一則對話訊息（id 使用 crypto.randomUUID，不支援時退回時間戳+隨機數） */
function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    id,
    role,
    text,
    createdAt: new Date().toISOString(),
  }
}

export function useChatSession() {
  const session = useState<ChatSession>('ai-chat-session', () => createInitialSession())
  const isLoading = useState<boolean>('ai-chat-loading', () => false)
  const error = useState<string | null>('ai-chat-error', () => null)

  /** 重置 Chat_Session 為初始狀態（例如離開頁面或重新開始對話） */
  function resetSession() {
    session.value = createInitialSession()
    error.value = null
  }

  /**
   * 傳送使用者訊息給 Chat_Assistant。
   *
   * 將使用者輸入先加入本地訊息歷史後，整包目前 session 送出至
   * `POST /api/ai-chat/message`；回應的 `session` 會完整覆寫本地狀態
   * （因此助手回覆訊息由後端負責併入 `session.messages`）。
   */
  async function sendMessage(userInput: string, inputMode: 'text' | 'voice' = 'text') {
    isLoading.value = true
    error.value = null

    // 先在本地顯示使用者訊息（即時 UI 回饋）
    const userMessage = createMessage('user', userInput)
    const sessionWithUserMessage: ChatSession = {
      ...session.value,
      messages: [...session.value.messages, userMessage],
    }
    session.value = sessionWithUserMessage

    // 送給後端的 session 不包含剛加的使用者訊息，因為後端 handleMessage 會自行 appendUserMessage
    const sessionToSend: ChatSession = {
      ...session.value,
      messages: session.value.messages.slice(0, -1),
    }

    try {
      const response = await $fetch<ChatMessageResponse>('/api/ai-chat/message', {
        method: 'POST',
        body: {
          session: sessionToSend,
          userInput,
          inputMode,
        },
        credentials: 'include',
      })

      session.value = response.session
      return response
    } catch (err: any) {
      const message = err?.data?.message || err?.message || '網路連線失敗，請稍後再試'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 送出目前 Chat_Session（表單提交）。整包目前 session 送出至
   * `POST /api/ai-chat/submit`；若回應包含 `session`，以其完整覆寫本地狀態
   * （例如未登入被拒時仍保留 `collectedFields` 不變，Requirement 6.2）。
   */
  async function submitFeedback() {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<ChatSubmitResponse>('/api/ai-chat/submit', {
        method: 'POST',
        body: { session: session.value },
        credentials: 'include',
      })

      if (response.session) {
        session.value = response.session
      }

      if (!response.success) {
        error.value = response.message || '送出失敗，請稍後再試'
      }

      return response
    } catch (err: any) {
      const message = err?.data?.message || err?.message || '網路連線失敗，請稍後再試'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    session,
    isLoading: readonly(isLoading) as Readonly<Ref<boolean>>,
    error: readonly(error) as Readonly<Ref<string | null>>,
    resetSession,
    sendMessage,
    submitFeedback,
  }
}
