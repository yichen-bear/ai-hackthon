'use strict';

/**
 * Feature: ai-chat-form-assistant
 * Property 18: 信心分數門檻決定模型升級
 *
 * *For any* 0 到 1 之間的信心分數與任意門檻值設定，
 * `shouldEscalateToSmartModel(confidence, threshold)` 回傳「升級」若且唯若 `confidence < threshold`。
 *
 * **Validates: Requirements 7.2**
 */

const fc = require('fast-check');
const { shouldEscalateToSmartModel } = require('../../services/llmGateway');

describe('Feature: ai-chat-form-assistant, Property 18: 信心分數門檻決定模型升級', () => {
  it('shouldEscalateToSmartModel(confidence, threshold) === (confidence < threshold)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (confidence, threshold) => {
          const result = shouldEscalateToSmartModel(confidence, threshold);
          expect(result).toBe(confidence < threshold);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 19: 429 重試與降級序列
 *
 * *For any* Smart_Model 與 Fast_Model 各自的 429 失敗/成功模式（是否耗盡最大重試次數、
 * 若未耗盡則在第幾次嘗試成功），`requestStructuredResponse({ messages, forceSmart: true })`：
 * - 若 Smart_Model 未耗盡重試次數（最多重試 3 次，總嘗試數 ≤ 4），SHALL 回傳 Smart_Model 的成功結果，
 *   且 Fast_Model 完全不會被呼叫；
 * - 若 Smart_Model 重試耗盡仍 429，SHALL 改呼叫 Fast_Model，且傳入 Fast_Model 的訊息內容與傳入
 *   Smart_Model 的訊息內容完全相同；若 Fast_Model 未耗盡重試次數，SHALL 回傳 Fast_Model 的成功結果；
 * - 若 Smart_Model 與 Fast_Model 皆耗盡重試次數仍 429，SHALL 拋出 `ServiceBusyError`；
 * - 每次重試之間隔（`setTimeout` 的延遲時間）皆不少於 500 毫秒。
 *
 * **Validates: Requirements 7.3, 7.4, 7.5**
 */

let mockCreate;

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args) => mockCreate(...args),
      },
    },
  }));
});

describe('Feature: ai-chat-form-assistant, Property 19: 429 重試與降級序列', () => {
  const FAST_MODEL = 'llama-3.1-8b-instant';
  const SMART_MODEL = 'llama-3.3-70b-versatile';

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    delete process.env.GROQ_MODEL_FAST;
    delete process.env.GROQ_MODEL_SMART;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeRateLimitError() {
    const error = new Error('Too Many Requests');
    error.status = 429;
    return error;
  }

  function makeSuccessResponse(tag) {
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({ action: 'answer_question', reply_text: tag, confidence: 1 }),
          },
        },
      ],
    };
  }

  it('依 Smart_Model/Fast_Model 的耗盡狀態決定成功結果來源、降級行為與 ServiceBusyError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.boolean(),
        fc.integer({ min: 0, max: 3 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 3 }),
        async (
          userText,
          smartExhausted,
          smartFailBeforeSuccess,
          fastExhausted,
          fastFailBeforeSuccess
        ) => {
          jest.resetModules();
          const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

          const smartCalls = [];
          const fastCalls = [];

          mockCreate = jest.fn((params) => {
            if (params.model === SMART_MODEL) {
              smartCalls.push(params.messages);
              const callIndex = smartCalls.length - 1;
              const shouldFail = smartExhausted || callIndex < smartFailBeforeSuccess;
              if (shouldFail) {
                return Promise.reject(makeRateLimitError());
              }
              return Promise.resolve(makeSuccessResponse('smart-ok'));
            }
            if (params.model === FAST_MODEL) {
              fastCalls.push(params.messages);
              const callIndex = fastCalls.length - 1;
              const shouldFail = fastExhausted || callIndex < fastFailBeforeSuccess;
              if (shouldFail) {
                return Promise.reject(makeRateLimitError());
              }
              return Promise.resolve(makeSuccessResponse('fast-ok'));
            }
            throw new Error(`unexpected model: ${params.model}`);
          });

          const { requestStructuredResponse, ServiceBusyError: ServiceBusyErrorClass } =
            require('../../services/llmGateway');

          const messages = [{ role: 'user', content: userText }];

          const resultPromise = requestStructuredResponse({ messages, forceSmart: true }).then(
            (value) => ({ ok: true, value }),
            (error) => ({ ok: false, error })
          );

          await jest.advanceTimersByTimeAsync(60000);
          const outcome = await resultPromise;

          // 每次重試之間隔皆不少於 500 毫秒
          for (const call of setTimeoutSpy.mock.calls) {
            expect(call[1]).toBeGreaterThanOrEqual(500);
          }
          setTimeoutSpy.mockRestore();

          if (!smartExhausted) {
            // Smart_Model 未耗盡重試次數：成功結果來自 Smart_Model，Fast_Model 完全不會被呼叫
            expect(smartCalls.length).toBe(smartFailBeforeSuccess + 1);
            expect(smartCalls.length).toBeLessThanOrEqual(4);
            expect(fastCalls.length).toBe(0);
            expect(outcome.ok).toBe(true);
            expect(outcome.value).toEqual({
              action: 'answer_question',
              reply_text: 'smart-ok',
              confidence: 1,
            });
            return;
          }

          // Smart_Model 重試已達最大次數（總嘗試數 = 4：1 次初始 + 3 次重試）仍 429
          expect(smartCalls.length).toBe(4);

          if (!fastExhausted) {
            // 降級呼叫 Fast_Model，訊息內容與傳入 Smart_Model 的訊息完全相同
            expect(fastCalls.length).toBe(fastFailBeforeSuccess + 1);
            expect(fastCalls.length).toBeLessThanOrEqual(4);
            expect(fastCalls[0]).toEqual(messages);
            expect(outcome.ok).toBe(true);
            expect(outcome.value).toEqual({
              action: 'answer_question',
              reply_text: 'fast-ok',
              confidence: 1,
            });
            return;
          }

          // Smart_Model 與 Fast_Model 皆耗盡重試次數仍 429 -> 拋出 ServiceBusyError
          expect(fastCalls.length).toBe(4);
          expect(fastCalls[0]).toEqual(messages);
          expect(outcome.ok).toBe(false);
          expect(outcome.error).toBeInstanceOf(ServiceBusyErrorClass);
        }
      ),
      { numRuns: 30 }
    );
  });
});
