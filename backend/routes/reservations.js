const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

/**
 * 狀態流程：
 * PENDING_SELLER_APPROVAL → APPROVED_MEETUP (面交) 或 ITEM_STORED_IN_711 (代收)
 * APPROVED_MEETUP → COMPLETED
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

module.exports = router
