const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

/**
 * GET /api/member/tickets?userId=xxx
 * 整合查詢使用者的所有票券/記錄：社區活動、叫車行程、i二手交易、興趣社群
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    // 1. 社區活動報名
    const activityRegs = await prisma.activity_registration.findMany({
      where: { userId, status: { in: ['registered', 'attended'] } },
      include: { activity: { select: { title: true, activityDate: true, activityEndDate: true, location: true, organizerName: true, status: true } } },
      orderBy: { registeredAt: 'desc' },
    })

    const activityTickets = activityRegs.map(r => ({
      id: `act-${r.id}`,
      type: 'activity',
      title: r.activity.title,
      date: r.activity.activityDate,
      endDate: r.activity.activityEndDate,
      location: r.activity.location,
      organizer: r.activity.organizerName,
      status: r.activity.status === 'completed' ? 'used' : 'active',
      code: `ACT-${r.id.slice(0, 8).toUpperCase()}`,
      registeredAt: r.registeredAt,
    }))

    // 2. 叫車行程（已完成）
    const rideOrders = await prisma.ride_order.findMany({
      where: { passengerId: userId, status: 'completed' },
      include: { driver: { select: { name: true, plateNumber: true, carModel: true } } },
      orderBy: { completedAt: 'desc' },
      take: 10,
    })

    const rideTickets = rideOrders.map(r => ({
      id: `ride-${r.id}`,
      type: 'ride',
      title: `${r.pickup.slice(0, 10)}... → ${r.destination.slice(0, 10)}...`,
      pickup: r.pickup,
      destination: r.destination,
      fare: r.fare,
      distance: r.distance,
      driver: r.driver?.name || '',
      plateNumber: r.driver?.plateNumber || '',
      rating: r.rating,
      status: 'used',
      date: r.completedAt || r.creTime,
      code: `RIDE-${r.id.slice(0, 8).toUpperCase()}`,
    }))

    // 3. i二手交易（買家已完成）
    const secondhandReservations = await prisma.pickupReservation.findMany({
      where: { buyerId: userId, status: 'COMPLETED' },
      include: { listing: { select: { productName: true, carbonSaved: true, pickupStore: true } } },
      orderBy: { updTime: 'desc' },
      take: 10,
    })

    const secondhandTickets = secondhandReservations.map(r => ({
      id: `sh-${r.id}`,
      type: 'secondhand',
      title: r.listing?.productName || '二手商品',
      store: r.listing?.pickupStore || r.pickupStore,
      carbonSaved: r.listing?.carbonSaved || 0,
      method: r.pickupMethod,
      status: 'used',
      date: r.updTime,
      code: `SH-${r.id.slice(0, 8).toUpperCase()}`,
    }))

    // 4. 興趣社群（已加入）
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: { include: { members: { select: { id: true } } } } },
      orderBy: { joinedAt: 'desc' },
    })

    const groupTickets = groupMemberships.map(m => ({
      id: `grp-${m.id}`,
      type: 'group',
      title: m.group.name,
      icon: m.group.icon,
      groupType: m.group.type,
      memberCount: m.group.members.length,
      status: 'active',
      date: m.joinedAt,
      code: `GRP-${m.groupId.slice(0, 8).toUpperCase()}`,
    }))

    res.json({
      activities: activityTickets,
      rides: rideTickets,
      secondhand: secondhandTickets,
      groups: groupTickets,
    })
  } catch (err) {
    console.error('GET /api/member/tickets error:', err)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

module.exports = router
