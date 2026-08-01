'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const { FEEDBACK_STATUS, READ_STATUS, PLATFORM_CODE } = require('../constants/status');

/**
 * GET /api/forms/:formId
 * 取得表單結構（含群組 → 題目 → 選項，依 sort 排序）
 */
router.get('/:formId', async (req, res) => {
  try {
    const formId = parseInt(req.params.formId, 10);

    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: '無效的表單 ID' });
    }

    const form = await prisma.pmsForm.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        type: true,
        subType: true,
        introContent: true,
        noticeContent: true,
        termsContent: true,
        feature: true,
        groups: {
          select: {
            id: true,
            name: true,
            sort: true,
            feature: true,
            topics: {
              select: {
                id: true,
                type: true,
                title: true,
                remark: true,
                isRequired: true,
                sort: true,
                feature: true,
                options: {
                  select: {
                    id: true,
                    optionName: true,
                    unitPrice: true,
                    isQuantity: true,
                    minQuantity: true,
                    maxQuantity: true,
                    sort: true,
                    feature: true,
                  },
                  orderBy: { sort: 'asc' },
                },
              },
              orderBy: { sort: 'asc' },
            },
          },
          orderBy: { sort: 'asc' },
        },
      },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: '找不到該表單' });
    }

    return res.status(200).json({ success: true, data: form });
  } catch (err) {
    console.error('[GET /api/forms/:formId] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/forms/:formId/feedback
 * 提交表單回饋
 */
router.post('/:formId/feedback', async (req, res) => {
  try {
    const formId = parseInt(req.params.formId, 10);

    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: '無效的表單 ID' });
    }

    const { feedbackContent, contactName, contactMobile, contactEmail, description } = req.body;

    if (!feedbackContent || !feedbackContent.answers) {
      return res.status(400).json({ success: false, message: '缺少 feedbackContent' });
    }

    // 取得表單 type 作為 formType
    const form = await prisma.pmsForm.findUnique({
      where: { id: formId },
      select: { type: true },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: '找不到該表單' });
    }

    // 產生唯一 feedbackNo: FB + 14 碼時間戳
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const feedbackNo = 'FB' + timestamp;

    // 加密欄位以 Buffer 佔位（hackathon demo，非真實加密）
    const nameBuffer = contactName ? Buffer.from(contactName, 'utf-8') : null;
    const mobileBuffer = contactMobile ? Buffer.from(contactMobile, 'utf-8') : null;
    const emailBuffer = contactEmail ? Buffer.from(contactEmail, 'utf-8') : null;

    const feedback = await prisma.pmsFormFeedback.create({
      data: {
        feedbackNo,
        serviceId: 1,
        platformCode: PLATFORM_CODE.WEB,
        formId,
        feedbackContent,
        formType: form.type,
        isRead: READ_STATUS.UNREAD,
        status: FEEDBACK_STATUS.PENDING,
        contactName: nameBuffer,
        contactMobile: mobileBuffer,
        contactEmail: emailBuffer,
        description: description || null,
        inbrAccountId: '00000000-0000-0000-0000-000000000001',
        creTime: now,
        updTime: now,
      },
    });

    return res.status(201).json({
      success: true,
      data: { feedbackNo: feedback.feedbackNo },
    });
  } catch (err) {
    console.error('[POST /api/forms/:formId/feedback] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
