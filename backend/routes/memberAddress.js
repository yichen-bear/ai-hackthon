'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const verifyToken = require('../middleware/verifyToken');
const { encryptField, decryptField, hashContactField } = require('../utils/crypto');

// 所有路由都需要登入
router.use(verifyToken);

/**
 * GET /api/member/addresses
 * 取得目前登入會員的所有地址（未刪除）
 */
router.get('/', async (req, res) => {
  try {
    const memberId = req.user.sub;

    const addresses = await prisma.memberAddress.findMany({
      where: { memberId, isDeleted: false },
      include: {
        county: { select: { code: true, name: true } },
        district: { select: { code: true, name: true, zip: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { updTime: 'desc' }],
    });

    // 解密詳細地址
    const result = addresses.map((addr) => ({
      id: addr.id,
      type: addr.type,
      label: addr.label,
      countyCode: addr.countyCode,
      countyName: addr.county.name,
      districtCode: addr.districtCode,
      districtName: addr.district.name,
      zip: addr.district.zip,
      addressDetail: addr.addressDetail ? decryptField(addr.addressDetail) : '',
      isDefault: addr.isDefault,
      creTime: addr.creTime,
      updTime: addr.updTime,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[GET /api/member/addresses] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/member/addresses
 * 新增一筆地址
 * Body: { type, label?, countyCode, districtCode, addressDetail, isDefault? }
 */
router.post('/', async (req, res) => {
  try {
    const memberId = req.user.sub;
    const { type, label, countyCode, districtCode, addressDetail, isDefault } = req.body;

    // 驗證必填
    if (!type || !countyCode || !districtCode || !addressDetail) {
      return res.status(400).json({ success: false, message: '缺少必要欄位：type, countyCode, districtCode, addressDetail' });
    }

    if (!['mailing', 'recent'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type 必須為 mailing 或 recent' });
    }

    // 若設為預設，先把同類型的其他地址取消預設
    if (isDefault) {
      await prisma.memberAddress.updateMany({
        where: { memberId, type, isDefault: true, isDeleted: false },
        data: { isDefault: false, updTime: new Date() },
      });
    }

    const encrypted = encryptField(addressDetail.trim());
    const hashed = hashContactField(addressDetail.trim());

    const created = await prisma.memberAddress.create({
      data: {
        memberId,
        type,
        label: label || null,
        countyCode,
        districtCode,
        addressDetail: encrypted,
        addressDetailHash: hashed,
        isDefault: Boolean(isDefault),
      },
    });

    return res.status(201).json({ success: true, data: { id: created.id } });
  } catch (err) {
    console.error('[POST /api/member/addresses] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * PUT /api/member/addresses/:id
 * 更新一筆地址
 * Body: { type?, label?, countyCode?, districtCode?, addressDetail?, isDefault? }
 */
router.put('/:id', async (req, res) => {
  try {
    const memberId = req.user.sub;
    const addressId = Number(req.params.id);

    if (Number.isNaN(addressId)) {
      return res.status(400).json({ success: false, message: '無效的地址 ID' });
    }

    // 確認該地址屬於此會員
    const existing = await prisma.memberAddress.findFirst({
      where: { id: addressId, memberId, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '找不到該地址' });
    }

    const { type, label, countyCode, districtCode, addressDetail, isDefault } = req.body;
    const updateData = { updTime: new Date() };

    if (type && ['mailing', 'recent'].includes(type)) {
      updateData.type = type;
    }
    if (label !== undefined) {
      updateData.label = label || null;
    }
    if (countyCode) {
      updateData.countyCode = countyCode;
    }
    if (districtCode) {
      updateData.districtCode = districtCode;
    }
    if (addressDetail) {
      updateData.addressDetail = encryptField(addressDetail.trim());
      updateData.addressDetailHash = hashContactField(addressDetail.trim());
    }
    if (isDefault !== undefined) {
      updateData.isDefault = Boolean(isDefault);
      // 若設為預設，先把同類型的其他地址取消預設
      if (isDefault) {
        const effectiveType = type || existing.type;
        await prisma.memberAddress.updateMany({
          where: { memberId, type: effectiveType, isDefault: true, isDeleted: false, id: { not: addressId } },
          data: { isDefault: false, updTime: new Date() },
        });
      }
    }

    await prisma.memberAddress.update({
      where: { id: addressId },
      data: updateData,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[PUT /api/member/addresses/:id] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * DELETE /api/member/addresses/:id
 * 軟刪除一筆地址
 */
router.delete('/:id', async (req, res) => {
  try {
    const memberId = req.user.sub;
    const addressId = Number(req.params.id);

    if (Number.isNaN(addressId)) {
      return res.status(400).json({ success: false, message: '無效的地址 ID' });
    }

    const existing = await prisma.memberAddress.findFirst({
      where: { id: addressId, memberId, isDeleted: false },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '找不到該地址' });
    }

    await prisma.memberAddress.update({
      where: { id: addressId },
      data: { isDeleted: true, updTime: new Date() },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/member/addresses/:id] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
