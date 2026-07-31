'use strict';

/**
 * 行預樂模組 Seed Script v2
 * ─────────────────────────────────────────────────────────────
 * 架構：5 個獨立 Vendor + 3 個 ServiceType + 5 份表單
 *
 *   行：yoxi車隊 (vendor id=6) → ServiceType code='10' 交通接送
 *   預：OPEN POINT 預購 (vendor 新建) → ServiceType code='11' 預購零售
 *   樂-票務：統一獅娛樂 (vendor 新建) → ServiceType code='12' 休閒娛樂
 *   樂-社區：信義區里辦公室 (vendor 新建) → ServiceType code='12'
 *   樂-社大：信義社區大學 (vendor 新建) → ServiceType code='12'
 *
 * 執行方式：node prisma/seed-xingyule.js
 * ⚠️ 執行前：先跑 node prisma/cleanup-xingyule.js
 * ⚠️ 確認 .env 有正確的 DATABASE_URL 和 ENCRYPTION_KEY (32 bytes hex)
 * ─────────────────────────────────────────────────────────────
 */

const prisma = require('../utils/prismaClient');
const { encryptField, hashContactField, hashEmail } = require('../utils/crypto');

const NOW = new Date();
function uuid() { return require('crypto').randomUUID(); }
const CRE_ID = uuid();

/** 組裝加密聯絡人欄位 */
function buildEncryptedContact(contact) {
  return {
    contactName: encryptField(contact.name),
    contactNameHash: hashContactField(contact.name),
    contactMobile: encryptField(contact.mobile),
    contactMobileHash: hashContactField(contact.mobile),
    contactEmail: encryptField(contact.email),
    contactEmailHash: hashEmail(contact.email),
  };
}

// ═══════════════════════════════════════════════════════════════
// PART 1: ServiceType + ServiceVendor + CmsHomepageService
// ═══════════════════════════════════════════════════════════════

const VENDOR_IDS = { transport: 6, booking: 50, entertainment: 51, community: 52, college: 53 };
const SERVICE_IDS = { transport: 30, booking: 31, entertainment: 32, community: 33, college: 34 };

async function seedVendorsAndServices() {
  console.log('[1/7] 建立 ServiceType + Vendor + Service...');

  // --- ServiceType ---
  for (const st of [
    { code: '10', name: '交通接送', description: '叫車、預約接送、機場接送', sort: 10 },
    { code: '11', name: '預購零售', description: 'i預購、i划算團購、門市取貨', sort: 11 },
    { code: '12', name: '休閒娛樂', description: '票券、社區活動、社大課程', sort: 12 },
  ]) {
    await prisma.serviceType.upsert({
      where: { code: st.code },
      update: { name: st.name, description: st.description, sort: st.sort, updTime: NOW },
      create: { ...st, isDeleted: '0', creTime: NOW, updTime: NOW },
    });
  }

  // --- Vendor: 行 (id=6，更新名稱) ---
  await prisma.cmsHomepageServiceVendor.update({
    where: { id: VENDOR_IDS.transport },
    data: { name: 'yoxi車隊', description: '即時叫車、預約接送、無障礙專車、寵物友善車' },
  });

  // --- Vendor: 預 (id=50) ---
  await prisma.cmsHomepageServiceVendor.upsert({
    where: { id: VENDOR_IDS.booking },
    update: { name: 'OPEN POINT 預購', description: 'i預購商品預訂、i划算社區團購、門市取貨服務' },
    create: { id: VENDOR_IDS.booking, name: 'OPEN POINT 預購', description: 'i預購商品預訂、i划算社區團購、門市取貨服務' },
  });

  // --- Vendor: 樂-票務 (id=51) ---
  await prisma.cmsHomepageServiceVendor.upsert({
    where: { id: VENDOR_IDS.entertainment },
    update: { name: '統一獅娛樂', description: '棒球賽事、演唱會、展覽、音樂劇票務服務' },
    create: { id: VENDOR_IDS.entertainment, name: '統一獅娛樂', description: '棒球賽事、演唱會、展覽、音樂劇票務服務' },
  });

  // --- Vendor: 樂-社區 (id=52) ---
  await prisma.cmsHomepageServiceVendor.upsert({
    where: { id: VENDOR_IDS.community },
    update: { name: '信義區里辦公室', description: '社區活動、節慶慶典、健走活動、鄰里聯誼' },
    create: { id: VENDOR_IDS.community, name: '信義區里辦公室', description: '社區活動、節慶慶典、健走活動、鄰里聯誼' },
  });

  // --- Vendor: 樂-社大 (id=53) ---
  await prisma.cmsHomepageServiceVendor.upsert({
    where: { id: VENDOR_IDS.college },
    update: { name: '信義社區大學', description: '終身學習課程、攝影、咖啡、瑜伽、園藝等多元課程' },
    create: { id: VENDOR_IDS.college, name: '信義社區大學', description: '終身學習課程、攝影、咖啡、瑜伽、園藝等多元課程' },
  });

  // --- CmsHomepageService ---
  for (const svc of [
    { id: SERVICE_IDS.transport, serviceVendorId: VENDOR_IDS.transport, type: '10', name: '叫車服務', description: '即時/預約叫車、多車種選擇' },
    { id: SERVICE_IDS.booking, serviceVendorId: VENDOR_IDS.booking, type: '11', name: '預購取貨服務', description: 'i預購、i划算團購、門市取貨' },
    { id: SERVICE_IDS.entertainment, serviceVendorId: VENDOR_IDS.entertainment, type: '12', name: '活動票券服務', description: '賽事/演唱會/展覽/音樂劇票券' },
    { id: SERVICE_IDS.community, serviceVendorId: VENDOR_IDS.community, type: '12', name: '社區活動服務', description: '社區活動報名與管理' },
    { id: SERVICE_IDS.college, serviceVendorId: VENDOR_IDS.college, type: '12', name: '社大課程服務', description: '社區大學課程報名' },
  ]) {
    const existing = await prisma.cmsHomepageService.findUnique({ where: { id: svc.id } });
    if (!existing) {
      await prisma.cmsHomepageService.create({ data: svc });
    }
  }

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// PART 2: 行 — 交通接送需求單 (id=1005 修正)
// ═══════════════════════════════════════════════════════════════

async function seedTransportForm() {
  console.log('[2/7] 修正交通接送需求單 (id=1005)...');
  const formId = 1005;
  const groupId = 2009; // 既有群組「乘車資訊」

  // 更新 vendor
  await prisma.pmsForm.update({ where: { id: formId }, data: { serviceVendorId: VENDOR_IDS.transport, updTime: NOW } });

  // 新增題目: 叫車模式 (id=3019)
  if (!(await prisma.pmsFormTopic.findUnique({ where: { id: 3019 } }))) {
    await prisma.pmsFormTopic.create({ data: { id: 3019, formId, formGroupId: groupId, type: '03', title: '叫車模式', remark: '請選擇即時叫車或預約叫車', isRequired: '1', sort: 0, updTime: NOW, creTime: NOW, creId: CRE_ID } });
    await prisma.pmsTopicOption.createMany({ data: [
      { id: 4030, formId, topicId: 3019, optionName: '即時叫車', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
      { id: 4031, formId, topicId: 3019, optionName: '預約叫車', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    ] });
  }

  // 新增題目: 車種選擇 (id=3020)
  if (!(await prisma.pmsFormTopic.findUnique({ where: { id: 3020 } }))) {
    await prisma.pmsFormTopic.create({ data: { id: 3020, formId, formGroupId: groupId, type: '03', title: '車種選擇', remark: '請選擇需要的車種', isRequired: '1', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID } });
    await prisma.pmsTopicOption.createMany({ data: [
      { id: 4032, formId, topicId: 3020, optionName: '一般轎車', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
      { id: 4033, formId, topicId: 3020, optionName: '多人座車', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
      { id: 4034, formId, topicId: 3020, optionName: '無障礙專車', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
      { id: 4035, formId, topicId: 3020, optionName: '寵物友善車', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
    ] });
  }

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// PART 3: 預 — 預購取貨需求單 (id=1006)
// ═══════════════════════════════════════════════════════════════

async function seedBookingForm() {
  console.log('[3/7] 新增預購取貨需求單 (id=1006)...');
  if (await prisma.pmsForm.findUnique({ where: { id: 1006 } })) { console.log('  ⏭ 跳過'); return; }
  const formId = 1006;

  await prisma.pmsForm.create({ data: { id: formId, serviceVendorId: VENDOR_IDS.booking, type: '3', subType: '2', name: '預購取貨需求單', introContent: '<p>歡迎使用 i預購服務，請填寫您的預購需求</p>', noticeContent: '<p>⚠️ 預購商品依各商品到貨時間為準</p>', termsContent: '<p>預購商品一經確認恕不退換</p>', reviewStatus: '1', isEnable: '1', isDeleted: '0', updTime: NOW, creTime: NOW, creId: CRE_ID } });

  // 群組 1: 商品資訊
  await prisma.pmsFormGroup.create({ data: { id: 2011, formId, name: '商品資訊', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3021, formId, formGroupId: 2011, type: '03', title: '預購商品', remark: '請選擇要預購的商品', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4040, formId, topicId: 3021, optionName: '中秋限定 日出鳳梨酥禮盒', unitPrice: 580, unit: '盒', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4041, formId, topicId: 3021, optionName: '微熱山丘 蘋果酥禮盒', unitPrice: 380, unit: '盒', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4042, formId, topicId: 3021, optionName: '星巴克聯名 限量咖啡禮盒', unitPrice: 999, unit: '組', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4043, formId, topicId: 3021, optionName: '郭元益 花好月圓禮盒', unitPrice: 450, unit: '盒', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3022, formId, formGroupId: 2011, type: '03', title: '商品規格', remark: '請選擇規格', isRequired: '1', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4044, formId, topicId: 3022, optionName: '小份 / 6入裝', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4045, formId, topicId: 3022, optionName: '標準 / 12入裝', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4046, formId, topicId: 3022, optionName: '大份 / 24入裝', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3023, formId, formGroupId: 2011, type: '02', title: '購買數量', remark: '請填寫數量（1~10）', isRequired: '1', sort: 3, isNumberOnly: '1', updTime: NOW, creTime: NOW, creId: CRE_ID } });

  // 群組 2: 取貨資訊
  await prisma.pmsFormGroup.create({ data: { id: 2012, formId, name: '取貨資訊', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3024, formId, formGroupId: 2012, type: '03', title: '取貨門市', remark: '請選擇取貨門市', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4047, formId, topicId: 3024, optionName: '7-11 信義門市', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4048, formId, topicId: 3024, optionName: '7-11 忠孝門市', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4049, formId, topicId: 3024, optionName: '7-11 南京門市', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4050, formId, topicId: 3024, optionName: '7-11 松山門市', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3025, formId, formGroupId: 2012, type: '09', title: '希望取貨日期', remark: '請選擇日期', isRequired: '0', sort: 2, startDateOffsetDays: 3, endDateOffsetDays: 60, updTime: NOW, creTime: NOW, creId: CRE_ID } });

  // 群組 3: 聯絡資訊
  await prisma.pmsFormGroup.create({ data: { id: 2013, formId, name: '聯絡資訊', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3026, formId, formGroupId: 2013, type: '10', title: '聯絡人資料', remark: '請填寫姓名、手機、Email', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3027, formId, formGroupId: 2013, type: '01', title: '備註說明', remark: '如有特殊需求請說明', isRequired: '0', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// PART 4: 樂-票務 — 活動票券需求單 (id=1007)
// ═══════════════════════════════════════════════════════════════

async function seedEntertainmentForm() {
  console.log('[4/7] 新增活動票券需求單 (id=1007)...');
  if (await prisma.pmsForm.findUnique({ where: { id: 1007 } })) { console.log('  ⏭ 跳過'); return; }
  const formId = 1007;

  await prisma.pmsForm.create({ data: { id: formId, serviceVendorId: VENDOR_IDS.entertainment, type: '3', subType: '3', name: '活動票券需求單', introContent: '<p>歡迎使用活動票券服務，提供棒球、演唱會、展覽等票券預訂</p>', noticeContent: '<p>⚠️ 票券一經購買恕不退換</p>', termsContent: '<p>購票即同意活動主辦方規定</p>', reviewStatus: '1', isEnable: '1', isDeleted: '0', updTime: NOW, creTime: NOW, creId: CRE_ID } });

  // 群組 1: 活動資訊
  await prisma.pmsFormGroup.create({ data: { id: 2014, formId, name: '活動資訊', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3030, formId, formGroupId: 2014, type: '03', title: '活動類型', remark: '請選擇活動類型', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4060, formId, topicId: 3030, optionName: '棒球賽事', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4061, formId, topicId: 3030, optionName: '演唱會', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4062, formId, topicId: 3030, optionName: '展覽', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4063, formId, topicId: 3030, optionName: '音樂劇 / 舞台劇', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4064, formId, topicId: 3030, optionName: '門市體驗活動', sort: 5, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3031, formId, formGroupId: 2014, type: '01', title: '活動名稱 / 場次', remark: '如：中信兄弟 vs 統一獅 8/2', isRequired: '1', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3032, formId, formGroupId: 2014, type: '09', title: '希望參加日期', remark: '請選擇日期', isRequired: '1', sort: 3, startDateOffsetDays: 0, endDateOffsetDays: 90, updTime: NOW, creTime: NOW, creId: CRE_ID } });

  // 群組 2: 票券資訊
  await prisma.pmsFormGroup.create({ data: { id: 2015, formId, name: '票券資訊', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3033, formId, formGroupId: 2015, type: '03', title: '座位區域 / 票種', remark: '請選擇', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4070, formId, topicId: 3033, optionName: '搖滾區 / VIP', unitPrice: 3800, sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4071, formId, topicId: 3033, optionName: '特A區 / 內野A', unitPrice: 2800, sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4072, formId, topicId: 3033, optionName: 'A區 / 內野B', unitPrice: 2200, sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4073, formId, topicId: 3033, optionName: 'B區 / 外野', unitPrice: 1200, sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4074, formId, topicId: 3033, optionName: '自由座 / 一般', unitPrice: 300, sort: 5, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3034, formId, formGroupId: 2015, type: '03', title: '票種身份', remark: '請選擇', isRequired: '1', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4075, formId, topicId: 3034, optionName: '全票', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4076, formId, topicId: 3034, optionName: '孩童票', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4077, formId, topicId: 3034, optionName: '敬老票', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4078, formId, topicId: 3034, optionName: '愛心票', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3035, formId, formGroupId: 2015, type: '02', title: '購票張數', remark: '1~10', isRequired: '1', sort: 3, isNumberOnly: '1', updTime: NOW, creTime: NOW, creId: CRE_ID } });

  // 群組 3: 聯絡資訊
  await prisma.pmsFormGroup.create({ data: { id: 2016, formId, name: '聯絡資訊', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3036, formId, formGroupId: 2016, type: '10', title: '聯絡人資料', remark: '姓名、手機、Email', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3037, formId, formGroupId: 2016, type: '01', title: '備註說明', remark: '如需輪椅座位等', isRequired: '0', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// PART 5: 樂-社區 — 社區活動報名單 (id=1008)
// ═══════════════════════════════════════════════════════════════

async function seedCommunityForm() {
  console.log('[5/7] 新增社區活動報名單 (id=1008)...');
  if (await prisma.pmsForm.findUnique({ where: { id: 1008 } })) { console.log('  ⏭ 跳過'); return; }
  const formId = 1008;

  await prisma.pmsForm.create({ data: { id: formId, serviceVendorId: VENDOR_IDS.community, type: '3', subType: '4', name: '社區活動報名單', introContent: '<p>歡迎報名社區活動！</p>', noticeContent: '<p>⚠️ 取消請提前 3 天通知</p>', termsContent: '<p>如遇天災將另行通知</p>', reviewStatus: '1', isEnable: '1', isDeleted: '0', updTime: NOW, creTime: NOW, creId: CRE_ID } });

  await prisma.pmsFormGroup.create({ data: { id: 2017, formId, name: '活動選擇', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3040, formId, formGroupId: 2017, type: '03', title: '報名活動', remark: '請選擇', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4080, formId, topicId: 3040, optionName: '中秋社區烤肉大會', unitPrice: 200, unit: '人', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4081, formId, topicId: 3040, optionName: '假日健走活動：象山步道', unitPrice: 0, unit: '人', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4082, formId, topicId: 3040, optionName: '親子手作 DIY 工坊', unitPrice: 150, unit: '組', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4083, formId, topicId: 3040, optionName: '社區電影欣賞會', unitPrice: 0, unit: '人', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3041, formId, formGroupId: 2017, type: '02', title: '參加人數', remark: '含本人', isRequired: '1', sort: 2, isNumberOnly: '1', updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3042, formId, formGroupId: 2017, type: '03', title: '是否攜帶12歲以下孩童', remark: '', isRequired: '0', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4084, formId, topicId: 3042, optionName: '是', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4085, formId, topicId: 3042, optionName: '否', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });

  await prisma.pmsFormGroup.create({ data: { id: 2018, formId, name: '聯絡資訊', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3043, formId, formGroupId: 2018, type: '10', title: '聯絡人資料', remark: '姓名、手機、Email', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3044, formId, formGroupId: 2018, type: '01', title: '備註說明', remark: '飲食過敏或其他需求', isRequired: '0', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// PART 6: 樂-社大 — 社大課程報名單 (id=1009)
// ═══════════════════════════════════════════════════════════════

async function seedCollegeForm() {
  console.log('[6/7] 新增社大課程報名單 (id=1009)...');
  if (await prisma.pmsForm.findUnique({ where: { id: 1009 } })) { console.log('  ⏭ 跳過'); return; }
  const formId = 1009;

  await prisma.pmsForm.create({ data: { id: formId, serviceVendorId: VENDOR_IDS.college, type: '3', subType: '5', name: '社大課程報名單', introContent: '<p>歡迎報名社區大學課程！</p>', noticeContent: '<p>⚠️ 退費依社大退費規定</p>', termsContent: '<p>報名即同意學員守則</p>', reviewStatus: '1', isEnable: '1', isDeleted: '0', updTime: NOW, creTime: NOW, creId: CRE_ID } });

  await prisma.pmsFormGroup.create({ data: { id: 2019, formId, name: '課程選擇', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3050, formId, formGroupId: 2019, type: '03', title: '報名課程', remark: '請選擇', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4090, formId, topicId: 3050, optionName: '銀髮族手機攝影班（週三 09:00~11:00）', unitPrice: 2000, unit: '學期', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4091, formId, topicId: 3050, optionName: '社區園藝療癒課（週六 14:00~16:00）', unitPrice: 1500, unit: '學期', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4092, formId, topicId: 3050, optionName: '太極拳入門（週一四 07:00~08:00）', unitPrice: 1800, unit: '學期', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4093, formId, topicId: 3050, optionName: '手工皂 DIY 進階（週日 10:00~12:00）', unitPrice: 2500, unit: '學期', sort: 4, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4094, formId, topicId: 3050, optionName: '生活日語會話（週二 19:00~21:00）', unitPrice: 3200, unit: '學期', sort: 5, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });
  await prisma.pmsFormTopic.create({ data: { id: 3051, formId, formGroupId: 2019, type: '01', title: '學習動機', remark: '簡述為何想修這門課', isRequired: '0', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3052, formId, formGroupId: 2019, type: '03', title: '是否有相關經驗', remark: '', isRequired: '1', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsTopicOption.createMany({ data: [
    { id: 4095, formId, topicId: 3052, optionName: '完全初學', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4096, formId, topicId: 3052, optionName: '有一點基礎', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID },
    { id: 4097, formId, topicId: 3052, optionName: '有經驗想進修', sort: 3, updTime: NOW, creTime: NOW, creId: CRE_ID },
  ] });

  await prisma.pmsFormGroup.create({ data: { id: 2020, formId, name: '聯絡資訊', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3053, formId, formGroupId: 2020, type: '10', title: '聯絡人資料', remark: '姓名、手機、Email', isRequired: '1', sort: 1, updTime: NOW, creTime: NOW, creId: CRE_ID } });
  await prisma.pmsFormTopic.create({ data: { id: 3054, formId, formGroupId: 2020, type: '01', title: '備註說明', remark: '特殊需求', isRequired: '0', sort: 2, updTime: NOW, creTime: NOW, creId: CRE_ID } });

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// PART 7: 範例 Feedback（個資加密）
// ═══════════════════════════════════════════════════════════════

async function seedFeedbacks() {
  console.log('[7/7] 新增範例需求單（加密個資）...');
  const member = await prisma.memberAccount.findFirst();
  if (!member) { console.log('  ⚠ 無 memberAccount，跳過'); return; }
  const uid = member.id;

  const feedbacks = [
    {
      feedbackNo: 'FB20260731001', serviceId: SERVICE_IDS.transport, formId: 1005, formType: '3', platformCode: '09',
      contact: { name: '陳先生', mobile: '0912345678', email: 'chen@example.com' },
      description: '趕飛機，需要大車放行李',
      contactAddressCounty: '2', contactAddressDistrict: '104',
      preferredContactTime: '1',
      feedbackContent: { data: [
        { type: '3', topicId: 3019, answerList: [{ answer: '預約叫車', answerId: 4031 }] },
        { type: '5', topicId: 3015, answerList: [{ countyCode: '2', countyName: '臺北市', districtCode: '104', districtName: '中山區', addressDetail: '南京東路二段50號' }] },
        { type: '2', topicId: 3016, answerList: [{ answer: '桃園國際機場第一航廈' }] },
        { type: '9', topicId: 3017, answerList: [{ answer: '2026-08-05 06:30:00' }] },
        { type: '3', topicId: 3020, answerList: [{ answer: '多人座車', answerId: 4033 }] },
      ] },
    },
    {
      feedbackNo: 'FB20260731002', serviceId: SERVICE_IDS.booking, formId: 1006, formType: '3', platformCode: '09',
      contact: { name: '李小華', mobile: '0922333444', email: 'li@example.com' },
      description: '中秋送禮用',
      feedbackContent: { data: [
        { type: '3', topicId: 3021, answerList: [{ answer: '中秋限定 日出鳳梨酥禮盒', answerId: 4040 }] },
        { type: '3', topicId: 3022, answerList: [{ answer: '標準 / 12入裝', answerId: 4045 }] },
        { type: '2', topicId: 3023, answerList: [{ answer: '3' }] },
        { type: '3', topicId: 3024, answerList: [{ answer: '7-11 信義門市', answerId: 4047 }] },
        { type: '9', topicId: 3025, answerList: [{ answer: '2026-08-15' }] },
        { type: '1', topicId: 3027, answerList: [{ answer: '希望包裝精美' }] },
      ] },
    },
    {
      feedbackNo: 'FB20260731003', serviceId: SERVICE_IDS.entertainment, formId: 1007, formType: '3', platformCode: '09',
      contact: { name: '張大衛', mobile: '0988777666', email: 'david@example.com' },
      description: '跟朋友一起看球',
      feedbackContent: { data: [
        { type: '3', topicId: 3030, answerList: [{ answer: '棒球賽事', answerId: 4060 }] },
        { type: '1', topicId: 3031, answerList: [{ answer: '中信兄弟 vs 統一獅 8/2' }] },
        { type: '9', topicId: 3032, answerList: [{ answer: '2026-08-02' }] },
        { type: '3', topicId: 3033, answerList: [{ answer: 'A區 / 內野B', answerId: 4072 }] },
        { type: '3', topicId: 3034, answerList: [{ answer: '全票', answerId: 4075 }] },
        { type: '2', topicId: 3035, answerList: [{ answer: '4' }] },
        { type: '1', topicId: 3037, answerList: [{ answer: '4人座在一起' }] },
      ] },
    },
    {
      feedbackNo: 'FB20260731004', serviceId: SERVICE_IDS.community, formId: 1008, formType: '3', platformCode: '09',
      contact: { name: '陳美麗', mobile: '0911222333', email: 'mei@example.com' },
      description: '一家四口參加',
      feedbackContent: { data: [
        { type: '3', topicId: 3040, answerList: [{ answer: '中秋社區烤肉大會', answerId: 4080 }] },
        { type: '2', topicId: 3041, answerList: [{ answer: '4' }] },
        { type: '3', topicId: 3042, answerList: [{ answer: '是', answerId: 4084 }] },
        { type: '1', topicId: 3044, answerList: [{ answer: '小朋友對海鮮過敏' }] },
      ] },
    },
    {
      feedbackNo: 'FB20260731005', serviceId: SERVICE_IDS.college, formId: 1009, formType: '3', platformCode: '09',
      contact: { name: '林志玲', mobile: '0933444555', email: 'lin@example.com' },
      description: '週六時段方便',
      feedbackContent: { data: [
        { type: '3', topicId: 3050, answerList: [{ answer: '社區園藝療癒課（週六 14:00~16:00）', answerId: 4091 }] },
        { type: '1', topicId: 3051, answerList: [{ answer: '想學種花草放鬆心情' }] },
        { type: '3', topicId: 3052, answerList: [{ answer: '完全初學', answerId: 4095 }] },
        { type: '1', topicId: 3054, answerList: [{ answer: '家裡有陽台可以種' }] },
      ] },
    },
  ];

  for (const fb of feedbacks) {
    const existing = await prisma.pmsFormFeedback.findUnique({ where: { feedbackNo: fb.feedbackNo } });
    if (existing) continue;
    await prisma.pmsFormFeedback.create({
      data: {
        feedbackNo: fb.feedbackNo,
        serviceId: fb.serviceId,
        platformCode: fb.platformCode,
        formId: fb.formId,
        formType: fb.formType,
        isRead: '0',
        status: '01',
        inbrAccountId: uid,
        feedbackContent: fb.feedbackContent,
        description: fb.description,
        contactAddressCounty: fb.contactAddressCounty || null,
        contactAddressDistrict: fb.contactAddressDistrict || null,
        preferredContactTime: fb.preferredContactTime || null,
        ...buildEncryptedContact(fb.contact),
        creTime: NOW,
        updTime: NOW,
      },
    });
  }

  console.log('  ✔ done');
}

// ═══════════════════════════════════════════════════════════════
// 主程式
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  行預樂模組 Seed Script v2                    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  try {
    await seedVendorsAndServices();
    await seedTransportForm();
    await seedBookingForm();
    await seedEntertainmentForm();
    await seedCommunityForm();
    await seedCollegeForm();
    await seedFeedbacks();

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ 全部完成！');
    console.log('');
    console.log('Vendor 結構：');
    console.log('  行：id=6  yoxi車隊 → ServiceType 10 交通接送');
    console.log('  預：id=50 OPEN POINT 預購 → ServiceType 11 預購零售');
    console.log('  樂：id=51 統一獅娛樂 → ServiceType 12 休閒娛樂');
    console.log('  樂：id=52 信義區里辦公室 → ServiceType 12');
    console.log('  樂：id=53 信義社區大學 → ServiceType 12');
    console.log('');
    console.log('表單：1005(行) 1006(預) 1007(樂-票) 1008(樂-社區) 1009(樂-社大)');
    console.log('Feedback：FB20260731001~005');
    console.log('═══════════════════════════════════════════════');
  } catch (err) {
    console.error('❌ 失敗：', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
