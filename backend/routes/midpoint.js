/**
 * 多人中點餐廳推薦 API 路由
 * POST /api/midpoint/recommend
 */

const express = require('express');
const router = express.Router();
const { recommend, suggestCarpool } = require('../services/midpointService');

/**
 * POST /api/midpoint/recommend
 * 
 * Request body:
 * {
 *   "addresses": ["台北市信義區松仁路100號", "新北市板橋區文化路一段"],
 *   "cuisineType": "日式料理"  // 可選
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "centroid": { "lat": 25.03, "lng": 121.56 },
 *   "radius": 5000,
 *   "origins": [...],
 *   "recommendations": [...]
 * }
 */
router.post('/recommend', async (req, res) => {
  try {
    const { addresses, cuisineType } = req.body;

    // 驗證輸入
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        error: '請提供 addresses 陣列',
      });
    }

    if (addresses.length < 2) {
      return res.status(400).json({
        success: false,
        error: '至少需要 2 個出發地址',
      });
    }

    if (addresses.length > 10) {
      return res.status(400).json({
        success: false,
        error: '最多支援 10 人',
      });
    }

    // 檢查每個地址是否為有效字串
    const invalidAddresses = addresses.filter(
      (addr) => typeof addr !== 'string' || addr.trim().length === 0
    );
    if (invalidAddresses.length > 0) {
      return res.status(400).json({
        success: false,
        error: '所有地址必須為非空字串',
      });
    }

    // 清理地址
    const cleanedAddresses = addresses.map((addr) => addr.trim());

    // 執行推薦
    const result = await recommend({
      addresses: cleanedAddresses,
      cuisineType: cuisineType ? cuisineType.trim() : undefined,
    });

    return res.json(result);
  } catch (err) {
    console.error('[Midpoint API Error]', err.message);

    // 區分用戶錯誤和系統錯誤
    if (err.message.includes('無法解析地址')) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    if (err.message.includes('環境變數未設定')) {
      return res.status(500).json({
        success: false,
        error: '伺服器設定錯誤，請聯繫管理員',
      });
    }

    return res.status(500).json({
      success: false,
      error: '推薦服務暫時無法使用，請稍後再試',
    });
  }
});

/**
 * POST /api/midpoint/carpool
 * 
 * 共乘路線建議：判斷開車的人能否順路接其他人
 * 
 * Request body:
 * {
 *   "origins": [{ "lat": 25.03, "lng": 121.56 }, ...],
 *   "destination": { "lat": 25.04, "lng": 121.55 },
 *   "travelDetails": [{ "duration": 15, "mode": "driving" }, { "duration": 20, "mode": "transit" }]
 * }
 */
router.post('/carpool', async (req, res) => {
  try {
    const { origins, destination, travelDetails } = req.body;

    // 驗證輸入
    if (!origins || !Array.isArray(origins) || origins.length < 2) {
      return res.status(400).json({
        success: false,
        error: '請提供至少 2 個出發座標 (origins)',
      });
    }

    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: '請提供有效的目的地座標 (destination)',
      });
    }

    if (!travelDetails || !Array.isArray(travelDetails) || travelDetails.length !== origins.length) {
      return res.status(400).json({
        success: false,
        error: 'travelDetails 長度需與 origins 一致',
      });
    }

    const result = await suggestCarpool({ origins, destination, travelDetails });
    return res.json(result);
  } catch (err) {
    console.error('[Carpool API Error]', err.message);

    if (err.message.includes('環境變數未設定')) {
      return res.status(500).json({
        success: false,
        error: '伺服器設定錯誤，請聯繫管理員',
      });
    }

    return res.status(500).json({
      success: false,
      error: '共乘建議服務暫時無法使用，請稍後再試',
    });
  }
});

module.exports = router;
