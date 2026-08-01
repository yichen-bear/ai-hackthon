const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

// POST /api/reservations - 建立面交預約（同時發送通知給賣家）
router.post('/', async (req, res) => {
  try {
    const { listingId, buyerId, buyerName, buyerPhone, sellerId, sellerName, pickupStore, pickupMethod, scheduledAt } = req.body
    if (!listingId || !buyerName || !sellerName || !pickupStore) {
      return res.status(400).json({ error: 'listingId, buyerName, sellerName, pickupStore are required' })
    }

    // 建立預約
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
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    })

    // 更新商品狀態為 reserved
    await prisma.secondhandListing.update({
      where: { id: listingId },
      data: { status: 'reserved' },
    })

    // 自動發送通知給賣家（建立一筆系統訊息）
    await prisma.chatMessage.create({
      data: {
        senderId: buyerId || '00000000-0000-0000-0000-000000000000',
        senderName: buyerName,
        receiverId: sellerId || '00000000-0000-0000-0000-000000000000',
        receiverName: sellerName,
        listingId,
        content: `🤝 ${buyerName} 已預約面交！地點：${pickupStore}（${pickupMethod}）`,
        messageType: 'reservation_notice',
      },
    })

    res.status(201).json(reservation)
  } catch (err) {
    console.error('POST /api/reservations error:', err)
    res.status(500).json({ error: 'Failed to create reservation' })
  }
})

// PATCH /api/reservations/:id - 更新預約狀態
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const reservation = await prisma.pickupReservation.update({
      where: { id },
      data: { status },
    })
    res.json(reservation)
  } catch (err) {
    console.error('PATCH /api/reservations error:', err)
    res.status(500).json({ error: 'Failed to update reservation' })
  }
})

module.exports = router
