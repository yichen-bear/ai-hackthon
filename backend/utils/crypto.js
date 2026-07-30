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
 * 計算聯絡欄位（手機、市話、地址等）的 SHA-256 hex string（用於雜湊查詢）
 * 與 hashEmail 相同的正規化規則：trim 後取 SHA-256 hex，但不進行大小寫轉換
 * @param {string} value - 聯絡欄位原始值
 * @returns {string} SHA-256 hex string
 */
function hashContactField(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('Value must be a non-empty string');
  }
  return crypto
    .createHash('sha256')
    .update(value.trim())
    .digest('hex');
}

/**
 * 加密欄位為 AES-256-GCM Buffer（與 decryptField 對稱）
 * 加密格式：IV (12 bytes) + authTag (16 bytes) + ciphertext (剩餘 bytes)
 * @param {string} plainText - 待加密的明文字串
 * @returns {Buffer} 加密後的 Buffer 資料
 */
function encryptField(plainText) {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (typeof plainText !== 'string') {
    throw new Error('plainText must be a string');
  }

  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]);
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
  hashContactField,
  encryptField,
  decryptField,
};
