/**
 * 將 10 個模擬帳號隨機分配到社群，並發送帶暱稱的訊息
 * 每人加入 2-4 個群，每群發 1-2 條訊息
 */
'use strict';

const prisma = require('./utils/prismaClient');

const users = [
  { id: '00000000-0000-0000-0000-000000000001', name: '沈湘淇', nickname: '淇淇愛登山' },
  { id: '00000000-0000-0000-0000-000000000002', name: '王大明', nickname: '攝影王' },
  { id: '00000000-0000-0000-0000-000000000003', name: '李美玲', nickname: '烘焙小天使' },
  { id: '00000000-0000-0000-0000-000000000004', name: '張家豪', nickname: '桌遊大師' },
  { id: '00000000-0000-0000-0000-000000000005', name: '陳玉婷', nickname: '瑜珈達人' },
  { id: '00000000-0000-0000-0000-000000000006', name: '林志偉', nickname: '晨跑林' },
  { id: '00000000-0000-0000-0000-000000000007', name: '黃雅茹', nickname: '書蟲小茹' },
  { id: '00000000-0000-0000-0000-000000000008', name: '吳建軍', nickname: '毛孩爸爸' },
  { id: '00000000-0000-0000-0000-000000000009', name: '許佩玲', nickname: '電影迷佩佩' },
  { id: '00000000-0000-0000-0000-00000000000a', name: '劉明華', nickname: '園藝劉叔' },
];

// 社群對話模板
const chatTemplates = {
  '象山登山隊': ['週六早上七點出發，大家記得帶水！', '上次拍到的夕陽好美，下次要帶腳架', '新手可以走哪條路線比較輕鬆？', '我帶了紅豆湯給大家暖身☕'],
  '社區攝影社': ['分享一張昨天街拍的作品 📸', '有人推薦平價的定焦鏡頭嗎？', '這週六信義區有攝影展，一起去嗎', '光圈優先模式真的很好用！'],
  '桌遊之夜': ['這週五晚上有空的+1', '新買了一款合作遊戲，很好玩', '上次的阿瓦隆玩到半夜😂', '帶零食來的人加分！'],
  '晨跑團': ['今天跑了5K，配速5分半💪', '明天六點河濱見，記得暖身', '推薦一雙好跑鞋', '下雨天改練核心好了'],
  '手作烘焙坊': ['今天做了肉桂捲，超香！', '有人要一起團購麵粉嗎？', '分享我的戚風蛋糕食譜', '第一次做就成功了！好開心'],
  '銀髮手機攝影班': ['食物模式拍出來效果真好', '孫子說我拍的比他還好😊', '下次教修圖嗎？', '用手機就能拍出好照片呢'],
  '社區讀書會': ['推薦《原子習慣》，很實用', '這個月的書目是什麼？', '我筆記整理好了可以分享', '下次要不要試試線上讀書會'],
  '瑜珈靜心社': ['今天的鴿子式做到了！', '老師建議每天至少做10分鐘', '下週改在公園戶外瑜珈如何', '筋骨真的有變軟❤️'],
  '寵物散步團': ['今天帶毛孩去河濱好開心🐕', '推薦一家寵物友善餐廳', '有人家的狗也怕打雷嗎😅', '週末寵物公園見！'],
  '電影同好會': ['剛看完《奧本海默》推薦！', '有人想一起訂團體票嗎', '這週末放映會選哪部？', '爆米花我準備🍿'],
  '漫畫分享會': ['最近在追《葬送的芙莉蓮》', '有人看過《SPY×FAMILY》嗎', '我有一些漫畫可以借', '下次聚會帶自己喜歡的漫畫來分享'],
};

// 每個用戶適合加入的社群（根據暱稱興趣）
const userGroupMapping = {
  '00000000-0000-0000-0000-000000000001': ['象山登山隊', '社區攝影社', '瑜珈靜心社'],
  '00000000-0000-0000-0000-000000000002': ['社區攝影社', '銀髮手機攝影班', '象山登山隊'],
  '00000000-0000-0000-0000-000000000003': ['手作烘焙坊', '社區讀書會', '瑜珈靜心社'],
  '00000000-0000-0000-0000-000000000004': ['桌遊之夜', '電影同好會', '漫畫分享會'],
  '00000000-0000-0000-0000-000000000005': ['瑜珈靜心社', '晨跑團', '象山登山隊'],
  '00000000-0000-0000-0000-000000000006': ['晨跑團', '象山登山隊', '桌遊之夜'],
  '00000000-0000-0000-0000-000000000007': ['社區讀書會', '電影同好會', '手作烘焙坊'],
  '00000000-0000-0000-0000-000000000008': ['寵物散步團', '晨跑團', '桌遊之夜'],
  '00000000-0000-0000-0000-000000000009': ['電影同好會', '漫畫分享會', '寵物散步團'],
  '00000000-0000-0000-0000-00000000000a': ['象山登山隊', '銀髮手機攝影班', '社區讀書會'],
};

async function main() {
  // 取得所有社群
  const groups = await prisma.communityGroup.findMany({ where: { isDeleted: false } });
  const groupMap = Object.fromEntries(groups.map(g => [g.name, g.id]));

  console.log('🔄 開始分配帳號到社群...\n');

  let totalJoined = 0;
  let totalMessages = 0;

  for (const user of users) {
    const targetGroups = userGroupMapping[user.id] || [];

    for (const groupName of targetGroups) {
      const groupId = groupMap[groupName];
      if (!groupId) { console.warn(`  ⚠️ 找不到社群: ${groupName}`); continue; }

      // 檢查是否已加入
      const existing = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
      if (!existing) {
        await prisma.groupMember.create({
          data: { groupId, userId: user.id, userName: user.nickname },
        });
        totalJoined++;
      }

      // 發送 1-2 條訊息
      const templates = chatTemplates[groupName] || ['大家好！'];
      const msgCount = Math.min(templates.length, 1 + Math.floor(Math.random() * 2));
      
      for (let i = 0; i < msgCount; i++) {
        const content = templates[Math.floor(Math.random() * templates.length)];
        // 避免重複訊息
        const existMsg = await prisma.chatMessage.findFirst({
          where: { groupId, senderId: user.id, content },
        });
        if (!existMsg) {
          const randomMinutesAgo = Math.floor(Math.random() * 10000) + 60; // 1hr ~ 7days ago
          await prisma.chatMessage.create({
            data: {
              senderId: user.id,
              senderName: user.nickname,
              groupId,
              content,
              messageType: 'text',
              creTime: new Date(Date.now() - randomMinutesAgo * 60000),
            },
          });
          totalMessages++;
        }
      }
    }

    console.log(`  ✅ ${user.nickname} → 加入 [${targetGroups.join(', ')}]`);
  }

  console.log(`\n🎉 完成！新增 ${totalJoined} 筆成員關係 + ${totalMessages} 則訊息`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
