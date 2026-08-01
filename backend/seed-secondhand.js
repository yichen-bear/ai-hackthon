require('dotenv').config()
const prisma = require('./utils/prismaClient')

async function seed() {
  const items = [
    { sellerId: '00000000-0000-0000-0000-000000000003', sellerName: '李先生', productName: '小米空氣清淨機', description: '使用一年，濾網剛換新，功能正常', price: 1200, isFree: false, category: 'electronics', pickupStore: '7-11 松山門市', pickupMethod: '門市代放', carbonSaved: 8.1 },
    { sellerId: '00000000-0000-0000-0000-000000000004', sellerName: '陳老師', productName: '兒童繪本套組 (20本)', description: '適合3-6歲，內含故事書、認知書，保存良好', price: 0, isFree: true, category: 'baby', pickupStore: '7-11 大安門市', pickupMethod: '門市面交', carbonSaved: 3.0 },
    { sellerId: '00000000-0000-0000-0000-000000000005', sellerName: '林小姐', productName: '瑜珈墊 + 彈力帶組合', description: '全新未拆封，朋友送的用不到', price: 0, isFree: true, category: 'household', pickupStore: '7-11 忠孝門市', pickupMethod: '門市代放', carbonSaved: 1.5 },
    { sellerId: '00000000-0000-0000-0000-000000000006', sellerName: '趙太太', productName: '大同電鍋（10人份）', description: '使用3年，外鍋有些許使用痕跡，內鍋完好', price: 500, isFree: false, category: 'electronics', pickupStore: '7-11 公館門市', pickupMethod: '門市面交', carbonSaved: 6.8 },
  ]

  for (const item of items) {
    await prisma.secondhandListing.create({ data: item })
    console.log(`✅ 建立: ${item.productName}`)
  }

  console.log('\n全部完成！目前資料：')
  const all = await prisma.secondhandListing.findMany({ where: { isDeleted: false }, orderBy: { creTime: 'desc' } })
  all.forEach(a => console.log(`  [${a.category}] ${a.productName} - $${a.price} (${a.pickupStore})`))
  
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
