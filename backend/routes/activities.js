const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

// ═══ 活動 CRUD ═══

// GET /api/activities - 取得活動列表（客戶端）
router.get('/', async (req, res) => {
  try {
    const { category, status = 'open', userId } = req.query
    const where = { isDeleted: false }
    if (status) where.status = status
    if (category && category !== 'all') where.category = category

    const activities = await prisma.communityActivity.findMany({
      where,
      orderBy: { activityDate: 'asc' },
      include: { registrations: { where: { status: 'registered' } } },
    })

    const result = activities.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      location: a.location,
      activityDate: a.activityDate,
      activityEndDate: a.activityEndDate,
      maxParticipants: a.maxParticipants,
      currentParticipants: a.registrations.length,
      status: a.status,
      imageUrl: a.imageUrl,
      organizerName: a.organizerName,
      isRegistered: userId ? a.registrations.some(r => r.userId === userId) : false,
      isFull: a.registrations.length >= a.maxParticipants,
      creTime: a.creTime,
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/activities error:', err)
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

// GET /api/activities/my?userId=xxx - 我的已報名活動
router.get('/my', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const registrations = await prisma.activityRegistration.findMany({
      where: { userId, status: 'registered' },
      include: { activity: true },
      orderBy: { activity: { activityDate: 'asc' } },
    })

    const result = registrations.map(r => ({
      registrationId: r.id,
      activityId: r.activityId,
      title: r.activity.title,
      description: r.activity.description,
      category: r.activity.category,
      location: r.activity.location,
      activityDate: r.activity.activityDate,
      activityEndDate: r.activity.activityEndDate,
      status: r.activity.status,
      organizerName: r.activity.organizerName,
      registeredAt: r.registeredAt,
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/activities/my error:', err)
    res.status(500).json({ error: 'Failed to fetch my activities' })
  }
})

// GET /api/activities/:id - 活動詳情 + 報名名單
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const activity = await prisma.communityActivity.findUnique({
      where: { id },
      include: { registrations: { where: { status: 'registered' }, orderBy: { registeredAt: 'asc' } } },
    })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    res.json({
      ...activity,
      currentParticipants: activity.registrations.length,
      isFull: activity.registrations.length >= activity.maxParticipants,
    })
  } catch (err) {
    console.error('GET /api/activities/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// POST /api/activities - 建立活動（里長端）
router.post('/', async (req, res) => {
  try {
    const { title, description, category, location, activityDate, activityEndDate, maxParticipants, organizerId, organizerName, status } = req.body
    if (!title || !activityDate) return res.status(400).json({ error: 'title, activityDate required' })

    const activity = await prisma.communityActivity.create({
      data: {
        title,
        description: description || null,
        category: category || 'general',
        location: location || null,
        activityDate: new Date(activityDate),
        activityEndDate: activityEndDate ? new Date(activityEndDate) : null,
        maxParticipants: maxParticipants || 50,
        status: status || 'open',
        organizerId: organizerId || '00000000-0000-0000-0000-eeeeeeeeeeee',
        organizerName: organizerName || '信義區里辦公處',
      },
    })

    res.status(201).json(activity)
  } catch (err) {
    console.error('POST /api/activities error:', err)
    res.status(500).json({ error: 'Failed to create activity' })
  }
})

// PATCH /api/activities/:id - 更新活動狀態（里長端）
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, category, location, activityDate, activityEndDate, maxParticipants, status } = req.body

    const data = {}
    if (title) data.title = title
    if (description !== undefined) data.description = description
    if (category) data.category = category
    if (location !== undefined) data.location = location
    if (activityDate) data.activityDate = new Date(activityDate)
    if (activityEndDate) data.activityEndDate = new Date(activityEndDate)
    if (maxParticipants) data.maxParticipants = maxParticipants
    if (status) data.status = status

    const activity = await prisma.communityActivity.update({ where: { id }, data })
    res.json(activity)
  } catch (err) {
    console.error('PATCH /api/activities/:id error:', err)
    res.status(500).json({ error: 'Failed to update activity' })
  }
})

// DELETE /api/activities/:id - 軟刪除活動
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.communityActivity.update({ where: { id }, data: { isDeleted: true } })
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/activities/:id error:', err)
    res.status(500).json({ error: 'Failed to delete activity' })
  }
})

// ═══ 報名/取消 ═══

// POST /api/activities/:id/register - 報名活動
router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params
    const { userId, userName, userPhone } = req.body
    if (!userId || !userName) return res.status(400).json({ error: 'userId, userName required' })

    // 檢查是否已額滿
    const activity = await prisma.communityActivity.findUnique({
      where: { id },
      include: { registrations: { where: { status: 'registered' } } },
    })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })
    if (activity.registrations.length >= activity.maxParticipants) {
      return res.status(409).json({ error: '活動已額滿' })
    }

    // 檢查是否已報名
    const existing = await prisma.activityRegistration.findFirst({
      where: { activityId: id, userId, status: 'registered' },
    })
    if (existing) return res.status(409).json({ error: '您已報名此活動' })

    const registration = await prisma.activityRegistration.create({
      data: { activityId: id, userId, userName, userPhone: userPhone || null },
    })

    res.status(201).json(registration)
  } catch (err) {
    console.error('POST /api/activities/:id/register error:', err)
    res.status(500).json({ error: 'Failed to register' })
  }
})

// DELETE /api/activities/:id/register - 取消報名
router.delete('/:id/register', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const registration = await prisma.activityRegistration.findFirst({
      where: { activityId: id, userId, status: 'registered' },
    })
    if (!registration) return res.status(404).json({ error: '未找到報名記錄' })

    await prisma.activityRegistration.update({
      where: { id: registration.id },
      data: { status: 'cancelled' },
    })

    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/activities/:id/register error:', err)
    res.status(500).json({ error: 'Failed to cancel registration' })
  }
})

// ═══ 通知推播（發送到私訊聊天室） ═══

// POST /api/activities/:id/notify - 里長發通知給所有報名者
router.post('/:id/notify', async (req, res) => {
  try {
    const { id } = req.params
    const { content, organizerId, organizerName } = req.body
    if (!content) return res.status(400).json({ error: 'content required' })

    const activity = await prisma.communityActivity.findUnique({
      where: { id },
      include: { registrations: { where: { status: 'registered' } } },
    })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const senderId = organizerId || '00000000-0000-0000-0000-eeeeeeeeeeee'
    const senderName = organizerName || '信義區里辦公處'

    // 對每位報名者發私訊
    const messages = []
    for (const reg of activity.registrations) {
      const msg = await prisma.chatMessage.create({
        data: {
          senderId,
          senderName,
          receiverId: reg.userId,
          receiverName: reg.userName,
          content: `📢【${activity.title}】${content}`,
          messageType: 'text',
        },
      })
      messages.push(msg)
    }

    res.json({ success: true, notifiedCount: messages.length })
  } catch (err) {
    console.error('POST /api/activities/:id/notify error:', err)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

// ═══ 居民提問 ═══

// GET /api/questions - 取得提問列表
router.get('/questions/list', async (req, res) => {
  try {
    const { status } = req.query
    const where = { isDeleted: false }
    if (status && status !== 'all') where.status = status

    const questions = await prisma.communityQuestion.findMany({
      where,
      orderBy: { creTime: 'desc' },
    })
    res.json(questions)
  } catch (err) {
    console.error('GET /api/questions/list error:', err)
    res.status(500).json({ error: 'Failed to fetch questions' })
  }
})

// POST /api/questions - 居民提問
router.post('/questions', async (req, res) => {
  try {
    const { askerId, askerName, content, category, isAnonymous } = req.body
    if (!askerId || !content) return res.status(400).json({ error: 'askerId, content required' })

    const question = await prisma.communityQuestion.create({
      data: {
        askerId,
        askerName: askerName || '匿名居民',
        content,
        category: category || 'general',
        isAnonymous: isAnonymous || false,
      },
    })
    res.status(201).json(question)
  } catch (err) {
    console.error('POST /api/questions error:', err)
    res.status(500).json({ error: 'Failed to create question' })
  }
})

// PATCH /api/questions/:id/reply - 里長回覆提問
router.patch('/questions/:id/reply', async (req, res) => {
  try {
    const { id } = req.params
    const { replyContent, repliedBy } = req.body
    if (!replyContent) return res.status(400).json({ error: 'replyContent required' })

    const question = await prisma.communityQuestion.update({
      where: { id },
      data: {
        replyContent,
        repliedBy: repliedBy || '里長',
        repliedAt: new Date(),
        status: 'replied',
      },
    })

    // 回覆後發私訊通知提問者
    await prisma.chatMessage.create({
      data: {
        senderId: '00000000-0000-0000-0000-eeeeeeeeeeee',
        senderName: '信義區里辦公處',
        receiverId: question.askerId,
        receiverName: question.askerName,
        content: `📩 您的提問已收到回覆：\n\n「${question.content.slice(0, 30)}...」\n\n里長回覆：${replyContent}`,
        messageType: 'text',
      },
    })

    res.json(question)
  } catch (err) {
    console.error('PATCH /api/questions/:id/reply error:', err)
    res.status(500).json({ error: 'Failed to reply question' })
  }
})

module.exports = router
