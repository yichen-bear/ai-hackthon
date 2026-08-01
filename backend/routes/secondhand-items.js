const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

/**
 * 店長端 i二手門市代收 API
 * 
 * GET /api/secondhand-items?store=門市名稱
 *   - 回傳該門市所有 status 為 ITEM_STORED_IN_711 或 COMPLETED 的代收件
 * 
 * PATCH /api/secondhand-items/:id/pickup
 *   - 買家取貨核銷：將 reservation status 改為 COMPLETED
 * 
 * PATCH /api/secondhand-items/:id/return-to-seller
 *   - 逾期退回：將 reservation status 改為 EXPIRED_RETURNED
 */

// GET /api/secondhand-items?store=7-ELEVEN 信義門市
router.get('/', async (req, res) => {
  try {
    const { store } = req.query

    const where = {
      pickupMethod: '門市代收',
      status: { in: ['ITEM_STORED_IN_711', 'COMPLETED', 'EXPIRED_RETURNED'] },
    }
    if (store) {
      where.pickupStore = store
    }

    const items = await prisma.pickupReservation.findMany({
      where,
      orderBy: { creTime: 'desc' },
      include: {
        listing: {
          select: {
            productName: true,
            carbonSaved: true,
            imageUrl: true,
            category: true,
          },
        },
      },
    })

    // 轉換為前端需要的格式
    const result = items.map(item => ({
      id: item.id,
      listingId: item.listingId,
      title: item.listing?.productName || '未知商品',
      category: item.listing?.category || '',
      imageUrl: item.listing?.imageUrl || null,
      sellerName: item.sellerName,
      buyerName: item.buyerName,
      pickupStore: item.pickupStore,
      status: item.status,
      storedAt: item.storedAt || item.creTime,
      pickupDeadline: item.pickupDeadline,
      carbonReducedKg: item.listing?.carbonSaved || 0,
      creTime: item.creTime,
    }))

    res.json(result)
  } catch (err) {
    console.error('GET /api/secondhand-items error:', err)
    res.status(500).json({ error: 'Failed to fetch secondhand items' })
  }
})

// PATCH /api/secondhand-items/:id/pickup - 買家取貨核銷
router.patch('/:id/pickup', async (req, res) => {
  try {
    const { id } = req.params

    const reservation = await prisma.pickupReservation.update({
      where: { id },
      data: { status: 'COMPLETED' },
    })

    // 同步更新商品狀態為 sold
    await prisma.secondhandListing.update({
      where: { id: reservation.listingId },
      data: { status: 'sold' },
    })

    // 發送通知給買賣雙方
    await prisma.chatMessage.create({
      data: {
        senderId: '00000000-0000-0000-0000-ffffffffffff',
        senderName: '系統通知',
        receiverId: reservation.buyerId,
        receiverName: reservation.buyerName,
        listingId: reservation.listingId,
        content: '🎉 交易完成！感謝使用 i二手，您已成功取貨。',
        messageType: 'system',
      },
    })

    await prisma.chatMessage.create({
      data: {
        senderId: '00000000-0000-0000-0000-ffffffffffff',
        senderName: '系統通知',
        receiverId: reservation.sellerId,
        receiverName: reservation.sellerName,
        listingId: reservation.listingId,
        content: '🎉 買家已取貨，交易完成！減碳積分已入帳。',
        messageType: 'system',
      },
    })

    res.json({ success: true, reservation })
  } catch (err) {
    console.error('PATCH /api/secondhand-items/:id/pickup error:', err)
    res.status(500).json({ error: 'Failed to confirm pickup' })
  }
})

// PATCH /api/secondhand-items/:id/return-to-seller - 逾期通知賣家領回
router.patch('/:id/return-to-seller', async (req, res) => {
  try {
    const { id } = req.params

    const reservation = await prisma.pickupReservation.update({
      where: { id },
      data: { status: 'EXPIRED_RETURNED' },
    })

    // 恢復商品狀態
    await prisma.secondhandListing.update({
      where: { id: reservation.listingId },
      data: { status: 'active' },
    })

    // 通知賣家
    await prisma.chatMessage.create({
      data: {
        senderId: '00000000-0000-0000-0000-ffffffffffff',
        senderName: '系統通知',
        receiverId: reservation.sellerId,
        receiverName: reservation.sellerName,
        listingId: reservation.listingId,
        content: '⚠️ 買家逾期未取貨，商品已安排退回原門市，請前往取回。',
        messageType: 'system',
      },
    })

    // 通知買家
    await prisma.chatMessage.create({
      data: {
        senderId: '00000000-0000-0000-0000-ffffffffffff',
        senderName: '系統通知',
        receiverId: reservation.buyerId,
        receiverName: reservation.buyerName,
        listingId: reservation.listingId,
        content: '⚠️ 您的取貨期限已過，商品將退回賣家。如有需要請重新預約。',
        messageType: 'system',
      },
    })

    res.json({ success: true, reservation })
  } catch (err) {
    console.error('PATCH /api/secondhand-items/:id/return-to-seller error:', err)
    res.status(500).json({ error: 'Failed to return item to seller' })
  }
})

module.exports = router
