/**
 * 種入 i二手門市代收假資料
 * 模擬幾筆已寄放門市的商品，供店長端測試
 */
const prisma = require('./utils/prismaClient')

async function main() {
  const currentUserId = '00000000-0000-0000-0000-000000000001' // 沈小姐
  const seller2Id = '00000000-0000-0000-0000-000000000002'
  const seller3Id = '00000000-0000-0000-0000-000000000003'
  const buyer2Id = '00000000-0000-0000-0000-000000000004'

  // 先建幾筆二手商品
  const listings = await Promise.all([
    prisma.secondhandListing.create({
      data: {
        sellerId: seller2Id,
        sellerName: '王大明',
        productName: 'Nintendo Switch 健身環',
        description: '九成新，附原廠盒',
        price: 1200,
        category: '3C',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        carbonSaved: 3.2,
        status: 'reserved',
        imageUrl: 'https://picsum.photos/seed/switch/200',
      },
    }),
    prisma.secondhandListing.create({
      data: {
        sellerId: seller3Id,
        sellerName: '李美玲',
        productName: '全新未拆 空氣清淨機濾網',
        description: 'HEPA 濾網，適用 Dyson TP04',
        price: 800,
        category: '家電',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        carbonSaved: 2.1,
        status: 'reserved',
        imageUrl: 'https://picsum.photos/seed/filter/200',
      },
    }),
    prisma.secondhandListing.create({
      data: {
        sellerId: currentUserId,
        sellerName: '沈小姐',
        productName: '二手繪本套組（共10本）',
        description: '幼兒繪本，適合2-5歲',
        price: 0,
        isFree: true,
        category: '書籍',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        carbonSaved: 1.5,
        status: 'reserved',
        imageUrl: 'https://picsum.photos/seed/books/200',
      },
    }),
    prisma.secondhandListing.create({
      data: {
        sellerId: seller2Id,
        sellerName: '王大明',
        productName: '瑜珈墊 + 瑜珈磚組',
        description: '使用不到5次，近全新',
        price: 350,
        category: '運動',
        pickupStore: '7-ELEVEN 松山門市',
        pickupMethod: '門市代收',
        carbonSaved: 1.8,
        status: 'reserved',
        imageUrl: 'https://picsum.photos/seed/yoga/200',
      },
    }),
    prisma.secondhandListing.create({
      data: {
        sellerId: seller3Id,
        sellerName: '李美玲',
        productName: '嬰兒推車（Graco）',
        description: '可折疊，附雨罩',
        price: 2500,
        category: '嬰幼兒',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        carbonSaved: 8.5,
        status: 'reserved',
        imageUrl: 'https://picsum.photos/seed/stroller/200',
      },
    }),
  ])

  // 建立對應的 PickupReservation
  const now = new Date()

  // 1. 正常件：3天前寄放，還有4天可取
  const stored3daysAgo = new Date(now)
  stored3daysAgo.setDate(stored3daysAgo.getDate() - 3)
  const deadline1 = new Date(stored3daysAgo)
  deadline1.setDate(deadline1.getDate() + 7)

  // 2. 即將到期：6天前寄放，明天到期
  const stored6daysAgo = new Date(now)
  stored6daysAgo.setDate(stored6daysAgo.getDate() - 6)
  const deadline2 = new Date(stored6daysAgo)
  deadline2.setDate(deadline2.getDate() + 7)

  // 3. 已逾期：8天前寄放
  const stored8daysAgo = new Date(now)
  stored8daysAgo.setDate(stored8daysAgo.getDate() - 8)
  const deadline3 = new Date(stored8daysAgo)
  deadline3.setDate(deadline3.getDate() + 7)

  await Promise.all([
    // 正常件 - 信義門市
    prisma.pickupReservation.create({
      data: {
        listingId: listings[0].id,
        buyerId: currentUserId,
        buyerName: '沈小姐',
        sellerId: seller2Id,
        sellerName: '王大明',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        status: 'ITEM_STORED_IN_711',
        storedAt: stored3daysAgo,
        pickupDeadline: deadline1,
      },
    }),
    // 即將到期 - 信義門市
    prisma.pickupReservation.create({
      data: {
        listingId: listings[1].id,
        buyerId: buyer2Id,
        buyerName: '張先生',
        sellerId: seller3Id,
        sellerName: '李美玲',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        status: 'ITEM_STORED_IN_711',
        storedAt: stored6daysAgo,
        pickupDeadline: deadline2,
      },
    }),
    // 已逾期 - 信義門市
    prisma.pickupReservation.create({
      data: {
        listingId: listings[2].id,
        buyerId: buyer2Id,
        buyerName: '張先生',
        sellerId: currentUserId,
        sellerName: '沈小姐',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        status: 'ITEM_STORED_IN_711',
        storedAt: stored8daysAgo,
        pickupDeadline: deadline3,
      },
    }),
    // 正常件 - 松山門市
    prisma.pickupReservation.create({
      data: {
        listingId: listings[3].id,
        buyerId: currentUserId,
        buyerName: '沈小姐',
        sellerId: seller2Id,
        sellerName: '王大明',
        pickupStore: '7-ELEVEN 松山門市',
        pickupMethod: '門市代收',
        status: 'ITEM_STORED_IN_711',
        storedAt: stored3daysAgo,
        pickupDeadline: deadline1,
      },
    }),
    // 已完成 - 信義門市（用於驗證 filter 不會顯示）
    prisma.pickupReservation.create({
      data: {
        listingId: listings[4].id,
        buyerId: currentUserId,
        buyerName: '沈小姐',
        sellerId: seller3Id,
        sellerName: '李美玲',
        pickupStore: '7-ELEVEN 信義門市',
        pickupMethod: '門市代收',
        status: 'COMPLETED',
        storedAt: stored8daysAgo,
        pickupDeadline: deadline3,
      },
    }),
  ])

  console.log('✅ i二手門市代收假資料種入完成！')
  console.log(`   - 5 筆 SecondhandListing`)
  console.log(`   - 5 筆 PickupReservation (3 STORED + 1 STORED松山 + 1 COMPLETED)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
