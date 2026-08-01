require('dotenv').config()
const prisma = require('./utils/prismaClient')

const USER = '00000000-0000-0000-0000-000000000001' // 沈小姐（當前使用者，加入所有群）
const SYSTEM = '00000000-0000-0000-0000-ffffffffffff' // 系統帳號

async function seed() {
  const groups = [
    { name: '象山登山隊', type: 'interest', icon: '🏔️', tags: ['登山', '運動', '健康'], description: '每週六早起爬象山，歡迎新手加入', activityDate: '每週六', activityTime: '07:00-09:00', activityLocation: '象山步道入口', creatorId: '00000000-0000-0000-0000-000000000020', creatorName: '阿傑' },
    { name: '社區攝影社', type: 'interest', icon: '📷', tags: ['攝影', '旅行'], description: '用手機記錄生活，不定期外拍活動', activityDate: '每月第二個週日', activityTime: '14:00-17:00', activityLocation: '大安森林公園', creatorId: '00000000-0000-0000-0000-000000000021', creatorName: '小美' },
    { name: '桌遊之夜', type: 'interest', icon: '🎲', tags: ['桌遊', '社交'], description: '週五晚上來殺一局！狼人殺、阿瓦隆、卡坦島', activityDate: '每週五', activityTime: '19:30-22:00', activityLocation: '里民活動室 2F', creatorId: '00000000-0000-0000-0000-000000000022', creatorName: '大頭' },
    { name: '晨跑團', type: 'interest', icon: '🏃', tags: ['運動', '跑步', '健康'], description: '6:30 河濱公園集合，5K 輕鬆跑', activityDate: '每週二、四', activityTime: '06:30-07:30', activityLocation: '基隆河濱公園', creatorId: '00000000-0000-0000-0000-000000000023', creatorName: '跑步哥' },
    { name: '手作烘焙坊', type: 'interest', icon: '🧁', tags: ['料理', '手作', '咖啡'], description: '一起做蛋糕、麵包、甜點，作品可帶回家', activityDate: '每月第一個週六', activityTime: '13:00-16:00', activityLocation: '社區活動中心廚房', creatorId: '00000000-0000-0000-0000-000000000024', creatorName: '烘焙達人Amy' },
    { name: '銀髮手機攝影班', type: 'course', icon: '📱', tags: ['攝影', '學習'], description: '社大課程學員群組，課後作業分享', activityDate: '每週三', activityTime: '09:00-11:00', activityLocation: '社大 A201', creatorId: '00000000-0000-0000-0000-000000000025', creatorName: '陳老師' },
    { name: '社區讀書會', type: 'interest', icon: '📚', tags: ['閱讀', '學習'], description: '每月共讀一本書，輕鬆討論不壓力', activityDate: '每月最後一個週六', activityTime: '14:00-16:00', activityLocation: '社區圖書角', creatorId: '00000000-0000-0000-0000-000000000026', creatorName: '書蟲小P' },
    { name: '瑜珈靜心社', type: 'interest', icon: '🧘', tags: ['運動', '健康'], description: '適合初學者的哈達瑜珈，帶著瑜珈墊來就好', activityDate: '每週日', activityTime: '08:00-09:00', activityLocation: '社區公園草地', creatorId: '00000000-0000-0000-0000-000000000027', creatorName: '小瑜老師' },
    { name: '寵物散步團', type: 'interest', icon: '🐕', tags: ['寵物', '社交'], description: '帶毛孩一起散步交朋友！', activityDate: '每週六', activityTime: '17:00-18:00', activityLocation: '河濱公園狗活動區', creatorId: '00000000-0000-0000-0000-000000000028', creatorName: '狗狗媽' },
    { name: '電影同好會', type: 'interest', icon: '🎬', tags: ['電影', '社交'], description: '一起看電影、聊劇情、交換片單', activityDate: '每月第三個週五', activityTime: '19:00-22:00', activityLocation: '信義威秀', creatorId: '00000000-0000-0000-0000-000000000029', creatorName: '影癡老王' },
  ]

  // 每個群的對話
  const conversations = {
    '象山登山隊': [
      { sender: '00000000-0000-0000-0000-000000000020', name: '阿傑', msg: '這週六照常 7 點集合喔，記得帶水！' },
      { sender: USER, name: '沈小姐', msg: '收到～我會準時到' },
      { sender: '00000000-0000-0000-0000-000000000023', name: '跑步哥', msg: '天氣預報說會有點悶熱，大家注意防曬' },
      { sender: '00000000-0000-0000-0000-000000000020', name: '阿傑', msg: '對了，上次拍的日出照片有人要嗎？我可以傳群組' },
    ],
    '社區攝影社': [
      { sender: '00000000-0000-0000-0000-000000000021', name: '小美', msg: '下次外拍主題：城市光影，大家可以開始構思取景點' },
      { sender: USER, name: '沈小姐', msg: '我想拍信義區的夜景，有人要一起嗎？' },
      { sender: '00000000-0000-0000-0000-000000000021', name: '小美', msg: '好耶！我也想去，約週日傍晚？' },
      { sender: '00000000-0000-0000-0000-000000000026', name: '書蟲小P', msg: '我有腳架可以借大家用' },
    ],
    '桌遊之夜': [
      { sender: '00000000-0000-0000-0000-000000000022', name: '大頭', msg: '這週五誰要來？目前確認 4 人' },
      { sender: USER, name: '沈小姐', msg: '我+1！帶阿瓦隆' },
      { sender: '00000000-0000-0000-0000-000000000022', name: '大頭', msg: '讚！那就 5 人了，完美開一桌' },
    ],
    '晨跑團': [
      { sender: '00000000-0000-0000-0000-000000000023', name: '跑步哥', msg: '今天跑了 6.2K，配速 5:30，新紀錄！' },
      { sender: USER, name: '沈小姐', msg: '太厲害了～我今天偷懶只跑 3K' },
      { sender: '00000000-0000-0000-0000-000000000023', name: '跑步哥', msg: '有跑就是好的！持續就會進步' },
      { sender: '00000000-0000-0000-0000-000000000024', name: '烘焙達人Amy', msg: '下次跑完我帶自製能量棒給大家' },
    ],
    '手作烘焙坊': [
      { sender: '00000000-0000-0000-0000-000000000024', name: '烘焙達人Amy', msg: '下次主題：法式可頌 🥐 材料費 $150/人' },
      { sender: USER, name: '沈小姐', msg: '超期待！可頌好難做但好想學' },
      { sender: '00000000-0000-0000-0000-000000000024', name: '烘焙達人Amy', msg: '別擔心，我會從基礎教起，保證大家都能成功帶回家' },
    ],
    '銀髮手機攝影班': [
      { sender: '00000000-0000-0000-0000-000000000025', name: '陳老師', msg: '下週三帶自己的作品來分享，主題是「家附近的風景」' },
      { sender: USER, name: '沈小姐', msg: '老師，請問用 iPhone 的人像模式可以嗎？' },
      { sender: '00000000-0000-0000-0000-000000000025', name: '陳老師', msg: '當然可以！人像模式的背景虛化很適合這個主題' },
    ],
    '社區讀書會': [
      { sender: '00000000-0000-0000-0000-000000000026', name: '書蟲小P', msg: '本月選書：《原子習慣》，圖書館有，也可以用電子書' },
      { sender: USER, name: '沈小姐', msg: '剛好想讀這本！' },
      { sender: '00000000-0000-0000-0000-000000000026', name: '書蟲小P', msg: '那太好了～讀完我們一起聊聊哪個習慣最有感' },
      { sender: '00000000-0000-0000-0000-000000000027', name: '小瑜老師', msg: '我也報名！想養成冥想的習慣' },
    ],
    '瑜珈靜心社': [
      { sender: '00000000-0000-0000-0000-000000000027', name: '小瑜老師', msg: '這週日天氣好，在公園草地做瑜珈，記得帶墊子' },
      { sender: USER, name: '沈小姐', msg: '好～需要自備瑜珈磚嗎？' },
      { sender: '00000000-0000-0000-0000-000000000027', name: '小瑜老師', msg: '不用喔，我會帶幾個公用的' },
    ],
    '寵物散步團': [
      { sender: '00000000-0000-0000-0000-000000000028', name: '狗狗媽', msg: '上次的合照有人要嗎？超可愛的！' },
      { sender: USER, name: '沈小姐', msg: '要要要～傳上來！' },
      { sender: '00000000-0000-0000-0000-000000000028', name: '狗狗媽', msg: '已傳！你家柴柴那張最萌了 🐕' },
      { sender: '00000000-0000-0000-0000-000000000029', name: '影癡老王', msg: '下次帶我家貓來可以嗎？牠很乖的' },
      { sender: '00000000-0000-0000-0000-000000000028', name: '狗狗媽', msg: '當然歡迎！不過建議帶牽繩比較安全' },
    ],
    '電影同好會': [
      { sender: '00000000-0000-0000-0000-000000000029', name: '影癡老王', msg: '這個月片單：《乘風破浪》或《腦筋急轉彎2》大家投票' },
      { sender: USER, name: '沈小姐', msg: '投《腦筋急轉彎2》！' },
      { sender: '00000000-0000-0000-0000-000000000029', name: '影癡老王', msg: '目前 3:1，腦筋急轉彎勝出！週五晚 7 點信義威秀見' },
    ],
  }

  for (const g of groups) {
    const group = await prisma.communityGroup.create({ data: g })
    console.log(`✅ 社群：${g.name}`)

    // 建立者加入
    await prisma.groupMember.create({ data: { groupId: group.id, userId: g.creatorId, userName: g.creatorName } })
    // 沈小姐加入所有群
    await prisma.groupMember.create({ data: { groupId: group.id, userId: USER, userName: '沈小姐' } })

    // 置頂公告
    await prisma.chatMessage.create({
      data: { senderId: SYSTEM, senderName: '📌 公告', groupId: group.id, content: `【${g.name}】${g.activityDate ? `活動時間：${g.activityDate} ${g.activityTime}\n地點：${g.activityLocation}` : '歡迎加入！'}`, messageType: 'system' },
    })

    // 對話
    const msgs = conversations[g.name] || []
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      await prisma.chatMessage.create({
        data: { senderId: m.sender, senderName: m.name, groupId: group.id, content: m.msg, messageType: 'text', creTime: new Date(Date.now() - (msgs.length - i) * 3600000) },
      })
    }
  }

  const totalGroups = await prisma.communityGroup.count()
  const totalMessages = await prisma.chatMessage.count({ where: { groupId: { not: null } } })
  console.log(`\n完成！${totalGroups} 個社群，${totalMessages} 筆群組訊息`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
