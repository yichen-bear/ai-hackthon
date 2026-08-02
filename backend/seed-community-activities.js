/**
 * 社區活動 + 報名 + 居民提問 Seed
 */
'use strict';

const prisma = require('./utils/prismaClient');

const ORGANIZER_ID = '00000000-0000-0000-0000-eeeeeeeeeeee';
const ORGANIZER_NAME = '信義區里辦公處';

const users = [
  { id: '00000000-0000-0000-0000-000000000001', name: '沈湘淇' },
  { id: '00000000-0000-0000-0000-000000000002', name: '王大明' },
  { id: '00000000-0000-0000-0000-000000000003', name: '李美玲' },
  { id: '00000000-0000-0000-0000-000000000004', name: '張家豪' },
  { id: '00000000-0000-0000-0000-000000000005', name: '陳玉婷' },
  { id: '00000000-0000-0000-0000-000000000006', name: '林志偉' },
  { id: '00000000-0000-0000-0000-000000000007', name: '黃雅茹' },
  { id: '00000000-0000-0000-0000-000000000008', name: '吳建軍' },
  { id: '00000000-0000-0000-0000-000000000009', name: '許佩玲' },
  { id: '00000000-0000-0000-0000-00000000000a', name: '劉明華' },
];

const activities = [
  {
    title: '社區中秋聯歡晚會',
    description: '一年一度的中秋晚會，有烤肉、猜燈謎、卡拉OK，歡迎全家大小一起來！備有月餅與柚子，名額有限請早報名。',
    category: 'culture',
    location: '信義區民活動中心 1F 大廳',
    activityDate: new Date('2026-09-17T18:00:00+08:00'),
    activityEndDate: new Date('2026-09-17T21:30:00+08:00'),
    maxParticipants: 80,
    status: 'open',
    registrants: [0, 1, 2, 3, 4],  // indices into users array
  },
  {
    title: '銀髮族健康操班（第3期）',
    description: '由物理治療師帶領，每週二、四早上 8:00-9:00，適合 60 歲以上長者。課程包含關節活動、平衡訓練、呼吸調節。',
    category: 'health',
    location: '里民公園涼亭區',
    activityDate: new Date('2026-08-05T08:00:00+08:00'),
    activityEndDate: new Date('2026-09-30T09:00:00+08:00'),
    maxParticipants: 30,
    status: 'open',
    registrants: [1, 5, 7, 9],
  },
  {
    title: '社區環保日：資源回收大作戰',
    description: '響應環保署政策，本里舉辦年度資源回收活動。請攜帶可回收物資前來，現場有點數兌換與環保小禮物。',
    category: 'environment',
    location: '信義國小操場',
    activityDate: new Date('2026-08-15T09:00:00+08:00'),
    activityEndDate: new Date('2026-08-15T12:00:00+08:00'),
    maxParticipants: 100,
    status: 'open',
    registrants: [0, 2, 4, 6, 8],
  },
  {
    title: '親子共讀繪本時光',
    description: '適合 3-8 歲兒童與家長參加，由志工媽媽帶領繪本朗讀、手作DIY。每月第二個週六下午舉辦。',
    category: 'culture',
    location: '信義區立圖書館 2F 兒童閱覽室',
    activityDate: new Date('2026-08-09T14:00:00+08:00'),
    activityEndDate: new Date('2026-08-09T16:00:00+08:00'),
    maxParticipants: 20,
    status: 'open',
    registrants: [0, 2, 7],
  },
  {
    title: '社區防災演練暨消防安全講座',
    description: '與信義消防分隊合辦，內容包含地震避難演練、滅火器操作、AED教學。全體住戶建議參加。',
    category: 'safety',
    location: '社區中庭廣場',
    activityDate: new Date('2026-08-22T10:00:00+08:00'),
    activityEndDate: new Date('2026-08-22T12:00:00+08:00'),
    maxParticipants: 60,
    status: 'open',
    registrants: [1, 3, 5, 6, 8, 9],
  },
  {
    title: '社區電影院：夏日動畫祭',
    description: '在中庭大螢幕播放《乘風破浪》+《天氣之子》雙片連映，備有爆米花與飲料，攜帶野餐墊來享受夏夜吧！',
    category: 'culture',
    location: '社區中庭廣場（雨天改至 B1 會議室）',
    activityDate: new Date('2026-08-30T19:00:00+08:00'),
    activityEndDate: new Date('2026-08-30T22:30:00+08:00'),
    maxParticipants: 50,
    status: 'open',
    registrants: [0, 3, 4, 8, 9],
  },
  {
    title: '社區跳蚤市場',
    description: '二手物品交換與販售，攤位免費申請（限社區住戶），同時結合 i二手線上物品展示。當天有手沖咖啡攤。',
    category: 'environment',
    location: '社區 1F 中庭走廊',
    activityDate: new Date('2026-09-06T10:00:00+08:00'),
    activityEndDate: new Date('2026-09-06T16:00:00+08:00'),
    maxParticipants: 40,
    status: 'open',
    registrants: [2, 4, 6, 7],
  },
  {
    title: '里長座談會（8月份）',
    description: '每月例行里長座談，歡迎住戶提出社區建議與問題。本月議題：停車場管理改善方案、中庭綠化計畫。',
    category: 'general',
    location: '里民活動中心 3F 會議室',
    activityDate: new Date('2026-08-28T19:30:00+08:00'),
    activityEndDate: new Date('2026-08-28T21:00:00+08:00'),
    maxParticipants: 40,
    status: 'open',
    registrants: [1, 5, 9],
  },
];

const questions = [
  { askerId: users[0].id, askerName: '沈湘淇', content: '請問中庭的兒童遊戲區什麼時候會整修完成？之前說8月初，現在有更新進度嗎？', category: 'facility' },
  { askerId: users[1].id, askerName: '王大明', content: '地下停車場 B2 的燈管好幾支壞了，晚上停車很暗很危險，可以盡快修繕嗎？', category: 'facility', replyContent: '已通知物業公司，預計本週五前完成更換。感謝您的反映！', repliedBy: '里長 陳建宏' },
  { askerId: users[3].id, askerName: '張家豪', content: '隔壁棟深夜常有裝潢噪音（超過晚上10點），已經持續兩週了，可以協助處理嗎？', category: 'noise', replyContent: '已聯繫該戶並發出書面警告，如再違規將依社區規約開罰。', repliedBy: '里長 陳建宏' },
  { askerId: users[4].id, askerName: '陳玉婷', content: '建議社區可以增設寵物便袋箱，在中庭散步區和後門出口各放一個，方便毛小孩飼主使用。', category: 'suggestion' },
  { askerId: users[6].id, askerName: '黃雅茹', content: '社區圖書角的書好久沒更新了，可以募集新書或訂閱雜誌嗎？我願意捐幾本。', category: 'suggestion', replyContent: '非常感謝！我們下月起會設置「好書交換角」，歡迎住戶捐書。詳情將於公告欄公布。', repliedBy: '里長 陳建宏' },
  { askerId: users[8].id, askerName: '許佩玲', content: '請問中秋晚會可以攜帶外食嗎？家裡有小孩對某些食物過敏，想自己帶餐。', category: 'general' },
  { askerId: users[5].id, askerName: '林志偉', content: '早上在里民公園慢跑時，發現步道有幾處地磚翹起，容易絆倒，特別是靠近涼亭那段。', category: 'safety', replyContent: '已回報市府養工處，預計下週排修。這段時間請小心通行，我們會先放置警示錐。', repliedBy: '里長 陳建宏' },
  { askerId: users[9].id, askerName: '劉明華', content: '社區花圃的自動灑水系統似乎故障了，靠近大門那排花都快枯萎了。', category: 'facility' },
];

async function main() {
  console.log('🔄 開始建立社區活動假資料...\n');

  // 建立活動
  for (const act of activities) {
    const existing = await prisma.communityActivity.findFirst({
      where: { title: act.title, isDeleted: false },
    });
    if (existing) { console.log(`  ⏭️ 已存在: ${act.title}`); continue; }

    const activity = await prisma.communityActivity.create({
      data: {
        title: act.title,
        description: act.description,
        category: act.category,
        location: act.location,
        activityDate: act.activityDate,
        activityEndDate: act.activityEndDate,
        maxParticipants: act.maxParticipants,
        status: act.status,
        organizerId: ORGANIZER_ID,
        organizerName: ORGANIZER_NAME,
      },
    });

    // 報名
    for (const idx of act.registrants) {
      const u = users[idx];
      await prisma.activityRegistration.create({
        data: {
          activityId: activity.id,
          userId: u.id,
          userName: u.name,
        },
      });
    }

    console.log(`  ✅ ${act.title} (${act.registrants.length} 人報名)`);
  }

  // 建立居民提問
  console.log('\n🔄 建立居民提問...\n');
  for (const q of questions) {
    const existing = await prisma.communityQuestion.findFirst({
      where: { askerId: q.askerId, content: q.content, isDeleted: false },
    });
    if (existing) { console.log(`  ⏭️ 已存在: ${q.content.slice(0, 20)}...`); continue; }

    await prisma.communityQuestion.create({
      data: {
        askerId: q.askerId,
        askerName: q.askerName,
        content: q.content,
        category: q.category,
        isAnonymous: false,
        replyContent: q.replyContent || null,
        repliedAt: q.replyContent ? new Date() : null,
        repliedBy: q.repliedBy || null,
        status: q.replyContent ? 'replied' : 'pending',
      },
    });
    console.log(`  ✅ ${q.askerName}: ${q.content.slice(0, 30)}...`);
  }

  console.log('\n🎉 完成！');
  console.log(`   - ${activities.length} 個社區活動`);
  console.log(`   - ${activities.reduce((s, a) => s + a.registrants.length, 0)} 筆報名`);
  console.log(`   - ${questions.length} 筆居民提問（${questions.filter(q => q.replyContent).length} 筆已回覆）`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
