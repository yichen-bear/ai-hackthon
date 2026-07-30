/**
 * Unit tests for `useChatSession`.
 *
 * Covers:
 * - `createInitialSession()` 的初始值
 * - `isAwaitingFormSwitch()` 的判斷邏輯
 * - `/message`、`/submit` 呼叫時整包送出目前 Chat_Session 內容（mock `$fetch`）
 *
 * Validates: Requirements 3.6, 6.2
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createInitialSession,
  isAwaitingFormSwitch,
  useChatSession,
  type ChatMessageResponse,
  type ChatSession,
  type ChatSubmitResponse,
} from './useChatSession'

describe('createInitialSession', () => {
  it('回傳未選定表單、無待確認切換、無已收集欄位、無目前題目、非等待送出確認、無對話歷史、階段為 selecting_form 的初始狀態', () => {
    const session = createInitialSession()

    expect(session).toEqual({
      selectedFormId: null,
      pendingFormSwitch: null,
      collectedFields: {},
      currentTopicId: null,
      awaitingSubmitConfirmation: false,
      messages: [],
      stage: 'selecting_form',
    })
  })

  it('每次呼叫都回傳獨立的物件（不共用同一參考，避免互相汙染）', () => {
    const a = createInitialSession()
    const b = createInitialSession()

    expect(a).not.toBe(b)
    expect(a.collectedFields).not.toBe(b.collectedFields)
    expect(a.messages).not.toBe(b.messages)
  })
})

describe('isAwaitingFormSwitch', () => {
  it('當 pendingFormSwitch 為 null 時回傳 false', () => {
    const session: ChatSession = { ...createInitialSession(), pendingFormSwitch: null }
    expect(isAwaitingFormSwitch(session)).toBe(false)
  })

  it('當 pendingFormSwitch 指向新表單時回傳 true', () => {
    const session: ChatSession = {
      ...createInitialSession(),
      pendingFormSwitch: { newFormId: 42 },
    }
    expect(isAwaitingFormSwitch(session)).toBe(true)
  })
})

describe('useChatSession - $fetch 整合', () => {
  beforeEach(() => {
    // useState 在測試環境中以模組級的 Map 模擬（見 vitest.setup.ts），
    // 同一個 key 的 ref 會在測試檔案內的多個測試間共用，因此每次測試前重置狀態。
    const { resetSession } = useChatSession()
    resetSession()

    ;(globalThis as any).$fetch = vi.fn()
  })

  it('sendMessage() 呼叫 POST /api/ai-chat/message，並整包送出目前 session 內容', async () => {
    const mockResponse: ChatMessageResponse = {
      session: {
        ...createInitialSession(),
        stage: 'filling',
        selectedFormId: 1,
      },
      replyText: '請問您想申請哪種服務？',
    }
    ;(globalThis as any).$fetch.mockResolvedValueOnce(mockResponse)

    const { session, sendMessage } = useChatSession()
    const sessionBeforeSend = session.value

    const result = await sendMessage('我想申請估價單', 'text')

    expect((globalThis as any).$fetch).toHaveBeenCalledTimes(1)
    const [url, options] = (globalThis as any).$fetch.mock.calls[0]
    expect(url).toBe('/api/ai-chat/message')
    expect(options.method).toBe('POST')
    expect(options.body.userInput).toBe('我想申請估價單')

    // 送出的 body.session 必須是「目前 session」整包內容：
    // 除了新增使用者訊息外，其餘欄位應與送出前完全相同。
    const sentSession = options.body.session as ChatSession
    expect(sentSession.selectedFormId).toBe(sessionBeforeSend.selectedFormId)
    expect(sentSession.pendingFormSwitch).toBe(sessionBeforeSend.pendingFormSwitch)
    expect(sentSession.collectedFields).toEqual(sessionBeforeSend.collectedFields)
    expect(sentSession.currentTopicId).toBe(sessionBeforeSend.currentTopicId)
    expect(sentSession.awaitingSubmitConfirmation).toBe(sessionBeforeSend.awaitingSubmitConfirmation)
    expect(sentSession.stage).toBe(sessionBeforeSend.stage)
    expect(sentSession.messages).toHaveLength(sessionBeforeSend.messages.length + 1)
    expect(sentSession.messages.at(-1)).toMatchObject({ role: 'user', text: '我想申請估價單' })
    expect(options.body.inputMode).toBe('text')

    // 回應的 session 會完整覆寫本地狀態
    expect(session.value).toEqual(mockResponse.session)
    expect(result).toEqual(mockResponse)
  })

  it('submitFeedback() 呼叫 POST /api/ai-chat/submit，並整包送出目前 session 內容', async () => {
    const { session, submitFeedback } = useChatSession()

    // 準備一個已有收集欄位的 session（模擬填表完成、待送出）
    session.value = {
      ...createInitialSession(),
      selectedFormId: 3,
      stage: 'confirming',
      collectedFields: {
        '10': { topicId: 10, value: '需求描述' },
      },
    }
    const sessionBeforeSubmit = session.value

    const mockResponse: ChatSubmitResponse = {
      success: true,
      message: '送出成功',
    }
    ;(globalThis as any).$fetch.mockResolvedValueOnce(mockResponse)

    const result = await submitFeedback()

    expect((globalThis as any).$fetch).toHaveBeenCalledTimes(1)
    const [url, options] = (globalThis as any).$fetch.mock.calls[0]
    expect(url).toBe('/api/ai-chat/submit')
    expect(options.method).toBe('POST')

    // 整包送出目前 session，內容應與送出前完全相同
    expect(options.body.session).toEqual(sessionBeforeSubmit)

    expect(result).toEqual(mockResponse)
  })

  it('submitFeedback() 未登入被拒時，回應保留的 session（collectedFields 不變）會覆寫本地狀態', async () => {
    const { session, submitFeedback } = useChatSession()

    session.value = {
      ...createInitialSession(),
      selectedFormId: 3,
      stage: 'confirming',
      collectedFields: {
        '10': { topicId: 10, value: '需求描述' },
      },
    }

    const mockResponse: ChatSubmitResponse = {
      success: false,
      code: 'AUTH_REQUIRED',
      message: '請先登入後再送出',
      session: session.value,
    }
    ;(globalThis as any).$fetch.mockResolvedValueOnce(mockResponse)

    const result = await submitFeedback()

    expect(result.success).toBe(false)
    expect(session.value.collectedFields).toEqual({
      '10': { topicId: 10, value: '需求描述' },
    })
  })
})
