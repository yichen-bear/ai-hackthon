const express = require('express')
const router = express.Router()
const prisma = require('../utils/prismaClient')

// ═══ 叫車訂單 ═══

// POST /api/rides - 客戶端叫車（建立訂單）
router.post('/', async (req, res) => {
  try {
    const { passengerId, passengerName, passengerPhone, pickup, destination, carType, mode, scheduledAt } = req.body
    if (!passengerId || !pickup || !destination) {
      return res.status(400).json({ error: 'passengerId, pickup, destination required' })
    }

    const order = await prisma.ride_order.create({
      data: {
        passenger_id: passengerId,
        passenger_name: passengerName || '乘客',
        passenger_phone: passengerPhone || null,
        pickup,
        destination,
        car_type: carType || 'sedan',
        mode: mode || 'instant',
        scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
        status: 'pending',
      },
    })

    res.status(201).json(order)
  } catch (err) {
    console.error('POST /api/rides error:', err)
    res.status(500).json({ error: 'Failed to create ride order' })
  }
})

// GET /api/rides?userId=xxx - 取得乘客歷史行程
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query
    const where = {}
    if (userId) where.passenger_id = userId
    if (status && status !== 'all') where.status = status

    const orders = await prisma.ride_order.findMany({
      where,
      orderBy: { cre_time: 'desc' },
      include: { driver: { select: { name: true, plate_number: true, car_model: true, rating: true } } },
    })

    res.json(orders)
  } catch (err) {
    console.error('GET /api/rides error:', err)
    res.status(500).json({ error: 'Failed to fetch rides' })
  }
})

// GET /api/rides/pending - 廠商端：待派車訂單
router.get('/pending', async (req, res) => {
  try {
    const orders = await prisma.ride_order.findMany({
      where: { status: 'pending' },
      orderBy: { cre_time: 'asc' },
    })
    res.json(orders)
  } catch (err) {
    console.error('GET /api/rides/pending error:', err)
    res.status(500).json({ error: 'Failed to fetch pending rides' })
  }
})

// GET /api/rides/active - 廠商端：進行中訂單
router.get('/active', async (req, res) => {
  try {
    const orders = await prisma.ride_order.findMany({
      where: { status: { in: ['dispatched', 'in_progress'] } },
      orderBy: { cre_time: 'desc' },
      include: { driver: { select: { name: true, plate_number: true, car_model: true } } },
    })
    res.json(orders)
  } catch (err) {
    console.error('GET /api/rides/active error:', err)
    res.status(500).json({ error: 'Failed to fetch active rides' })
  }
})

// GET /api/rides/completed - 廠商端：已完成訂單
router.get('/completed', async (req, res) => {
  try {
    const orders = await prisma.ride_order.findMany({
      where: { status: 'completed' },
      orderBy: { completed_at: 'desc' },
      take: 50,
      include: { driver: { select: { name: true, plate_number: true } } },
    })
    res.json(orders)
  } catch (err) {
    console.error('GET /api/rides/completed error:', err)
    res.status(500).json({ error: 'Failed to fetch completed rides' })
  }
})

// PATCH /api/rides/:id/dispatch - 廠商端派車
router.patch('/:id/dispatch', async (req, res) => {
  try {
    const { id } = req.params
    const { driverId } = req.body
    if (!driverId) return res.status(400).json({ error: 'driverId required' })

    // 預估費用（根據車種）
    const order = await prisma.ride_order.findUnique({ where: { id } })
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const baseFare = { sedan: 250, van: 350, accessible: 280, 'pet-friendly': 300 }
    const fare = (baseFare[order.car_type] || 250) + Math.floor(Math.random() * 100)

    const updated = await prisma.ride_order.update({
      where: { id },
      data: { status: 'dispatched', driver_id: driverId, fare },
    })

    // 更新司機狀態為 busy
    await prisma.driver.update({ where: { id: driverId }, data: { status: 'busy' } })

    res.json(updated)
  } catch (err) {
    console.error('PATCH /api/rides/:id/dispatch error:', err)
    res.status(500).json({ error: 'Failed to dispatch' })
  }
})

// PATCH /api/rides/:id/start - 開始行程
router.patch('/:id/start', async (req, res) => {
  try {
    const { id } = req.params
    const updated = await prisma.ride_order.update({
      where: { id },
      data: { status: 'in_progress' },
    })
    res.json(updated)
  } catch (err) {
    console.error('PATCH /api/rides/:id/start error:', err)
    res.status(500).json({ error: 'Failed to start ride' })
  }
})

// PATCH /api/rides/:id/complete - 完成行程
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const { distance } = req.body

    const order = await prisma.ride_order.update({
      where: { id },
      data: {
        status: 'completed',
        completed_at: new Date(),
        distance: distance || (Math.random() * 10 + 2).toFixed(1),
      },
    })

    // 司機恢復可用 + 累計行程
    if (order.driver_id) {
      await prisma.driver.update({
        where: { id: order.driver_id },
        data: { status: 'available', total_trips: { increment: 1 } },
      })
    }

    res.json(order)
  } catch (err) {
    console.error('PATCH /api/rides/:id/complete error:', err)
    res.status(500).json({ error: 'Failed to complete ride' })
  }
})

// PATCH /api/rides/:id/cancel - 取消訂單
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const order = await prisma.ride_order.update({
      where: { id },
      data: { status: 'cancelled' },
    })
    // 如果已派車，釋放司機
    if (order.driver_id) {
      await prisma.driver.update({ where: { id: order.driver_id }, data: { status: 'available' } })
    }
    res.json(order)
  } catch (err) {
    console.error('PATCH /api/rides/:id/cancel error:', err)
    res.status(500).json({ error: 'Failed to cancel ride' })
  }
})

// POST /api/rides/:id/rate - 乘客評分
router.post('/:id/rate', async (req, res) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating 1-5 required' })

    const order = await prisma.ride_order.update({
      where: { id },
      data: { rating, rating_comment: comment || null },
    })

    // 更新司機平均評分
    if (order.driver_id) {
      const avg = await prisma.ride_order.aggregate({
        where: { driver_id: order.driver_id, rating: { not: null } },
        _avg: { rating: true },
      })
      if (avg._avg.rating) {
        await prisma.driver.update({
          where: { id: order.driver_id },
          data: { rating: Math.round(avg._avg.rating * 10) / 10 },
        })
      }
    }

    res.json(order)
  } catch (err) {
    console.error('POST /api/rides/:id/rate error:', err)
    res.status(500).json({ error: 'Failed to rate ride' })
  }
})

// ═══ 司機管理 ═══

// GET /api/rides/drivers - 取得所有司機（車隊狀態）
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { is_deleted: false },
      orderBy: { name: 'asc' },
    })
    res.json(drivers)
  } catch (err) {
    console.error('GET /api/rides/drivers error:', err)
    res.status(500).json({ error: 'Failed to fetch drivers' })
  }
})

// PATCH /api/rides/drivers/:id - 更新司機狀態
router.patch('/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const driver = await prisma.driver.update({
      where: { id },
      data: { status },
    })
    res.json(driver)
  } catch (err) {
    console.error('PATCH /api/rides/drivers/:id error:', err)
    res.status(500).json({ error: 'Failed to update driver' })
  }
})

module.exports = router
