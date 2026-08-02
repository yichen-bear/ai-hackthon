const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

// ═══ 活動 CRUD ═══

// GET /api/activities - 取得活動列表（客戶端）
router.get('/', async (req, res) => {
  try {
    const { category, status, userId } = req.query
    const where = { is_deleted: false }
    if (status && status !== 'all') where.status = status
    if (category && category !== 'all') where.category = category

    const activities = await prisma.community_activity.findMany({
      where,
      orderBy: { activity_date: 'asc' },
      include: { activity_registration: true },
    })

    const result = activities.map(a => {
      const registered = a.activity_registration.filter(r => r.status === 'registered')
      const waitlisted = a.activity_registration.filter(r => r.status === 'waitlisted')
      const totalParticipants = registered.length + (a.extra_participants || 0)
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        category: a.category,
        location: a.location,
        activityDate: a.activity_date,
        activityEndDate: a.activity_end_date,
        maxParticipants: a.max_participants,
        currentParticipants: totalParticipants,
        waitlistCount: waitlisted.length,
        volunteersNeeded: a.volunteers_needed,
        volunteersAssigned: a.volunteers_assigned,
        status: a.status,
        imageUrl: a.image_url,
        organizerName: a.organizer_name,
        isRegistered: userId ? registered.some(r => r.user_id === userId) : false,
        isWaitlisted: userId ? waitlisted.some(r => r.user_id === userId) : false,
        isFull: totalParticipants >= a.max_participants,
        creTime: a.cre_time,
      }
    })

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

    const registrations = await prisma.activity_registration.findMany({
      where: { user_id: userId, status: 'registered' },
      include: { community_activity: true },
      orderBy: { community_activity: { activity_date: 'asc' } },
    })

    const result = registrations.map(r => ({
      registrationId: r.id,
      activityId: r.activity_id,
      title: r.community_activity.title,
      description: r.community_activity.description,
      category: r.community_activity.category,
      location: r.community_activity.location,
      activityDate: r.community_activity.activity_date,
      activityEndDate: r.community_activity.activity_end_date,
      status: r.community_activity.status,
      organizerName: r.community_activity.organizer_name,
      registeredAt: r.registered_at,
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
    const activity = await prisma.community_activity.findUnique({
      where: { id },
      include: { activity_registration: { orderBy: { registered_at: 'asc' } } },
    })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const registered = activity.activity_registration.filter(r => r.status === 'registered' || r.status === 'attended')
    const waitlisted = activity.activity_registration.filter(r => r.status === 'waitlisted')
    const totalParticipants = registered.length + (activity.extra_participants || 0)

    res.json({
      ...activity,
      currentParticipants: totalParticipants,
      waitlistCount: waitlisted.length,
      isFull: totalParticipants >= activity.max_participants,
      registrations: registered,
      waitlist: waitlisted,
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

    const activity = await prisma.community_activity.create({
      data: {
        title,
        description: description || null,
        category: category || 'general',
        location: location || null,
        activity_date: new Date(activityDate),
        activity_end_date: activityEndDate ? new Date(activityEndDate) : null,
        max_participants: maxParticipants || 50,
        status: status || 'open',
        organizer_id: organizerId || '00000000-0000-0000-0000-eeeeeeeeeeee',
        organizer_name: organizerName || '信義區里辦公處',
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
    if (activityDate) data.activity_date = new Date(activityDate)
    if (activityEndDate) data.activity_end_date = new Date(activityEndDate)
    if (maxParticipants) data.max_participants = maxParticipants
    if (status) data.status = status

    const activity = await prisma.community_activity.update({ where: { id }, data })
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
    await prisma.community_activity.update({ where: { id }, data: { is_deleted: true } })
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/activities/:id error:', err)
    res.status(500).json({ error: 'Failed to delete activity' })
  }
})

// ═══ 報名/取消 ═══

// POST /api/activities/:id/register - 報名活動（額滿自動進候補）
router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params
    const { userId, userName, userPhone, source } = req.body
    if (!userId || !userName) return res.status(400).json({ error: 'userId, userName required' })

    // 檢查是否已報名或候補
    const existing = await prisma.activity_registration.findFirst({
      where: { activity_id: id, user_id: userId, status: { in: ['registered', 'waitlisted'] } },
    })
    if (existing) return res.status(409).json({ error: existing.status === 'waitlisted' ? '您已在候補名單中' : '您已報名此活動' })

    // 檢查是否額滿
    const activity = await prisma.community_activity.findUnique({
      where: { id },
      include: { activity_registration: { where: { status: 'registered' } } },
    })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const totalParticipants = activity.activity_registration.length + (activity.extra_participants || 0)
    const isFull = totalParticipants >= activity.max_participants

    const registration = await prisma.activity_registration.create({
      data: {
        activity_id: id,
        user_id: userId,
        user_name: userName,
        user_phone: userPhone || null,
        status: isFull ? 'waitlisted' : 'registered',
        source: source || 'app',
      },
    })

    if (isFull) {
      res.status(201).json({ ...registration, message: '活動已額滿，已加入候補名單' })
    } else {
      res.status(201).json(registration)
    }
  } catch (err) {
    console.error('POST /api/activities/:id/register error:', err)
    res.status(500).json({ error: 'Failed to register' })
  }
})

// DELETE /api/activities/:id/register - 取消報名（自動遞補候補者）
router.delete('/:id/register', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const registration = await prisma.activity_registration.findFirst({
      where: { activity_id: id, user_id: userId, status: { in: ['registered', 'waitlisted'] } },
    })
    if (!registration) return res.status(404).json({ error: '未找到報名記錄' })

    await prisma.activity_registration.update({
      where: { id: registration.id },
      data: { status: 'cancelled' },
    })

    // 如果取消的是正式報名者，自動遞補最早的候補者
    if (registration.status === 'registered') {
      const nextWaitlisted = await prisma.activity_registration.findFirst({
        where: { activity_id: id, status: 'waitlisted' },
        orderBy: { registered_at: 'asc' },
      })
      if (nextWaitlisted) {
        await prisma.activity_registration.update({
          where: { id: nextWaitlisted.id },
          data: { status: 'registered' },
        })
        // 私訊通知候補遞補成功
        await prisma.chatMessage.create({
          data: {
            senderId: '00000000-0000-0000-0000-eeeeeeeeeeee',
            senderName: '信義區里辦公處',
            receiverId: nextWaitlisted.user_id,
            receiverName: nextWaitlisted.user_name,
            content: `🎉 恭喜！有名額釋出，您已從候補名單遞補成功！請準時參加活動。`,
            messageType: 'text',
          },
        })
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/activities/:id/register error:', err)
    res.status(500).json({ error: 'Failed to cancel registration' })
  }
})

// POST /api/activities/:id/complete - 結束活動（里長端）
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const activity = await prisma.community_activity.update({
      where: { id },
      data: { status: 'completed' },
    })
    // 將所有候補者標記為 cancelled
    await prisma.activity_registration.updateMany({
      where: { activity_id: id, status: 'waitlisted' },
      data: { status: 'cancelled' },
    })
    res.json({ success: true, activity })
  } catch (err) {
    console.error('POST /api/activities/:id/complete error:', err)
    res.status(500).json({ error: 'Failed to complete activity' })
  }
})

// ═══ 通知推播（發送到私訊聊天室） ═══

// POST /api/activities/:id/notify - 里長發通知給所有報名者
router.post('/:id/notify', async (req, res) => {
  try {
    const { id } = req.params
    const { content, organizerId, organizerName } = req.body
    if (!content) return res.status(400).json({ error: 'content required' })

    const activity = await prisma.community_activity.findUnique({
      where: { id },
      include: { activity_registration: { where: { status: 'registered' } } },
    })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const senderId = organizerId || '00000000-0000-0000-0000-eeeeeeeeeeee'
    const senderName = organizerName || '信義區里辦公處'

    // 對每位報名者發私訊
    const messages = []
    for (const reg of activity.activity_registration) {
      const msg = await prisma.chatMessage.create({
        data: {
          senderId,
          senderName,
          receiverId: reg.user_id,
          receiverName: reg.user_name,
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
    const where = { is_deleted: false }
    if (status && status !== 'all') where.status = status

    const questions = await prisma.community_question.findMany({
      where,
      orderBy: { cre_time: 'desc' },
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

    const question = await prisma.community_question.create({
      data: {
        asker_id: askerId,
        asker_name: askerName || '匿名居民',
        content,
        category: category || 'general',
        is_anonymous: isAnonymous || false,
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

    const question = await prisma.community_question.update({
      where: { id },
      data: {
        reply_content: replyContent,
        replied_by: repliedBy || '里長',
        replied_at: new Date(),
        status: 'replied',
      },
    })

    // 回覆後發私訊通知提問者
    await prisma.chatMessage.create({
      data: {
        senderId: '00000000-0000-0000-0000-eeeeeeeeeeee',
        senderName: '信義區里辦公處',
        receiverId: question.asker_id,
        receiverName: question.asker_name,
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
