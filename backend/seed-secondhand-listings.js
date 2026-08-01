/**
 * 不同帳號刊登 i二手商品（8 筆）
 * 使用 member_account 中的 userId，確保賣家帳號確實存在
 */
'use strict';

const prisma = require('./utils/prismaClient');

const listings = [
  {
    sellerId: '00000000-0000-0000-0000-000000000002',
    sellerName: '王大明',
    productName: 'Canon EOS M50 微單相機',
    description: '使用約一年，快門數不到5000，附 15-45mm kit 鏡',
    price: 12000,
    category: '3C',
    pickupStore: '7-ELEVEN 信義門市',
    pickupMethod: '門市代收',
    carbonSaved: 12.5,
    imageUrl: 'https://picsum.photos/seed/camera/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-000000000003',
    sellerName: '李美玲',
    productName: '全新 KitchenAid 攪拌機（紅色）',
    description: '朋友送的但家裡已有一台，全新未拆封',
    price: 8500,
    category: '家電',
    pickupStore: '7-ELEVEN 大安門市',
    pickupMethod: '門市代收',
    carbonSaved: 9.0,
    imageUrl: 'https://picsum.photos/seed/mixer/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-000000000005',
    sellerName: '陳玉婷',
    productName: '瑜珈墊 + 瑜珈輪 + 彈力帶組',
    description: '換了新墊子，舊的還很好用，整組出清',
    price: 0,
    isFree: true,
    category: '運動',
    pickupStore: '7-ELEVEN 松山門市',
    pickupMethod: '門市面交',
    carbonSaved: 2.8,
    imageUrl: 'https://picsum.photos/seed/yoga2/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-000000000006',
    sellerName: '林志偉',
    productName: 'Nike Pegasus 40 慢跑鞋 (US10)',
    description: '穿了約200km，鞋底還很好，換新鞋出清',
    price: 1500,
    category: '運動',
    pickupStore: '7-ELEVEN 信義門市',
    pickupMethod: '門市面交',
    carbonSaved: 3.2,
    imageUrl: 'https://picsum.photos/seed/shoes/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-000000000007',
    sellerName: '黃雅茹',
    productName: '二手書籍套組（15本文學小說）',
    description: '村上春樹、東野圭吾、張愛玲等，保存良好',
    price: 0,
    isFree: true,
    category: '書籍',
    pickupStore: '7-ELEVEN 大安門市',
    pickupMethod: '門市代收',
    carbonSaved: 4.5,
    imageUrl: 'https://picsum.photos/seed/novels/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-000000000008',
    sellerName: '吳建軍',
    productName: '寵物推車（可折疊、20kg 以下）',
    description: '狗狗長大了用不到，九成新附防蚊罩',
    price: 1800,
    category: '寵物',
    pickupStore: '7-ELEVEN 松山門市',
    pickupMethod: '門市代收',
    carbonSaved: 6.0,
    imageUrl: 'https://picsum.photos/seed/petstroller/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-000000000004',
    sellerName: '張家豪',
    productName: '桌遊：阿瓦隆 + 風聲 + 狼人殺',
    description: '三款經典桌遊一起賣，卡片完整無缺',
    price: 600,
    category: '娛樂',
    pickupStore: '7-ELEVEN 信義門市',
    pickupMethod: '門市面交',
    carbonSaved: 1.5,
    imageUrl: 'https://picsum.photos/seed/boardgame/200',
  },
  {
    sellerId: '00000000-0000-0000-0000-00000000000a',
    sellerName: '劉明華',
    productName: '園藝工具組（鏟子、剪刀、花盆x3）',
    description: '搬家出清，花盆是陶製的很漂亮',
    price: 350,
    category: '生活',
    pickupStore: '7-ELEVEN 公館門市',
    pickupMethod: '門市代收',
    carbonSaved: 2.0,
    imageUrl: 'https://picsum.photos/seed/garden/200',
  },
];

async function main() {
  console.log('🔄 開始刊登 i二手商品...\n');

  for (const item of listings) {
    // 檢查是否已存在（依 sellerId + productName）
    const existing = await prisma.secondhandListing.findFirst({
      where: { sellerId: item.sellerId, productName: item.productName, isDeleted: false },
    });
    if (existing) {
      console.log(`  ⏭️ 已存在: ${item.productName}`);
      continue;
    }

    await prisma.secondhandListing.create({
      data: {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        productName: item.productName,
        description: item.description || null,
        price: item.price || 0,
        isFree: item.isFree || item.price === 0,
        category: item.category,
        pickupStore: item.pickupStore,
        pickupMethod: item.pickupMethod,
        carbonSaved: item.carbonSaved || 0,
        imageUrl: item.imageUrl || null,
        status: 'active',
      },
    });

    console.log(`  ✅ ${item.sellerName} 刊登: ${item.productName} ($${item.price})`);
  }

  console.log('\n🎉 完成！共 ' + listings.length + ' 筆二手商品。');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
