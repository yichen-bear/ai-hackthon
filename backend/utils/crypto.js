'use strict';

const crypto = require('crypto');

/**
 * 計算 email 的 SHA-256 hex string（用於 emailHash 欄位查詢）
 * @param {string} email - 使用者 email
 * @returns {string} SHA-256 hex string
 */
function hashEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * 解密 AES-256-GCM 加密的 Buffer 欄位
 * 加密格式：IV (12 bytes) + authTag (16 bytes) + ciphertext (剩餘 bytes)
 * @param {Buffer} encryptedBuffer - 加密後的 Buffer 資料
 * @returns {string} 解密後的明文字串
 */
function decryptField(encryptedBuffer) {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (!Buffer.isBuffer(encryptedBuffer)) {
    encryptedBuffer = Buffer.from(encryptedBuffer);
  }

  // 解構加密格式：IV (12 bytes) + authTag (16 bytes) + ciphertext
  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);

  const keyBuffer = Buffer.from(key, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  hashEmail,
  decryptField,
};
