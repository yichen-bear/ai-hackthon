'use strict';

/**
 * Feature: ai-chat-form-assistant
 *
 * 單元測試：`buildFormFeedbackPayload(session, userId)` 與 `submitFeedback(session, userId)`
 * （Task 8.7）。使用 mock Prisma Client 驗證資料組裝、`serviceId` 反查與預設值、
 * `feedbackNo` 碰撞重試、以及送出流程呼叫時序。
 */

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);

const {
  buildFormFeedbackPayload,
  submitFeedback,
} = require('../../services/chatAssistantService');

function createBaseSession(overrides = {}) {
  return {
    selectedFormId: 1,
    pendingFormSwitch: null,
    collectedFields: {},
    currentTopicId: null,
    awaitingSubmitConfirmation: false,
    messages: [],
    stage: 'confirming',
    ...overrides,
  };
}

function createMockPrisma(overrides = {}) {
  return {
    pmsForm: {
      findUnique: jest.fn().mockResolvedValue({ serviceVendorId: 10, type: '01' }),
    },
    cmsHomepageService: {
      findMany: jest.fn().mockResolvedValue([{ id: 99 }]),
    },
    pmsFormFeedback: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    ...overrides,
  };
}

describe('buildFormFeedbackPayload', () => {
  afterEach(() => {
    delete process.env.AI_CHAT_DEFAULT_SERVICE_ID;
    delete process.env.AI_CHAT_PLATFORM_CODE;
  });

  it('組裝 feedbackContent、聯絡資訊欄位、serviceId、platformCode、feedbackNo 等欄位', async () => {
    const prisma = createMockPrisma();
    const session = createBaseSession({
      collectedFields: {
        1: { topicId: 1, value: '一般答案' },
        contactName: 'Alice',
        contactMobile: '0912345678',
        contactAddressCounty: '01',
        contactAddressDistrict: '001',
      },
    });

    const payload = await buildFormFeedbackPayload(session, 'user-1', prisma);

    // feedbackContent 僅排除 buildFeedbackContent 定義的五個聯絡資訊鍵
    // （contactName/contactMobile/contactLandline/contactEmail/contactAddressDetail），
    // contactAddressCounty/District 屬於代碼值，不在排除範圍內。
    expect(payload.feedbackContent).toEqual({
      1: { topicId: 1, value: '一般答案' },
      contactAddressCounty: '01',
      contactAddressDistrict: '001',
    });
    expect(payload.serviceId).toBe(99);
    expect(payload.platformCode).toBe('09');
    expect(payload.formId).toBe(1);
    expect(payload.formType).toBe('01');
    expect(payload.isRead).toBe('0');
    expect(payload.status).toBe('01');
    expect(payload.inbrAccountId).toBe('user-1');
    expect(payload.contactName).toBeInstanceOf(Buffer);
    expect(typeof payload.contactNameHash).toBe('string');
    expect(payload.contactAddressCounty).toBe('01');
    expect(payload.contactAddressDistrict).toBe('001');
    // 未提供的聯絡欄位應為 null
    expect(payload.contactLandline).toBeNull();
    expect(payload.contactLandlineHash).toBeNull();
    // feedbackNo 應為 YYYYMMDD + 8 碼 base36（共 16 碼）
    expect(payload.feedbackNo).toMatch(/^\d{8}[0-9a-z]{8}$/);
  });

  it('serviceVendorId 查無對應 CmsHomepageService 時，使用 AI_CHAT_DEFAULT_SERVICE_ID 環境變數作為預設值', async () => {
    process.env.AI_CHAT_DEFAULT_SERVICE_ID = '77';
    const prisma = createMockPrisma({
      cmsHomepageService: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const session = createBaseSession();

    const payload = await buildFormFeedbackPayload(session, 'user-1', prisma);

    expect(payload.serviceId).toBe(77);
  });

  it('serviceVendorId 查無對應且未設定預設值環境變數時，serviceId 為 null', async () => {
    const prisma = createMockPrisma({
      cmsHomepageService: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const session = createBaseSession();

    const payload = await buildFormFeedbackPayload(session, 'user-1', prisma);

    expect(payload.serviceId).toBeNull();
  });

  it('platformCode 可透過 AI_CHAT_PLATFORM_CODE 環境變數覆寫，未設定時預設為 09', async () => {
    process.env.AI_CHAT_PLATFORM_CODE = '05';
    const prisma = createMockPrisma();
    const session = createBaseSession();

    const payload = await buildFormFeedbackPayload(session, 'user-1', prisma);

    expect(payload.platformCode).toBe('05');
  });

  it('feedbackNo 碰撞時應重新產生，直到查無重複紀錄為止', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ feedbackNo: 'existing' })
      .mockResolvedValueOnce(null);
    const prisma = createMockPrisma({
      pmsFormFeedback: {
        findUnique,
        create: jest.fn(),
      },
    });
    const session = createBaseSession();

    const payload = await buildFormFeedbackPayload(session, 'user-1', prisma);

    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(payload.feedbackNo).toMatch(/^\d{8}[0-9a-z]{8}$/);
  });

  it('找不到對應表單時應拋出錯誤，中止組裝', async () => {
    const prisma = createMockPrisma({
      pmsForm: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const session = createBaseSession();

    await expect(buildFormFeedbackPayload(session, 'user-1', prisma)).rejects.toThrow();
  });
});

describe('submitFeedback', () => {
  it('未登入時拒絕送出且不呼叫 prisma.pmsFormFeedback.create', async () => {
    const prisma = createMockPrisma();
    const session = createBaseSession({ collectedFields: { 1: { topicId: 1, value: 'x' } } });

    const result = await submitFeedback(session, null, prisma);

    expect(result).toEqual({ success: false, code: 'AUTH_REQUIRED' });
    expect(prisma.pmsFormFeedback.create).not.toHaveBeenCalled();
  });

  it('已登入且資料組裝成功時，呼叫 prisma.pmsFormFeedback.create 並回傳成功結果', async () => {
    const prisma = createMockPrisma();
    const session = createBaseSession({ collectedFields: { 1: { topicId: 1, value: 'x' } } });

    const result = await submitFeedback(session, 'user-1', prisma);

    expect(result.success).toBe(true);
    expect(typeof result.feedbackNo).toBe('string');
    expect(prisma.pmsFormFeedback.create).toHaveBeenCalledTimes(1);
  });

  it('資料組裝失敗時（例如找不到表單），不呼叫 create 且回傳失敗結果', async () => {
    const prisma = createMockPrisma({
      pmsForm: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const session = createBaseSession();

    const result = await submitFeedback(session, 'user-1', prisma);

    expect(result).toEqual({ success: false, code: 'SUBMIT_FAILED' });
    expect(prisma.pmsFormFeedback.create).not.toHaveBeenCalled();
  });

  it('資料庫寫入失敗時，回傳失敗結果並保留 session.collectedFields（呼叫端狀態不受影響）', async () => {
    const prisma = createMockPrisma({
      pmsFormFeedback: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const collectedFields = { 1: { topicId: 1, value: 'x' } };
    const session = createBaseSession({ collectedFields });

    const result = await submitFeedback(session, 'user-1', prisma);

    expect(result).toEqual({ success: false, code: 'SUBMIT_FAILED' });
    expect(session.collectedFields).toBe(collectedFields);
  });
});
