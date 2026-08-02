/**
 * 食（想吃什麼）附近餐廳推薦 API 路由
 * GET /api/food/recommend
 */

const express = require('express');
const router = express.Router();
const { recommendNearby } = require('../services/foodRecommendService');
const { generateMenu } = require('../services/menuGeneratorService');

/**
 * GET /api/food/recommend
 *
 * Query parameters:
 *   lat (required) - 使用者緯度
 *   lng (required) - 使用者經度
 *   radius (optional) - 搜索半徑，單位公尺，預設 1500
 *   keyword (optional) - 料理類型關鍵字，如 "日式" "火鍋"
 *   mode (optional) - 用餐模式: dine_in / takeout / delivery
 *
 * Response:
 * {
 *   "success": true,
 *   "recommendations": [
 *     {
 *       "id": "place_id",
 *       "name": "餐廳名稱",
 *       "tag": "日式拉麵",
 *       "priceMin": 300,
 *       "priceMax": 600,
 *       "priceAvg": 450,
 *       "rating": 4.5,
 *       "distance": "0.3 km",
 *       "distanceMeters": 320,
 *       "image": "🍜",
 *       "badge": "popular",
 *       "badgeLabel": "🔥 熱門推薦",
 *       "timeSlots": [...],
 *       "score": 0.85
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/recommend', async (req, res) => {
  try {
    const { lat, lng, radius, keyword, mode } = req.query;

    // 驗證必要參數
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '請提供使用者位置（lat, lng）',
      });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({
        success: false,
        error: 'lat 和 lng 必須為有效數字',
      });
    }

    // 合理範圍檢查（台灣）
    if (parsedLat < 21 || parsedLat > 26 || parsedLng < 119 || parsedLng > 123) {
      return res.status(400).json({
        success: false,
        error: '座標超出服務範圍（限台灣地區）',
      });
    }

    const parsedRadius = radius ? parseInt(radius, 10) : 1500;
    if (parsedRadius < 100 || parsedRadius > 50000) {
      return res.status(400).json({
        success: false,
        error: '搜索半徑需在 100~50000 公尺之間',
      });
    }

    // 執行推薦
    const result = await recommendNearby({
      lat: parsedLat,
      lng: parsedLng,
      radius: parsedRadius,
      keyword: keyword || undefined,
      mode: mode || 'dine_in',
    });

    return res.json(result);
  } catch (err) {
    console.error('[Food Recommend API Error]', err.message);

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
 * POST /api/food/menu
 *
 * 使用 AI 根據餐廳資訊生成合理菜單
 *
 * Request body:
 * {
 *   "restaurantId": "ChIJ...",   // Google Place ID，用於 cache
 *   "name": "一蘭拉麵 台北店",
 *   "tag": "日式拉麵",
 *   "priceAvg": 420,
 *   "priceMin": 350,             // 可選
 *   "priceMax": 500              // 可選
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "items": [
 *     { "name": "招牌豚骨拉麵", "price": 280, "calories": 650 },
 *     ...
 *   ],
 *   "fromCache": false
 * }
 */
router.post('/menu', async (req, res) => {
  try {
    const { restaurantId, name, tag, priceAvg, priceMin, priceMax } = req.body;

    // 驗證必要參數
    if (!name || !tag) {
      return res.status(400).json({
        success: false,
        error: '請提供餐廳名稱 (name) 和料理類型 (tag)',
      });
    }

    if (!priceAvg || typeof priceAvg !== 'number' || priceAvg <= 0) {
      return res.status(400).json({
        success: false,
        error: '請提供有效的人均消費 (priceAvg)',
      });
    }

    const result = await generateMenu({
      restaurantId: restaurantId || null,
      name: name.trim(),
      tag: tag.trim(),
      priceAvg,
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined,
    });

    return res.json({
      success: true,
      items: result.items,
      fromCache: result.fromCache || false,
    });
  } catch (err) {
    console.error('[Food Menu API Error]', err.message);

    return res.status(500).json({
      success: false,
      error: '菜單生成服務暫時無法使用，請稍後再試',
    });
  }
});

module.exports = router;