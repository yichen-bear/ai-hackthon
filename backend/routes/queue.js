/**
 * 餐廳候位系統 API
 *
 * GET  /api/queue/status/:placeId  - 客戶端：取得某餐廳即時候位狀態
 * POST /api/queue/take-number      - 客戶端：抽取候位號碼牌
 * PUT  /api/queue/admin/update     - 廠商端：更新餐廳座位/候位狀態
 * POST /api/queue/admin/call-next  - 廠商端：叫號（下一組入座）
 * POST /api/queue/admin/init       - 廠商端：初始化餐廳候位資料（首次建立）
 */

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prismaClient');

/**
 * GET /api/queue/status/:placeId
 * 客戶端取得餐廳即時候位資訊
 */
router.get('/status/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ success: false, error: '缺少 placeId' });
    }

    const queue = await prisma.restaurantQueue.findUnique({
      where: { placeId },
    });

    // 如果這間餐廳還沒有候位資料，回傳預設值
    if (!queue) {
      return res.json({
        success: true,
        data: {
          placeId,
          waitingGroups: 0,
          estimatedMinutes: 0,
          emptyTables: 0,
          totalTables: 0,
          isOpen: true,
          notRegistered: true,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        placeId: queue.placeId,
        name: queue.name,
        waitingGroups: queue.waitingGroups,
        estimatedMinutes: queue.estimatedMinutes,
        emptyTables: queue.emptyTables,
        totalTables: queue.totalTables,
        isOpen: queue.isOpen,
        updatedAt: queue.updTime,
      },
    });
  } catch (err) {
    console.error('[Queue Status Error]', err.message);
    return res.status(500).json({ success: false, error: '無法取得候位資訊' });
  }
});

/**
 * POST /api/queue/take-number
 * 客戶端抽取候位號碼牌
 *
 * Body: { placeId, partySize, customerName?, customerPhone?, note? }
 */
router.post('/take-number', async (req, res) => {
  try {
    const { placeId, partySize, customerName, customerPhone, note } = req.body;

    if (!placeId) {
      return res.status(400).json({ success: false, error: '缺少 placeId' });
    }
    if (!partySize || partySize < 1 || partySize > 20) {
      return res.status(400).json({ success: false, error: '人數需在 1~20 之間' });
    }

    // 找到或建立 queue
    let queue = await prisma.restaurantQueue.findUnique({
      where: { placeId },
    });

    if (!queue) {
      // 自動建立（用 placeId 當名稱 placeholder）
      queue = await prisma.restaurantQueue.create({
        data: {
          placeId,
          name: placeId,
          totalTables: 10,
          emptyTables: 3,
          waitingGroups: 0,
          estimatedMinutes: 0,
        },
      });
    }

    if (!queue.isOpen) {
      return res.status(400).json({ success: false, error: '此餐廳目前未開放候位' });
    }

    // 取得目前最大票號
    const lastEntry = await prisma.queueEntry.findFirst({
      where: { queueId: queue.id, status: { in: ['waiting', 'called'] } },
      orderBy: { ticketNumber: 'desc' },
    });

    const ticketNumber = lastEntry ? lastEntry.ticketNumber + 1 : 1;

    // 建立候位紀錄
    const entry = await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        ticketNumber,
        partySize,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        note: note || null,
        status: 'waiting',
      },
    });

    // 更新等候組數和預估時間
    const waitingCount = await prisma.queueEntry.count({
      where: { queueId: queue.id, status: 'waiting' },
    });

    const newEstimatedMinutes = waitingCount * Math.ceil(queue.avgServiceMinutes / Math.max(queue.totalTables, 1));

    await prisma.restaurantQueue.update({
      where: { id: queue.id },
      data: {
        waitingGroups: waitingCount,
        estimatedMinutes: newEstimatedMinutes,
      },
    });

    return res.json({
      success: true,
      data: {
        ticketNumber: entry.ticketNumber,
        partySize: entry.partySize,
        waitingAhead: waitingCount - 1,
        estimatedMinutes: newEstimatedMinutes,
        status: entry.status,
      },
    });
  } catch (err) {
    console.error('[Queue Take Number Error]', err.message);
    return res.status(500).json({ success: false, error: '抽號失敗，請稍後再試' });
  }
});

/**
 * PUT /api/queue/admin/update
 * 廠商端更新餐廳座位狀態
 *
 * Body: { placeId, emptyTables?, totalTables?, isOpen?, avgServiceMinutes? }
 */
router.put('/admin/update', async (req, res) => {
  try {
    const { placeId, emptyTables, totalTables, isOpen, avgServiceMinutes } = req.body;

    if (!placeId) {
      return res.status(400).json({ success: false, error: '缺少 placeId' });
    }

    const queue = await prisma.restaurantQueue.findUnique({
      where: { placeId },
    });

    if (!queue) {
      return res.status(404).json({ success: false, error: '餐廳候位資料不存在，請先初始化' });
    }

    // 組裝更新資料
    const updateData = {};
    if (typeof emptyTables === 'number') updateData.emptyTables = Math.max(0, emptyTables);
    if (typeof totalTables === 'number') updateData.totalTables = Math.max(1, totalTables);
    if (typeof isOpen === 'boolean') updateData.isOpen = isOpen;
    if (typeof avgServiceMinutes === 'number') updateData.avgServiceMinutes = Math.max(5, avgServiceMinutes);

    // 如果空桌數改變，重算預估等候時間
    if (typeof emptyTables === 'number') {
      const waitingCount = await prisma.queueEntry.count({
        where: { queueId: queue.id, status: 'waiting' },
      });
      const tables = updateData.totalTables || queue.totalTables;
      const serviceTime = updateData.avgServiceMinutes || queue.avgServiceMinutes;
      updateData.estimatedMinutes = waitingCount * Math.ceil(serviceTime / Math.max(tables, 1));
    }

    const updated = await prisma.restaurantQueue.update({
      where: { placeId },
      data: updateData,
    });

    return res.json({
      success: true,
      data: {
        placeId: updated.placeId,
        name: updated.name,
        emptyTables: updated.emptyTables,
        totalTables: updated.totalTables,
        waitingGroups: updated.waitingGroups,
        estimatedMinutes: updated.estimatedMinutes,
        isOpen: updated.isOpen,
        avgServiceMinutes: updated.avgServiceMinutes,
      },
    });
  } catch (err) {
    console.error('[Queue Admin Update Error]', err.message);
    return res.status(500).json({ success: false, error: '更新失敗' });
  }
});

/**
 * POST /api/queue/admin/call-next
 * 廠商端叫號：將下一組候位者改為 "called"，並更新統計
 *
 * Body: { placeId }
 */
router.post('/admin/call-next', async (req, res) => {
  try {
    const { placeId } = req.body;

    if (!placeId) {
      return res.status(400).json({ success: false, error: '缺少 placeId' });
    }

    const queue = await prisma.restaurantQueue.findUnique({
      where: { placeId },
    });

    if (!queue) {
      return res.status(404).json({ success: false, error: '餐廳候位資料不存在' });
    }

    // 找到最早的 waiting entry
    const nextEntry = await prisma.queueEntry.findFirst({
      where: { queueId: queue.id, status: 'waiting' },
      orderBy: { ticketNumber: 'asc' },
    });

    if (!nextEntry) {
      return res.json({ success: true, data: null, message: '目前沒有等候中的客人' });
    }

    // 更新為 called -> seated
    await prisma.queueEntry.update({
      where: { id: nextEntry.id },
      data: { status: 'seated' },
    });

    // 重算等候組數
    const waitingCount = await prisma.queueEntry.count({
      where: { queueId: queue.id, status: 'waiting' },
    });

    const newEstimatedMinutes = waitingCount * Math.ceil(queue.avgServiceMinutes / Math.max(queue.totalTables, 1));

    // 空桌 -1（有人入座了）
    const newEmptyTables = Math.max(0, queue.emptyTables - 1);

    await prisma.restaurantQueue.update({
      where: { id: queue.id },
      data: {
        waitingGroups: waitingCount,
        estimatedMinutes: newEstimatedMinutes,
        emptyTables: newEmptyTables,
      },
    });

    return res.json({
      success: true,
      data: {
        ticketNumber: nextEntry.ticketNumber,
        partySize: nextEntry.partySize,
        customerName: nextEntry.customerName,
        remainingWaiting: waitingCount,
      },
    });
  } catch (err) {
    console.error('[Queue Call Next Error]', err.message);
    return res.status(500).json({ success: false, error: '叫號失敗' });
  }
});

/**
 * POST /api/queue/admin/init
 * 廠商端初始化餐廳候位資料
 *
 * Body: { placeId, name, totalTables?, emptyTables?, avgServiceMinutes? }
 */
router.post('/admin/init', async (req, res) => {
  try {
    const { placeId, name, totalTables, emptyTables, avgServiceMinutes } = req.body;

    if (!placeId || !name) {
      return res.status(400).json({ success: false, error: '缺少 placeId 或 name' });
    }

    const existing = await prisma.restaurantQueue.findUnique({
      where: { placeId },
    });

    if (existing) {
      return res.status(409).json({ success: false, error: '此餐廳已有候位資料', data: existing });
    }

    const queue = await prisma.restaurantQueue.create({
      data: {
        placeId,
        name,
        totalTables: totalTables || 10,
        emptyTables: emptyTables !== undefined ? emptyTables : 5,
        avgServiceMinutes: avgServiceMinutes || 30,
        waitingGroups: 0,
        estimatedMinutes: 0,
        isOpen: true,
      },
    });

    return res.json({ success: true, data: queue });
  } catch (err) {
    console.error('[Queue Admin Init Error]', err.message);
    return res.status(500).json({ success: false, error: '初始化失敗' });
  }
});

/**
 * GET /api/queue/detail/:placeId
 * 廠商端：取得餐廳桌位分配詳情（在座顧客 + 候位顧客）
 */
router.get('/detail/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ success: false, error: '缺少 placeId' });
    }

    const queue = await prisma.restaurantQueue.findUnique({
      where: { placeId },
      include: {
        entries: {
          where: { status: { in: ['seated', 'waiting'] } },
          orderBy: [{ status: 'asc' }, { ticketNumber: 'asc' }],
        },
      },
    });

    if (!queue) {
      return res.status(404).json({ success: false, error: '餐廳候位資料不存在' });
    }

    const seated = queue.entries
      .filter((e) => e.status === 'seated')
      .map((e) => ({
        id: e.id,
        ticketNumber: e.ticketNumber,
        partySize: e.partySize,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        note: e.note,
        seatedAt: e.updTime,
      }));

    const waiting = queue.entries
      .filter((e) => e.status === 'waiting')
      .map((e) => ({
        id: e.id,
        ticketNumber: e.ticketNumber,
        partySize: e.partySize,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        note: e.note,
        waitingSince: e.creTime,
      }));

    return res.json({
      success: true,
      data: {
        placeId: queue.placeId,
        name: queue.name,
        totalTables: queue.totalTables,
        emptyTables: queue.emptyTables,
        waitingGroups: queue.waitingGroups,
        estimatedMinutes: queue.estimatedMinutes,
        isOpen: queue.isOpen,
        seated,
        waiting,
      },
    });
  } catch (err) {
    console.error('[Queue Detail Error]', err.message);
    return res.status(500).json({ success: false, error: '無法取得桌位詳情' });
  }
});

module.exports = router;
