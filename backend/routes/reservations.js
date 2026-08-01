const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

/**
 * 狀態流程：
 * PENDING_SELLER_APPROVAL → APPROVED_MEETUP (面交) 或 APPROVED_STORE_PICKUP (代收已同意)
 * APPROVED_STORE_PICKUP → ITEM_STORED_IN_711 (賣家已寄放門市，啟動7天倒數)
 * APPROVED_MEETUP → COMPLETED (買家確認已面交)
 * ITEM_STORED_IN_711 → COMPLETED 或 EXPIRED_RETURNED (7天過期)
 * PENDING_SELLER_APPROVAL → REJECTED
 */

// POST /api/reservations - 買家發起預約
router.post('/', async (req, res) => {
  try {
    const { listingId, buyerId, buyerName, buyerPhone, sellerId, sellerName, pickupStore, pickupMethod, scheduledAt } = req.body
    if (!listingId || !buyerName || !sellerName || !pickupStore) {
      return res.status(400).json({ error: 'listingId, buyerName, sellerName, pickupStore are required' })
    }

    const reservation = await prisma.pickupReservation.create({
      data: {
        listingId,
        buyerId: buyerId || '00000000-0000-0000-0000-000000000000',
        buyerName,
        buyerPhone: buyerPhone || null,
        sellerId: sellerId || '00000000-0000-0000-0000-000000000000',
        sellerName,
        pickupStore,
        pickupMethod: pickupMethod || '門市面交',
        status: 'PENDING_SELLER_APPROVAL',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    })

    // 更新商品狀態
    await prisma.secondhandListing.update({
      where: { id: listingId },
      data: { status: 'reserved' },
    })

    // 發送預約通知給賣家
    const timeStr = scheduledAt ? new Date(scheduledAt).toLocaleString('zh-TW') : '待確認'
    await prisma.chatMessage.create({
      data: {
        senderId: buyerId || '00000000-0000-0000-0000-000000000000',
        senderName: buyerName,
        receiverId: sellerId || '00000000-0000-0000-0000-000000000000',
        receiverName: sellerName,
        listingId,
        content: JSON.stringify({
          type: 'reservation_card',
          reservationId: reservation.id,
          pickupStore,
          pickupMethod,
          scheduledAt: scheduledAt || null,
          status: 'PENDING_SELLER_APPROVAL',
        }),
        messageType: 'reservation_notice',
      },
    })

    res.status(201).json(reservation)
  } catch (err) {
    console.error('POST /api/reservations error:', err)
    res.status(500).json({ error: 'Failed to create reservation' })
  }
})

// PATCH /api/reservations/:id - 賣家確認/拒絕/更新狀態
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const updateData = { status }

    // 門市代收同意 → 啟動 7 天倒數
    if (status === 'ITEM_STORED_IN_711') {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 7)
      updateData.pickupDeadline = deadline
      updateData.storedAt = new Date()
    }

    const reservation = await prisma.pickupReservation.update({
      where: { id },
      data: updateData,
    })

    // 更新聊天室中的預約卡片狀態
    const cardMessages = await prisma.chatMessage.findMany({
      where: { messageType: 'reservation_notice', listingId: reservation.listingId },
    })
    for (const msg of cardMessages) {
      try {
        const parsed = JSON.parse(msg.content)
        if (parsed.reservationId === id) {
          parsed.status = status
          await prisma.chatMessage.update({
            where: { id: msg.id },
            data: { content: JSON.stringify(parsed) },
          })
        }
      } catch { /* skip non-json */ }
    }

    // 如果拒絕，恢復商品狀態
    if (status === 'REJECTED') {
      await prisma.secondhandListing.update({
        where: { id: reservation.listingId },
        data: { status: 'active' },
      })
    }

    // 如果完成，更新商品為 sold
    if (status === 'COMPLETED') {
      await prisma.secondhandListing.update({
        where: { id: reservation.listingId },
        data: { status: 'sold' },
      })
    }

    // 在原對話中發送狀態通知（由賣家發給買家，在同一個聊天室）
    const statusMsgs = {
      APPROVED_MEETUP: '✅ 已同意面交！請依約定時間前往取貨。',
      APPROVED_STORE_PICKUP: '✅ 已同意代收！我會盡快將商品寄放至門市。',
      ITEM_STORED_IN_711: '📦 商品已寄放門市，請於 7 天內前往取貨。',
      COMPLETED: '🎉 交易完成！感謝使用 i二手。',
      EXPIRED_RETURNED: '⚠️ 逾期未取貨，商品將退回。',
      REJECTED: '❌ 已拒絕此交易。',
    }

    if (statusMsgs[status]) {
      await prisma.chatMessage.create({
        data: {
          senderId: reservation.sellerId,
          senderName: reservation.sellerName,
          receiverId: reservation.buyerId,
          receiverName: reservation.buyerName,
          listingId: reservation.listingId,
          content: statusMsgs[status],
          messageType: 'text',
        },
      })
    }

    res.json(reservation)
  } catch (err) {
    console.error('PATCH /api/reservations error:', err)
    res.status(500).json({ error: 'Failed to update reservation' })
  }
})

// GET /api/reservations?userId=xxx - 取得某用戶的預約
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })
    const reservations = await prisma.pickupReservation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { creTime: 'desc' },
      include: { listing: true },
    })
    res.json(reservations)
  } catch (err) {
    console.error('GET /api/reservations error:', err)
    res.status(500).json({ error: 'Failed to fetch reservations' })
  }
})

/**
 * GET /api/reservations/my-orders?userId=xxx
 * 回傳買家的 i二手訂單（用於訂單 Tab）
 * 包含所有非 REJECTED 的預約，按狀態分類
 */
router.get('/my-orders', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const reservations = await prisma.pickupReservation.findMany({
      where: {
        buyerId: userId,
        status: { notIn: ['REJECTED'] },
      },
      orderBy: { creTime: 'desc' },
      include: {
        listing: {
          select: { productName: true, imageUrl: true, price: true, carbonSaved: true, category: true },
        },
      },
    })

    const result = reservations.map(r => ({
      id: r.id,
      listingId: r.listingId,
      productName: r.listing?.productName || '未知商品',
      imageUrl: r.listing?.imageUrl || null,
      price: r.listing?.price || 0,
      carbonSaved: r.listing?.carbonSaved || 0,
      sellerName: r.sellerName,
      pickupStore: r.pickupStore,
      pickupMethod: r.pickupMethod,
      status: r.status,
      scheduledAt: r.scheduledAt,
      storedAt: r.storedAt,
      pickupDeadline: r.pickupDeadline,
      creTime: r.creTime,
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/reservations/my-orders error:', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

/**
 * GET /api/reservations/my-pickups?userId=xxx
 * 回傳買家「待取貨/待面交」的項目（用於取貨提醒 Tab）
 * 只回傳 APPROVED_MEETUP 和 ITEM_STORED_IN_711 狀態
 */
router.get('/my-pickups', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const reservations = await prisma.pickupReservation.findMany({
      where: {
        buyerId: userId,
        status: { in: ['APPROVED_MEETUP', 'APPROVED_STORE_PICKUP', 'ITEM_STORED_IN_711'] },
      },
      orderBy: { creTime: 'desc' },
      include: {
        listing: {
          select: { productName: true, imageUrl: true, carbonSaved: true },
        },
      },
    })

    const result = reservations.map(r => ({
      id: r.id,
      listingId: r.listingId,
      productName: r.listing?.productName || '未知商品',
      imageUrl: r.listing?.imageUrl || null,
      sellerName: r.sellerName,
      pickupStore: r.pickupStore,
      pickupMethod: r.pickupMethod,
      status: r.status,
      scheduledAt: r.scheduledAt,
      storedAt: r.storedAt,
      pickupDeadline: r.pickupDeadline,
      carbonSaved: r.listing?.carbonSaved || 0,
      creTime: r.creTime,
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/reservations/my-pickups error:', err)
    res.status(500).json({ error: 'Failed to fetch pickups' })
  }
})

/**
 * GET /api/reservations/my-sales?userId=xxx
 * 回傳賣家的訂單（用於賣家管理：查看需要寄放的代收件等）
 */
router.get('/my-sales', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const reservations = await prisma.pickupReservation.findMany({
      where: {
        sellerId: userId,
        status: { notIn: ['REJECTED'] },
      },
      orderBy: { creTime: 'desc' },
      include: {
        listing: {
          select: { productName: true, imageUrl: true, price: true },
        },
      },
    })

    const result = reservations.map(r => ({
      id: r.id,
      listingId: r.listingId,
      productName: r.listing?.productName || '未知商品',
      imageUrl: r.listing?.imageUrl || null,
      buyerName: r.buyerName,
      pickupStore: r.pickupStore,
      pickupMethod: r.pickupMethod,
      status: r.status,
      scheduledAt: r.scheduledAt,
      storedAt: r.storedAt,
      pickupDeadline: r.pickupDeadline,
      creTime: r.creTime,
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/reservations/my-sales error:', err)
    res.status(500).json({ error: 'Failed to fetch sales' })
  }
})

module.exports = router
