'use strict';

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 5: 表單比對結果套用規則 — Validates: Requirements 3.2, 3.3, 3.4
 *
 * *For any* Chat_Session（尚未選定表單）與任意 `matched_form_id` 及任意有效表單 ID 集合：
 * 若 `matched_form_id` 存在於該集合中，套用後 `session.selectedFormId` 應等於 `matched_form_id`；
 * 若不存在於集合中（含 null），套用後 `session.selectedFormId` 應保持為 null。
 */

const fc = require('fast-check');
const { applyMatchResult } = require('../../services/chatAssistantService');

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

// matched_form_id 候選值：可能為 null/undefined 或任意整數（含可能不在有效集合中的值）。
const matchedFormIdArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.integer({ min: -1000, max: 1000 })
);

const validFormIdsArb = fc.uniqueArray(fc.integer({ min: -1000, max: 1000 }), {
  maxLength: 10,
});

describe('Feature: ai-chat-form-assistant, Property 5: 表單比對結果套用規則', () => {
  it('matched_form_id 存在於有效集合中則 selectedFormId 等於該值，否則保持為 null', () => {
    fc.assert(
      fc.property(matchedFormIdArb, validFormIdsArb, (matchedFormId, validFormIds) => {
        const session = createBaseSession();

        const result = applyMatchResult(session, matchedFormId, validFormIds);

        const isValidMatch =
          matchedFormId !== null &&
          matchedFormId !== undefined &&
          validFormIds.includes(matchedFormId);

        if (isValidMatch) {
          expect(result.selectedFormId).toBe(matchedFormId);
        } else {
          expect(result.selectedFormId).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式），且其餘欄位維持不變', () => {
    fc.assert(
      fc.property(matchedFormIdArb, validFormIdsArb, (matchedFormId, validFormIds) => {
        const session = createBaseSession({
          messages: [{ id: 'm1', role: 'user', text: 'hi', createdAt: new Date().toISOString() }],
        });
        const sessionSnapshot = JSON.parse(JSON.stringify(session));

        const result = applyMatchResult(session, matchedFormId, validFormIds);

        expect(session).toEqual(sessionSnapshot);
        expect(result.pendingFormSwitch).toBe(session.pendingFormSwitch);
        expect(result.collectedFields).toBe(session.collectedFields);
        expect(result.currentTopicId).toBe(session.currentTopicId);
        expect(result.messages).toBe(session.messages);
        expect(result.stage).toBe(session.stage);
      }),
      { numRuns: 100 }
    );
  });

  it('validFormIds 為 null/undefined 時視為空集合，任何 matched_form_id 皆判定為未比對', () => {
    fc.assert(
      fc.property(matchedFormIdArb, fc.constantFrom(null, undefined), (matchedFormId, emptyValidFormIds) => {
        const session = createBaseSession();

        const result = applyMatchResult(session, matchedFormId, emptyValidFormIds);

        expect(result.selectedFormId).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 6: 非推進動作保持 Chat_Session 階段不變 — Validates: Requirements 3.5, 5.1, 5.2, 5.5
 *
 * *For any* Chat_Session（任一 `stage`）與任意 `action` 為 `need_clarification` 或
 * `answer_question` 的 Structured_Response（包含 `reply_text` 為空字串的情形），
 * 套用該回應後 `session.stage` 應與套用前完全相同。
 */

const { applyNonAdvancingResponse } = require('../../services/chatAssistantService');

const chatSessionStageArb = fc.constantFrom(
  'selecting_form',
  'filling',
  'confirming',
  'submitted'
);

const nonAdvancingActionArb = fc.constantFrom('need_clarification', 'answer_question');

const replyTextArb = fc.oneof(fc.constant(''), fc.string());

const nonAdvancingStructuredResponseArb = fc.record({
  action: nonAdvancingActionArb,
  reply_text: replyTextArb,
  matched_form_id: fc.oneof(fc.constant(null), fc.constant(undefined), fc.integer()),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
});

describe('Feature: ai-chat-form-assistant, Property 6: 非推進動作保持 Chat_Session 階段不變', () => {
  it('action 為 need_clarification 或 answer_question（含 reply_text 為空字串）時，套用後 stage 與套用前完全相同', () => {
    fc.assert(
      fc.property(
        chatSessionStageArb,
        nonAdvancingStructuredResponseArb,
        (stage, structuredResponse) => {
          const session = createBaseSession({ stage });
          const stageBefore = session.stage;

          const result = applyNonAdvancingResponse(session, structuredResponse);

          expect(result.stage).toBe(stageBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式），其餘欄位維持不變', () => {
    fc.assert(
      fc.property(
        chatSessionStageArb,
        nonAdvancingStructuredResponseArb,
        (stage, structuredResponse) => {
          const session = createBaseSession({
            stage,
            collectedFields: { '1': { topicId: 1, value: 'foo' } },
            currentTopicId: 1,
            selectedFormId: 42,
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          const result = applyNonAdvancingResponse(session, structuredResponse);

          expect(session).toEqual(sessionSnapshot);
          expect(result.collectedFields).toEqual(sessionSnapshot.collectedFields);
          expect(result.currentTopicId).toBe(sessionSnapshot.currentTopicId);
          expect(result.selectedFormId).toBe(sessionSnapshot.selectedFormId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 10: 欄位擷取成功時更新、失敗時保留 — Validates: Requirements 4.3, 4.9
 *
 * *For any* Chat_Session 與任意既有 `collectedFields`：當欄位擷取呼叫成功並回傳有效值時，
 * 套用後 `collectedFields` 應包含該筆新值（其餘既有欄位不變）；當欄位擷取呼叫逾時或失敗時，
 * 套用後 `collectedFields` 應與套用前完全相同（不遺失任何既有欄位）。
 */

const { applyFieldExtraction } = require('../../services/chatAssistantService');

const fieldValueArb = fc.record({
  topicId: fc.integer({ min: 1, max: 1000 }),
  value: fc.oneof(fc.string(), fc.array(fc.string(), { maxLength: 5 }), fc.integer()),
});

const collectedFieldsArb = fc.dictionary(
  fc.integer({ min: 1, max: 1000 }).map(String),
  fieldValueArb,
  { maxKeys: 5 }
);

const newFieldsArb = fc.dictionary(
  fc.integer({ min: 1, max: 1000 }).map(String),
  fieldValueArb,
  { maxKeys: 5 }
);

describe('Feature: ai-chat-form-assistant, Property 10: 欄位擷取成功時更新、失敗時保留', () => {
  it('擷取成功時，collectedFields 應合併新欄位且保留既有欄位', () => {
    fc.assert(
      fc.property(collectedFieldsArb, newFieldsArb, (collectedFields, newFields) => {
        const session = createBaseSession({ collectedFields });

        const result = applyFieldExtraction(session, { success: true, fields: newFields });

        // 新欄位皆存在且等於擷取結果
        Object.keys(newFields).forEach((key) => {
          expect(result.collectedFields[key]).toEqual(newFields[key]);
        });

        // 未被新欄位覆寫的既有欄位保持不變
        Object.keys(collectedFields).forEach((key) => {
          if (!Object.prototype.hasOwnProperty.call(newFields, key)) {
            expect(result.collectedFields[key]).toEqual(collectedFields[key]);
          }
        });

        // 不會多出其他未預期的鍵
        expect(Object.keys(result.collectedFields).sort()).toEqual(
          Array.from(new Set([...Object.keys(collectedFields), ...Object.keys(newFields)])).sort()
        );
      }),
      { numRuns: 100 }
    );
  });

  it('擷取逾時或失敗時，collectedFields 應與套用前完全相同', () => {
    const failureResultArb = fc.oneof(
      fc.record({ success: fc.constant(false) }),
      fc.constant(null),
      fc.constant(undefined),
      fc.record({ success: fc.constant(false), fields: newFieldsArb })
    );

    fc.assert(
      fc.property(collectedFieldsArb, failureResultArb, (collectedFields, extractionResult) => {
        const session = createBaseSession({ collectedFields });

        const result = applyFieldExtraction(session, extractionResult);

        expect(result.collectedFields).toEqual(collectedFields);
      }),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式），其餘欄位維持不變', () => {
    fc.assert(
      fc.property(
        collectedFieldsArb,
        fc.oneof(
          fc.record({ success: fc.constant(true), fields: newFieldsArb }),
          fc.record({ success: fc.constant(false) })
        ),
        (collectedFields, extractionResult) => {
          const session = createBaseSession({
            collectedFields,
            selectedFormId: 42,
            currentTopicId: 7,
            stage: 'filling',
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          const result = applyFieldExtraction(session, extractionResult);

          expect(session).toEqual(sessionSnapshot);
          expect(result.selectedFormId).toBe(sessionSnapshot.selectedFormId);
          expect(result.currentTopicId).toBe(sessionSnapshot.currentTopicId);
          expect(result.stage).toBe(sessionSnapshot.stage);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 12: 必填欄位完整度決定摘要階段 — Validates: Requirements 4.6, 4.7
 *
 * *For any* 表單的 `PmsFormTopic` 集合與任意 `collectedFields`：當且僅當所有
 * `isRequired === '1'` 的題目皆存在有效值時，完整度判斷函式回傳「已完整」，
 * Chat_Session 套用後 `stage` 應轉為 `confirming`；否則 `stage` 不應轉為 `confirming`。
 * 使用者於 `confirming` 階段要求修改後，`stage` 應轉回對應題目引導，且在新一輪收集完整後
 * 應能再次轉為 `confirming`。
 */

const { isCollectionComplete, applyCompletionCheck } = require('../../services/chatAssistantService');

const topicArb = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  isRequired: fc.constantFrom('0', '1'),
});

const topicsArb = fc.uniqueArray(topicArb, {
  maxLength: 8,
  selector: (topic) => topic.id,
});

// 有效值：非空白字串、非空陣列、或數字。無效值：undefined/null/空字串/空陣列。
const validFieldValueArb = fc.oneof(
  fc.string({ minLength: 1 }).filter((s) => s.trim() !== ''),
  fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
  fc.integer()
);

function buildCollectedFieldsForTopics(topics, answeredFlags) {
  const fields = {};
  topics.forEach((topic, index) => {
    if (answeredFlags[index]) {
      fields[String(topic.id)] = { topicId: topic.id, value: 'valid-answer' };
    }
  });
  return fields;
}

describe('Feature: ai-chat-form-assistant, Property 12: 必填欄位完整度決定摘要階段', () => {
  it('isCollectionComplete 回傳 true 若且唯若所有必填題目皆有有效值', () => {
    fc.assert(
      fc.property(topicsArb, (topics) => {
        // 任意子集合的必填題目被回答，其餘題目隨機是否被回答
        return fc.assert(
          fc.property(
            fc.array(fc.boolean(), { minLength: topics.length, maxLength: topics.length }),
            (answeredFlags) => {
              const collectedFields = buildCollectedFieldsForTopics(topics, answeredFlags);

              const requiredTopics = topics.filter((t) => t.isRequired === '1');
              const expectedComplete = requiredTopics.every((topic) => {
                const idx = topics.findIndex((t) => t.id === topic.id);
                return answeredFlags[idx] === true;
              });

              const result = isCollectionComplete(topics, collectedFields);

              expect(result).toBe(expectedComplete);
            }
          ),
          { numRuns: 20 }
        );
      }),
      { numRuns: 50 }
    );
  });

  it('applyCompletionCheck：完整時 stage 轉為 confirming，否則 stage 保持不變', () => {
    fc.assert(
      fc.property(
        topicsArb,
        chatSessionStageArb,
        (topics, stage) => {
          fc.assert(
            fc.property(
              fc.array(fc.boolean(), { minLength: topics.length, maxLength: topics.length }),
              (answeredFlags) => {
                const collectedFields = buildCollectedFieldsForTopics(topics, answeredFlags);
                const session = createBaseSession({ stage, collectedFields });

                const complete = isCollectionComplete(topics, collectedFields);
                const result = applyCompletionCheck(session, topics);

                if (complete) {
                  expect(result.stage).toBe('confirming');
                } else {
                  expect(result.stage).toBe(stage);
                }
              }
            ),
            { numRuns: 20 }
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('使用者於 confirming 階段要求修改（轉回 filling）後，重新收集完整時應能再次轉為 confirming', () => {
    fc.assert(
      fc.property(topicsArb.filter((topics) => topics.some((t) => t.isRequired === '1')), (topics) => {
        // 第一輪：全部收集完整 -> confirming
        const fullyAnsweredFields = buildCollectedFieldsForTopics(
          topics,
          topics.map(() => true)
        );
        let session = createBaseSession({ stage: 'filling', collectedFields: fullyAnsweredFields });
        session = applyCompletionCheck(session, topics);
        expect(session.stage).toBe('confirming');

        // 使用者要求修改某一必填題目 -> 轉回 filling，並清空該題答案
        const requiredTopic = topics.find((t) => t.isRequired === '1');
        const partialFields = { ...session.collectedFields };
        delete partialFields[String(requiredTopic.id)];
        session = { ...session, stage: 'filling', collectedFields: partialFields };

        // 尚未補齊該題目時，不應轉為 confirming
        const incompleteResult = applyCompletionCheck(session, topics);
        expect(incompleteResult.stage).toBe('filling');

        // 補齊該題目後，應再次轉為 confirming
        session = {
          ...session,
          collectedFields: {
            ...session.collectedFields,
            [String(requiredTopic.id)]: { topicId: requiredTopic.id, value: 'updated-answer' },
          },
        };
        const completeAgainResult = applyCompletionCheck(session, topics);
        expect(completeAgainResult.stage).toBe('confirming');
      }),
      { numRuns: 50 }
    );
  });

  it('applyCompletionCheck 不會修改傳入的 session 物件（純函式）', () => {
    fc.assert(
      fc.property(topicsArb, chatSessionStageArb, (topics, stage) => {
        const collectedFields = buildCollectedFieldsForTopics(
          topics,
          topics.map(() => true)
        );
        const session = createBaseSession({ stage, collectedFields });
        const sessionSnapshot = JSON.parse(JSON.stringify(session));

        applyCompletionCheck(session, topics);

        expect(session).toEqual(sessionSnapshot);
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 13: 離題問答不移動題目指標 — Validates: Requirements 4.8
 *
 * *For any* Chat_Session（任意 `currentTopicId`）與任意離題問答回覆文字：
 * 套用 `applyOffTopicAnswer` 前後，`session.currentTopicId` 應完全相同。
 */

const { applyOffTopicAnswer } = require('../../services/chatAssistantService');

const currentTopicIdArb = fc.oneof(
  fc.constant(null),
  fc.integer({ min: 1, max: 1000 })
);

const replyTextForOffTopicArb = fc.oneof(fc.constant(''), fc.string());

describe('Feature: ai-chat-form-assistant, Property 13: 離題問答不移動題目指標', () => {
  it('套用離題問答回覆前後，currentTopicId 應完全相同', () => {
    fc.assert(
      fc.property(currentTopicIdArb, replyTextForOffTopicArb, (currentTopicId, replyText) => {
        const session = createBaseSession({ currentTopicId });
        const currentTopicIdBefore = session.currentTopicId;

        const result = applyOffTopicAnswer(session, replyText);

        expect(result.currentTopicId).toBe(currentTopicIdBefore);
      }),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式），其餘欄位維持不變', () => {
    fc.assert(
      fc.property(currentTopicIdArb, replyTextForOffTopicArb, (currentTopicId, replyText) => {
        const session = createBaseSession({
          currentTopicId,
          selectedFormId: 42,
          collectedFields: { '1': { topicId: 1, value: 'foo' } },
          stage: 'filling',
        });
        const sessionSnapshot = JSON.parse(JSON.stringify(session));

        const result = applyOffTopicAnswer(session, replyText);

        expect(session).toEqual(sessionSnapshot);
        expect(result.selectedFormId).toBe(sessionSnapshot.selectedFormId);
        expect(result.collectedFields).toEqual(sessionSnapshot.collectedFields);
        expect(result.stage).toBe(sessionSnapshot.stage);
      }),
      { numRuns: 100 }
    );
  });

  it('與任意其他非離題操作交錯後，離題問答仍不移動 currentTopicId（模擬插話情境）', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(replyTextForOffTopicArb, { minLength: 1, maxLength: 5 }),
        (initialTopicId, offTopicReplies) => {
          let session = createBaseSession({ currentTopicId: initialTopicId });

          offTopicReplies.forEach((replyText) => {
            session = applyOffTopicAnswer(session, replyText);
          });

          expect(session.currentTopicId).toBe(initialTopicId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 7: 表單切換需經確認且不立即變更已收集欄位 — Validates: Requirements 3.6
 *
 * *For any* Chat_Session（已選定表單 A，且 `collectedFields` 非空）與比對到相異表單 B 的結果，
 * 套用後 `session.selectedFormId` 仍應為 A、`session.collectedFields` 應維持不變，
 * 且 `session.pendingFormSwitch` 應被設定為指向 B。
 */

const { requestFormSwitch } = require('../../services/chatAssistantService');

const nonEmptyCollectedFieldsArb = fc.dictionary(
  fc.integer({ min: 1, max: 1000 }).map(String),
  fieldValueArb,
  { minKeys: 1, maxKeys: 5 }
);

const formIdArb = fc.integer({ min: 1, max: 1000 });

describe('Feature: ai-chat-form-assistant, Property 7: 表單切換需經確認且不立即變更已收集欄位', () => {
  it('套用 requestFormSwitch 後，selectedFormId 維持 A、collectedFields 不變，pendingFormSwitch 指向 B', () => {
    fc.assert(
      fc.property(
        formIdArb,
        formIdArb,
        nonEmptyCollectedFieldsArb,
        (formIdA, formIdB, collectedFields) => {
          fc.pre(formIdA !== formIdB);

          const session = createBaseSession({
            selectedFormId: formIdA,
            collectedFields,
            stage: 'filling',
          });

          const result = requestFormSwitch(session, formIdB);

          expect(result.selectedFormId).toBe(formIdA);
          expect(result.collectedFields).toEqual(collectedFields);
          expect(result.pendingFormSwitch).toEqual({ newFormId: formIdB });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式），其餘欄位維持不變', () => {
    fc.assert(
      fc.property(
        formIdArb,
        formIdArb,
        nonEmptyCollectedFieldsArb,
        (formIdA, formIdB, collectedFields) => {
          fc.pre(formIdA !== formIdB);

          const session = createBaseSession({
            selectedFormId: formIdA,
            collectedFields,
            currentTopicId: 7,
            stage: 'filling',
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          const result = requestFormSwitch(session, formIdB);

          expect(session).toEqual(sessionSnapshot);
          expect(result.currentTopicId).toBe(sessionSnapshot.currentTopicId);
          expect(result.stage).toBe(sessionSnapshot.stage);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 8: 表單切換確認決策 — Validates: Requirements 3.7, 3.8
 *
 * *For any* Chat_Session 處於 `pendingFormSwitch` 指向表單 B 的狀態，且 `collectedFields` 非空：
 * 若使用者訊息被判定為「確認切換」，套用後 `session.selectedFormId` 應等於 B 且
 * `session.collectedFields` 應為空集合；若判定為「拒絕」或「未明確回覆」，套用後
 * `session.selectedFormId` 應保持為原表單、`session.collectedFields` 應與套用前完全相同。
 */

const { resolveFormSwitch } = require('../../services/chatAssistantService');

describe('Feature: ai-chat-form-assistant, Property 8: 表單切換確認決策', () => {
  it('確認切換時，selectedFormId 等於 B 且 collectedFields 清空為空集合', () => {
    fc.assert(
      fc.property(
        formIdArb,
        formIdArb,
        nonEmptyCollectedFieldsArb,
        (formIdA, formIdB, collectedFields) => {
          fc.pre(formIdA !== formIdB);

          const session = createBaseSession({
            selectedFormId: formIdA,
            collectedFields,
            pendingFormSwitch: { newFormId: formIdB },
            stage: 'filling',
          });

          const result = resolveFormSwitch(session, true);

          expect(result.selectedFormId).toBe(formIdB);
          expect(result.collectedFields).toEqual({});
          expect(result.pendingFormSwitch).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('拒絕切換或未明確回覆時，selectedFormId 與 collectedFields 皆與套用前完全相同', () => {
    fc.assert(
      fc.property(
        formIdArb,
        formIdArb,
        nonEmptyCollectedFieldsArb,
        (formIdA, formIdB, collectedFields) => {
          fc.pre(formIdA !== formIdB);

          const session = createBaseSession({
            selectedFormId: formIdA,
            collectedFields,
            pendingFormSwitch: { newFormId: formIdB },
            stage: 'filling',
          });

          const result = resolveFormSwitch(session, false);

          expect(result.selectedFormId).toBe(formIdA);
          expect(result.collectedFields).toEqual(collectedFields);
          expect(result.pendingFormSwitch).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式）', () => {
    fc.assert(
      fc.property(
        formIdArb,
        formIdArb,
        nonEmptyCollectedFieldsArb,
        fc.boolean(),
        (formIdA, formIdB, collectedFields, isConfirmed) => {
          fc.pre(formIdA !== formIdB);

          const session = createBaseSession({
            selectedFormId: formIdA,
            collectedFields,
            pendingFormSwitch: { newFormId: formIdB },
            currentTopicId: 7,
            stage: 'filling',
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          resolveFormSwitch(session, isConfirmed);

          expect(session).toEqual(sessionSnapshot);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 14: feedbackContent 恰好排除聯絡資訊欄位 — Validates: Requirements 6.1
 *
 * *For any* `collectedFields`（可能混合任意題目鍵與聯絡資訊鍵）：
 * `buildFeedbackContent` 回傳的物件應恰好排除
 * `contactName`/`contactMobile`/`contactLandline`/`contactEmail`/`contactAddressDetail`
 * 五個鍵，其餘鍵值應原樣保留。
 */

const { buildFeedbackContent } = require('../../services/chatAssistantService');

const CONTACT_FIELD_KEYS_FOR_TEST = [
  'contactName',
  'contactMobile',
  'contactLandline',
  'contactEmail',
  'contactAddressDetail',
];

// 一般題目鍵：避免與聯絡資訊鍵名衝突的字串或數字鍵（以字串表示）
const nonContactKeyArb = fc
  .integer({ min: 1, max: 1000 })
  .map(String)
  .filter((key) => !CONTACT_FIELD_KEYS_FOR_TEST.includes(key));

const arbitraryFieldValueArb = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.array(fc.string(), { maxLength: 5 }),
  fieldValueArb
);

// 混合一般欄位（任意鍵）與聯絡資訊欄位（固定鍵，是否出現隨機）的 collectedFields
const mixedCollectedFieldsArb = fc
  .tuple(
    fc.dictionary(nonContactKeyArb, arbitraryFieldValueArb, { maxKeys: 6 }),
    fc.subarray(CONTACT_FIELD_KEYS_FOR_TEST),
    fc.array(arbitraryFieldValueArb, { minLength: 0, maxLength: 5 })
  )
  .map(([nonContactFields, presentContactKeys, contactValues]) => {
    const contactFields = {};
    presentContactKeys.forEach((key, index) => {
      contactFields[key] = contactValues[index % Math.max(contactValues.length, 1)] ?? 'contact-value';
    });
    return { ...nonContactFields, ...contactFields };
  });

describe('Feature: ai-chat-form-assistant, Property 14: feedbackContent 恰好排除聯絡資訊欄位', () => {
  it('回傳物件恰好排除五個聯絡資訊鍵，其餘鍵值原樣保留', () => {
    fc.assert(
      fc.property(mixedCollectedFieldsArb, (collectedFields) => {
        const result = buildFeedbackContent(collectedFields);

        // 聯絡資訊鍵一律不存在於結果中
        CONTACT_FIELD_KEYS_FOR_TEST.forEach((key) => {
          expect(Object.prototype.hasOwnProperty.call(result, key)).toBe(false);
        });

        // 其餘鍵值原樣保留
        Object.keys(collectedFields).forEach((key) => {
          if (!CONTACT_FIELD_KEYS_FOR_TEST.includes(key)) {
            expect(result[key]).toEqual(collectedFields[key]);
          }
        });

        // 結果鍵集合恰為輸入鍵集合扣除聯絡資訊鍵
        const expectedKeys = Object.keys(collectedFields)
          .filter((key) => !CONTACT_FIELD_KEYS_FOR_TEST.includes(key))
          .sort();
        expect(Object.keys(result).sort()).toEqual(expectedKeys);
      }),
      { numRuns: 100 }
    );
  });

  it('全部五個聯絡資訊鍵皆存在時，結果為只剩一般欄位的物件', () => {
    fc.assert(
      fc.property(
        fc.dictionary(nonContactKeyArb, arbitraryFieldValueArb, { maxKeys: 6 }),
        (nonContactFields) => {
          const collectedFields = {
            ...nonContactFields,
            contactName: 'Alice',
            contactMobile: '0912345678',
            contactLandline: '02-12345678',
            contactEmail: 'alice@example.com',
            contactAddressDetail: '某路 1 號',
          };

          const result = buildFeedbackContent(collectedFields);

          expect(Object.keys(result).sort()).toEqual(Object.keys(nonContactFields).sort());
          Object.keys(nonContactFields).forEach((key) => {
            expect(result[key]).toEqual(nonContactFields[key]);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('collectedFields 為空、null 或 undefined 時，回傳空物件', () => {
    fc.assert(
      fc.property(fc.constantFrom(undefined, null, {}), (input) => {
        const result = buildFeedbackContent(input);
        expect(result).toEqual({});
      }),
      { numRuns: 10 }
    );
  });

  it('不會修改傳入的 collectedFields 物件（純函式）', () => {
    fc.assert(
      fc.property(mixedCollectedFieldsArb, (collectedFields) => {
        const snapshot = JSON.parse(JSON.stringify(collectedFields));

        buildFeedbackContent(collectedFields);

        expect(collectedFields).toEqual(snapshot);
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 15: 未登入送出被拒且不清空已收集欄位 — Validates: Requirements 6.2
 *
 * *For any* Chat_Session（任意 `collectedFields`）與任意 `userId`：
 * 當 `userId` 為 `null`/`undefined`（未登入）時，`assertLoggedInForSubmit` 應拒絕
 * （`allowed: false`, `code: 'AUTH_REQUIRED'`），且回傳的 `session.collectedFields`
 * 應與套用前完全相同（不被清空或變更）；當 `userId` 已提供（已登入）時，應允許
 * （`allowed: true`, `code: null`），且 `collectedFields` 同樣維持不變。
 */

const { assertLoggedInForSubmit } = require('../../services/chatAssistantService');

const loggedOutUserIdArb = fc.constantFrom(null, undefined);

const loggedInUserIdArb = fc.oneof(
  fc.string({ minLength: 1 }),
  fc.integer({ min: 1, max: 100000 })
);

describe('Feature: ai-chat-form-assistant, Property 15: 未登入送出被拒且不清空已收集欄位', () => {
  it('userId 為 null/undefined 時應拒絕送出（AUTH_REQUIRED），且 collectedFields 完全不變', () => {
    fc.assert(
      fc.property(collectedFieldsArb, loggedOutUserIdArb, (collectedFields, userId) => {
        const session = createBaseSession({ collectedFields, stage: 'confirming' });

        const result = assertLoggedInForSubmit(session, userId);

        expect(result.allowed).toBe(false);
        expect(result.code).toBe('AUTH_REQUIRED');
        expect(result.session.collectedFields).toEqual(collectedFields);
      }),
      { numRuns: 100 }
    );
  });

  it('userId 已提供（已登入）時應允許送出，且 collectedFields 完全不變', () => {
    fc.assert(
      fc.property(collectedFieldsArb, loggedInUserIdArb, (collectedFields, userId) => {
        const session = createBaseSession({ collectedFields, stage: 'confirming' });

        const result = assertLoggedInForSubmit(session, userId);

        expect(result.allowed).toBe(true);
        expect(result.code).toBeNull();
        expect(result.session.collectedFields).toEqual(collectedFields);
      }),
      { numRuns: 100 }
    );
  });

  it('無論允許或拒絕，回傳的 session 皆與傳入的 session 完全相同（僅為淺拷貝），且不修改原始 session', () => {
    fc.assert(
      fc.property(
        collectedFieldsArb,
        fc.oneof(loggedOutUserIdArb, loggedInUserIdArb),
        (collectedFields, userId) => {
          const session = createBaseSession({
            collectedFields,
            selectedFormId: 42,
            currentTopicId: 7,
            stage: 'confirming',
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          const result = assertLoggedInForSubmit(session, userId);

          expect(session).toEqual(sessionSnapshot);
          expect(result.session).toEqual(sessionSnapshot);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 20: 兩模型皆忙碌時 Chat_Session 狀態不受影響 — Validates: Requirements 7.6
 *
 * *For any* Chat_Session（任意 `collectedFields`/`selectedFormId`/`currentTopicId`/`stage`）：
 * 套用 `applyServiceBusyError` 後，除 `messages` 新增一則系統錯誤訊息外，
 * `collectedFields`、`selectedFormId`、`currentTopicId`、`stage` 皆與套用前完全相同。
 */

const { applyServiceBusyError } = require('../../services/chatAssistantService');

const selectedFormIdArb = fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 }));

const messagesArb = fc.array(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    role: fc.constantFrom('user', 'assistant'),
    text: fc.string(),
    createdAt: fc.constant(new Date().toISOString()),
  }),
  { maxLength: 5 }
);

describe('Feature: ai-chat-form-assistant, Property 20: 兩模型皆忙碌時 Chat_Session 狀態不受影響', () => {
  it('套用後 collectedFields/selectedFormId/currentTopicId/stage 皆與套用前完全相同', () => {
    fc.assert(
      fc.property(
        collectedFieldsArb,
        selectedFormIdArb,
        currentTopicIdArb,
        chatSessionStageArb,
        messagesArb,
        (collectedFields, selectedFormId, currentTopicId, stage, messages) => {
          const session = createBaseSession({
            collectedFields,
            selectedFormId,
            currentTopicId,
            stage,
            messages,
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          const result = applyServiceBusyError(session);

          expect(result.collectedFields).toEqual(sessionSnapshot.collectedFields);
          expect(result.selectedFormId).toBe(sessionSnapshot.selectedFormId);
          expect(result.currentTopicId).toBe(sessionSnapshot.currentTopicId);
          expect(result.stage).toBe(sessionSnapshot.stage);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('messages 應恰好新增一則 role 為 assistant 的系統錯誤訊息，其餘既有訊息保持原順序與內容不變', () => {
    fc.assert(
      fc.property(messagesArb, (messages) => {
        const session = createBaseSession({ messages });

        const result = applyServiceBusyError(session);

        expect(result.messages.length).toBe(messages.length + 1);
        // 既有訊息保持原順序與內容不變
        for (let i = 0; i < messages.length; i += 1) {
          expect(result.messages[i]).toEqual(messages[i]);
        }
        // 新增的最後一則訊息為 assistant 角色，且具備 id/text/createdAt
        const newMessage = result.messages[result.messages.length - 1];
        expect(newMessage.role).toBe('assistant');
        expect(typeof newMessage.text).toBe('string');
        expect(newMessage.text.length).toBeGreaterThan(0);
        expect(typeof newMessage.id).toBe('string');
        expect(typeof newMessage.createdAt).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('不會修改傳入的 session 物件（純函式），且不修改原始 messages 陣列', () => {
    fc.assert(
      fc.property(
        collectedFieldsArb,
        selectedFormIdArb,
        currentTopicIdArb,
        chatSessionStageArb,
        messagesArb,
        (collectedFields, selectedFormId, currentTopicId, stage, messages) => {
          const session = createBaseSession({
            collectedFields,
            selectedFormId,
            currentTopicId,
            stage,
            messages,
          });
          const sessionSnapshot = JSON.parse(JSON.stringify(session));

          applyServiceBusyError(session);

          expect(session).toEqual(sessionSnapshot);
          expect(session.messages.length).toBe(messages.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('session.messages 為 undefined 時，套用後應僅包含新增的錯誤訊息', () => {
    fc.assert(
      fc.property(collectedFieldsArb, (collectedFields) => {
        const session = createBaseSession({ collectedFields, messages: undefined });

        const result = applyServiceBusyError(session);

        expect(result.messages.length).toBe(1);
        expect(result.messages[0].role).toBe('assistant');
      }),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 16: 聯絡資訊加解密往返與未提供值的 null 處理
 * （本測試涵蓋未提供值 null 處理與代碼值直寫部分；往返部分見
 * `backend/__tests__/utils/crypto.property.test.js` 任務 1.3）
 * Validates: Requirements 6.3
 *
 * *For any* 聯絡資訊輸入（`contactName`/`contactMobile`/`contactLandline`/
 * `contactEmail`/`contactAddressDetail` 各自可能未提供）：未提供的欄位與其對應
 * 雜湊欄位皆應為 `null`，且 `encryptField` 不應被呼叫；`contactAddressCounty`/
 * `contactAddressDistrict` 在組裝結果中應與輸入代碼值完全相同（不加密、不雜湊）。
 */

jest.mock('../../utils/crypto', () => {
  const actual = jest.requireActual('../../utils/crypto');
  return {
    ...actual,
    encryptField: jest.fn(actual.encryptField),
  };
});

const nodeCrypto = require('crypto');
const cryptoUtils = require('../../utils/crypto');
const { buildContactFields } = require('../../services/chatAssistantService');

// 欄位值：可能未提供（undefined/null/空字串）或任意非空字串。
const contactStringValueArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 50 })
);

const contactInputArb = fc.record({
  contactName: contactStringValueArb,
  contactMobile: contactStringValueArb,
  contactLandline: contactStringValueArb,
  contactEmail: contactStringValueArb,
  contactAddressDetail: contactStringValueArb,
  contactAddressCounty: contactStringValueArb,
  contactAddressDistrict: contactStringValueArb,
});

function isContactValueProvidedForTest(value) {
  return value !== undefined && value !== null && value !== '';
}

describe('Feature: ai-chat-form-assistant, Property 16: 聯絡資訊組裝之未提供值 null 處理與代碼值直寫', () => {
  beforeAll(() => {
    // 設定一個合法的 32-byte hex 字串作為 ENCRYPTION_KEY，供 encryptField 使用。
    process.env.ENCRYPTION_KEY = nodeCrypto.randomBytes(32).toString('hex');
  });

  beforeEach(() => {
    cryptoUtils.encryptField.mockClear();
  });

  it('未提供之聯絡欄位與對應雜湊欄位皆為 null，且不呼叫 encryptField；已提供之欄位正確加密/雜湊', () => {
    fc.assert(
      fc.property(contactInputArb, (contactInput) => {
        cryptoUtils.encryptField.mockClear();

        const result = buildContactFields(contactInput);

        const encryptedFieldSpecs = [
          { key: 'contactName', hashKey: 'contactNameHash', hashFn: cryptoUtils.hashContactField },
          { key: 'contactMobile', hashKey: 'contactMobileHash', hashFn: cryptoUtils.hashContactField },
          { key: 'contactLandline', hashKey: 'contactLandlineHash', hashFn: cryptoUtils.hashContactField },
          { key: 'contactEmail', hashKey: 'contactEmailHash', hashFn: cryptoUtils.hashEmail },
          { key: 'contactAddressDetail', hashKey: 'contactAddressDetailHash', hashFn: cryptoUtils.hashContactField },
        ];

        let expectedEncryptCallCount = 0;

        encryptedFieldSpecs.forEach(({ key, hashKey, hashFn }) => {
          const inputValue = contactInput[key];

          if (!isContactValueProvidedForTest(inputValue)) {
            expect(result[key]).toBeNull();
            expect(result[hashKey]).toBeNull();
          } else {
            expectedEncryptCallCount += 1;
            expect(Buffer.isBuffer(result[key])).toBe(true);
            expect(result[hashKey]).toBe(hashFn(inputValue));
          }
        });

        // encryptField 恰好被呼叫「已提供之加密欄位數量」次，且每次呼叫的參數皆為對應的原始輸入值
        expect(cryptoUtils.encryptField).toHaveBeenCalledTimes(expectedEncryptCallCount);
        encryptedFieldSpecs.forEach(({ key }) => {
          const inputValue = contactInput[key];
          if (isContactValueProvidedForTest(inputValue)) {
            expect(cryptoUtils.encryptField).toHaveBeenCalledWith(inputValue);
          }
        });

        // contactAddressCounty/contactAddressDistrict 為代碼值，直接原樣寫入（不加密、不雜湊）
        expect(result.contactAddressCounty).toBe(
          isContactValueProvidedForTest(contactInput.contactAddressCounty)
            ? contactInput.contactAddressCounty
            : null
        );
        expect(result.contactAddressDistrict).toBe(
          isContactValueProvidedForTest(contactInput.contactAddressDistrict)
            ? contactInput.contactAddressDistrict
            : null
        );
      }),
      { numRuns: 100 }
    );
  });

  it('所有聯絡欄位皆未提供時，結果中對應欄位與雜湊欄位皆為 null，且 encryptField 完全未被呼叫', () => {
    const result = buildContactFields({});

    expect(result).toEqual({
      contactName: null,
      contactNameHash: null,
      contactMobile: null,
      contactMobileHash: null,
      contactLandline: null,
      contactLandlineHash: null,
      contactEmail: null,
      contactEmailHash: null,
      contactAddressCounty: null,
      contactAddressDistrict: null,
      contactAddressDetail: null,
      contactAddressDetailHash: null,
    });
    expect(cryptoUtils.encryptField).not.toHaveBeenCalled();
  });

  it('contactAddressCounty/contactAddressDistrict 在提供任意代碼字串時應與輸入值完全相同', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (county, district) => {
          const result = buildContactFields({
            contactAddressCounty: county,
            contactAddressDistrict: district,
          });

          expect(result.contactAddressCounty).toBe(county);
          expect(result.contactAddressDistrict).toBe(district);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('contactInput 為 undefined 時不會拋出例外，並回傳全為 null 的欄位物件', () => {
    const result = buildContactFields(undefined);

    Object.values(result).forEach((value) => {
      expect(value).toBeNull();
    });
    expect(cryptoUtils.encryptField).not.toHaveBeenCalled();
  });
});

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 17: 送出失敗具原子性且保留已收集欄位 — Validates: Requirements 6.5
 *
 * *For any* Chat_Session（任意 `collectedFields`）與任意已登入 `userId`：當資料組裝階段
 * （表單反查、服務代碼反查、`feedbackNo` 產生）任一步驟失敗時，`prisma.pmsFormFeedback.create`
 * 絕不應被呼叫（組裝與驗證必須在寫入之前全部完成，任一步驟失敗即中止且不建立紀錄），
 * 且 `session.collectedFields` 在送出呼叫前後應完全相同。當資料組裝成功但寫入資料庫階段
 * 失敗時，`create` 應恰好被呼叫一次，且 `session.collectedFields` 仍應完全相同（送出失敗
 * 不應清空或變更呼叫端保留的已收集欄位）。
 */

const { submitFeedback: submitFeedbackForAtomicity } = require('../../services/chatAssistantService');

/**
 * 依失敗模式建立對應的 mock Prisma Client：
 * - 'form_not_found'：`pmsForm.findUnique` 回傳 null（表單反查失敗，組裝中止）
 * - 'service_lookup_error'：`cmsHomepageService.findMany` 拒絕（服務代碼反查失敗，組裝中止）
 * - 'feedback_no_exhausted'：`pmsFormFeedback.findUnique` 永遠回傳已存在紀錄（碰撞重試耗盡，組裝中止）
 * - 'create_rejects'：組裝成功，但 `pmsFormFeedback.create` 拒絕（寫入階段失敗）
 * @param {('form_not_found'|'service_lookup_error'|'feedback_no_exhausted'|'create_rejects')} failureMode
 */
function createMockPrismaForFailureMode(failureMode) {
  const createMock = jest.fn().mockImplementation(({ data }) => Promise.resolve(data));

  const base = {
    pmsForm: {
      findUnique: jest.fn().mockResolvedValue({ serviceVendorId: 10, type: '01' }),
    },
    cmsHomepageService: {
      findMany: jest.fn().mockResolvedValue([{ id: 99 }]),
    },
    pmsFormFeedback: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: createMock,
    },
  };

  if (failureMode === 'form_not_found') {
    base.pmsForm.findUnique = jest.fn().mockResolvedValue(null);
  } else if (failureMode === 'service_lookup_error') {
    base.cmsHomepageService.findMany = jest.fn().mockRejectedValue(new Error('service lookup failed'));
  } else if (failureMode === 'feedback_no_exhausted') {
    base.pmsFormFeedback.findUnique = jest.fn().mockResolvedValue({ feedbackNo: 'existing' });
  } else if (failureMode === 'create_rejects') {
    base.pmsFormFeedback.create = jest.fn().mockRejectedValue(new Error('write failed'));
  }

  return base;
}

const assemblyFailureModeArb = fc.constantFrom(
  'form_not_found',
  'service_lookup_error',
  'feedback_no_exhausted'
);

const anyFailureModeArb = fc.constantFrom(
  'form_not_found',
  'service_lookup_error',
  'feedback_no_exhausted',
  'create_rejects'
);

describe('Feature: ai-chat-form-assistant, Property 17: 送出失敗具原子性且保留已收集欄位', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
  });

  it('資料組裝階段任一步驟失敗時，create 絕不被呼叫，且 collectedFields 送出前後完全相同', async () => {
    await fc.assert(
      fc.asyncProperty(
        collectedFieldsArb,
        loggedInUserIdArb,
        assemblyFailureModeArb,
        async (collectedFields, userId, failureMode) => {
          const prisma = createMockPrismaForFailureMode(failureMode);
          const session = createBaseSession({ selectedFormId: 1, collectedFields, stage: 'confirming' });
          const collectedFieldsSnapshot = JSON.parse(JSON.stringify(collectedFields));

          const result = await submitFeedbackForAtomicity(session, userId, prisma);

          expect(result.success).toBe(false);
          expect(prisma.pmsFormFeedback.create).not.toHaveBeenCalled();
          expect(session.collectedFields).toEqual(collectedFieldsSnapshot);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('無論組裝失敗或寫入失敗，submitFeedback 皆不修改傳入 session 的 collectedFields（呼叫端狀態保留）', async () => {
    await fc.assert(
      fc.asyncProperty(
        collectedFieldsArb,
        loggedInUserIdArb,
        anyFailureModeArb,
        async (collectedFields, userId, failureMode) => {
          const prisma = createMockPrismaForFailureMode(failureMode);
          const session = createBaseSession({ selectedFormId: 1, collectedFields, stage: 'confirming' });
          const collectedFieldsSnapshot = JSON.parse(JSON.stringify(collectedFields));

          const result = await submitFeedbackForAtomicity(session, userId, prisma);

          expect(result.success).toBe(false);
          expect(result.code).toBe('SUBMIT_FAILED');
          // session 物件本身（含其 collectedFields 參照）在呼叫前後保持不變
          expect(session.collectedFields).toEqual(collectedFieldsSnapshot);

          if (failureMode === 'create_rejects') {
            // 組裝成功，寫入階段才失敗：create 應恰好被呼叫一次
            expect(prisma.pmsFormFeedback.create).toHaveBeenCalledTimes(1);
          } else {
            // 組裝階段即失敗：create 絕不應被呼叫
            expect(prisma.pmsFormFeedback.create).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('組裝成功且寫入成功時，create 於組裝完成後恰好被呼叫一次，且 collectedFields 送出前後完全相同', async () => {
    await fc.assert(
      fc.asyncProperty(collectedFieldsArb, loggedInUserIdArb, async (collectedFields, userId) => {
        const prisma = createMockPrismaForFailureMode(null);
        const session = createBaseSession({ selectedFormId: 1, collectedFields, stage: 'confirming' });
        const collectedFieldsSnapshot = JSON.parse(JSON.stringify(collectedFields));

        const result = await submitFeedbackForAtomicity(session, userId, prisma);

        expect(result.success).toBe(true);
        expect(prisma.pmsFormFeedback.create).toHaveBeenCalledTimes(1);
        expect(session.collectedFields).toEqual(collectedFieldsSnapshot);
      }),
      { numRuns: 50 }
    );
  });
});
