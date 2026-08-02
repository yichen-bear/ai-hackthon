/**
 * 候位系統 seed — 插入幾間示範餐廳的候位資料
 * 用法: node prisma/seed-queue.js
 */

require('dotenv').config();
const prisma = require('../utils/prismaClient');

const demoRestaurants = [
  {
    placeId: 'demo_dintaifung_101',
    name: '鼎泰豐 101店',
    totalTables: 15,
    emptyTables: 2,
    waitingGroups: 5,
    estimatedMinutes: 20,
    avgServiceMinutes: 45,
    isOpen: true,
  },
  {
    placeId: 'demo_ichiran_taipei',
    name: '一蘭拉麵 台北店',
    totalTables: 20,
    emptyTables: 6,
    waitingGroups: 2,
    estimatedMinutes: 8,
    avgServiceMinutes: 25,
    isOpen: true,
  },
  {
    placeId: 'demo_dingwang_hotpot',
    name: '鼎王麻辣鍋',
    totalTables: 12,
    emptyTables: 0,
    waitingGroups: 8,
    estimatedMinutes: 35,
    avgServiceMinutes: 60,
    isOpen: true,
  },
];

async function seed() {
  console.log('Seeding restaurant queue data...');

  for (const r of demoRestaurants) {
    const existing = await prisma.restaurantQueue.findUnique({
      where: { placeId: r.placeId },
    });

    if (existing) {
      await prisma.restaurantQueue.update({
        where: { placeId: r.placeId },
        data: r,
      });
      console.log(`  Updated: ${r.name}`);
    } else {
      await prisma.restaurantQueue.create({ data: r });
      console.log(`  Created: ${r.name}`);
    }
  }

  console.log('Done!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
