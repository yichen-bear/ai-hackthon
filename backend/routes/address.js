'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');

/**
 * GET /api/address/counties
 * 取得所有啟用中的縣市清單（依 sort 排序）
 */
router.get('/counties', async (req, res) => {
  try {
    const counties = await prisma.sysCounty.findMany({
      where: { isDeleted: '0' },
      select: { code: true, name: true, sort: true },
      orderBy: { sort: 'asc' },
    });

    return res.status(200).json({ success: true, data: counties });
  } catch (err) {
    console.error('[GET /api/address/counties] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * GET /api/address/districts/:countyCode
 * 依縣市代碼取得該縣市下所有啟用中的鄉鎮市區（依 sort 排序）
 */
router.get('/districts/:countyCode', async (req, res) => {
  try {
    const { countyCode } = req.params;

    if (!countyCode || countyCode.length > 2) {
      return res.status(400).json({ success: false, message: '無效的縣市代碼' });
    }

    const districts = await prisma.sysDistrict.findMany({
      where: {
        countyCode,
        isDeleted: '0',
      },
      select: { code: true, name: true, zip: true, sort: true },
      orderBy: { sort: 'asc' },
    });

    return res.status(200).json({ success: true, data: districts });
  } catch (err) {
    console.error('[GET /api/address/districts] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
