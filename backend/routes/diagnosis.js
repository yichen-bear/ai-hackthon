'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const { callFastModel } = require('../services/llmGateway');
const { FEEDBACK_STATUS, READ_STATUS, PLATFORM_CODE } = require('../constants/status');

/**
 * POST /api/diagnosis/analyze
 * 使用 Llama 3.1 8B (via Groq) 進行症狀初步分析
 */
router.post('/analyze', async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 2) {
      return res.status(400).json({ success: false, message: '請描述您的症狀' });
    }

    const systemPrompt = `你是一位 AI 醫療衛教助手，專門進行症狀初步評估與科別建議。注意：你的分析僅供衛教參考，絕非正式醫療診斷。

請根據使用者描述的症狀，以 JSON 格式回傳分析結果。格式為：
{"causes":[{"name":"可能原因名稱","probability":0到100整數,"description":"簡短說明"}],"department":"建議看診科別","department_alternatives":["其他科別"],"advice":"衛教建議50字內","severity":"low|medium|high"}

規則：
1. causes 陣列最多 3 項，依 probability 從高到低排列
2. 所有文字使用繁體中文
3. 不做確定性診斷
4. 只回覆 JSON，不要包含其他文字`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '我的症狀是：' + symptoms.trim() },
    ];

    const rawResponse = await callFastModel(messages);

    let analysis;
    try {
      analysis = JSON.parse(rawResponse);
    } catch (parseErr) {
      analysis = {
        causes: [{ name: '需進一步評估', probability: 50, description: '症狀描述需更多資訊才能準確判斷' }],
        department: '家醫科',
        department_alternatives: ['一般內科'],
        advice: '建議就醫進一步檢查',
        severity: 'medium',
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        symptoms: symptoms.trim(),
        causes: analysis.causes || [],
        department: analysis.department || '家醫科',
        departmentAlternatives: analysis.department_alternatives || [],
        advice: analysis.advice || '',
        severity: analysis.severity || 'medium',
        disclaimer: '⚠️ 本 AI 分析結果僅供衛教資訊與就醫參考，不可作為正式醫療診斷依據。如有緊急狀況請撥打 119。',
      },
    });
  } catch (err) {
    console.error('[POST /api/diagnosis/analyze] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

/**
 * GET /api/diagnosis/clinics
 * 取得合作診所清單
 */
router.get('/clinics', async (req, res) => {
  try {
    const clinics = [
      { id: 'clinic-01', name: '信義耳鼻喉科診所', department: '耳鼻喉科', distance: '450m', hours: { morning: '09:00-12:00', afternoon: '14:00-17:30', evening: '18:00-21:00' }, availableSlots: ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '18:00', '18:30', '19:00'] },
      { id: 'clinic-02', name: '康健家醫診所', department: '家醫科', distance: '600m', hours: { morning: '08:30-12:00', afternoon: '14:00-17:00', evening: '18:30-21:00' }, availableSlots: ['08:30', '09:00', '09:30', '10:00', '14:00', '14:30', '18:30', '19:00'] },
      { id: 'clinic-03', name: '仁愛內科診所', department: '一般內科', distance: '800m', hours: { morning: '09:00-12:00', afternoon: '14:00-17:30', evening: null }, availableSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'] },
      { id: 'clinic-04', name: '美麗皮膚科診所', department: '皮膚科', distance: '1.2km', hours: { morning: '09:00-12:00', afternoon: '14:00-17:00', evening: '18:00-20:30' }, availableSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '18:00', '19:00'] },
    ];

    const { department } = req.query;
    const filtered = department
      ? clinics.filter(c => c.department.includes(department))
      : clinics;

    return res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    console.error('[GET /api/diagnosis/clinics] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/diagnosis/appointment
 * 提交掛號預約
 */
router.post('/appointment', async (req, res) => {
  try {
    const { symptoms, department, clinicName, appointmentTime, visitType, patientName, phone, nationalId, age, date, session } = req.body;

    if (!clinicName || !appointmentTime || !patientName || !phone) {
      return res.status(400).json({ success: false, message: '缺少必要的掛號資料' });
    }

    const FORM_ID = 1020;

    // 確保 service vendor 存在
    await prisma.cmsHomepageServiceVendor.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: '醫療服務' },
    });

    // 確保表單存在（hackathon 用途：自動建立）
    const form = await prisma.pmsForm.upsert({
      where: { id: FORM_ID },
      update: {},
      create: {
        id: FORM_ID,
        serviceVendorId: 1,
        type: '01',
        subType: '01',
        name: '門診掛號預約',
        reviewStatus: '02',
        isEnable: '1',
        isDeleted: '0',
        updTime: new Date(),
        creTime: new Date(),
      },
      select: { type: true },
    });

    const feedbackContent = {
      '4028': { topicId: 4028, value: symptoms || '' },
      '4029': { topicId: 4029, value: department || '' },
      '4030': { topicId: 4030, value: clinicName },
      '4031': { topicId: 4031, value: appointmentTime },
      '4032': { topicId: 4032, value: visitType || '初診' },
      '4033': { topicId: 4033, value: patientName },
      '4034': { topicId: 4034, value: phone },
      '4035': { topicId: 4035, value: nationalId || '' },
      '4036': { topicId: 4036, value: age != null ? String(age) : '' },
      '4037': { topicId: 4037, value: date || '' },
      '4038': { topicId: 4038, value: session || '' },
    };

    const now = new Date();
    const ts = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const feedbackNo = 'DX' + ts.slice(4) + Math.random().toString(36).slice(2, 6);

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
        contactName: patientName ? Buffer.from(patientName, 'utf-8') : null,
        contactMobile: phone ? Buffer.from(phone, 'utf-8') : null,
        inbrAccountId: '00000000-0000-0000-0000-000000000001',
        creTime: now,
        updTime: now,
      },
    });

    return res.status(201).json({
      success: true,
      data: { feedbackNo: created.feedbackNo, appointmentNumber: Math.floor(Math.random() * 20) + 5 },
    });
  } catch (err) {
    console.error('[POST /api/diagnosis/appointment] error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

/**
 * GET /api/diagnosis/latest-appointment
 * 取得最新掛號預約資料（含身分證遮蔽）
 */
router.get('/latest-appointment', async (req, res) => {
  try {
    const feedbacks = await prisma.pmsFormFeedback.findMany({
      where: { formId: 1020 },
      orderBy: { creTime: 'desc' },
      take: 5,
    });

    let found = null;
    for (const fb of feedbacks) {
      const c = fb.feedbackContent;
      if (c && typeof c === 'object' && c['4030']) {
        found = fb;
        break;
      }
    }

    if (!found) {
      return res.status(200).json({ success: true, data: null });
    }

    const content = found.feedbackContent;
    let fields = {};
    for (const [key, val] of Object.entries(content)) {
      fields[key] = (val && typeof val === 'object' && 'value' in val) ? val.value : val;
    }

    let maskedId = fields['4035'] || '';
    if (maskedId.length >= 6) {
      maskedId = maskedId.slice(0, 4) + '***' + maskedId.slice(-3);
    }

    return res.status(200).json({
      success: true,
      data: {
        feedbackNo: found.feedbackNo,
        createdAt: found.creTime,
        symptoms: fields['4028'] || null,
        department: fields['4029'] || null,
        clinicName: fields['4030'] || null,
        appointmentTime: fields['4031'] || null,
        visitType: fields['4032'] || null,
        patientName: fields['4033'] || null,
        phone: fields['4034'] || null,
        nationalIdMasked: maskedId,
      },
    });
  } catch (err) {
    console.error('[GET /api/diagnosis/latest-appointment] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * GET /api/diagnosis/appointments
 * 取得所有掛號預約記錄（供管理後台使用）
 */
router.get('/appointments', async (req, res) => {
  try {
    const feedbacks = await prisma.pmsFormFeedback.findMany({
      where: { formId: 1020 },
      orderBy: { creTime: 'desc' },
    });

    const data = feedbacks.map(fb => {
      const c = fb.feedbackContent || {};
      const getValue = (key) => {
        const entry = c[key];
        return entry && typeof entry === 'object' && 'value' in entry ? entry.value : (entry || '');
      };

      let nationalId = getValue('4035');
      if (nationalId.length >= 6) {
        nationalId = nationalId.slice(0, 4) + '***' + nationalId.slice(-3);
      }

      return {
        id: fb.feedbackNo,
        name: getValue('4033'),
        age: getValue('4036'),
        phone: getValue('4034'),
        nationalId,
        date: getValue('4037'),
        session: getValue('4038'),
        clinicName: getValue('4030'),
        status: fb.status,
        createdAt: fb.creTime ? fb.creTime.toISOString() : '',
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[GET /api/diagnosis/appointments] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
