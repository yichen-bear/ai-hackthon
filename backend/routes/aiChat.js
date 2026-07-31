'use strict';

const router = require('express').Router();
const { verifyToken } = require('../services/authService');
const { createAiChatRateLimiter } = require('../middleware/aiChatRateLimiter');
const chatAssistantService = require('../services/chatAssistantService');
const { maskPiiForLogging } = require('../utils/piiLogging');
const prisma = require('../utils/prismaClient');

const aiChatRateLimiter = createAiChatRateLimiter();

/**
 * 可選（soft）身份驗證：嘗試從 `req.cookies.token` 解析出使用者身份並掛載至 `req.user`，
 * 但不論成功與否都會呼叫 `next()` 繼續處理請求，讓未登入使用者仍可使用問答/填表對話
 * （Requirement 6.2、design.md 決策 #5）。
 * 用於為 Rate_Limiter 提供識別碼（`req.user.sub`），以及 `/submit` 判斷登入狀態。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function optionalAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch (err) {
      // Token 無效或過期：視為未登入，不中斷請求
      req.user = undefined;
    }
  }
  next();
}

/**
 * 從 Chat_Session 的 `messages` 中取出最後一則助手訊息文字，作為本次回應的 `replyText`。
 * @param {object} session
 * @returns {string}
 */
function extractLatestReplyText(session) {
  const messages = (session && session.messages) || [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      return messages[i].text || '';
    }
  }
  return '';
}

/**
 * POST /api/ai-chat/message
 * 接收 { session, userInput, inputMode }，套用 Rate_Limiter 後呼叫
 * `chatAssistantService.handleMessage`（該函式內部已依 Requirement 1.6/1.7、9.5、9.6
 * 執行傳送前的長度/禁用內容檢查，觸發時不會呼叫 LLM_Gateway，此路由不重複檢查）。
 * 回傳 { session, replyText, replyMeta }。
 */
router.post('/message', optionalAuth, aiChatRateLimiter, async (req, res) => {
  try {
    const { session, userInput, inputMode } = req.body;

    if (!session || typeof userInput !== 'string') {
      return res.status(400).json({ success: false, message: '缺少必要參數 session 或 userInput' });
    }

    const result = await chatAssistantService.handleMessage(session, userInput, inputMode);

    // 若目前引導中的題目有選項，附帶選項資訊讓前端可以渲染選項按鈕
    let options = null;
    let topicType = null;
    let topicRequired = true;
    let topicTitle = null;
    let savedAddresses = null;
    if (result.session.currentTopicId && result.session.selectedFormId && result.session.stage === 'filling') {
      try {
        const formMatchingService = require('../services/formMatchingService');
        const form = await formMatchingService.getFormWithTopics(result.session.selectedFormId);
        if (form && Array.isArray(form.groups)) {
          for (const group of form.groups) {
            for (const topic of (group.topics || [])) {
              if (topic.id === result.session.currentTopicId) {
                topicType = topic.type;
                topicTitle = topic.title;
                topicRequired = topic.isRequired === '1';
                // 只要題目有選項就回傳，不限定特定 type 代碼
                const topicOptions = topic.options || [];
                if (topicOptions.length > 0) {
                  options = topicOptions.map((opt) => ({
                    id: opt.id,
                    name: opt.optionName,
                  }));
                }

                // 若題目標題含「地址」且使用者已登入，回傳已儲存的常用地址
                const isAddressTopic = (topic.title || '').includes('地址');
                if (isAddressTopic && req.user && req.user.sub) {
                  try {
                    const { decryptField } = require('../utils/crypto');
                    const memberAddresses = await prisma.memberAddress.findMany({
                      where: { memberId: req.user.sub, isDeleted: false },
                      include: {
                        county: { select: { name: true } },
                        district: { select: { name: true } },
                      },
                      orderBy: [{ isDefault: 'desc' }, { updTime: 'desc' }],
                      take: 5,
                    });
                    if (memberAddresses.length > 0) {
                      savedAddresses = memberAddresses.map((addr) => ({
                        id: addr.id,
                        label: addr.label || (addr.type === 'mailing' ? '通訊地址' : '近期地址'),
                        fullAddress: `${addr.county.name}${addr.district.name}${addr.addressDetail ? decryptField(addr.addressDetail) : ''}`,
                      }));
                    }
                  } catch (_) {
                    // 取地址失敗不影響主流程
                  }
                }

                break;
              }
            }
            if (topicType !== null) break;
          }
        }
      } catch (_) {
        // 取選項失敗不影響主流程
      }
    }

    return res.status(200).json({
      session: result.session,
      replyText: extractLatestReplyText(result.session),
      replyMeta: {
        blocked: Boolean(result.blocked),
        reason: result.reason || null,
        topicType,
        topicTitle,
        topicRequired,
        options,
        savedAddresses,
      },
    });
  } catch (err) {
    console.error('[POST /api/ai-chat/message] error:', maskPiiForLogging({ message: err.message }));
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/ai-chat/submit
 * 接收 { session }，呼叫 `chatAssistantService.submitFeedback`（內部組裝
 * `buildFormFeedbackPayload` 並寫入資料庫）。未登入時回傳業務層
 * `success: false, code: 'AUTH_REQUIRED'`（HTTP 200，非中介層硬性 401），
 * 讓前端可保留已收集欄位並導向登入，而不因硬性 401 中斷流程（Requirement 6.2）。
 */
router.post('/submit', optionalAuth, async (req, res) => {
  try {
    const { session } = req.body;

    if (!session) {
      return res.status(400).json({ success: false, message: '缺少必要參數 session' });
    }

    const userId = req.user && req.user.sub;
    const result = await chatAssistantService.submitFeedback(session, userId);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[POST /api/ai-chat/submit] error:', maskPiiForLogging({ message: err.message }));
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
