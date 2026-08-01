require('dotenv').config()
const prisma = require('./utils/prismaClient')

async function seed() {
  const items = [
    { sellerId: '00000000-0000-0000-0000-000000000007', sellerName: '黃太太', productName: 'Dyson 吹風機（二手）', description: '使用兩年，風力依然強勁，附收納架', price: 3500, isFree: false, category: 'electronics', pickupStore: '7-11 信義門市', pickupMethod: '門市面交', carbonSaved: 12.0 },
    { sellerId: '00000000-0000-0000-0000-000000000008', sellerName: '周爸爸', productName: '兒童安全座椅', description: 'Britax 0-4歲，無事故，可調整角度', price: 2000, isFree: false, category: 'baby', pickupStore: '7-11 松山門市', pickupMethod: '門市面交', carbonSaved: 15.0 },
    { sellerId: '00000000-0000-0000-0000-000000000009', sellerName: '蔡小姐', productName: '除濕機 Panasonic 6L', description: '每年使用3個月，功能正常附說明書', price: 1800, isFree: false, category: 'electronics', pickupStore: '7-11 大安門市', pickupMethod: '門市代放', carbonSaved: 9.5 },
    { sellerId: '00000000-0000-0000-0000-000000000010', sellerName: '吳同學', productName: '任天堂 Switch + 健身環', description: '螢幕完好，附2片遊戲卡帶', price: 5500, isFree: false, category: 'electronics', pickupStore: '7-11 公館門市', pickupMethod: '門市面交', carbonSaved: 4.2 },
    { sellerId: '00000000-0000-0000-0000-000000000011', sellerName: '張奶奶', productName: '縫紉機（勝家牌）', description: '年代久遠但功能正常，適合手作愛好者', price: 0, isFree: true, category: 'household', pickupStore: '7-11 忠孝門市', pickupMethod: '門市面交', carbonSaved: 7.0 },
    { sellerId: '00000000-0000-0000-0000-000000000012', sellerName: '劉先生', productName: '電競椅（黑紅色）', description: '使用一年，椅面微磨損，骨架完好', price: 1500, isFree: false, category: 'household', pickupStore: '7-11 信義門市', pickupMethod: '門市面交', carbonSaved: 18.0 },
    { sellerId: '00000000-0000-0000-0000-000000000013', sellerName: '陳媽媽', productName: '嬰兒床 + 床墊組', description: '木質嬰兒床，可調高度，附全新床墊', price: 1200, isFree: false, category: 'baby', pickupStore: '7-11 大安門市', pickupMethod: '門市代放', carbonSaved: 20.0 },
    { sellerId: '00000000-0000-0000-0000-000000000014', sellerName: '許先生', productName: '咖啡機 Nespresso', description: '膠囊式，附20顆膠囊，外觀9成新', price: 800, isFree: false, category: 'electronics', pickupStore: '7-11 松山門市', pickupMethod: '門市面交', carbonSaved: 5.5 },
    { sellerId: '00000000-0000-0000-0000-000000000015', sellerName: '林阿姨', productName: '全套廚房收納架（3層）', description: '不鏽鋼材質，可拆洗，含掛勾組', price: 0, isFree: true, category: 'household', pickupStore: '7-11 公館門市', pickupMethod: '門市代放', carbonSaved: 3.5 },
    { sellerId: '00000000-0000-0000-0000-000000000016', sellerName: '方同學', productName: 'iPad Air 4 + Apple Pencil', description: '64GB WiFi版，螢幕無刮痕，附保護殼', price: 8000, isFree: false, category: 'electronics', pickupStore: '7-11 忠孝門市', pickupMethod: '門市面交', carbonSaved: 6.0 },
  ]

  for (const item of items) {
    await prisma.secondhandListing.create({ data: item })
    console.log(`✅ ${item.productName}`)
  }

  const count = await prisma.secondhandListing.count({ where: { isDeleted: false, status: 'active' } })
  console.log(`\n完成！目前共 ${count} 筆活躍商品`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
