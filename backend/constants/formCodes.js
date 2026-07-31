'use strict';

/**
 * pms_form_topic.type 暫行代碼常數
 * 詳見 design.md「待確認事項的設計決策」#1：
 * 代碼值待與現有前端表單頁面程式碼核對後修正。
 */
const TOPIC_TYPE = {
  TEXT: '01', // 文字
  NUMBER: '02', // 數字
  SINGLE_CHOICE: '03', // 單選
  MULTIPLE_CHOICE: '04', // 多選
  DATE: '05', // 日期
  IMAGE_UPLOAD: '06', // 上傳圖片
  ADDRESS: '05', // 地址（縣市+行政區+詳細地址），與 DATE 共用代碼但以 feature.subType 區分
  CONTACT_SIMPLE: '08', // 聯絡資訊（簡化版：姓名、電話、Email）
  DATETIME: '09', // 日期時間（可含時間）
  CONTACT_FULL: '10', // 聯絡人資料（完整版：姓名、手機、Email，對應加密欄位）
};

module.exports = {
  TOPIC_TYPE,
};
