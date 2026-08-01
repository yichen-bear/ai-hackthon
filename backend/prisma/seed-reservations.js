require('dotenv').config();
const prisma = require('../utils/prismaClient');

const LINKED_PLACE_ID = 'linked_restaurant_01';

async function seed() {
  console.log('Seeding reservations...');

  const members = await prisma.groupMember.findMany({
    take: 20,
    select: { userName: true },
  });

  const names = members.length > 0
    ? members.map(m => m.userName)
    : ['陳小明', '林美玲', '王大維', '張雅婷', '李建宏', '黃淑芬', '吳志偉', '劉佳琪', '楊宗翰', '蔡欣怡', '許志豪', '周雅芳', '鄭文彬', '謝宜蓁', '郭俊宏', '洪美華', '曾建國', '廖淑惠', '賴宗憲', '徐雅萍'];

  const phones = ['0912-345-678', '0923-456-789', '0934-567-890', '0945-678-901', '0956-789-012', '0967-890-123', '0978-901-234', '0989-012-345', '0910-123-456', '0921-234-567', '0932-345-678', '0943-456-789', '0954-567-890', '0965-678-901', '0976-789-012', '0987-890-123', '0918-901-234', '0929-012-345', '0930-123-456', '0941-234-567'];

  await prisma.reservation.deleteMany({ where: { placeId: LINKED_PLACE_ID } });

  // Different slot distributions per day
  const dayConfigs = [
    // Today: busy evening
    { offset: 0, slots: [{ time: '18:00', count: 3 }, { time: '18:30', count: 2 }, { time: '19:00', count: 4 }, { time: '19:30', count: 1 }, { time: '20:00', count: 2 }] },
    // Tomorrow: moderate
    { offset: 1, slots: [{ time: '18:00', count: 1 }, { time: '18:30', count: 3 }, { time: '19:00', count: 2 }, { time: '19:30', count: 2 }, { time: '20:00', count: 0 }] },
    // Day after: light
    { offset: 2, slots: [{ time: '18:00', count: 0 }, { time: '18:30', count: 1 }, { time: '19:00', count: 1 }, { time: '19:30', count: 0 }, { time: '20:00', count: 1 }] },
  ];

  const notes = [null, '慶生，需要蛋糕', '需要嬰兒椅', '過敏：花生', null, '包廂', null, null, '輪椅空間', null];
  let nameIdx = 0;
  let totalCount = 0;

  for (const dayConfig of dayConfigs) {
    const d = new Date();
    d.setDate(d.getDate() + dayConfig.offset);
    const dateStr = d.toISOString().slice(0, 10);

    for (const slot of dayConfig.slots) {
      for (let i = 0; i < slot.count; i++) {
        const idx = nameIdx % names.length;
        await prisma.reservation.create({
          data: {
            placeId: LINKED_PLACE_ID,
            customerName: names[idx],
            customerPhone: phones[idx],
            partySize: Math.floor(Math.random() * 4) + 2,
            date: dateStr,
            time: slot.time,
            status: 'confirmed',
            note: notes[nameIdx % notes.length],
          },
        });
        nameIdx++;
        totalCount++;
      }
    }
  }

  console.log(`Seeded ${totalCount} reservations across 3 days for ${LINKED_PLACE_ID}`);
}

seed()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
