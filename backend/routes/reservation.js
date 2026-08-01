const express = require('express');
const router = express.Router();
const prisma = require('../utils/prismaClient');

/**
 * GET /api/food-reservations/slots/:placeId?date=2026-08-01
 * Get time slot summary (remaining tables) for a specific date
 */
router.get('/slots/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { date } = req.query;

    if (!placeId || !date) {
      return res.status(400).json({ success: false, error: '缺少 placeId 或 date' });
    }

    // Get reservations for the date
    const reservations = await prisma.reservation.findMany({
      where: { placeId, date, status: { not: 'cancelled' } },
      select: { time: true },
    });

    // Get custom capacities from DB
    const capacities = await prisma.slotCapacity.findMany({
      where: { placeId },
    });
    const capacityMap = {};
    for (const c of capacities) {
      capacityMap[c.time] = c.totalTables;
    }

    const DEFAULT_TABLES = 4;
    const slotTimes = ['18:00', '18:30', '19:00', '19:30', '20:00'];

    const slots = slotTimes.map(time => {
      const totalTables = capacityMap[time] !== undefined ? capacityMap[time] : DEFAULT_TABLES;
      const bookedTables = reservations.filter(r => r.time === time).length;
      const remaining = Math.max(0, totalTables - bookedTables);
      const capacity = remaining * 4;
      let status = 'open';
      if (remaining === 0) status = 'full';
      else if (remaining <= 1) status = 'low';

      return { time, remainingTables: remaining, totalTables, capacity, status, bookedCount: bookedTables };
    });

    return res.json({ success: true, data: { placeId, date, slots } });
  } catch (err) {
    console.error('[Reservation Slots Error]', err.message);
    return res.status(500).json({ success: false, error: '無法取得時段資訊' });
  }
});

/**
 * PUT /api/food-reservations/slots/:placeId
 * Admin: update total tables for a specific time slot
 * Body: { time, totalTables }
 */
router.put('/slots/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { time, totalTables } = req.body;

    if (!placeId || !time || typeof totalTables !== 'number') {
      return res.status(400).json({ success: false, error: '缺少必要欄位' });
    }

    const capacity = await prisma.slotCapacity.upsert({
      where: { placeId_time: { placeId, time } },
      update: { totalTables: Math.max(0, totalTables) },
      create: { placeId, time, totalTables: Math.max(0, totalTables) },
    });

    return res.json({ success: true, data: capacity });
  } catch (err) {
    console.error('[Slot Capacity Update Error]', err.message);
    return res.status(500).json({ success: false, error: '更新失敗' });
  }
});

/**
 * GET /api/food-reservations/:placeId?date=2026-08-01
 * Get all reservations for a restaurant on a specific date
 */
router.get('/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { date } = req.query;

    if (!placeId) return res.status(400).json({ success: false, error: '缺少 placeId' });

    const where = { placeId, status: { not: 'cancelled' } };
    if (date) where.date = date;

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { creTime: 'asc' }],
    });

    // Group by time slot
    const bySlot = {};
    for (const r of reservations) {
      if (!bySlot[r.time]) bySlot[r.time] = [];
      bySlot[r.time].push({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        partySize: r.partySize,
        date: r.date,
        time: r.time,
        note: r.note,
        status: r.status,
      });
    }

    return res.json({ success: true, data: { placeId, date, reservations, bySlot } });
  } catch (err) {
    console.error('[Reservation GET Error]', err.message);
    return res.status(500).json({ success: false, error: '無法取得訂位資訊' });
  }
});

/**
 * POST /api/food-reservations
 * Create a new reservation (client-side)
 */
router.post('/', async (req, res) => {
  try {
    const { placeId, customerName, customerPhone, partySize, date, time, note } = req.body;

    if (!placeId || !customerName || !customerPhone || !date || !time) {
      return res.status(400).json({ success: false, error: '缺少必要欄位' });
    }

    const reservation = await prisma.reservation.create({
      data: {
        placeId,
        customerName,
        customerPhone,
        partySize: partySize || 2,
        date,
        time,
        note: note || null,
        status: 'confirmed',
      },
    });

    return res.json({ success: true, data: reservation });
  } catch (err) {
    console.error('[Reservation POST Error]', err.message);
    return res.status(500).json({ success: false, error: '訂位失敗' });
  }
});

/**
 * PUT /api/food-reservations/:id/cancel
 * Cancel a reservation
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: '無效的訂位 ID' });

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[Reservation Cancel Error]', err.message);
    return res.status(500).json({ success: false, error: '取消失敗' });
  }
});

module.exports = router;
