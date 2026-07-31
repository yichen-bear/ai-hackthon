'use strict';

/**
 * Feature: ai-chat-form-assistant
 *
 * 單元測試（具體案例）：`handleMessage(session, userInput, inputMode, deps)`（Task 6.14）。
 * 涵蓋一般問答資料來源選擇（已選定/未選定表單時 introContent/noticeContent/termsContent
 * 或表單清單摘要的優先順序）與 `type` 對應提問形式映射（Requirement 5.3, 5.4）。
 *
 * 透過 `deps.formMatchingService`/`deps.llmGateway` 注入 mock，避免呼叫真實 Prisma/Groq。
 */

const { handleMessage } = require('../../services/chatAssistantService');
const { TOPIC_TYPE } = require('../../constants/formCodes');

function createBaseSession(overrides = {}) {
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

function lastAssistantText(result) {
  const { messages } = result.session;
  return messages[messages.length - 1].text;
}

describe('handleMessage - 一般問答資料來源選擇（Requirement 5.3, 5.4）', () => {
  it('未選定表單且有可選表單清單時，answer_question 空 reply_text 應回覆表單清單摘要（含 introContent）', async () => {
    const forms = [
      { id: 1, name: '路燈報修', introContent: '請描述路燈故障地點' },
      { id: 2, name: '噪音檢舉', introContent: null },
    ];
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn().mockResolvedValue(forms),
        getFormWithTopics: jest.fn(),
        selectNextTopic: jest.fn(),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'answer_question',
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };

    const result = await handleMessage(createBaseSession(), '你們有哪些服務？', 'text', deps);

    expect(lastAssistantText(result)).toBe(
      '目前提供以下服務項目，歡迎詢問或告訴我您的需求：\n路燈報修：請描述路燈故障地點\n噪音檢舉'
    );
  });

  it('未選定表單且無可選表單清單時，answer_question 空 reply_text 應回覆「目前沒有相關資訊」訊息', async () => {
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn().mockResolvedValue([]),
        getFormWithTopics: jest.fn(),
        selectNextTopic: jest.fn(),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'answer_question',
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };

    const result = await handleMessage(createBaseSession(), '你們有哪些服務？', 'text', deps);

    expect(lastAssistantText(result)).toBe('目前沒有相關資訊可提供，若您有其他問題歡迎告訴我。');
  });

  it('已選定表單時，answer_question 空 reply_text 應優先使用該表單的 introContent', async () => {
    const topic = { id: 10, title: '姓名', type: TOPIC_TYPE.TEXT, sort: 1, group: { sort: 1 } };
    const form = {
      groups: [{ sort: 1, topics: [topic] }],
      introContent: '本表單用於申請路燈報修',
      noticeContent: '請於三日內回覆',
      termsContent: '同意個資使用條款',
    };
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn(),
        getFormWithTopics: jest.fn().mockResolvedValue(form),
        selectNextTopic: jest.fn().mockReturnValue(topic),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'answer_question',
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };
    const session = createBaseSession({ selectedFormId: 1, stage: 'filling' });

    const result = await handleMessage(session, '這個表單是做什麼的？', 'text', deps);

    expect(lastAssistantText(result)).toBe('本表單用於申請路燈報修');
  });

  it('已選定表單且 introContent 缺失時，應改用 noticeContent', async () => {
    const topic = { id: 10, title: '姓名', type: TOPIC_TYPE.TEXT, sort: 1, group: { sort: 1 } };
    const form = {
      groups: [{ sort: 1, topics: [topic] }],
      introContent: null,
      noticeContent: '請於三日內回覆',
      termsContent: '同意個資使用條款',
    };
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn(),
        getFormWithTopics: jest.fn().mockResolvedValue(form),
        selectNextTopic: jest.fn().mockReturnValue(topic),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'answer_question',
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };
    const session = createBaseSession({ selectedFormId: 1, stage: 'filling' });

    const result = await handleMessage(session, '這個表單是做什麼的？', 'text', deps);

    expect(lastAssistantText(result)).toBe('請於三日內回覆');
  });

  it('已選定表單且 introContent/noticeContent 皆缺失時，應改用 termsContent', async () => {
    const topic = { id: 10, title: '姓名', type: TOPIC_TYPE.TEXT, sort: 1, group: { sort: 1 } };
    const form = {
      groups: [{ sort: 1, topics: [topic] }],
      introContent: null,
      noticeContent: null,
      termsContent: '同意個資使用條款',
    };
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn(),
        getFormWithTopics: jest.fn().mockResolvedValue(form),
        selectNextTopic: jest.fn().mockReturnValue(topic),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'answer_question',
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };
    const session = createBaseSession({ selectedFormId: 1, stage: 'filling' });

    const result = await handleMessage(session, '這個表單是做什麼的？', 'text', deps);

    expect(lastAssistantText(result)).toBe('同意個資使用條款');
  });

  it('已選定表單且三個內容欄位皆缺失時，應回覆「目前沒有相關資訊」訊息', async () => {
    const topic = { id: 10, title: '姓名', type: TOPIC_TYPE.TEXT, sort: 1, group: { sort: 1 } };
    const form = {
      groups: [{ sort: 1, topics: [topic] }],
      introContent: null,
      noticeContent: null,
      termsContent: null,
    };
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn(),
        getFormWithTopics: jest.fn().mockResolvedValue(form),
        selectNextTopic: jest.fn().mockReturnValue(topic),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'answer_question',
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };
    const session = createBaseSession({ selectedFormId: 1, stage: 'filling' });

    const result = await handleMessage(session, '這個表單是做什麼的？', 'text', deps);

    expect(lastAssistantText(result)).toBe('目前沒有相關資訊可提供，若您有其他問題歡迎告訴我。');
  });
});

describe('handleMessage - type 對應提問形式映射（Requirement 4.2, 5.3, 5.4）', () => {
  /**
   * 建立一個成功比對到表單、reply_text 為空、進入下一題的情境，
   * 驗證依 `topic.type` 產生的提問文字格式。
   */
  async function runMatchFormAndGetQuestionText(topic) {
    const forms = [{ id: 1, name: '測試表單', introContent: null }];
    const form = { groups: [{ sort: 1, topics: [topic] }] };
    const deps = {
      formMatchingService: {
        listActiveForms: jest.fn().mockResolvedValue(forms),
        getFormWithTopics: jest.fn().mockResolvedValue(form),
        selectNextTopic: jest.fn().mockReturnValue(topic),
        validateAnswerAgainstTopic: jest.fn(),
      },
      llmGateway: {
        requestStructuredResponse: jest.fn().mockResolvedValue({
          action: 'match_form',
          matched_form_id: 1,
          reply_text: '',
          confidence: 0.9,
        }),
      },
    };

    const result = await handleMessage(createBaseSession(), '我要報修路燈', 'text', deps);
    return lastAssistantText(result);
  }

  it('文字型題目（TEXT）僅顯示題目標題', async () => {
    const topic = { id: 1, title: '姓名', type: TOPIC_TYPE.TEXT, sort: 1, group: { sort: 1 } };
    const text = await runMatchFormAndGetQuestionText(topic);
    expect(text).toBe('好的，我來協助您填寫表單。\n\n首先請回答：姓名');
  });

  it('數字型題目（NUMBER）附加提示要求提供數字', async () => {
    const topic = { id: 2, title: '年齡', type: TOPIC_TYPE.NUMBER, sort: 1, group: { sort: 1 } };
    const text = await runMatchFormAndGetQuestionText(topic);
    expect(text).toBe('好的，我來協助您填寫表單。\n\n首先請回答：年齡（請提供數字）');
  });

  it('單選型題目（SINGLE_CHOICE）附加選項清單', async () => {
    const topic = {
      id: 3,
      title: '性別',
      type: TOPIC_TYPE.SINGLE_CHOICE,
      sort: 1,
      group: { sort: 1 },
      options: [
        { optionName: '男' },
        { optionName: '女' },
      ],
    };
    const text = await runMatchFormAndGetQuestionText(topic);
    expect(text).toBe('好的，我來協助您填寫表單。\n\n首先請回答：性別（請選擇一項：男、女）');
  });

  it('多選型題目（MULTIPLE_CHOICE）附加可多選提示與選項清單', async () => {
    const topic = {
      id: 4,
      title: '興趣',
      type: TOPIC_TYPE.MULTIPLE_CHOICE,
      sort: 1,
      group: { sort: 1 },
      options: [
        { optionName: '閱讀' },
        { optionName: '運動' },
      ],
    };
    const text = await runMatchFormAndGetQuestionText(topic);
    expect(text).toBe('好的，我來協助您填寫表單。\n\n首先請回答：興趣（可多選，請列出所有您選擇的項目：閱讀、運動）');
  });

  it('日期型題目（DATE）附加日期格式範例', async () => {
    const topic = { id: 5, title: '預計拜訪日期', type: TOPIC_TYPE.DATE, sort: 1, group: { sort: 1 } };
    const text = await runMatchFormAndGetQuestionText(topic);
    expect(text).toBe('好的，我來協助您填寫表單。\n\n首先請回答：預計拜訪日期（請提供日期，例如 2024-01-01）');
  });

  it('上傳圖片型題目（IMAGE_UPLOAD）附加上傳圖片提示', async () => {
    const topic = { id: 6, title: '現場照片', type: TOPIC_TYPE.IMAGE_UPLOAD, sort: 1, group: { sort: 1 } };
    const text = await runMatchFormAndGetQuestionText(topic);
    expect(text).toBe('好的，我來協助您填寫表單。\n\n首先請回答：現場照片（請上傳圖片）');
  });
});
