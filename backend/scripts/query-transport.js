'use strict';
const prisma = require('../utils/prismaClient');

async function main() {
  // 1. Vendor
  const vendor = await prisma.cmsHomepageServiceVendor.findUnique({
    where: { id: 6 },
    include: { services: true },
  });
  console.log('═══════════════════════════════════════');
  console.log('  Vendor: yoxi車隊 (id=6)');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(vendor, null, 2));

  // 2. ServiceType
  const st = await prisma.serviceType.findUnique({ where: { code: '10' } });
  console.log('\n═══════════════════════════════════════');
  console.log('  ServiceType: code=10');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(st, null, 2));

  // 3. Form + Groups + Topics + Options
  const form = await prisma.pmsForm.findUnique({
    where: { id: 1005 },
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
  console.log('\n═══════════════════════════════════════');
  console.log('  PmsForm: 交通接送需求單 (id=1005)');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(form, null, 2));

  // 4. Feedback
  const feedbacks = await prisma.pmsFormFeedback.findMany({
    where: { formId: 1005 },
    select: {
      feedbackNo: true,
      formId: true,
      platformCode: true,
      status: true,
      feedbackContent: true,
      description: true,
      contactAddressCounty: true,
      contactAddressDistrict: true,
      preferredContactTime: true,
      creTime: true,
    },
  });
  console.log('\n═══════════════════════════════════════');
  console.log('  Feedback (formId=1005)');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(feedbacks, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
