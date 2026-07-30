'use strict';

/**
 * Feature: ai-chat-form-assistant
 *
 * Property 16: 聯絡資訊加解密往返與未提供值的 null 處理
 * （本測試僅涵蓋 encryptField/decryptField 往返部分）
 * Validates: Requirements 6.3
 */

const crypto = require('crypto');
const fc = require('fast-check');

describe('Feature: ai-chat-form-assistant, Property 16: 聯絡資訊加解密往返', () => {
  let encryptField;
  let decryptField;

  beforeAll(() => {
    // 設定一個合法的 32-byte hex 字串作為 ENCRYPTION_KEY，供 encryptField/decryptField 使用。
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

    // 在設定完環境變數後才 require，確保模組讀取到正確的 key。
    ({ encryptField, decryptField } = require('../../utils/crypto'));
  });

  it('decryptField(encryptField(x)) 對任意字串 x 皆還原為原始值', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (plainText) => {
        const encrypted = encryptField(plainText);
        const decrypted = decryptField(encrypted);
        expect(decrypted).toBe(plainText);
      }),
      { numRuns: 100 }
    );
  });

  it('同一明文每次加密結果不同（隨機 IV），但解密後皆還原為原始值', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 200 }), (plainText) => {
        const encryptedA = encryptField(plainText);
        const encryptedB = encryptField(plainText);

        expect(Buffer.isBuffer(encryptedA)).toBe(true);
        expect(encryptedA.equals(encryptedB)).toBe(false);

        expect(decryptField(encryptedA)).toBe(plainText);
        expect(decryptField(encryptedB)).toBe(plainText);
      }),
      { numRuns: 50 }
    );
  });
});
