/**
 * 候位系統 seed — 從 member_account 撈真實會員，
 * 分配 8 位為「在座」、2 位為「候位」，建立 queue_entry 記錄
 * 
 * 使用固定的 placeId = 'linked_restaurant_01' 作為客戶端與廠商端共用的餐廳 ID
 * 
 * 用法: node prisma/seed-queue-customers.js
 */

require('dotenv').config();
const prisma = require('../utils/prismaClient');

// 共用的餐廳 placeId — 客戶端推薦第一間與廠商端管理的都是這個
const LINKED_PLACE_ID = 'linked_restaurant_01';
const RESTAURANT_NAME = 'AI 推薦餐廳';

// 顯示用的假名（因為 member_account 的 name 是加密的，我們在 queue_entry 存可讀名字）
const DISPLAY_NAMES = [
  { name: '陳小明', phone: '0912-345-678' },
  { name: '林美玲', phone: '0923-456-789' },
  { name: '王大維', phone: '0934-567-890' },
  { name: '張雅婷', phone: '0945-678-901' },
  { name: '李建宏', phone: '0956-789-012' },
  { name: '黃淑芬', phone: '0967-890-123' },
  { name: '吳志偉', phone: '0978-901-234' },
  { name: '劉佳琪', phone: '0989-012-345' },
  { name: '楊宗翰', phone: '0910-123-456' },
  { name: '蔡欣怡', phone: '0921-234-567' },
];

async function seed() {
  console.log('Seeding queue customers...');

  // Step 1: 確保餐廳候位資料存在
  let queue = await prisma.restaurantQueue.findUnique({
    where: { placeId: LINKED_PLACE_ID },
  });

  if (!queue) {
    queue = await prisma.restaurantQueue.create({
      data: {
        placeId: LINKED_PLACE_ID,
        name: RESTAURANT_NAME,
        totalTables: 10,
        emptyTables: 2,
        waitingGroups: 2,
        estimatedMinutes: 10,
        avgServiceMinutes: 30,
        isOpen: true,
      },
    });
    console.log(`  Created restaurant queue: ${RESTAURANT_NAME}`);
  } else {
    // 更新為正確的狀態
    await prisma.restaurantQueue.update({
      where: { placeId: LINKED_PLACE_ID },
      data: {
        name: RESTAURANT_NAME,
        totalTables: 10,
        emptyTables: 2,
        waitingGroups: 2,
        estimatedMinutes: 10,
      },
    });
    console.log(`  Updated restaurant queue: ${RESTAURANT_NAME}`);
  }

  // Step 2: 清掉舊的 queue entries
  await prisma.queueEntry.deleteMany({
    where: { queueId: queue.id },
  });
  console.log('  Cleared old queue entries');

  // Step 3: 撈真實會員 IDs（取前 10 位）
  const members = await prisma.memberAccount.findMany({
    take: 10,
    select: { id: true },
    orderBy: { creTime: 'asc' },
  });

  if (members.length < 10) {
    console.log(`  Warning: only ${members.length} members found, will use what's available`);
  }

  // Step 4: 建立 8 個 seated + 2 個 waiting
  const seatedCount = Math.min(8, members.length);
  const waitingCount = Math.min(2, Math.max(0, members.length - 8));

  for (let i = 0; i < seatedCount; i++) {
    const display = DISPLAY_NAMES[i];
    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        ticketNumber: i + 1,
        partySize: Math.floor(Math.random() * 4) + 1, // 1~4 人
        customerName: display.name,
        customerPhone: display.phone,
        note: null,
        status: 'seated',
      },
    });
  }
  console.log(`  Created ${seatedCount} seated entries`);

  for (let i = 0; i < waitingCount; i++) {
    const idx = seatedCount + i;
    const display = DISPLAY_NAMES[idx];
    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        ticketNumber: seatedCount + i + 1,
        partySize: Math.floor(Math.random() * 3) + 2, // 2~4 人
        customerName: display.name,
        customerPhone: display.phone,
        note: i === 0 ? '需要嬰兒椅' : null,
        status: 'waiting',
      },
    });
  }
  console.log(`  Created ${waitingCount} waiting entries`);

  console.log('Done! Restaurant placeId:', LINKED_PLACE_ID);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
