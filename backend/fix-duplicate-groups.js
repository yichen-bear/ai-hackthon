require('dotenv').config()
const prisma = require('./utils/prismaClient')

async function fix() {
  // 找出重複名稱的社群
  const groups = await prisma.communityGroup.findMany({ where: { isDeleted: false }, orderBy: { creTime: 'asc' } })
  const seen = new Map()
  const toDelete = []

  for (const g of groups) {
    if (seen.has(g.name)) {
      toDelete.push(g.id)
    } else {
      seen.set(g.name, g.id)
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ 無重複社群')
  } else {
    console.log(`🗑️ 找到 ${toDelete.length} 筆重複，刪除中...`)
    // 刪除重複的 members 和 messages
    for (const id of toDelete) {
      await prisma.chatMessage.deleteMany({ where: { groupId: id } })
      await prisma.groupMember.deleteMany({ where: { groupId: id } })
      await prisma.communityGroup.delete({ where: { id } })
      console.log(`  刪除: ${id}`)
    }
  }

  const remaining = await prisma.communityGroup.findMany({ where: { isDeleted: false }, orderBy: { creTime: 'asc' } })
  console.log(`\n目前剩 ${remaining.length} 個社群：`)
  remaining.forEach(g => console.log(`  ${g.icon} ${g.name} (${g.tags.join(', ')})`))
  process.exit(0)
}

fix().catch(e => { console.error(e); process.exit(1) })
