'use strict';

/**
 * 行預樂模組 驗證腳本
 * ─────────────────────────────────────────────────────────────
 * 用途：跑完 seed-xingyule.js 後，驗證資料是否正確寫入
 * 執行方式：node prisma/verify-xingyule.js
 * ─────────────────────────────────────────────────────────────
 */

const prisma = require('../utils/prismaClient');

const XINGYULE_FORM_IDS = [1005, 1006, 1007, 1008, 1009];

const EXPECTED_FORMS = {
  1005: { name: '交通接送需求單', minTopics: 5 },
  1006: { name: '預購取貨需求單', minTopics: 7 },
  1007: { name: '活動票券需求單', minTopics: 8 },
  1008: { name: '社區活動報名單', minTopics: 5 },
  1009: { name: '社大課程報名單', minTopics: 5 },
};

// 平台用戶端的 feedbackContent 格式規格
const VALID_ANSWER_FORMATS = {
  '01': '文字: [{ answer: "..." }]',
  '02': '數字/文字描述: [{ answer: "..." }]',
  '03': '單選: [{ answer: "名稱", answerId: 數字 }]',
  '04': '多選: [{ answer: "名稱", answerId: 數字, quantity?: 數字 }, ...]',
  '05': '地址: [{ countyCode, countyName, districtCode, districtName, addressDetail }]',
  '06': '圖片: [{ answer: "url" }, ...]',
  '08': '聯絡簡化: [{ answer: "姓名" }, { answer: "電話" }, { answer: "email" }]',
  '09': '日期時間: [{ answer: "YYYY-MM-DD" 或 "YYYY-MM-DD HH:mm:ss" }]',
  '10': '聯絡完整: [{ answer: "姓名" }, { answer: "手機" }, { answer: "email" }]',
};

let errors = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); errors++; }
function warn(msg) { console.log(`  ⚠️  ${msg}`); warnings++; }

async function verifyForms() {
  console.log('\n━━━ 1. 驗證表單是否存在且啟用 ━━━\n');

  for (const formId of XINGYULE_FORM_IDS) {
    const form = await prisma.pmsForm.findUnique({ where: { id: formId } });
    const expected = EXPECTED_FORMS[formId];

    if (!form) {
      fail(`表單 id=${formId} (${expected.name}) 不存在！請先執行 seed-xingyule.js`);
      continue;
    }

    if (form.isEnable !== '1') fail(`表單 id=${formId} 未啟用 (isEnable=${form.isEnable})`);
    else if (form.isDeleted !== '0') fail(`表單 id=${formId} 已刪除`);
    else pass(`表單 id=${formId} "${form.name}" 存在且啟用`);
  }
}

async function verifyTopicsAndOptions() {
  console.log('\n━━━ 2. 驗證題目與選項完整度 ━━━\n');

  for (const formId of XINGYULE_FORM_IDS) {
    const expected = EXPECTED_FORMS[formId];
    const form = await prisma.pmsForm.findUnique({
      where: { id: formId },
      include: {
        groups: {
          orderBy: { sort: 'asc' },
          include: {
            topics: {
              orderBy: { sort: 'asc' },
              include: { options: { orderBy: { sort: 'asc' } } },
            },
          },
        },
      },
    });

    if (!form) continue;

    const allTopics = form.groups.flatMap((g) => g.topics);
    const topicCount = allTopics.length;

    if (topicCount < expected.minTopics) {
      fail(`表單 "${form.name}" 只有 ${topicCount} 題，預期至少 ${expected.minTopics} 題`);
    } else {
      pass(`表單 "${form.name}" 有 ${topicCount} 題 (≥${expected.minTopics})`);
    }

    // 驗證單選/多選題必須有選項
    for (const topic of allTopics) {
      if (['03', '04'].includes(topic.type) && topic.options.length === 0) {
        fail(`題目 id=${topic.id} "${topic.title}" 是${topic.type === '03' ? '單選' : '多選'}但沒有選項！`);
      }
    }

    // 驗證必填題目存在
    const requiredTopics = allTopics.filter((t) => t.isRequired === '1');
    if (requiredTopics.length === 0) {
      warn(`表單 "${form.name}" 沒有任何必填題目`);
    }
  }
}

async function verifyFeedbackFormat() {
  console.log('\n━━━ 3. 驗證範例需求單 feedbackContent 格式 ━━━\n');

  const feedbacks = await prisma.pmsFormFeedback.findMany({
    where: { formId: { in: XINGYULE_FORM_IDS } },
    select: {
      feedbackNo: true,
      formId: true,
      feedbackContent: true,
    },
  });

  if (feedbacks.length === 0) {
    warn('沒有找到行預樂相關的 feedback 範例');
    return;
  }

  for (const fb of feedbacks) {
    const content = fb.feedbackContent;

    // 必須是 { data: [...] } 格式
    if (!content || !content.data || !Array.isArray(content.data)) {
      fail(`${fb.feedbackNo}: feedbackContent 不是 { data: [...] } 格式！`);
      continue;
    }

    let fbOk = true;
    for (const item of content.data) {
      // 每筆必須有 type, topicId, answerList
      if (!item.type || !item.topicId || !Array.isArray(item.answerList)) {
        fail(`${fb.feedbackNo}: 某筆 data 缺少 type/topicId/answerList`);
        fbOk = false;
        break;
      }

      // answerList 不可為空
      if (item.answerList.length === 0) {
        fail(`${fb.feedbackNo}: topicId=${item.topicId} 的 answerList 為空`);
        fbOk = false;
      }
    }

    if (fbOk) {
      pass(`${fb.feedbackNo} (formId=${fb.formId}): feedbackContent 格式正確 ✓`);
    }
  }
}

async function verifyServiceVendor() {
  console.log('\n━━━ 4. 驗證 ServiceVendor 關聯 ━━━\n');

  const vendor = await prisma.cmsHomepageServiceVendor.findUnique({
    where: { id: 6 },
    include: { services: true },
  });

  if (!vendor) {
    fail('ServiceVendor id=6 (行預樂生活服務平台) 不存在');
    return;
  }

  pass(`ServiceVendor: "${vendor.name}" (id=6)`);
  console.log(`    服務列表 (${vendor.services.length} 筆):`);
  for (const svc of vendor.services) {
    console.log(`      - id=${svc.id} "${svc.name}"`);
  }

  if (vendor.services.length < 3) {
    warn('預期至少 3 個服務 (交通/預購/活動)');
  } else {
    pass('服務數量 ≥ 3');
  }
}

async function printSummaryTable() {
  console.log('\n━━━ 5. 表單總覽（可拿去跟前端對照）━━━\n');
  console.log('┌──────┬──────────────────┬──────┬────────────────────────────────────────────┐');
  console.log('│ id   │ 表單名稱         │ 題數 │ 題目類型組合                               │');
  console.log('├──────┼──────────────────┼──────┼────────────────────────────────────────────┤');

  for (const formId of XINGYULE_FORM_IDS) {
    const form = await prisma.pmsForm.findUnique({
      where: { id: formId },
      include: { groups: { include: { topics: { orderBy: { sort: 'asc' } } } } },
    });
    if (!form) continue;

    const topics = form.groups.flatMap((g) => g.topics);
    const types = topics.map((t) => t.type).join(', ');
    const name = form.name.padEnd(16);
    console.log(`│ ${formId} │ ${name} │  ${String(topics.length).padStart(2)}  │ ${types.padEnd(42)} │`);
  }

  console.log('└──────┴──────────────────┴──────┴────────────────────────────────────────────┘');

  console.log('\n題目類型代碼對照：');
  for (const [code, desc] of Object.entries(VALID_ANSWER_FORMATS)) {
    console.log(`  type=${code} → ${desc}`);
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  行預樂模組 驗證腳本                          ║');
  console.log('╚══════════════════════════════════════════════╝');

  try {
    await verifyForms();
    await verifyTopicsAndOptions();
    await verifyFeedbackFormat();
    await verifyServiceVendor();
    await printSummaryTable();

    console.log('\n═══════════════════════════════════════════════');
    if (errors === 0 && warnings === 0) {
      console.log('🎉 全部通過！資料結構正確，可以對接 AI 聊天和廠商端。');
    } else if (errors === 0) {
      console.log(`⚠️  通過但有 ${warnings} 個警告，建議確認。`);
    } else {
      console.log(`❌ 有 ${errors} 個錯誤、${warnings} 個警告，請修正後重新驗證。`);
    }
    console.log('═══════════════════════════════════════════════\n');
  } catch (err) {
    console.error('驗證失敗：', err.message);
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
