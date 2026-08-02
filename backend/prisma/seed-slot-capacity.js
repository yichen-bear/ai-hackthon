require('dotenv').config();
const prisma = require('../utils/prismaClient');

const LINKED_PLACE_ID = 'linked_restaurant_01';

async function seed() {
  console.log('Seeding slot capacities...');
  const slots = ['18:00', '18:30', '19:00', '19:30', '20:00'];
  const tables = [3, 4, 5, 4, 3]; // Different capacity per slot

  for (let i = 0; i < slots.length; i++) {
    await prisma.slotCapacity.upsert({
      where: { placeId_time: { placeId: LINKED_PLACE_ID, time: slots[i] } },
      update: { totalTables: tables[i] },
      create: { placeId: LINKED_PLACE_ID, time: slots[i], totalTables: tables[i] },
    });
  }
  console.log('Done!');
}

seed()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
