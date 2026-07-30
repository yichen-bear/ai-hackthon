'use strict';

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 2: 輸入文字驗證閘門 — Validates: Requirements 1.6, 1.7
 * Property 23: 語音輸入截斷保持前綴且不超過上限 — Validates: Requirements 9.5
 * Property 24: 禁用內容判定阻止 LLM 呼叫 — Validates: Requirements 9.6
 */

const fc = require('fast-check');
const {
  LLM_INPUT_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  truncateForLLM,
  containsDisallowedContent,
  containsHtml,
  containsCodeSnippet,
  validateMessageBeforeSend,
} = require('../../utils/inputGuard');

// 與 backend/utils/inputGuard.js 中 DISALLOWED_WORDS 維持一致，供測試產生違規輸入。
const DISALLOWED_WORDS = [
  '仇恨言論',
  '種族歧視',
  '殺光',
  'hate speech',
  '色情',
  '成人影片',
  '裸體',
  'porn',
  'sex video',
  '暴力煽動',
  '恐怖攻擊',
  '殺死你',
  '炸彈製作',
  'kill you',
  'make a bomb',
];

// 安全的 ASCII 字元集合，用於組裝不含 HTML/程式碼特徵、不含禁用詞彙的「乾淨」字串。
const safeCharArb = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ，。！你好謝謝請問服務表單申請'.split('')
);

function containsAnyDisallowedWord(text) {
  const normalized = text.toLowerCase();
  return DISALLOWED_WORDS.some((word) => normalized.includes(word.toLowerCase()));
}

// 「乾淨」字串生成器：避開 HTML 標籤、程式碼片段特徵與禁用詞彙。
const cleanStringArb = fc
  .array(safeCharArb, { minLength: 0, maxLength: 40 })
  .map((chars) => chars.join(''))
  .filter(
    (text) =>
      !containsHtml(text) && !containsCodeSnippet(text) && !containsAnyDisallowedWord(text)
  );

describe('Feature: ai-chat-form-assistant, Property 2: 輸入文字驗證閘門', () => {
  it('validateMessageBeforeSend 的允許/拒絕結果與長度、HTML、程式碼片段、禁用內容檢測完全一致，且輸入字串不被修改', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1500 }), (text) => {
        const original = text;
        const result = validateMessageBeforeSend(text);

        const expectedAllowed =
          text.length <= MESSAGE_MAX_LENGTH &&
          !containsHtml(text) &&
          !containsCodeSnippet(text) &&
          !containsDisallowedContent(text);

        expect(result.allowed).toBe(expectedAllowed);

        if (!expectedAllowed) {
          expect(result.reason).not.toBeNull();
          if (text.length > MESSAGE_MAX_LENGTH) {
            expect(result.reason).toBe('TOO_LONG');
          } else if (containsHtml(text)) {
            expect(result.reason).toBe('HTML_CONTENT');
          } else if (containsCodeSnippet(text)) {
            expect(result.reason).toBe('CODE_SNIPPET');
          } else {
            expect(result.reason).toBe('DISALLOWED_CONTENT');
          }
        } else {
          expect(result.reason).toBeNull();
        }

        // 輸入字串在驗證前後保持不變
        expect(text).toBe(original);
      }),
      { numRuns: 100 }
    );
  });

  it('乾淨字串（長度 <= 500 且無 HTML/程式碼/禁用內容特徵）一律被允許', () => {
    fc.assert(
      fc.property(cleanStringArb, (text) => {
        fc.pre(text.length <= MESSAGE_MAX_LENGTH);
        const result = validateMessageBeforeSend(text);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-chat-form-assistant, Property 23: 語音輸入截斷保持前綴且不超過上限', () => {
  it('truncateForLLM 回傳結果長度不超過上限，短字串保持原樣，長字串恰為前 1000 字元', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 3000 }), (text) => {
        const result = truncateForLLM(text);

        expect(result.length).toBeLessThanOrEqual(LLM_INPUT_MAX_LENGTH);

        if (text.length <= LLM_INPUT_MAX_LENGTH) {
          expect(result).toBe(text);
        } else {
          expect(result).toBe(text.slice(0, LLM_INPUT_MAX_LENGTH));
          expect(result.length).toBe(LLM_INPUT_MAX_LENGTH);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-chat-form-assistant, Property 24: 禁用內容判定阻止 LLM 呼叫', () => {
  it('包含禁用詞彙的字串必被判定為禁用內容，且在驗證閘門攔截下呼叫鏈不會觸發 LLM_Gateway', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DISALLOWED_WORDS),
        fc.array(safeCharArb, { minLength: 0, maxLength: 20 }).map((c) => c.join('')),
        fc.array(safeCharArb, { minLength: 0, maxLength: 20 }).map((c) => c.join('')),
        (word, prefix, suffix) => {
          const text = `${prefix}${word}${suffix}`;

          expect(containsDisallowedContent(text)).toBe(true);

          // 模擬呼叫鏈：僅在驗證閘門允許時才會呼叫 LLM_Gateway。
          const llmGatewayMock = jest.fn();
          const gateResult = validateMessageBeforeSend(
            text.length > MESSAGE_MAX_LENGTH ? text.slice(0, MESSAGE_MAX_LENGTH) : text
          );

          if (containsDisallowedContent(text)) {
            // 禁用內容本身即應導致 allowed 為 false（除非先被更早的長度/HTML/程式碼規則攔截，
            // 但無論以何種理由被攔截，都不應呼叫 LLM_Gateway）。
            expect(gateResult.allowed).toBe(false);
          }

          if (!gateResult.allowed) {
            // 呼叫鏈不應觸發 LLM_Gateway
          } else {
            llmGatewayMock();
          }

          expect(llmGatewayMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不包含禁用詞彙的乾淨字串必被判定為非禁用內容', () => {
    fc.assert(
      fc.property(cleanStringArb, (text) => {
        expect(containsDisallowedContent(text)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
