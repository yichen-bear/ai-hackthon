'use strict';

const router = require('express').Router();
const {
  loginMember,
  loginVendor,
  registerMember,
  registerVendor,
} = require('../services/authService');
const verifyToken = require('../middleware/verifyToken');
const { decryptField } = require('../utils/crypto');
const { maskName } = require('../utils/maskName');
const prisma = require('../utils/prismaClient');

// Cookie maxAge constants (in milliseconds)
const MEMBER_MAX_AGE = 24 * 60 * 60 * 1000;  // 24h
const VENDOR_MAX_AGE = 8 * 60 * 60 * 1000;   // 8h

const VALID_ROLES = ['member', 'vendor'];

/**
 * 驗證 email 格式
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string' || email.length === 0 || email.length > 254) {
    return false;
  }
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return false;
  const domain = email.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  return true;
}

/**
 * 驗證密碼長度
 */
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72;
}

function cookieMaxAgeForRole(role) {
  if (role === 'vendor') return VENDOR_MAX_AGE;
  return MEMBER_MAX_AGE;
}

/**
 * POST /api/auth/login
 * 接收 { email, password, role } → 呼叫 authService → 設定 cookie → 回傳用戶資訊
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 驗證 role 必須是 'member' 或 'vendor'
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: '無效的角色類型' });
    }

    let result;
    if (role === 'member') {
      result = await loginMember(email, password);
    } else {
      result = await loginVendor(email, password);
    }

    // 設定 HttpOnly Secure SameSite=Strict cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: cookieMaxAgeForRole(role),
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
 * POST /api/auth/register
 * 接收 { role, email, password, ...其他角色專屬欄位 }
 * role === 'vendor' 需要 companyName（廠商名稱）
 * 註冊成功 → 設定 cookie（直接登入） → 回傳用戶資訊
 */
router.post('/register', async (req, res) => {
  try {
    const { role, email, password, name, phone, companyName } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: '無效的角色類型' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: '請輸入有效的 Email 格式' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: '密碼長度需介於 8 至 72 字元' });
    }

    let result;
    if (role === 'member') {
      result = await registerMember({ email, password, name, phone });
    } else {
      if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
        return res.status(400).json({ success: false, message: '請輸入廠商名稱' });
      }
      result = await registerVendor({ email, password, companyName: companyName.trim(), name });
    }

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: cookieMaxAgeForRole(role),
    });

    const user = {
      userId: result.userId,
      role,
    };
    if (result.vendorId !== undefined) {
      user.vendorId = result.vendorId;
    }

    return res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('[register] error:', err);
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

    // 查詢用戶資料（Bytes 欄位）並解密
    if (role === 'member') {
      const account = await prisma.memberAccount.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true, creTime: true, communityNickname: true },
      });
      if (account) {
        try { if (account.name) result.name = decryptField(account.name); } catch (e) { console.error('[/me] decrypt name failed:', e.message); }
        try { if (account.email) result.email = decryptField(account.email); } catch (e) { console.error('[/me] decrypt email failed:', e.message); }
        try { if (account.phone) result.phone = decryptField(account.phone); } catch (e) { console.error('[/me] decrypt phone failed:', e.message); }
        if (account.creTime) result.createdAt = account.creTime;
        if (account.communityNickname) result.communityNickname = account.communityNickname;
        if (result.name) result.maskedName = maskName(result.name);
      }
    } else if (role === 'vendor') {
      const vendor = await prisma.vendorUser.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (vendor) {
        try { if (vendor.name) result.name = decryptField(vendor.name); } catch (e) { console.error('[/me] decrypt name failed:', e.message); }
        try { if (vendor.email) result.email = decryptField(vendor.email); } catch (e) { console.error('[/me] decrypt email failed:', e.message); }
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
