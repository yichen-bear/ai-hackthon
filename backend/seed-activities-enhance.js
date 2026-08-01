/**
 * 社區活動增強 seed：
 * - 更新活動加入志工數字 + extraParticipants
 * - 讓「親子共讀」和「社區防災演練」額滿 (status: closed)
 * - 新增現場報名 (source: onsite) 和里長代報 (source: delegate)
 * - 額滿活動加入候補 (status: waitlisted)
 */
'use strict';

const prisma = require('./utils/prismaClient');

const users = [
  { id: '00000000-0000-0000-0000-000000000001', name: '沈湘淇', phone: '0912-345-678' },
  { id: '00000000-0000-0000-0000-000000000002', name: '王大明', phone: '0922-456-789' },
  { id: '00000000-0000-0000-0000-000000000003', name: '李美玲', phone: '0933-567-890' },
  { id: '00000000-0000-0000-0000-000000000004', name: '張家豪', phone: '0944-678-901' },
  { id: '00000000-0000-0000-0000-000000000005', name: '陳玉婷', phone: '0955-789-012' },
  { id: '00000000-0000-0000-0000-000000000006', name: '林志偉', phone: '0966-890-123' },
  { id: '00000000-0000-0000-0000-000000000007', name: '黃雅茹', phone: '0977-901-234' },
  { id: '00000000-0000-0000-0000-000000000008', name: '吳建軍', phone: '0988-012-345' },
  { id: '00000000-0000-0000-0000-000000000009', name: '許佩玲', phone: '0911-123-456' },
  { id: '00000000-0000-0000-0000-00000000000a', name: '劉明華', phone: '0922-234-567' },
];

async function main() {
  console.log('🔄 增強社區活動資料...\n');

  const allActivities = await prisma.communityActivity.findMany({ where: { isDeleted: false } });

  // ─── 1. 更新所有活動的志工數字和 extra ───
  const enhancements = {
    '社區中秋聯歡晚會': { volunteersNeeded: 10, volunteersAssigned: 7, extraParticipants: 35 },
    '銀髮族健康操班（第3期）': { volunteersNeeded: 3, volunteersAssigned: 3, extraParticipants: 18 },
    '社區環保日：資源回收大作戰': { volunteersNeeded: 8, volunteersAssigned: 5, extraParticipants: 45 },
    '親子共讀繪本時光': { volunteersNeeded: 4, volunteersAssigned: 4, extraParticipants: 14, status: 'closed' },
    '社區防災演練暨消防安全講座': { volunteersNeeded: 6, volunteersAssigned: 6, extraParticipants: 48, status: 'closed' },
    '社區電影院：夏日動畫祭': { volunteersNeeded: 5, volunteersAssigned: 3, extraParticipants: 20 },
    '社區跳蚤市場': { volunteersNeeded: 6, volunteersAssigned: 4, extraParticipants: 15 },
    '里長座談會（8月份）': { volunteersNeeded: 2, volunteersAssigned: 2, extraParticipants: 22 },
  };

  for (const act of allActivities) {
    const enh = enhancements[act.title];
    if (enh) {
      await prisma.communityActivity.update({
        where: { id: act.id },
        data: enh,
      });
      console.log(`  ✅ ${act.title} → 志工 ${enh.volunteersAssigned}/${enh.volunteersNeeded}, extra +${enh.extraParticipants}${enh.status ? ', status: ' + enh.status : ''}`);
    }
  }

  // ─── 2. 新增現場報名 (onsite) 和里長代報 (delegate) ───
  console.log('\n🔄 新增現場報名/代報...\n');

  const midAutumn = allActivities.find(a => a.title === '社區中秋聯歡晚會');
  const hiking = allActivities.find(a => a.title === '銀髮族健康操班（第3期）');
  const eco = allActivities.find(a => a.title === '社區環保日：資源回收大作戰');

  // 中秋晚會：現場報名 2 人
  if (midAutumn) {
    for (const u of [users[5], users[8]]) {
      const existing = await prisma.activityRegistration.findFirst({ where: { activityId: midAutumn.id, userId: u.id } });
      if (!existing) {
        await prisma.activityRegistration.create({
          data: { activityId: midAutumn.id, userId: u.id, userName: u.name, userPhone: u.phone, source: 'onsite' },
        });
        console.log(`  ✅ 現場報名：${u.name} → ${midAutumn.title}`);
      }
    }
  }

  // 健康操：里長代報 2 人
  if (hiking) {
    for (const u of [users[2], users[6]]) {
      const existing = await prisma.activityRegistration.findFirst({ where: { activityId: hiking.id, userId: u.id } });
      if (!existing) {
        await prisma.activityRegistration.create({
          data: { activityId: hiking.id, userId: u.id, userName: u.name, userPhone: u.phone, source: 'delegate' },
        });
        console.log(`  ✅ 里長代報：${u.name} → ${hiking.title}`);
      }
    }
  }

  // 環保日：現場報名 1 人
  if (eco) {
    const u = users[3];
    const existing = await prisma.activityRegistration.findFirst({ where: { activityId: eco.id, userId: u.id } });
    if (!existing) {
      await prisma.activityRegistration.create({
        data: { activityId: eco.id, userId: u.id, userName: u.name, userPhone: u.phone, source: 'onsite' },
      });
      console.log(`  ✅ 現場報名：${u.name} → ${eco.title}`);
    }
  }

  // ─── 3. 額滿活動加入候補 (waitlisted) ───
  console.log('\n🔄 新增候補名單...\n');

  const readingAct = allActivities.find(a => a.title === '親子共讀繪本時光');
  const fireAct = allActivities.find(a => a.title === '社區防災演練暨消防安全講座');

  // 親子共讀候補：3 人
  if (readingAct) {
    for (const u of [users[3], users[5], users[8]]) {
      const existing = await prisma.activityRegistration.findFirst({ where: { activityId: readingAct.id, userId: u.id } });
      if (!existing) {
        await prisma.activityRegistration.create({
          data: { activityId: readingAct.id, userId: u.id, userName: u.name, userPhone: u.phone, status: 'waitlisted', source: 'app' },
        });
        console.log(`  ✅ 候補：${u.name} → ${readingAct.title}`);
      }
    }
  }

  // 防災演練候補：2 人
  if (fireAct) {
    for (const u of [users[0], users[2]]) {
      const existing = await prisma.activityRegistration.findFirst({ where: { activityId: fireAct.id, userId: u.id } });
      if (!existing) {
        await prisma.activityRegistration.create({
          data: { activityId: fireAct.id, userId: u.id, userName: u.name, userPhone: u.phone, status: 'waitlisted', source: 'app' },
        });
        console.log(`  ✅ 候補：${u.name} → ${fireAct.title}`);
      }
    }
  }

  console.log('\n🎉 增強完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
