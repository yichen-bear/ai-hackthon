const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

// GET /api/messages?userId=xxx - 取得某用戶的所有對話
router.get('/', async (req, res) => {
  try {
    const { userId, peerId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const where = peerId
      ? { OR: [{ senderId: userId, receiverId: peerId }, { senderId: peerId, receiverId: userId }], groupId: null }
      : { OR: [{ senderId: userId }, { receiverId: userId }], groupId: null }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { creTime: 'asc' },
      take: 100,
    })
    res.json(messages)
  } catch (err) {
    console.error('GET /api/messages error:', err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// GET /api/messages/unread?userId=xxx - 取得未讀數
router.get('/unread', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const count = await prisma.chatMessage.count({
      where: { receiverId: userId, isRead: false, groupId: null },
    })
    res.json({ unreadCount: count })
  } catch (err) {
    // 查詢失敗時回傳 0，避免前端噴紅字（表不存在或連線問題）
    return res.json({ unreadCount: 0 })
  }
})

// POST /api/messages - 發送私訊
router.post('/', async (req, res) => {
  try {
    const { senderId, senderName, receiverId, receiverName, listingId, content, messageType } = req.body
    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: 'senderId, receiverId, content are required' })
    }
    const message = await prisma.chatMessage.create({
      data: {
        senderId,
        senderName: senderName || '使用者',
        receiverId,
        receiverName: receiverName || '賣家',
        listingId: listingId || null,
        content,
        messageType: messageType || 'text',
      },
    })
    res.status(201).json(message)
  } catch (err) {
    console.error('POST /api/messages error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// PATCH /api/messages/read - 標記已讀
router.patch('/read', async (req, res) => {
  try {
    const { userId, peerId } = req.body
    if (!userId || !peerId) return res.status(400).json({ error: 'userId, peerId required' })
    await prisma.chatMessage.updateMany({
      where: { senderId: peerId, receiverId: userId, isRead: false },
      data: { isRead: true },
    })
    res.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/messages/read error:', err)
    res.status(500).json({ error: 'Failed to mark as read' })
  }
})

module.exports = router
