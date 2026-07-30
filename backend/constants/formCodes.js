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
};

module.exports = {
  TOPIC_TYPE,
};
