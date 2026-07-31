'use strict';

/**
 * 清除腳本：刪除舊 seed-xingyule.js 建立的所有資料
 * 執行方式：node prisma/cleanup-xingyule.js
 */

const prisma = require('../utils/prismaClient');

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  清除舊 seed 資料                             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 1. 刪除範例 Feedback
  console.log('[1/6] 刪除範例 Feedback...');
  await prisma.pmsFormFeedback.deleteMany({
    where: { feedbackNo: { in: ['FB20260731001', 'FB20260731002', 'FB20260731003', 'FB20260731004', 'FB20260731005'] } },
  });
  console.log('  ✔ done');

  // 2. 刪除 PmsTopicOption (id 4030~4097)
  console.log('[2/6] 刪除 PmsTopicOption id=4030~4097...');
  await prisma.pmsTopicOption.deleteMany({
    where: { id: { gte: 4030, lte: 4097 } },
  });
  console.log('  ✔ done');

  // 3. 刪除 PmsFormTopic (id 3019~3054)
  console.log('[3/6] 刪除 PmsFormTopic id=3019~3054...');
  await prisma.pmsFormTopic.deleteMany({
    where: { id: { gte: 3019, lte: 3054 } },
  });
  console.log('  ✔ done');

  // 4. 刪除 PmsFormGroup (id 2011~2020)
  console.log('[4/6] 刪除 PmsFormGroup id=2011~2020...');
  await prisma.pmsFormGroup.deleteMany({
    where: { id: { gte: 2011, lte: 2020 } },
  });
  console.log('  ✔ done');

  // 5. 刪除 PmsForm (id 1006~1009)
  console.log('[5/6] 刪除 PmsForm id=1006~1009...');
  await prisma.pmsForm.deleteMany({
    where: { id: { in: [1006, 1007, 1008, 1009] } },
  });
  console.log('  ✔ done');

  // 6. 刪除 CmsHomepageService (id 30~32) 和 ServiceType code='03' (如果是我建的)
  console.log('[6/6] 刪除 CmsHomepageService id=30~32...');
  await prisma.cmsHomepageService.deleteMany({
    where: { id: { in: [30, 31, 32] } },
  });
  // 還原 vendor id=6 的 name（稍後 seed 會重新改）
  // 刪除 ServiceType code='03' 只在沒有其他 service 引用時才刪
  const svcUsingType03 = await prisma.cmsHomepageService.count({ where: { type: '03' } });
  if (svcUsingType03 === 0) {
    await prisma.serviceType.deleteMany({ where: { code: '03' } });
    console.log('  ✔ ServiceType code=03 已刪除');
  }
  console.log('  ✔ done');

  // 還原 PmsForm id=1005 的 serviceVendorId（回到原始值 6）
  await prisma.pmsForm.update({
    where: { id: 1005 },
    data: { serviceVendorId: 6 },
  }).catch(() => { /* 如果不存在就忽略 */ });

  console.log('');
  console.log('✅ 清除完成！可以執行新的 seed 了。');
  console.log('');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ 清除失敗：', e.message);
  process.exit(1);
});
