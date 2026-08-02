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

    let fields = {};
    if (content && typeof content === 'object') {
      if (content.answers && Array.isArray(content.answers)) {
        for (const ans of content.answers) {
          fields[String(ans.topicId)] = ans.value;
        }
      } else {
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
 * 儲存飲水/保健品設定至 form 1020 feedback
 * 可由 AI chat 或前端卡片手動觸發
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

/* ═══════════════════════════════════════════════════════════
 *  每日飲水量紀錄 API (HealthWaterLog)
 * ═══════════════════════════════════════════════════════════ */

/**
 * 取得今日日期字串 (YYYY-MM-DD, 以本地時區為準)
 */
function getTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * GET /api/health-tracker/water-log/today
 * 取得今日的飲水進度
 */
router.get('/water-log/today', async (req, res) => {
  try {
    const today = getTodayDateStr();

    const log = await prisma.healthWaterLog.findUnique({
      where: { date: today },
    });

    return res.status(200).json({
      success: true,
      data: {
        date: today,
        intake: log ? log.intake : 0,
      },
    });
  } catch (err) {
    console.error('[GET /api/health-tracker/water-log/today] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/health-tracker/water-log
 * 增加飲水量 (累加)
 * body: { amount: number }  — 本次新增的 ml 數
 */
router.post('/water-log', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: '請提供有效的 amount (正整數, ml)' });
    }

    const today = getTodayDateStr();
    const now = new Date();

    // upsert: 如果今天已經有紀錄就累加，沒有就建新的
    const log = await prisma.healthWaterLog.upsert({
      where: { date: today },
      create: {
        date: today,
        intake: amount,
        creTime: now,
        updTime: now,
      },
      update: {
        intake: { increment: amount },
        updTime: now,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        date: today,
        intake: log.intake,
      },
    });
  } catch (err) {
    console.error('[POST /api/health-tracker/water-log] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/health-tracker/water-log/reset
 * 手動歸零今日飲水量
 */
router.post('/water-log/reset', async (req, res) => {
  try {
    const today = getTodayDateStr();
    const now = new Date();

    await prisma.healthWaterLog.upsert({
      where: { date: today },
      create: {
        date: today,
        intake: 0,
        creTime: now,
        updTime: now,
      },
      update: {
        intake: 0,
        updTime: now,
      },
    });

    return res.status(200).json({
      success: true,
      data: { date: today, intake: 0 },
    });
  } catch (err) {
    console.error('[POST /api/health-tracker/water-log/reset] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
