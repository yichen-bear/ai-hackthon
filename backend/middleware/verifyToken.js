'use strict';

const { verifyToken } = require('../services/authService');

/**
 * JWT Token 驗證 middleware
 * 從 req.cookies.token 讀取 token，驗證後將 decoded payload 掛載至 req.user
 * 驗證失敗回傳 401 JSON（區分過期 vs 無效簽章）
 */
function verifyTokenMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: '認證無效' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '認證已過期' });
    }
    // JsonWebTokenError, NotBeforeError, or any other verification failure
    return res.status(401).json({ success: false, message: '認證無效' });
  }
}

module.exports = verifyTokenMiddleware;
