/**
 * yoxi 叫車 Seed：6 位司機 + 10 筆歷史訂單
 */
'use strict';

const prisma = require('./utils/prismaClient');

const drivers = [
  { id: 'dd000000-0000-0000-0000-000000000001', name: '陳志明', phone: '0912-111-001', plateNumber: 'ABC-1234', carModel: 'Toyota Camry', carType: 'sedan', rating: 4.8, totalTrips: 1523, status: 'available' },
  { id: 'dd000000-0000-0000-0000-000000000002', name: '林建宏', phone: '0922-111-002', plateNumber: 'DEF-5678', carModel: 'Toyota Alphard', carType: 'van', rating: 4.9, totalTrips: 892, status: 'busy' },
  { id: 'dd000000-0000-0000-0000-000000000003', name: '張美華', phone: '0933-111-003', plateNumber: 'GHI-9012', carModel: 'Honda Fit', carType: 'sedan', rating: 4.7, totalTrips: 2105, status: 'available' },
  { id: 'dd000000-0000-0000-0000-000000000004', name: '王俊傑', phone: '0944-111-004', plateNumber: 'JKL-3456', carModel: 'Toyota Sienta (無障礙)', carType: 'accessible', rating: 4.9, totalTrips: 654, status: 'available' },
  { id: 'dd000000-0000-0000-0000-000000000005', name: '黃淑芬', phone: '0955-111-005', plateNumber: 'MNO-7890', carModel: 'Nissan X-Trail', carType: 'pet-friendly', rating: 4.6, totalTrips: 1287, status: 'offline' },
  { id: 'dd000000-0000-0000-0000-000000000006', name: '劉國棟', phone: '0966-111-006', plateNumber: 'PQR-2345', carModel: 'Hyundai Ioniq 5', carType: 'sedan', rating: 4.8, totalTrips: 430, status: 'available' },
];

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

const rideOrders = [
  // 已完成（有評分）
  { passengerId: users[0].id, passengerName: users[0].name, passengerPhone: users[0].phone, pickup: '台北市信義區松仁路100號', destination: '台北市大安區忠孝東路四段200號', carType: 'sedan', mode: 'instant', status: 'completed', driverId: drivers[0].id, fare: 285, distance: 5.2, rating: 5, ratingComment: '司機很有禮貌，車內乾淨', hoursAgo: 2 },
  { passengerId: users[1].id, passengerName: users[1].name, passengerPhone: users[1].phone, pickup: '台北市中山區南京東路二段50號', destination: '桃園國際機場第一航廈', carType: 'van', mode: 'scheduled', status: 'completed', driverId: drivers[1].id, fare: 1250, distance: 35.8, rating: 5, ratingComment: '準時到達，行李幫忙搬', hoursAgo: 24 },
  { passengerId: users[2].id, passengerName: users[2].name, passengerPhone: users[2].phone, pickup: '台北市大安區復興南路二段151號', destination: '台大醫院門診大樓', carType: 'sedan', mode: 'instant', status: 'completed', driverId: drivers[2].id, fare: 180, distance: 3.1, rating: 4, ratingComment: null, hoursAgo: 48 },
  { passengerId: users[5].id, passengerName: users[5].name, passengerPhone: users[5].phone, pickup: '台北市松山區民生東路四段97號', destination: '台北101觀景台', carType: 'sedan', mode: 'instant', status: 'completed', driverId: drivers[5].id, fare: 220, distance: 4.5, rating: 5, ratingComment: '電動車好安靜好舒服', hoursAgo: 72 },
  { passengerId: users[7].id, passengerName: users[7].name, passengerPhone: users[7].phone, pickup: '台北市信義區永吉路30巷12號', destination: '台北市內湖區瑞光路513巷', carType: 'pet-friendly', mode: 'instant', status: 'completed', driverId: drivers[4].id, fare: 320, distance: 7.8, rating: 4, ratingComment: '狗狗坐得很開心', hoursAgo: 96 },
  // 已完成（無評分）
  { passengerId: users[3].id, passengerName: users[3].name, passengerPhone: users[3].phone, pickup: '台北市信義區基隆路一段333號', destination: '台北市中正區博愛路', carType: 'sedan', mode: 'instant', status: 'completed', driverId: drivers[0].id, fare: 195, distance: 3.8, rating: null, ratingComment: null, hoursAgo: 120 },
  { passengerId: users[9].id, passengerName: users[9].name, passengerPhone: users[9].phone, pickup: '台北市松山區南京東路五段250號', destination: '台北市萬華區西門町', carType: 'accessible', mode: 'scheduled', status: 'completed', driverId: drivers[3].id, fare: 380, distance: 8.2, rating: 5, ratingComment: '無障礙設備完善，很貼心', hoursAgo: 144 },
  // 進行中
  { passengerId: users[4].id, passengerName: users[4].name, passengerPhone: users[4].phone, pickup: '台北市中山區長安東路二段48號', destination: '台北市信義區松高路19號（ATT 4 FUN）', carType: 'sedan', mode: 'instant', status: 'in_progress', driverId: drivers[2].id, fare: 240, distance: 4.8, rating: null, ratingComment: null, hoursAgo: 0 },
  // 待派車
  { passengerId: users[6].id, passengerName: users[6].name, passengerPhone: users[6].phone, pickup: '台北市大安區和平東路二段76號', destination: '台北市北投區新民路', carType: 'sedan', mode: 'instant', status: 'pending', driverId: null, fare: null, distance: null, rating: null, ratingComment: null, hoursAgo: 0 },
  { passengerId: users[8].id, passengerName: users[8].name, passengerPhone: users[8].phone, pickup: '台北市中山區長安東路二段48號', destination: '台北車站', carType: 'van', mode: 'scheduled', status: 'pending', driverId: null, fare: null, distance: null, rating: null, ratingComment: null, hoursAgo: 0 },
];

async function main() {
  console.log('🔄 建立 yoxi 叫車假資料...\n');

  // 建立司機
  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { id: d.id },
      update: { name: d.name, phone: d.phone, plateNumber: d.plateNumber, carModel: d.carModel, carType: d.carType, rating: d.rating, totalTrips: d.totalTrips, status: d.status },
      create: d,
    });
    console.log(`  🚗 司機：${d.name} (${d.carModel}) - ${d.status}`);
  }

  // 建立訂單
  console.log('');
  for (const r of rideOrders) {
    const existing = await prisma.rideOrder.findFirst({
      where: { passengerId: r.passengerId, pickup: r.pickup, destination: r.destination },
    });
    if (existing) { console.log(`  ⏭️ 已存在：${r.passengerName} → ${r.destination.slice(0, 15)}...`); continue; }

    const creTime = new Date(Date.now() - r.hoursAgo * 3600000);
    const completedAt = r.status === 'completed' ? new Date(creTime.getTime() + (r.distance || 5) * 3 * 60000) : null;

    await prisma.rideOrder.create({
      data: {
        passengerId: r.passengerId,
        passengerName: r.passengerName,
        passengerPhone: r.passengerPhone,
        pickup: r.pickup,
        destination: r.destination,
        carType: r.carType,
        mode: r.mode,
        status: r.status,
        driverId: r.driverId,
        fare: r.fare,
        distance: r.distance,
        rating: r.rating,
        ratingComment: r.ratingComment,
        creTime,
        completedAt,
        scheduledAt: r.mode === 'scheduled' ? new Date(creTime.getTime() + 3600000) : null,
      },
    });
    console.log(`  ✅ ${r.passengerName} → ${r.destination.slice(0, 20)}... [${r.status}]`);
  }

  console.log('\n🎉 完成！');
  console.log(`   - ${drivers.length} 位司機`);
  console.log(`   - ${rideOrders.length} 筆叫車訂單`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
