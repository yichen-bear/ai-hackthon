'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const { FEEDBACK_STATUS, READ_STATUS, PLATFORM_CODE } = require('../constants/status');

/**
 * 垃圾分類 AI 助手 API
 * form_id = 1030, Topic 4036(物品名稱/描述), 4037(辨識分類), 4038(處置建議)
 */

const WASTE_FORM_ID = 1030;
const TOPIC_ITEM_NAME = 4036;      // 物品名稱/描述
const TOPIC_CLASSIFICATION = 4037; // 辨識分類 Option
const TOPIC_DISPOSAL_ADVICE = 4038; // 處置建議

/**
 * 垃圾分類類別選項
 */
const WASTE_CATEGORIES = [
  '一般垃圾',
  '紙容器類',
  '一般紙類',
  '塑膠類',
  '金屬類',
  '玻璃類',
  '廚餘',
  '有害垃圾',
  '大型廢棄物',
  '電子廢棄物',
];

/**
 * 建立垃圾分類的系統提示
 * @param {Array<{role: string, text: string}>} conversationHistory - 對話歷史
 * @returns {string} 系統提示
 */
function buildWasteClassificationSystemPrompt(conversationHistory) {
  return [
    '你是台灣的「AI 垃圾分類助手」，專門協助使用者正確分類生活垃圾。',
    '你的回覆必須是 JSON 格式，不要包含其他文字。',
    '',
    '## 你的職責：',
    '1. 根據使用者描述的物品，判斷其正確的垃圾分類。',
    '2. 若使用者描述模糊（如「塑膠東西」、「這個便當」），主動追問細節以精準分類。',
    '3. 確定分類後，提供正確的處置建議。',
    '',
    '## 可用分類：',
    WASTE_CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n'),
    '',
    '## 回覆 JSON 格式：',
    '```',
    '{',
    '  "action": "classify" | "ask_detail",',
    '  "item_name": "物品名稱（使用者描述的原始物品）",',
    '  "classification": "分類結果（從可用分類中選擇，僅 action=classify 時填寫）",',
    '  "disposal_advice": "處置建議步驟（具體的處理方式，僅 action=classify 時填寫）",',
    '  "reply_text": "回覆給使用者的完整文字（包含分類結果或追問問題）",',
    '  "confidence": 0.0~1.0',
    '}',
    '```',
    '',
    '## 規則：',
    '- 若無法確定分類（信心 < 0.7），使用 action=ask_detail 追問細節',
    '- 追問時要具體，例如詢問材質、有無油污、是否可清洗等',
    '- 分類確定時，disposal_advice 需包含具體步驟（如：1. 倒掉殘餘食物 2. 清水沖洗 3. 壓扁放入回收）',
    '- reply_text 需使用友善語氣，並包含 emoji 增加易讀性',
    '- 針對台灣的垃圾分類規則回答（環保署標準）',
    '- 若使用者上傳了照片描述，根據描述判斷分類',
    '',
    '## 追問範例：',
    '- 紙便當盒 → 「請問便當盒內層是否有塑膠膜防水層呢？油污是否可以沖洗乾淨？」',
    '- 塑膠東西 → 「請問是哪種塑膠製品呢？（如：寶特瓶、塑膠袋、保麗龍、塑膠容器...）」',
    '- 杯子 → 「請問是紙杯還是塑膠杯？是否有淋膜（防水層）？」',
  ].join('\n');
}

/**
 * 將對話歷史轉換為 LLM messages 格式
 * @param {Array<{role: string, text: string}>} history
 * @param {string} systemPrompt
 * @returns {Array<{role: string, content: string}>}
 */
function buildLlmMessages(history, systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const msg of history) {
    messages.push({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.text,
    });
  }
  return messages;
}

/**
 * 呼叫 LLM 進行垃圾分類
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<object>} parsed structured response
 */
async function callClassificationLLM(messages) {
  const llmGateway = require('../services/llmGateway');
  const result = await llmGateway.requestStructuredResponse({ messages, forceSmart: false });
  return result;
}

/**
 * 產生唯一的 feedbackNo
 * @returns {string}
 */
function generateFeedbackNo() {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  let randomPart = '';
  while (randomPart.length < 8) {
    randomPart += Math.random().toString(36).slice(2);
  }
  return datePart + randomPart.slice(0, 8);
}

/**
 * 將分類結果寫入資料庫
 * @param {string} itemName - 物品名稱/描述
 * @param {string} classification - 辨識分類
 * @param {string} disposalAdvice - 處置建議
 * @returns {Promise<string>} feedbackNo
 */
async function saveClassificationToDB(itemName, classification, disposalAdvice) {
  const feedbackNo = generateFeedbackNo();
  const now = new Date();

  const feedbackContent = {
    [String(TOPIC_ITEM_NAME)]: { topicId: TOPIC_ITEM_NAME, value: itemName },
    [String(TOPIC_CLASSIFICATION)]: { topicId: TOPIC_CLASSIFICATION, value: classification },
    [String(TOPIC_DISPOSAL_ADVICE)]: { topicId: TOPIC_DISPOSAL_ADVICE, value: disposalAdvice },
  };

  await prisma.pmsFormFeedback.create({
    data: {
      feedbackNo,
      serviceId: 1,
      platformCode: PLATFORM_CODE.WEB,
      formId: WASTE_FORM_ID,
      feedbackContent,
      formType: '01',
      isRead: READ_STATUS.UNREAD,
      status: FEEDBACK_STATUS.PENDING,
      inbrAccountId: '00000000-0000-0000-0000-000000000001',
      creTime: now,
      updTime: now,
    },
  });

  return feedbackNo;
}

/**
 * POST /api/waste-classification/classify
 * 
 * 接收使用者的垃圾描述（文字或圖片描述），進行多輪對話式分類。
 * 
 * Request Body:
 * {
 *   "conversationHistory": [{ "role": "user"|"ai", "text": "..." }],
 *   "userInput": "紙便當盒",
 *   "imageDescription": "(可選) 使用者上傳照片的描述"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "action": "classify" | "ask_detail",
 *     "replyText": "AI 回覆文字",
 *     "classification": { "itemName", "category", "disposalAdvice" } | null,
 *     "quickReplies": ["選項1", "選項2"] | null,
 *     "feedbackNo": "寫入DB後的編號" | null
 *   }
 * }
 */
router.post('/classify', async (req, res) => {
  try {
    const { conversationHistory = [], userInput, imageDescription } = req.body;

    if (!userInput && !imageDescription) {
      return res.status(400).json({
        success: false,
        message: '請提供垃圾物品的文字描述或照片',
      });
    }

    // 組合使用者輸入（可能包含照片描述）
    let combinedInput = userInput || '';
    if (imageDescription) {
      combinedInput = combinedInput
        ? `${combinedInput}（照片內容：${imageDescription}）`
        : `使用者上傳了一張照片：${imageDescription}`;
    }

    // 建立對話歷史（加入本次使用者輸入）
    const history = [
      ...conversationHistory,
      { role: 'user', text: combinedInput },
    ];

    // 呼叫 LLM
    const systemPrompt = buildWasteClassificationSystemPrompt(history);
    const messages = buildLlmMessages(history, systemPrompt);
    const structured = await callClassificationLLM(messages);

    // 處理 LLM 回覆
    if (structured.action === 'error') {
      return res.status(200).json({
        success: true,
        data: {
          action: 'ask_detail',
          replyText: '抱歉，我目前無法辨識此物品，請提供更多描述或拍攝更清楚的照片。',
          classification: null,
          quickReplies: null,
          feedbackNo: null,
        },
      });
    }

    if (structured.action === 'ask_detail') {
      // AI 需要追問更多細節
      // 從回覆中嘗試提取快捷回覆選項
      const quickReplies = extractQuickReplies(structured.reply_text);

      return res.status(200).json({
        success: true,
        data: {
          action: 'ask_detail',
          replyText: structured.reply_text || '可以請您提供更多關於這個物品的細節嗎？',
          classification: null,
          quickReplies,
          feedbackNo: null,
        },
      });
    }

    // action === 'classify' — 已確定分類
    const itemName = structured.item_name || userInput || '未知物品';
    const classification = structured.classification || '一般垃圾';
    const disposalAdvice = structured.disposal_advice || '請依照當地回收規定處理';

    // 寫入 DB
    let feedbackNo = null;
    try {
      feedbackNo = await saveClassificationToDB(itemName, classification, disposalAdvice);
    } catch (dbErr) {
      console.error('[waste-classification] DB write error:', dbErr.message);
      // DB 寫入失敗不影響回覆使用者
    }

    return res.status(200).json({
      success: true,
      data: {
        action: 'classify',
        replyText: structured.reply_text || `此物品屬於「${classification}」。${disposalAdvice}`,
        classification: {
          itemName,
          category: classification,
          disposalAdvice,
        },
        quickReplies: null,
        feedbackNo,
      },
    });
  } catch (err) {
    console.error('[POST /api/waste-classification/classify] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

/**
 * GET /api/waste-classification/history
 * 取得最近的分類紀錄（供前端渲染結果卡片）
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const records = await prisma.pmsFormFeedback.findMany({
      where: { formId: WASTE_FORM_ID },
      orderBy: { creTime: 'desc' },
      take: limit,
      select: {
        feedbackNo: true,
        feedbackContent: true,
        creTime: true,
      },
    });

    const data = records.map((record) => {
      const content = record.feedbackContent || {};
      return {
        feedbackNo: record.feedbackNo,
        itemName: content[String(TOPIC_ITEM_NAME)]?.value || '未知物品',
        category: content[String(TOPIC_CLASSIFICATION)]?.value || '未分類',
        disposalAdvice: content[String(TOPIC_DISPOSAL_ADVICE)]?.value || '',
        createdAt: record.creTime,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[GET /api/waste-classification/history] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * 從 AI 回覆文字中提取可能的快捷回覆選項
 * 例如回覆中包含「是否...」、「A 或 B」之類的選擇性文字
 * @param {string} replyText
 * @returns {string[]|null}
 */
function extractQuickReplies(replyText) {
  if (!replyText) return null;

  const quickReplies = [];

  // 常見追問模式的快捷回覆
  if (replyText.includes('油污') || replyText.includes('沖洗')) {
    quickReplies.push('已洗乾淨，無油污');
    quickReplies.push('嚴重油污，無法清洗');
  }
  if (replyText.includes('塑膠膜') || replyText.includes('淋膜') || replyText.includes('防水層')) {
    quickReplies.push('有塑膠膜/淋膜');
    quickReplies.push('無塑膠膜，純紙材質');
  }
  if (replyText.includes('紙杯') || replyText.includes('塑膠杯')) {
    quickReplies.push('紙杯');
    quickReplies.push('塑膠杯');
    quickReplies.push('保麗龍杯');
  }
  if (replyText.includes('寶特瓶') || replyText.includes('塑膠袋') || replyText.includes('塑膠容器')) {
    quickReplies.push('寶特瓶');
    quickReplies.push('塑膠袋');
    quickReplies.push('塑膠容器');
  }
  if (replyText.includes('電池') || replyText.includes('充電')) {
    quickReplies.push('一般乾電池');
    quickReplies.push('鋰電池/充電電池');
    quickReplies.push('鈕扣電池');
  }

  // 若沒有匹配到特定模式，嘗試通用快捷回覆
  if (quickReplies.length === 0) {
    if (replyText.includes('？') || replyText.includes('?')) {
      quickReplies.push('是');
      quickReplies.push('否');
    }
  }

  return quickReplies.length > 0 ? quickReplies : null;
}

module.exports = router;
