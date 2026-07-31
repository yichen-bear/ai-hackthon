'use strict';

const defaultPrisma = require('../utils/prismaClient');
const { TOPIC_TYPE } = require('../constants/formCodes');

/**
 * 查詢所有啟用中且未刪除的表單，回傳精簡清單供 LLM prompt 使用
 * 篩選條件：isEnable === '1' && isDeleted === '0'
 * @param {object} [prismaClient] - 可注入的 Prisma Client（預設使用共用單一實例），供測試以 mock 取代
 * @returns {Promise<Array<{id: number, name: string, introContent: (string|null)}>>} 啟用中且未刪除的表單精簡清單
 */
async function listActiveForms(prismaClient = defaultPrisma) {
  const forms = await prismaClient.pmsForm.findMany({
    where: {
      isEnable: '1',
      isDeleted: '0',
    },
    select: {
      id: true,
      name: true,
      introContent: true,
    },
  });

  return forms;
}

/**
 * 依表單 ID 取得表單本身，以及依 `PmsFormGroup.sort`、`PmsFormTopic.sort` 排序的群組、題目與其選項
 * @param {number} formId - `PmsForm.id`
 * @param {object} [prismaClient] - 可注入的 Prisma Client（預設使用共用單一實例），供測試以 mock 取代
 * @returns {Promise<object|null>} 含 `groups`（依 sort 排序，其下 `topics` 亦依 sort 排序，各 `topic` 含 `options`）的表單物件；查無資料時回傳 `null`
 */
async function getFormWithTopics(formId, prismaClient = defaultPrisma) {
  const form = await prismaClient.pmsForm.findUnique({
    where: { id: formId },
    include: {
      groups: {
        orderBy: { sort: 'asc' },
        include: {
          topics: {
            orderBy: { sort: 'asc' },
            include: {
              options: {
                orderBy: { sort: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  return form;
}

/**
 * 取得題目所屬 group 的 sort 值，優先讀取巢狀的 `topic.group.sort`，
 * 其次讀取扁平化的 `topic.groupSort`，皆缺省時視為 0
 * @param {object} topic - `PmsFormTopic`（可能含 `group: { sort }` 或 `groupSort`）
 * @returns {number} group 的 sort 值
 */
function getGroupSort(topic) {
  if (topic.group && typeof topic.group.sort === 'number') {
    return topic.group.sort;
  }
  if (typeof topic.groupSort === 'number') {
    return topic.groupSort;
  }
  return 0;
}

/**
 * 依 `group.sort` 再依 `topic.sort` 排序，回傳未回答題目中排序最小者
 * @param {Array<object>} topics - `PmsFormTopic` 陣列，各筆含 `id`、`sort`，以及所屬 group 的 sort（`group.sort` 或 `groupSort`）
 * @param {Record<string, unknown>} [collectedFields] - 已收集欄位，鍵為 `PmsFormTopic.id`（供判斷該題是否已回答）
 * @returns {object|null} 下一個應提問的題目；若所有題目皆已回答（或無題目），回傳 `null`
 */
function selectNextTopic(topics, collectedFields = {}) {
  if (!Array.isArray(topics) || topics.length === 0) {
    return null;
  }

  const answeredIds = new Set(Object.keys(collectedFields || {}).map(String));

  const unanswered = topics.filter((topic) => !answeredIds.has(String(topic.id)));

  if (unanswered.length === 0) {
    return null;
  }

  const sorted = [...unanswered].sort((a, b) => {
    const groupSortDiff = getGroupSort(a) - getGroupSort(b);
    if (groupSortDiff !== 0) {
      return groupSortDiff;
    }
    return (a.sort ?? 0) - (b.sort ?? 0);
  });

  return sorted[0];
}

/**
 * 判斷答案是否等同於「跳過」（未提供任何有意義的值）
 * @param {*} rawAnswer - 使用者原始答案
 * @returns {boolean} 是否視為跳過
 */
function isSkippedAnswer(rawAnswer) {
  if (rawAnswer === undefined || rawAnswer === null) {
    return true;
  }
  if (typeof rawAnswer === 'string' && rawAnswer.trim() === '') {
    return true;
  }
  if (typeof rawAnswer === 'string' && rawAnswer.trim() === '跳過') {
    return true;
  }
  if (typeof rawAnswer === 'string' && rawAnswer.trim() === '都不用') {
    return true;
  }
  if (typeof rawAnswer === 'string' && rawAnswer.trim() === '無') {
    return true;
  }
  if (typeof rawAnswer === 'string' && rawAnswer.trim() === '沒') {
    return true;
  }
  if (Array.isArray(rawAnswer) && rawAnswer.length === 0) {
    return true;
  }
  return false;
}

/**
 * 驗證文字型題目（TOPIC_TYPE.TEXT）
 * @param {string} rawAnswer - 使用者原始答案
 * @returns {{valid: boolean, normalizedValue: (string|null), errorMessage: (string|null)}}
 */
function validateTextAnswer(rawAnswer) {
  if (typeof rawAnswer !== 'string') {
    return { valid: false, normalizedValue: null, errorMessage: '請提供文字格式的答案' };
  }
  const normalized = rawAnswer.trim();
  if (normalized === '') {
    return { valid: false, normalizedValue: null, errorMessage: '答案不可為空白' };
  }
  return { valid: true, normalizedValue: normalized, errorMessage: null };
}

/**
 * 驗證數字型題目（TOPIC_TYPE.NUMBER）
 * @param {*} rawAnswer - 使用者原始答案
 * @returns {{valid: boolean, normalizedValue: (number|null), errorMessage: (string|null)}}
 */
function validateNumberAnswer(rawAnswer) {
  if (typeof rawAnswer === 'boolean' || Array.isArray(rawAnswer) || rawAnswer === '') {
    return { valid: false, normalizedValue: null, errorMessage: '請提供有效的數字' };
  }
  const parsed = typeof rawAnswer === 'number' ? rawAnswer : Number(rawAnswer);
  if (Number.isNaN(parsed)) {
    return { valid: false, normalizedValue: null, errorMessage: '請提供有效的數字' };
  }
  return { valid: true, normalizedValue: parsed, errorMessage: null };
}

/**
 * 驗證單選型題目（TOPIC_TYPE.SINGLE_CHOICE），答案須為 `topic.options` 中某一筆的 `id`
 * @param {object} topic - `PmsFormTopic`（含 `options` 陣列）
 * @param {*} rawAnswer - 使用者原始答案（選項 id）
 * @returns {{valid: boolean, normalizedValue: (number|null), errorMessage: (string|null)}}
 */
function validateSingleChoiceAnswer(topic, rawAnswer) {
  const options = Array.isArray(topic.options) ? topic.options : [];
  if (Array.isArray(rawAnswer)) {
    return { valid: false, normalizedValue: null, errorMessage: '請提供單一選項' };
  }

  // 優先嘗試以 id 比對
  const optionId = typeof rawAnswer === 'number' ? rawAnswer : Number(rawAnswer);
  if (!Number.isNaN(optionId)) {
    const matched = options.find((option) => option.id === optionId);
    if (matched) {
      return { valid: true, normalizedValue: matched.id, errorMessage: null };
    }
  }

  // Fallback：以選項名稱比對（LLM 可能回傳名稱而非 id）
  if (typeof rawAnswer === 'string' && rawAnswer.trim() !== '') {
    const normalizedInput = rawAnswer.trim().toLowerCase();
    const matched = options.find(
      (option) => option.optionName && option.optionName.trim().toLowerCase() === normalizedInput
    );
    if (matched) {
      return { valid: true, normalizedValue: matched.id, errorMessage: null };
    }
  }

  if (options.length === 0) {
    return { valid: false, normalizedValue: null, errorMessage: '此題目尚無選項可選' };
  }
  return { valid: false, normalizedValue: null, errorMessage: '所選選項不存在於此題目的選項清單中' };
}

/**
 * 驗證多選型題目（TOPIC_TYPE.MULTIPLE_CHOICE），答案須為 `topic.options` 中若干筆的 `id` 所組成的陣列
 * @param {object} topic - `PmsFormTopic`（含 `options` 陣列）
 * @param {*} rawAnswer - 使用者原始答案（選項 id 陣列）
 * @returns {{valid: boolean, normalizedValue: (Array<number>|null), errorMessage: (string|null)}}
 */
function validateMultipleChoiceAnswer(topic, rawAnswer) {
  const options = Array.isArray(topic.options) ? topic.options : [];
  if (!Array.isArray(rawAnswer)) {
    // Fallback：LLM 可能回傳單一字串而非陣列，嘗試以名稱比對
    if (typeof rawAnswer === 'string' && rawAnswer.trim() !== '') {
      const normalizedInput = rawAnswer.trim().toLowerCase();
      const matched = options.find(
        (option) => option.optionName && option.optionName.trim().toLowerCase() === normalizedInput
      );
      if (matched) {
        return { valid: true, normalizedValue: [matched.id], errorMessage: null };
      }
    }
    return { valid: false, normalizedValue: null, errorMessage: '請提供選項清單' };
  }

  const validOptionIds = new Set(options.map((option) => option.id));
  const optionNameMap = new Map(
    options.map((option) => [(option.optionName || '').trim().toLowerCase(), option.id])
  );
  const normalizedIds = [];

  for (const item of rawAnswer) {
    // 優先以 id 比對
    const optionId = typeof item === 'number' ? item : Number(item);
    if (!Number.isNaN(optionId) && validOptionIds.has(optionId)) {
      normalizedIds.push(optionId);
      continue;
    }
    // Fallback：以名稱比對
    if (typeof item === 'string' && item.trim() !== '') {
      const matchedId = optionNameMap.get(item.trim().toLowerCase());
      if (matchedId !== undefined) {
        normalizedIds.push(matchedId);
        continue;
      }
    }
    return { valid: false, normalizedValue: null, errorMessage: '所選選項中包含不存在於此題目選項清單的項目' };
  }

  return { valid: true, normalizedValue: normalizedIds, errorMessage: null };
}

/**
 * 驗證日期型題目（TOPIC_TYPE.DATE），日期須落在以今日為基準、`startDateOffsetDays`/`endDateOffsetDays` 定義的允許區間內
 * @param {object} topic - `PmsFormTopic`（含 `startDateOffsetDays`/`endDateOffsetDays`）
 * @param {*} rawAnswer - 使用者原始答案（日期字串，例如 `YYYY-MM-DD`）
 * @param {Date} [now] - 可注入的「現在時間」，供測試使用
 * @returns {{valid: boolean, normalizedValue: (string|null), errorMessage: (string|null)}}
 */
function validateDateAnswer(topic, rawAnswer, now = new Date()) {
  if (typeof rawAnswer !== 'string' || rawAnswer.trim() === '') {
    return { valid: false, normalizedValue: null, errorMessage: '請提供有效的日期' };
  }

  const input = rawAnswer.trim();
  let parsedDate;

  // 嘗試解析各種格式
  // 格式: M/D, M-D, M月D日 (沒有年份，自動補今年或明年)
  const monthDayMatch = input.match(/^(\d{1,2})[\/\-月](\d{1,2})[日]?$/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1], 10);
    const day = parseInt(monthDayMatch[2], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { valid: false, normalizedValue: null, errorMessage: '請提供有效的日期' };
    }

    // 先用今年，如果日期已過就用明年
    let year = now.getFullYear();
    const candidateDate = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (candidateDate < today) {
      year += 1;
    }

    parsedDate = new Date(year, month - 1, day);
  } else {
    // 嘗試標準格式解析 (YYYY-MM-DD, YYYY/MM/DD 等)
    parsedDate = new Date(input);
  }

  if (Number.isNaN(parsedDate.getTime())) {
    return { valid: false, normalizedValue: null, errorMessage: '請提供有效的日期格式（例如 7/31 或 2026-07-31）' };
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const answerDateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const diffDays = Math.round((answerDateOnly.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (typeof topic.startDateOffsetDays === 'number' && diffDays < topic.startDateOffsetDays) {
    return { valid: false, normalizedValue: null, errorMessage: '日期早於此題目允許的最早日期' };
  }
  if (typeof topic.endDateOffsetDays === 'number' && diffDays > topic.endDateOffsetDays) {
    return { valid: false, normalizedValue: null, errorMessage: '日期晚於此題目允許的最晚日期' };
  }

  const year = answerDateOnly.getFullYear();
  const month = String(answerDateOnly.getMonth() + 1).padStart(2, '0');
  const day = String(answerDateOnly.getDate()).padStart(2, '0');
  const normalized = `${year}-${month}-${day}`;
  return { valid: true, normalizedValue: normalized, errorMessage: null };
}

/**
 * 驗證上傳圖片型題目（TOPIC_TYPE.IMAGE_UPLOAD），數量須落在 `minimumMediasUpload`/`maximumMediasUpload` 範圍內
 * @param {object} topic - `PmsFormTopic`（含 `minimumMediasUpload`/`maximumMediasUpload`）
 * @param {*} rawAnswer - 使用者原始答案（圖片網址陣列）
 * @returns {{valid: boolean, normalizedValue: (Array<string>|null), errorMessage: (string|null)}}
 */
function validateImageUploadAnswer(topic, rawAnswer) {
  if (!Array.isArray(rawAnswer) || rawAnswer.some((item) => typeof item !== 'string' || item.trim() === '')) {
    return { valid: false, normalizedValue: null, errorMessage: '請提供有效的圖片清單' };
  }

  const count = rawAnswer.length;
  const minRequired = typeof topic.minimumMediasUpload === 'number' ? topic.minimumMediasUpload : 0;
  const maxAllowed = typeof topic.maximumMediasUpload === 'number' ? topic.maximumMediasUpload : Infinity;

  if (count < minRequired) {
    return { valid: false, normalizedValue: null, errorMessage: `上傳圖片數量不足，至少需要 ${minRequired} 張` };
  }
  if (count > maxAllowed) {
    return { valid: false, normalizedValue: null, errorMessage: `上傳圖片數量超過上限，最多 ${maxAllowed} 張` };
  }

  return { valid: true, normalizedValue: rawAnswer, errorMessage: null };
}

/**
 * 依 `topic.type`（`formCodes.js` 常數）與限制條件（`PmsTopicOption` 清單、
 * `minimumMediasUpload`/`maximumMediasUpload`、`startDateOffsetDays`/`endDateOffsetDays`、`isRequired`）
 * 驗證使用者提供的答案
 * @param {object} topic - `PmsFormTopic`（可含 `options` 陣列）
 * @param {*} rawAnswer - 使用者原始答案
 * @returns {{valid: boolean, normalizedValue: *, errorMessage: (string|null)}}
 */
function validateAnswerAgainstTopic(topic, rawAnswer) {
  if (isSkippedAnswer(rawAnswer)) {
    if (topic.isRequired === '1') {
      return { valid: false, normalizedValue: null, errorMessage: '此題目為必填，請提供答案' };
    }
    return { valid: true, normalizedValue: null, errorMessage: null };
  }

  switch (topic.type) {
    case TOPIC_TYPE.TEXT:
      return validateTextAnswer(rawAnswer);
    case TOPIC_TYPE.NUMBER:
      return validateNumberAnswer(rawAnswer);
    case TOPIC_TYPE.SINGLE_CHOICE:
      return validateSingleChoiceAnswer(topic, rawAnswer);
    case TOPIC_TYPE.MULTIPLE_CHOICE:
      return validateMultipleChoiceAnswer(topic, rawAnswer);
    case TOPIC_TYPE.DATE:
      return validateDateAnswer(topic, rawAnswer);
    case TOPIC_TYPE.IMAGE_UPLOAD:
      return validateImageUploadAnswer(topic, rawAnswer);
    default:
      // 未列舉的題目類型（例如 textarea、備註等）回退至文字驗證，避免使用者無法作答
      if (typeof rawAnswer === 'object' && rawAnswer !== null) {
        // LLM 可能回傳 object，將其轉為可讀字串
        const textValue = Array.isArray(rawAnswer)
          ? rawAnswer.join('、')
          : Object.values(rawAnswer).filter(v => v != null && v !== '').join('、');
        return validateTextAnswer(textValue || JSON.stringify(rawAnswer));
      }
      return validateTextAnswer(typeof rawAnswer === 'string' ? rawAnswer : String(rawAnswer));
  }
}

module.exports = {
  listActiveForms,
  getFormWithTopics,
  selectNextTopic,
  validateAnswerAgainstTopic,
};
