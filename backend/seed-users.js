/**
 * 多角色模擬帳號 Seed
 * 建立 8+ 住戶帳號，包含加密欄位 + bcrypt 密碼 + 社群暱稱
 * 
 * 明碼密碼列表（bcrypt hash 存入 DB）：
 * ┌──────────────────────────────────┬──────────────┐
 * │ Email                            │ Password     │
 * ├──────────────────────────────────┼──────────────┤
 * │ shen.xiangqi@gmail.com           │ Shen@2026    │
 * │ wang.daming@gmail.com            │ Wang@2026    │
 * │ li.meiling@gmail.com             │ Li@2026      │
 * │ zhang.jiahao@gmail.com           │ Zhang@2026   │
 * │ chen.yuting@gmail.com            │ Chen@2026    │
 * │ lin.zhiwei@gmail.com             │ Lin@2026     │
 * │ huang.yaru@gmail.com             │ Huang@2026   │
 * │ wu.jianjun@gmail.com             │ Wu@2026      │
 * │ xu.peiling@gmail.com             │ Xu@2026      │
 * │ liu.minghua@gmail.com            │ Liu@2026     │
 * └──────────────────────────────────┴──────────────┘
 */

'use strict';

const bcrypt = require('bcrypt');
const prisma = require('./utils/prismaClient');
const { hashEmail, hashContactField, encryptField } = require('./utils/crypto');

const SYSTEM_UUID = '00000000-0000-0000-0000-ffffffffffff';

const users = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'shen.xiangqi@gmail.com',
    phone: '0912-345-678',
    name: '沈湘淇',
    password: 'Shen@2026',
    nickname: '淇淇愛登山',
    address: { county: '01', district: '011', detail: '台北市信義區松仁路100號12樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'wang.daming@gmail.com',
    phone: '0922-456-789',
    name: '王大明',
    password: 'Wang@2026',
    nickname: '攝影王',
    address: { county: '01', district: '011', detail: '台北市信義區忠孝東路五段68號5樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'li.meiling@gmail.com',
    phone: '0933-567-890',
    name: '李美玲',
    password: 'Li@2026',
    nickname: '烘焙小天使',
    address: { county: '01', district: '012', detail: '台北市大安區復興南路二段151號3樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'zhang.jiahao@gmail.com',
    phone: '0944-678-901',
    name: '張家豪',
    password: 'Zhang@2026',
    nickname: '桌遊大師',
    address: { county: '01', district: '011', detail: '台北市信義區基隆路一段333號8樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'chen.yuting@gmail.com',
    phone: '0955-789-012',
    name: '陳玉婷',
    password: 'Chen@2026',
    nickname: '瑜珈達人',
    address: { county: '01', district: '013', detail: '台北市中山區南京東路三段219號6樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'lin.zhiwei@gmail.com',
    phone: '0966-890-123',
    name: '林志偉',
    password: 'Lin@2026',
    nickname: '晨跑林',
    address: { county: '01', district: '014', detail: '台北市松山區民生東路四段97號10樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    email: 'huang.yaru@gmail.com',
    phone: '0977-901-234',
    name: '黃雅茹',
    password: 'Huang@2026',
    nickname: '書蟲小茹',
    address: { county: '01', district: '012', detail: '台北市大安區和平東路二段76號4樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    email: 'wu.jianjun@gmail.com',
    phone: '0988-012-345',
    name: '吳建軍',
    password: 'Wu@2026',
    nickname: '毛孩爸爸',
    address: { county: '01', district: '011', detail: '台北市信義區永吉路30巷12號2樓' },
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    email: 'xu.peiling@gmail.com',
    phone: '0911-123-456',
    name: '許佩玲',
    password: 'Xu@2026',
    nickname: '電影迷佩佩',
    address: { county: '01', district: '013', detail: '台北市中山區長安東路二段48號7樓' },
  },
  {
    id: '00000000-0000-0000-0000-00000000000a',
    email: 'liu.minghua@gmail.com',
    phone: '0922-234-567',
    name: '劉明華',
    password: 'Liu@2026',
    nickname: '園藝劉叔',
    address: { county: '01', district: '014', detail: '台北市松山區南京東路五段250號9樓' },
  },
];

async function main() {
  console.log('🔄 開始建立模擬住戶帳號...\n');

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const emailHash = hashEmail(u.email);
    const phoneHash = hashContactField(u.phone);
    const nameHash = hashContactField(u.name);

    const emailEnc = encryptField(u.email);
    const phoneEnc = encryptField(u.phone);
    const nameEnc = encryptField(u.name);

    await prisma.memberAccount.upsert({
      where: { id: u.id },
      update: {
        email: emailEnc,
        emailHash,
        phone: phoneEnc,
        phoneHash,
        name: nameEnc,
        nameHash,
        passwordHash,
        communityNickname: u.nickname,
        updId: SYSTEM_UUID,
      },
      create: {
        id: u.id,
        email: emailEnc,
        emailHash,
        phone: phoneEnc,
        phoneHash,
        name: nameEnc,
        nameHash,
        passwordHash,
        communityNickname: u.nickname,
        status: '01',
        isDeleted: false,
        creId: SYSTEM_UUID,
        updId: SYSTEM_UUID,
      },
    });

    // 建立地址（跳過如果 county/district 不存在）
    if (u.address) {
      try {
        const addrEnc = encryptField(u.address.detail);
        const addrHash = hashContactField(u.address.detail);

        const existing = await prisma.memberAddress.findFirst({
          where: { memberId: u.id, isDeleted: false },
        });

        if (!existing) {
          await prisma.memberAddress.create({
            data: {
              memberId: u.id,
              type: 'home',
              label: '住家',
              countyCode: u.address.county,
              districtCode: u.address.district,
              addressDetail: addrEnc,
              addressDetailHash: addrHash,
              isDefault: true,
            },
          });
        }
      } catch (addrErr) {
        // county/district FK 不存在時跳過
      }
    }

    console.log(`  ✅ ${u.name} (${u.email}) → nickname: ${u.nickname}`);
  }

  console.log('\n🎉 共建立 ' + users.length + ' 個模擬帳號！');
  console.log('\n📋 明碼密碼列表：');
  console.log('─'.repeat(50));
  for (const u of users) {
    console.log(`  ${u.email.padEnd(34)} → ${u.password}`);
  }
  console.log('─'.repeat(50));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
