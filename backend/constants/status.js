'use strict';

/**
 * 全域狀態碼常量
 * 消除後端魔法字串 (Magic Strings)
 */

/** PmsFormFeedback.status — 表單回饋狀態 */
const FEEDBACK_STATUS = {
  PENDING: '01',       // 待處理
  PROCESSING: '02',   // 處理中
  COMPLETED: '03',    // 已完成
  CANCELLED: '04',    // 已取消
};

/** PmsFormFeedback.isRead — 已讀狀態 */
const READ_STATUS = {
  UNREAD: '0',
  READ: '1',
};

/** PmsForm.isEnable — 表單啟用狀態 */
const ENABLE_STATUS = {
  ENABLED: '1',
  DISABLED: '0',
};

/** PmsForm.isDeleted — 軟刪除標記 */
const DELETE_STATUS = {
  ACTIVE: '0',
  DELETED: '1',
};

/** PmsForm.reviewStatus — 審核狀態 */
const REVIEW_STATUS = {
  DRAFT: '00',
  PENDING: '01',
  APPROVED: '02',
  REJECTED: '03',
};

/** MmsOrderRecord.orderStatus — 訂單狀態 */
const ORDER_STATUS = {
  PENDING: '01',
  CONFIRMED: '02',
  IN_PROGRESS: '03',
  COMPLETED: '04',
  CANCELLED: '05',
  REFUNDED: '06',
};

/** MmsOrderRecord.pointStatus — 點數狀態 */
const POINT_STATUS = {
  PENDING: '01',
  GRANTED: '02',
  REVOKED: '03',
};

/** 通用平台碼 */
const PLATFORM_CODE = {
  WEB: '01',
  APP: '02',
};

/** MemberAccount.status */
const ACCOUNT_STATUS = {
  ACTIVE: '01',
  SUSPENDED: '02',
  CLOSED: '03',
};

module.exports = {
  FEEDBACK_STATUS,
  READ_STATUS,
  ENABLE_STATUS,
  DELETE_STATUS,
  REVIEW_STATUS,
  ORDER_STATUS,
  POINT_STATUS,
  PLATFORM_CODE,
  ACCOUNT_STATUS,
};
