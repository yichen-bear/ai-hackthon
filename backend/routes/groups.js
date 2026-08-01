const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

// GET /api/groups/my?userId=xxx - 取得使用者已加入的社群
router.get('/my', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: true },
      distinct: ['groupId'],
    })

    const groups = await Promise.all(memberships.map(async (m) => {
      const memberCount = await prisma.groupMember.count({ where: { groupId: m.groupId } })
      const lastMsg = await prisma.chatMessage.findFirst({
        where: { groupId: m.groupId },
        orderBy: { creTime: 'desc' },
      })
      const unreadCount = await prisma.chatMessage.count({
        where: { groupId: m.groupId, creTime: { gt: m.joinedAt }, senderId: { not: userId } },
      })
      return {
        ...m.group,
        memberCount,
        lastMessage: lastMsg?.content || '',
        lastMessageTime: lastMsg?.creTime || m.joinedAt,
        unreadCount,
      }
    }))

    res.json(groups)
  } catch (err) {
    console.error('GET /api/groups/my error:', err)
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// GET /api/groups/discover?tags=登山,攝影 - 探索可加入的社群（依興趣標籤）
router.get('/discover', async (req, res) => {
  try {
    const { tags, userId } = req.query
    const tagArr = tags ? tags.split(',') : []

    const groups = await prisma.communityGroup.findMany({
      where: { isDeleted: false },
      orderBy: { creTime: 'desc' },
    })

    // 加上成員數 + 是否已加入
    const result = await Promise.all(groups.map(async (g) => {
      const memberCount = await prisma.groupMember.count({ where: { groupId: g.id } })
      const joined = userId ? await prisma.groupMember.findFirst({ where: { groupId: g.id, userId } }) : null
      const matchScore = tagArr.length > 0 ? g.tags.filter(t => tagArr.includes(t)).length / tagArr.length * 100 : 50
      return { ...g, memberCount, isJoined: !!joined, matchScore: Math.round(matchScore) }
    }))

    res.json(result.sort((a, b) => b.matchScore - a.matchScore))
  } catch (err) {
    console.error('GET /api/groups/discover error:', err)
    res.status(500).json({ error: 'Failed to discover groups' })
  }
})

// POST /api/groups/join - 加入社群
router.post('/join', async (req, res) => {
  try {
    const { groupId, userId, userName } = req.body
    if (!groupId || !userId || !userName) return res.status(400).json({ error: 'groupId, userId, userName required' })

    const existing = await prisma.groupMember.findFirst({ where: { groupId, userId } })
    if (existing) return res.status(409).json({ error: 'Already joined' })

    const member = await prisma.groupMember.create({ data: { groupId, userId, userName } })

    // 發送系統訊息
    await prisma.chatMessage.create({
      data: { senderId: '00000000-0000-0000-0000-ffffffffffff', senderName: '系統', groupId, content: `${userName} 加入了社群 👋`, messageType: 'system' },
    })

    res.status(201).json(member)
  } catch (err) {
    console.error('POST /api/groups/join error:', err)
    res.status(500).json({ error: 'Failed to join group' })
  }
})

// POST /api/groups/leave - 退出社群
router.post('/leave', async (req, res) => {
  try {
    const { groupId, userId, userName } = req.body
    if (!groupId || !userId) return res.status(400).json({ error: 'groupId, userId required' })

    await prisma.groupMember.deleteMany({ where: { groupId, userId } })

    await prisma.chatMessage.create({
      data: { senderId: '00000000-0000-0000-0000-ffffffffffff', senderName: '系統', groupId, content: `${userName || '成員'} 離開了社群`, messageType: 'system' },
    })

    res.json({ success: true })
  } catch (err) {
    console.error('POST /api/groups/leave error:', err)
    res.status(500).json({ error: 'Failed to leave group' })
  }
})

// GET /api/groups/:id/messages - 取得群組聊天記錄
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const messages = await prisma.chatMessage.findMany({
      where: { groupId: id },
      orderBy: { creTime: 'asc' },
      take: 100,
    })
    res.json(messages)
  } catch (err) {
    console.error('GET /api/groups/:id/messages error:', err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// POST /api/groups/:id/messages - 發送群組訊息
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const { senderId, senderName, content } = req.body
    if (!senderId || !content) return res.status(400).json({ error: 'senderId, content required' })

    const message = await prisma.chatMessage.create({
      data: { senderId, senderName: senderName || '使用者', groupId: id, content, messageType: 'text' },
    })
    res.status(201).json(message)
  } catch (err) {
    console.error('POST /api/groups/:id/messages error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// POST /api/groups - 建立新社群
router.post('/', async (req, res) => {
  try {
    const { name, type, icon, tags, description, activityDate, activityTime, activityLocation, creatorId, creatorName, maxMembers } = req.body
    if (!name || !creatorId || !creatorName) return res.status(400).json({ error: 'name, creatorId, creatorName required' })

    const group = await prisma.communityGroup.create({
      data: { name, type: type || 'interest', icon: icon || '💡', tags: tags || [], description, activityDate, activityTime, activityLocation, creatorId, creatorName, maxMembers: maxMembers || 50 },
    })

    // 建立者自動加入
    await prisma.groupMember.create({ data: { groupId: group.id, userId: creatorId, userName: creatorName } })

    // 置頂公告
    await prisma.chatMessage.create({
      data: { senderId: '00000000-0000-0000-0000-ffffffffffff', senderName: '📌 公告', groupId: group.id, content: `【${name}】社群已建立！${activityDate ? `活動時間：${activityDate} ${activityTime || ''}\n地點：${activityLocation || '待定'}` : '歡迎大家加入！'}`, messageType: 'system' },
    })

    res.status(201).json(group)
  } catch (err) {
    console.error('POST /api/groups error:', err)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

module.exports = router
