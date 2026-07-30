'use strict';

// Feature: ai-chat-form-assistant, Property 22: 日誌遮罩排除明文個資欄位

const fc = require('fast-check');
const { maskPiiForLogging, MASK_MARKER, PII_KEYS } = require('../../utils/piiLogging');

// Arbitrary for values that are safe to place under PII keys (plaintext strings, numbers,
// null, or undefined) so we can assert their plaintext values never survive masking.
const piiValueArbitrary = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.constant(null),
  fc.constant(undefined)
);

// Arbitrary for arbitrary non-PII keys, avoiding accidental collision with PII_KEYS.
const nonPiiKeyArbitrary = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((key) => !PII_KEYS.includes(key));

// Builds an object with a random subset of PII_KEYS (each mapped to a plaintext value)
// plus a random set of non-PII fields, so tests cover partial/absent PII fields too.
const objectWithPiiArbitrary = fc
  .record({
    piiSubset: fc.subarray(PII_KEYS),
    piiValues: fc.array(piiValueArbitrary, { minLength: PII_KEYS.length, maxLength: PII_KEYS.length }),
    extraEntries: fc.array(fc.tuple(nonPiiKeyArbitrary, fc.oneof(fc.string(), fc.integer())), {
      maxLength: 5,
    }),
  })
  .map(({ piiSubset, piiValues, extraEntries }) => {
    const obj = {};
    piiSubset.forEach((key, idx) => {
      obj[key] = piiValues[idx];
    });
    for (const [key, value] of extraEntries) {
      obj[key] = value;
    }
    return obj;
  });

describe('Feature: ai-chat-form-assistant, Property 22: 日誌遮罩排除明文個資欄位', () => {
  it('對任意包含個資欄位子集的物件，遮罩後所有存在的個資欄位皆變為遮罩標記，且原始明文值不再出現於結果中', () => {
    fc.assert(
      fc.property(objectWithPiiArbitrary, (obj) => {
        const masked = maskPiiForLogging(obj);

        for (const key of PII_KEYS) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Masked field must be replaced with the mask marker, never the plaintext value.
            expect(masked[key]).toBe(MASK_MARKER);
            const originalValue = obj[key];
            if (originalValue !== MASK_MARKER) {
              expect(masked[key]).not.toBe(originalValue);
            }
          } else {
            expect(Object.prototype.hasOwnProperty.call(masked, key)).toBe(false);
          }
        }

        // Non-PII keys must be preserved untouched.
        for (const key of Object.keys(obj)) {
          if (!PII_KEYS.includes(key)) {
            expect(masked[key]).toBe(obj[key]);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('遮罩函式不會修改原始輸入物件（回傳新物件）', () => {
    fc.assert(
      fc.property(objectWithPiiArbitrary, (obj) => {
        const originalSnapshot = JSON.stringify(obj);
        maskPiiForLogging(obj);
        expect(JSON.stringify(obj)).toBe(originalSnapshot);
      }),
      { numRuns: 100 }
    );
  });

  it('對非物件輸入（null、陣列、原始型別）原樣回傳，不拋出例外', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.array(fc.string()),
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(undefined)
        ),
        (input) => {
          expect(maskPiiForLogging(input)).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });
});
