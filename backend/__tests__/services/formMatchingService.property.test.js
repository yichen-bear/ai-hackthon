'use strict';

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 11: 答案驗證正確反映題目限制條件 — Validates: Requirements 4.4, 4.5
 *
 * *For any* `PmsFormTopic` 定義（含 `type`、`isRequired`、關聯 `PmsTopicOption` 清單、
 * `minimumMediasUpload`/`maximumMediasUpload`、`startDateOffsetDays`/`endDateOffsetDays`）與任意候選答案：
 * `validateAnswerAgainstTopic()` 回傳「有效」時，該答案必定符合對應題型的格式與所有已定義限制
 * （在選項清單內／媒體數量落在範圍內／日期落在允許區間內）；回傳「無效」時，該答案必定違反至少一項限制或格式；
 * 當 `isRequired === '1'` 且答案為「跳過」時，一律回傳「無效」。
 */

const fc = require('fast-check');
const { validateAnswerAgainstTopic } = require('../../services/formMatchingService');
const { TOPIC_TYPE } = require('../../constants/formCodes');

// 與 formMatchingService.js 中「跳過」定義一致的獨立判斷（供測試獨立驗證，不直接重用實作內部函式）。
function isSkippedAnswer(rawAnswer) {
  if (rawAnswer === undefined || rawAnswer === null) return true;
  if (typeof rawAnswer === 'string' && rawAnswer.trim() === '') return true;
  if (Array.isArray(rawAnswer) && rawAnswer.length === 0) return true;
  return false;
}

const isRequiredArb = fc.constantFrom('0', '1');

// 通用「任意型別」答案產生器，用於涵蓋各種格式錯誤的輸入。
const anyAnswerArb = fc.oneof(
  fc.string({ maxLength: 20 }),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.array(fc.integer(), { maxLength: 5 }),
  fc.array(fc.string({ maxLength: 10 }), { maxLength: 5 })
);

describe('Feature: ai-chat-form-assistant, Property 11: 答案驗證正確反映題目限制條件', () => {
  it('isRequired 為 "1" 且答案為「跳過」時，一律回傳無效', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          TOPIC_TYPE.TEXT,
          TOPIC_TYPE.NUMBER,
          TOPIC_TYPE.SINGLE_CHOICE,
          TOPIC_TYPE.MULTIPLE_CHOICE,
          TOPIC_TYPE.DATE,
          TOPIC_TYPE.IMAGE_UPLOAD
        ),
        fc.constantFrom(undefined, null, '', '   ', []),
        (type, skippedAnswer) => {
          const topic = { type, isRequired: '1', options: [] };
          const result = validateAnswerAgainstTopic(topic, skippedAnswer);

          expect(isSkippedAnswer(skippedAnswer)).toBe(true);
          expect(result.valid).toBe(false);
          expect(result.errorMessage).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isRequired 為 "0" 且答案為「跳過」時，一律回傳有效（視為未回答但允許跳過）', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          TOPIC_TYPE.TEXT,
          TOPIC_TYPE.NUMBER,
          TOPIC_TYPE.SINGLE_CHOICE,
          TOPIC_TYPE.MULTIPLE_CHOICE,
          TOPIC_TYPE.DATE,
          TOPIC_TYPE.IMAGE_UPLOAD
        ),
        fc.constantFrom(undefined, null, '', '   ', []),
        (type, skippedAnswer) => {
          const topic = { type, isRequired: '0', options: [] };
          const result = validateAnswerAgainstTopic(topic, skippedAnswer);

          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('文字題型（TEXT）：有效時答案為非空白字串，無效時答案非字串或為空白字串', () => {
    fc.assert(
      fc.property(isRequiredArb, anyAnswerArb, (isRequired, rawAnswer) => {
        fc.pre(!isSkippedAnswer(rawAnswer));
        const topic = { type: TOPIC_TYPE.TEXT, isRequired, options: [] };
        const result = validateAnswerAgainstTopic(topic, rawAnswer);

        const independentlyValid = typeof rawAnswer === 'string' && rawAnswer.trim() !== '';

        expect(result.valid).toBe(independentlyValid);
        if (result.valid) {
          expect(typeof result.normalizedValue).toBe('string');
          expect(result.normalizedValue.trim()).toBe(result.normalizedValue);
          expect(result.normalizedValue).not.toBe('');
        } else {
          expect(result.errorMessage).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('數字題型（NUMBER）：有效時答案可解析為數字，無效時答案為布林/陣列/空字串/無法解析為數字', () => {
    fc.assert(
      fc.property(isRequiredArb, anyAnswerArb, (isRequired, rawAnswer) => {
        fc.pre(!isSkippedAnswer(rawAnswer));
        const topic = { type: TOPIC_TYPE.NUMBER, isRequired, options: [] };
        const result = validateAnswerAgainstTopic(topic, rawAnswer);

        const isBooleanOrArrayOrEmptyString =
          typeof rawAnswer === 'boolean' || Array.isArray(rawAnswer) || rawAnswer === '';
        const parsed = typeof rawAnswer === 'number' ? rawAnswer : Number(rawAnswer);
        const independentlyValid = !isBooleanOrArrayOrEmptyString && !Number.isNaN(parsed);

        expect(result.valid).toBe(independentlyValid);
        if (result.valid) {
          expect(typeof result.normalizedValue).toBe('number');
          expect(Number.isNaN(result.normalizedValue)).toBe(false);
        } else {
          expect(result.errorMessage).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('單選題型（SINGLE_CHOICE）：有效時答案為選項清單中某一筆的 id，無效時答案不在清單內或為陣列', () => {
    const optionsArb = fc
      .uniqueArray(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 6 })
      .map((ids) => ids.map((id) => ({ id })));

    fc.assert(
      fc.property(
        isRequiredArb,
        optionsArb,
        fc.oneof(
          // 有效建構：從選項清單中挑一個 id
          fc.integer({ min: 1, max: 1000 }),
          fc.string({ maxLength: 10 }),
          fc.array(fc.integer(), { maxLength: 3 })
        ),
        (isRequired, options, rawAnswer) => {
          fc.pre(!isSkippedAnswer(rawAnswer));
          const topic = { type: TOPIC_TYPE.SINGLE_CHOICE, isRequired, options };
          const result = validateAnswerAgainstTopic(topic, rawAnswer);

          const optionIds = new Set(options.map((o) => o.id));
          const candidateId = typeof rawAnswer === 'number' ? rawAnswer : Number(rawAnswer);
          const independentlyValid = !Array.isArray(rawAnswer) && !Number.isNaN(candidateId) && optionIds.has(candidateId);

          expect(result.valid).toBe(independentlyValid);
          if (result.valid) {
            expect(optionIds.has(result.normalizedValue)).toBe(true);
          } else {
            expect(result.errorMessage).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('多選題型（MULTIPLE_CHOICE）：有效時答案為選項清單子集合，無效時含不存在於清單的項目或非陣列', () => {
    const optionsArb = fc
      .uniqueArray(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 6 })
      .map((ids) => ids.map((id) => ({ id })));

    fc.assert(
      fc.property(
        isRequiredArb,
        optionsArb,
        fc.oneof(
          fc.array(fc.integer({ min: 1, max: 1000 }), { maxLength: 5 }),
          fc.string({ maxLength: 10 }),
          fc.integer()
        ),
        (isRequired, options, rawAnswer) => {
          fc.pre(!isSkippedAnswer(rawAnswer));
          const topic = { type: TOPIC_TYPE.MULTIPLE_CHOICE, isRequired, options };
          const result = validateAnswerAgainstTopic(topic, rawAnswer);

          const optionIds = new Set(options.map((o) => o.id));
          let independentlyValid = false;
          if (Array.isArray(rawAnswer)) {
            independentlyValid = rawAnswer.every((item) => {
              const id = typeof item === 'number' ? item : Number(item);
              return !Number.isNaN(id) && optionIds.has(id);
            });
          }

          expect(result.valid).toBe(independentlyValid);
          if (result.valid) {
            expect(Array.isArray(result.normalizedValue)).toBe(true);
            result.normalizedValue.forEach((id) => expect(optionIds.has(id)).toBe(true));
          } else {
            expect(result.errorMessage).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('日期題型（DATE）：有效時日期落在 startDateOffsetDays/endDateOffsetDays 允許區間內，無效時超出區間或格式錯誤', () => {
    fc.assert(
      fc.property(
        isRequiredArb,
        fc.integer({ min: -30, max: 0 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: -60, max: 60 }),
        fc.boolean(),
        (isRequired, startOffset, endOffset, dayOffset, useInvalidFormat) => {
          const now = new Date();
          const topic = {
            type: TOPIC_TYPE.DATE,
            isRequired,
            startDateOffsetDays: startOffset,
            endDateOffsetDays: endOffset,
            options: [],
          };

          let rawAnswer;
          if (useInvalidFormat) {
            rawAnswer = 'not-a-real-date';
          } else {
            const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
            // 使用本地年月日組裝 YYYY-MM-DD，避免 toISOString() 轉為 UTC 造成日期偏移
            const y = candidate.getFullYear();
            const m = String(candidate.getMonth() + 1).padStart(2, '0');
            const d = String(candidate.getDate()).padStart(2, '0');
            rawAnswer = `${y}-${m}-${d}`;
          }

          const result = validateAnswerAgainstTopic(topic, rawAnswer);

          if (useInvalidFormat) {
            expect(result.valid).toBe(false);
            expect(result.errorMessage).not.toBeNull();
            return;
          }

          const independentlyValid = dayOffset >= startOffset && dayOffset <= endOffset;
          expect(result.valid).toBe(independentlyValid);
          if (result.valid) {
            expect(result.normalizedValue).toBe(rawAnswer);
          } else {
            expect(result.errorMessage).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('上傳圖片題型（IMAGE_UPLOAD）：有效時數量落在 minimumMediasUpload/maximumMediasUpload 範圍內，無效時超出範圍或格式錯誤', () => {
    fc.assert(
      fc.property(
        isRequiredArb,
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 3, max: 6 }),
        fc.integer({ min: 0, max: 8 }),
        (isRequired, minRequired, maxAllowed, mediaCount) => {
          const topic = {
            type: TOPIC_TYPE.IMAGE_UPLOAD,
            isRequired,
            minimumMediasUpload: minRequired,
            maximumMediasUpload: maxAllowed,
            options: [],
          };

          const rawAnswer = Array.from({ length: mediaCount }, (_, i) => `https://example.com/img-${i}.png`);
          fc.pre(!isSkippedAnswer(rawAnswer));

          const result = validateAnswerAgainstTopic(topic, rawAnswer);

          const independentlyValid = mediaCount >= minRequired && mediaCount <= maxAllowed;
          expect(result.valid).toBe(independentlyValid);
          if (result.valid) {
            expect(result.normalizedValue.length).toBe(mediaCount);
          } else {
            expect(result.errorMessage).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('上傳圖片題型（IMAGE_UPLOAD）：非陣列或含非字串/空字串項目的答案一律無效', () => {
    fc.assert(
      fc.property(
        isRequiredArb,
        fc.oneof(
          fc.string({ maxLength: 10 }),
          fc.integer(),
          fc.array(fc.oneof(fc.integer(), fc.constant(''), fc.constant('   ')), { minLength: 1, maxLength: 4 })
        ),
        (isRequired, rawAnswer) => {
          fc.pre(!isSkippedAnswer(rawAnswer));
          const topic = {
            type: TOPIC_TYPE.IMAGE_UPLOAD,
            isRequired,
            minimumMediasUpload: 0,
            maximumMediasUpload: 10,
            options: [],
          };

          const result = validateAnswerAgainstTopic(topic, rawAnswer);
          expect(result.valid).toBe(false);
          expect(result.errorMessage).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 * Property 4: 可選表單清單即為啟用未刪除之子集合
 *
 * *For any* `pms_form` 資料集合，`listActiveForms()` 回傳的表單集合，
 * 恰好等於該資料集合中 `isEnable === '1' && isDeleted === '0'` 的子集合（不多、不少）。
 *
 * **Validates: Requirements 3.1**
 */

const { listActiveForms } = require('../../services/formMatchingService');

// Arbitrary for a single mock pms_form record, using flag-like string values
// so that both matching ('1'/'0') and non-matching values are well represented.
const formRecordArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ maxLength: 20 }),
  introContent: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  isEnable: fc.constantFrom('0', '1', '2', ''),
  isDeleted: fc.constantFrom('0', '1', '2', ''),
});

/**
 * Builds a mock Prisma client whose `pmsForm.findMany` applies the `where`
 * clause it receives against the given in-memory dataset, mirroring the
 * real Prisma filtering semantics for the simple equality filters used by
 * `listActiveForms()`.
 */
function buildMockPrismaClient(records) {
  return {
    pmsForm: {
      findMany: jest.fn(({ where, select } = {}) => {
        const filtered = records.filter((record) => {
          return Object.entries(where || {}).every(
            ([key, value]) => record[key] === value
          );
        });

        if (!select) {
          return Promise.resolve(filtered);
        }

        const projected = filtered.map((record) => {
          const projection = {};
          for (const key of Object.keys(select)) {
            if (select[key]) {
              projection[key] = record[key];
            }
          }
          return projection;
        });

        return Promise.resolve(projected);
      }),
    },
  };
}

describe('Feature: ai-chat-form-assistant, Property 4: 可選表單清單即為啟用未刪除之子集合', () => {
  it('listActiveForms() returns exactly the isEnable === "1" && isDeleted === "0" subset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(formRecordArbitrary, { maxLength: 30 }),
        async (records) => {
          const prismaClient = buildMockPrismaClient(records);

          const result = await listActiveForms(prismaClient);

          const expectedIds = records
            .filter((record) => record.isEnable === '1' && record.isDeleted === '0')
            .map((record) => record.id)
            .sort((a, b) => a - b);

          const actualIds = result.map((form) => form.id).sort((a, b) => a - b);

          expect(actualIds).toEqual(expectedIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
