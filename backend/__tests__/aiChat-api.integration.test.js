'use strict';

/**
 * 後端 API 整合測試：AI 聊天表單助手路由（`backend/routes/aiChat.js`）
 *
 * 使用 supertest 涵蓋：
 * - Rate_Limiter 429 回應格式（Requirement 8.2）
 * - 輸入驗證阻擋（傳送前檢查於 `chatAssistantService.handleMessage` 內部執行，
 *   route 層負責將 `blocked`/`reason` 正確反映於回應，Requirement 1.6, 1.7, 9.5, 9.6）
 * - `/submit` 未登入業務層錯誤碼（非中介層硬性 401，Requirement 6.2）
 * - 成功訊息/送出流程（mock `chatAssistantService`/Prisma）
 *
 * `chatAssistantService` 已有獨立的單元/屬性測試（見
 * `backend/__tests__/services/chatAssistantService.property.test.js`），故此處以
 * `jest.mock('../services/chatAssistantService')` 於模組層級整體 mock，僅驗證路由層行為。
 *
 * **Validates: Requirements 1.6, 1.7, 6.2, 8.2, 9.5, 9.6**
 */

// --- Mocks must be set up before requiring app ---

const mockPrisma = {
  memberAccount: { findUnique: jest.fn() },
  vendorUser: { findUnique: jest.fn() },
};

jest.mock('../generated/prisma', () => {
  return { PrismaClient: jest.fn(() => mockPrisma) };
}, { virtual: true });

jest.mock('../services/chatAssistantService');

// Set env vars before requiring modules
process.env.JWT_SECRET = 'integration-test-secret-key-32chars!!';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
// 預設放寬呼叫上限，避免不同 describe/test 之間互相干擾（僅 Rate_Limiter 專屬測試會暫時調低）
process.env.AI_CHAT_RATE_WINDOW_SECONDS = '60';
process.env.AI_CHAT_RATE_MAX_CALLS = '1000';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const chatAssistantService = require('../services/chatAssistantService');

const JWT_SECRET = process.env.JWT_SECRET;

/** 簽發一個有效的會員 JWT，供需要「已登入」情境的測試使用 */
function signMemberToken(sub) {
  return jwt.sign({ sub, role: 'member' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
}

/** 建立一個最小可用的 Chat_Session 假資料，供 mock 回傳使用 */
function buildFakeSession(overrides = {}) {
  return {
    selectedFormId: null,
    pendingFormSwitch: null,
    collectedFields: {},
    currentTopicId: null,
    awaitingSubmitConfirmation: false,
    messages: [],
    stage: 'selecting_form',
    ...overrides,
  };
}

describe('POST /api/ai-chat/message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('成功訊息流程', () => {
    it('通過驗證與 Rate_Limiter 後呼叫 chatAssistantService.handleMessage，回傳 { session, replyText, replyMeta }', async () => {
      const assistantMessage = {
        id: 'msg-1',
        role: 'assistant',
        text: '請問您想諮詢哪一種服務？',
        createdAt: new Date().toISOString(),
      };
      const resultSession = buildFakeSession({ messages: [assistantMessage] });
      chatAssistantService.handleMessage.mockResolvedValue({ session: resultSession });

      const res = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', `token=${signMemberToken('member-success-001')}`)
        .send({ session: buildFakeSession(), userInput: '我想申請報價', inputMode: 'text' });

      expect(res.status).toBe(200);
      expect(res.body.session).toEqual(resultSession);
      expect(res.body.replyText).toBe('請問您想諮詢哪一種服務？');
      expect(res.body.replyMeta).toEqual({ blocked: false, reason: null, topicType: null, topicRequired: true, options: null });
      expect(chatAssistantService.handleMessage).toHaveBeenCalledTimes(1);
      expect(chatAssistantService.handleMessage).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'selecting_form' }),
        '我想申請報價',
        'text'
      );
    });

    it('缺少必要參數（session 或 userInput）→ 400，不呼叫 handleMessage', async () => {
      const res = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', `token=${signMemberToken('member-missing-params')}`)
        .send({ userInput: '缺少 session' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(chatAssistantService.handleMessage).not.toHaveBeenCalled();
    });
  });

  describe('輸入驗證阻擋（Requirement 1.6, 1.7, 9.5, 9.6）', () => {
    it('handleMessage 判定輸入被阻擋時，route 應原樣反映 blocked:true 與 reason', async () => {
      const rejectionMessage = {
        id: 'msg-blocked',
        role: 'assistant',
        text: '您的訊息長度超過 500 個字元上限，請縮短內容後再試一次。',
        createdAt: new Date().toISOString(),
      };
      const blockedSession = buildFakeSession({ messages: [rejectionMessage] });
      chatAssistantService.handleMessage.mockResolvedValue({
        session: blockedSession,
        blocked: true,
        reason: 'TOO_LONG',
      });

      const res = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', `token=${signMemberToken('member-blocked-001')}`)
        .send({ session: buildFakeSession(), userInput: 'a'.repeat(600), inputMode: 'text' });

      expect(res.status).toBe(200);
      expect(res.body.replyMeta).toEqual({ blocked: true, reason: 'TOO_LONG', topicType: null, topicRequired: true, options: null });
      expect(res.body.replyText).toBe(rejectionMessage.text);
      // 阻擋情形下 route 仍只負責轉發 handleMessage 的結果，不重複呼叫 LLM 或改變阻擋判定
      expect(chatAssistantService.handleMessage).toHaveBeenCalledTimes(1);
    });

    it('禁用內容輸入被阻擋時，reason 應為 DISALLOWED_CONTENT', async () => {
      const rejectionMessage = {
        id: 'msg-blocked-2',
        role: 'assistant',
        text: '您的訊息包含不允許的內容，請修改後重新傳送。',
        createdAt: new Date().toISOString(),
      };
      const blockedSession = buildFakeSession({ messages: [rejectionMessage] });
      chatAssistantService.handleMessage.mockResolvedValue({
        session: blockedSession,
        blocked: true,
        reason: 'DISALLOWED_CONTENT',
      });

      const res = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', `token=${signMemberToken('member-blocked-002')}`)
        .send({ session: buildFakeSession(), userInput: '不允許的內容', inputMode: 'voice' });

      expect(res.status).toBe(200);
      expect(res.body.replyMeta.blocked).toBe(true);
      expect(res.body.replyMeta.reason).toBe('DISALLOWED_CONTENT');
    });
  });

  describe('Rate_Limiter 429 回應格式（Requirement 8.2）', () => {
    const originalMaxCalls = process.env.AI_CHAT_RATE_MAX_CALLS;

    beforeEach(() => {
      process.env.AI_CHAT_RATE_MAX_CALLS = '2';
      chatAssistantService.handleMessage.mockResolvedValue({ session: buildFakeSession() });
    });

    afterEach(() => {
      process.env.AI_CHAT_RATE_MAX_CALLS = originalMaxCalls;
    });

    it('同一識別碼超過呼叫上限後回傳 429，且包含頻率限制提示與 retryAfterSeconds', async () => {
      const cookie = `token=${signMemberToken('member-rate-limited-001')}`;

      // 前 2 次呼叫在額度內，應正常放行
      const res1 = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', cookie)
        .send({ session: buildFakeSession(), userInput: '第一次', inputMode: 'text' });
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', cookie)
        .send({ session: buildFakeSession(), userInput: '第二次', inputMode: 'text' });
      expect(res2.status).toBe(200);

      // 第 3 次超過上限，應被 Rate_Limiter 拒絕，回傳 429
      const res3 = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', cookie)
        .send({ session: buildFakeSession(), userInput: '第三次', inputMode: 'text' });

      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.message).toBe('已達呼叫頻率限制，請稍後再試');
      expect(typeof res3.body.retryAfterSeconds).toBe('number');
      expect(res3.body.retryAfterSeconds).toBeGreaterThan(0);

      // 被拒絕的請求不應轉發至 chatAssistantService
      expect(chatAssistantService.handleMessage).toHaveBeenCalledTimes(2);
    });

    it('不同識別碼的呼叫次數計數器彼此獨立，不受其他使用者影響', async () => {
      const cookieA = `token=${signMemberToken('member-rate-limited-independent-A')}`;
      const cookieB = `token=${signMemberToken('member-rate-limited-independent-B')}`;

      await request(app).post('/api/ai-chat/message').set('Cookie', cookieA).send({ session: buildFakeSession(), userInput: 'A1', inputMode: 'text' });
      await request(app).post('/api/ai-chat/message').set('Cookie', cookieA).send({ session: buildFakeSession(), userInput: 'A2', inputMode: 'text' });

      // B 是全新識別碼，即使 A 已用盡額度，B 的第一次呼叫仍應被允許
      const resB = await request(app)
        .post('/api/ai-chat/message')
        .set('Cookie', cookieB)
        .send({ session: buildFakeSession(), userInput: 'B1', inputMode: 'text' });

      expect(resB.status).toBe(200);
    });
  });
});

describe('POST /api/ai-chat/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('未登入送出 → 200，業務層 success:false, code: AUTH_REQUIRED（非中介層硬性 401，Requirement 6.2）', async () => {
    chatAssistantService.submitFeedback.mockResolvedValue({ success: false, code: 'AUTH_REQUIRED' });

    const res = await request(app)
      .post('/api/ai-chat/submit')
      .send({ session: buildFakeSession({ collectedFields: { 1: { topicId: 1, value: '需求描述' } } }) });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: false, code: 'AUTH_REQUIRED' });
    // 未登入時 userId 應為 undefined，交由 service 層判斷（Requirement 6.2 由 service 統一處理）
    expect(chatAssistantService.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ collectedFields: { 1: { topicId: 1, value: '需求描述' } } }),
      undefined
    );
  });

  it('缺少必要參數 session → 400，不呼叫 submitFeedback', async () => {
    const res = await request(app).post('/api/ai-chat/submit').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(chatAssistantService.submitFeedback).not.toHaveBeenCalled();
  });

  it('已登入使用者送出成功 → 200，success:true 並帶回 feedbackNo', async () => {
    chatAssistantService.submitFeedback.mockResolvedValue({ success: true, feedbackNo: '2024010112345678' });

    const res = await request(app)
      .post('/api/ai-chat/submit')
      .set('Cookie', `token=${signMemberToken('member-submit-success-001')}`)
      .send({ session: buildFakeSession({ collectedFields: { 1: { topicId: 1, value: '需求描述' } } }) });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, feedbackNo: '2024010112345678' });
    expect(chatAssistantService.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ collectedFields: { 1: { topicId: 1, value: '需求描述' } } }),
      'member-submit-success-001'
    );
  });

  it('已登入但送出失敗（例如資料庫寫入失敗）→ 200，success:false, code: SUBMIT_FAILED', async () => {
    chatAssistantService.submitFeedback.mockResolvedValue({ success: false, code: 'SUBMIT_FAILED' });

    const res = await request(app)
      .post('/api/ai-chat/submit')
      .set('Cookie', `token=${signMemberToken('member-submit-fail-001')}`)
      .send({ session: buildFakeSession({ collectedFields: { 1: { topicId: 1, value: '需求描述' } } }) });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: false, code: 'SUBMIT_FAILED' });
  });
});
