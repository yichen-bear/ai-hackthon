'use strict';

const MASK_MARKER = '[REDACTED]';

const PII_KEYS = [
  'contactName',
  'contactMobile',
  'contactLandline',
  'contactEmail',
  'contactAddressDetail',
];

/**
 * 遮罩物件中明文個資欄位（用於一般應用程式日誌記錄前處理）
 * 排除 contactName/contactMobile/contactLandline/contactEmail/contactAddressDetail
 * 的明文值，以遮罩標記取代；不會修改原始輸入物件。
 * @param {object} obj - 可能包含個資欄位的物件
 * @returns {object} 新物件，個資欄位值已替換為遮罩標記
 */
function maskPiiForLogging(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const masked = { ...obj };

  for (const key of PII_KEYS) {
    if (Object.prototype.hasOwnProperty.call(masked, key)) {
      masked[key] = MASK_MARKER;
    }
  }

  return masked;
}

module.exports = {
  maskPiiForLogging,
  MASK_MARKER,
  PII_KEYS,
};
