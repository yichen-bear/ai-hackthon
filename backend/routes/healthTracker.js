'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const { FEEDBACK_STATUS, READ_STATUS, PLATFORM_CODE } = require('../constants/status');

/**
 * GET /api/health-tracker/latest
 * 取得使用者最新的飲水與保健品提醒資料 (form_id = 1020)
 * 從 pms_form_feedback 取得最新一筆，解析 feedbackContent 並格式化回傳
 */
router.get('/latest', async (req, res) => {
  try {
    const FORM_ID = 1020;

    // 取得最新的 feedback (以 creTime 降序排列取第一筆)
    const feedback = await prisma.pmsFormFeedback.findFirst({
      where: { formId: FORM_ID },
      orderBy: { creTime: 'desc' },
    });

    if (!feedback) {
      return res.status(200).json({
        success: true,
        data: null,
        message: '尚無健康追蹤資料',
      });
    }

    // 解析 feedbackContent JSON
    const content = feedback.feedbackContent;
    // content 結構為 { "4021": { topicId: 4021, value: "60" }, ... }
    // 或 { answers: [{ topicId: 4021, optionIds: [], value: "60" }] }

    let fields = {};
    if (content && typeof content === 'object') {
      if (content.answers && Array.isArray(content.answers)) {
        // 來自前端表單送出的格式
        for (const ans of content.answers) {
          fields[String(ans.topicId)] = ans.value;
        }
      } else {
        // 來自 AI chat 的格式 (collectedFields)
        for (const [key, val] of Object.entries(content)) {
          if (val && typeof val === 'object' && 'value' in val) {
            fields[key] = val.value;
          } else {
            fields[key] = val;
          }
        }
      }
    }

    // 提取飲水追蹤資料
    const weight = fields['4021'] ? Number(fields['4021']) : null;
    const dailyTarget = fields['4022'] ? Number(fields['4022']) : (weight ? weight * 35 : null);
    const bottleCapacity = fields['4023'] ? Number(fields['4023']) : null;
    const cupsPerDay = (dailyTarget && bottleCapacity) ? Math.ceil(dailyTarget / bottleCapacity) : null;

    // 提取保健品資料
    const supplementName = fields['4024'] || null;
    const frequency = fields['4025'] || null;
    const timing = fields['4026'] || null;
    const alarm = fields['4027'] || null;

    // 格式化回傳
    const result = {
      feedbackNo: feedback.feedbackNo,
      updatedAt: feedback.creTime,
      water: {
        weight,
        dailyTarget,
        bottleCapacity,
        cupsPerDay,
      },
      supplement: {
        name: supplementName,
        frequency,
        timing,
        alarm,
      },
    };

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[GET /api/health-tracker/latest] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/health-tracker/save
 * AI 對話完成後，直接儲存飲水/保健品資料至 form 1020 feedback
 * 供 AI chat 系統在填寫完成後呼叫，或前端手動觸發
 */
router.post('/save', async (req, res) => {
  try {
    const FORM_ID = 1020;
    const { water, supplement } = req.body;

    if (!water && !supplement) {
      return res.status(400).json({ success: false, message: '缺少 water 或 supplement 資料' });
    }

    // 組裝 feedbackContent (使用 AI chat 格式)
    const feedbackContent = {};

    if (water) {
      if (water.weight) {
        feedbackContent['4021'] = { topicId: 4021, value: String(water.weight) };
      }
      if (water.dailyTarget) {
        feedbackContent['4022'] = { topicId: 4022, value: String(water.dailyTarget) };
      }
      if (water.bottleCapacity) {
        feedbackContent['4023'] = { topicId: 4023, value: String(water.bottleCapacity) };
      }
    }

    if (supplement) {
      if (supplement.name) {
        feedbackContent['4024'] = { topicId: 4024, value: supplement.name };
      }
      if (supplement.frequency) {
        feedbackContent['4025'] = { topicId: 4025, value: supplement.frequency };
      }
      if (supplement.timing) {
        feedbackContent['4026'] = { topicId: 4026, value: supplement.timing };
      }
      if (supplement.alarm) {
        feedbackContent['4027'] = { topicId: 4027, value: supplement.alarm };
      }
    }

    // 取得表單 type
    const form = await prisma.pmsForm.findUnique({
      where: { id: FORM_ID },
      select: { type: true },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: '找不到表單 1020' });
    }

    // 產生 feedbackNo
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const feedbackNo = 'HT' + timestamp;

    const created = await prisma.pmsFormFeedback.create({
      data: {
        feedbackNo,
        serviceId: 1,
        platformCode: PLATFORM_CODE.WEB,
        formId: FORM_ID,
        feedbackContent,
        formType: form.type,
        isRead: READ_STATUS.UNREAD,
        status: FEEDBACK_STATUS.PENDING,
        inbrAccountId: '00000000-0000-0000-0000-000000000001',
        creTime: now,
        updTime: now,
      },
    });

    return res.status(201).json({
      success: true,
      data: { feedbackNo: created.feedbackNo },
    });
  } catch (err) {
    console.error('[POST /api/health-tracker/save] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
