'use strict';

const router = require('express').Router();
const { loginMember, loginVendor } = require('../services/authService');
const verifyToken = require('../middleware/verifyToken');
const { decryptField } = require('../utils/crypto');
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

// Cookie maxAge constants (in milliseconds)
const MEMBER_MAX_AGE = 24 * 60 * 60 * 1000; // 24h
const VENDOR_MAX_AGE = 8 * 60 * 60 * 1000;  // 8h

/**
 * POST /api/auth/login
 * 接收 { email, password, role } → 呼叫 authService → 設定 cookie → 回傳用戶資訊
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 驗證 role 必須是 'member' 或 'vendor'
    if (role !== 'member' && role !== 'vendor') {
      return res.status(400).json({ success: false, message: '無效的角色類型' });
    }

    let result;
    if (role === 'member') {
      result = await loginMember(email, password);
    } else {
      result = await loginVendor(email, password);
    }

    // 設定 HttpOnly Secure SameSite=Strict cookie
    const maxAge = role === 'member' ? MEMBER_MAX_AGE : VENDOR_MAX_AGE;
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge,
    });

    // 組裝回傳用戶資訊
    const user = {
      userId: result.userId,
      role,
    };

    if (result.vendorId !== undefined) {
      user.vendorId = result.vendorId;
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.statusCode ? err.message : '系統錯誤';
    return res.status(statusCode).json({ success: false, message });
  }
});

/**
 * POST /api/auth/logout
 * 清除 token cookie → 回傳 200
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });

  return res.status(200).json({ success: true });
});

/**
 * GET /api/auth/me
 * 使用 verifyToken middleware → 查詢用戶名稱 → 解密 → 回傳用戶資訊
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { sub: userId, role, vendorId } = req.user;

    const result = { userId, role };

    if (vendorId !== undefined) {
      result.vendorId = vendorId;
    }

    // 查詢用戶名稱（Bytes 欄位）並解密
    let name = null;
    if (role === 'member') {
      const account = await prisma.memberAccount.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (account && account.name) {
        name = decryptField(account.name);
      }
    } else if (role === 'vendor') {
      const vendor = await prisma.vendorUser.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (vendor && vendor.name) {
        name = decryptField(vendor.name);
      }
    }

    if (name) {
      result.name = name;
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
