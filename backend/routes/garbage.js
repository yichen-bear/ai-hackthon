'use strict';

const router = require('express').Router();
const garbageService = require('../services/garbageService');

/**
 * 台北市垃圾車清運點查詢 API
 * 串接台北市公開資料 API，回傳距離使用者最近的清運點資訊。
 *
 * form_id = 1030
 * Topic 4039: 清運點與距離
 * Topic 4040: 時間與類別
 * Topic 4042: 導航經緯度
 */

/**
 * GET /api/garbage/nearby?lat=25.033&lng=121.556
 *
 * Query params:
 *   lat {number} - 使用者緯度
 *   lng {number} - 使用者經度
 *   top {number} - (可選) 回傳最近幾個點，預設 3
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "todaySchedule": { "dayLabel", "categories", "isRestDay" },
 *     "nextAvailable": { "dayLabel", "categories", "daysUntil" } | null,
 *     "stops": [{
 *       "id", "name", "lat", "lng", "district",
 *       "distanceMeters", "walkMinutes",
 *       "arriveTime", "leaveTime",
 *       "minutesLeft", "urgent", "categories"
 *     }],
 *     "source": "taipei-opendata" | "fallback",
 *     "cards": {
 *       "4039": { "topicId": 4039, "value": "..." },
 *       "4040": { "topicId": 4040, "value": "..." },
 *       "4042": { "topicId": 4042, "value": {...} }
 *     }
 *   }
 * }
 */
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const top = parseInt(req.query.top, 10) || 3;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: '請提供有效的經緯度參數 (lat, lng)',
      });
    }

    const result = await garbageService.getNearbyStops(lat, lng, { topN: top });

    // 組裝前端卡片資料（Topics 4039, 4040, 4042）
    let cards = null;
    if (result.stops.length > 0) {
      const nearest = result.stops[0];

      cards = {
        '4039': {
          topicId: 4039,
          value: `${nearest.name}（距離 ${nearest.distanceMeters} 公尺，步行約 ${nearest.walkMinutes} 分鐘）`,
        },
        '4040': {
          topicId: 4040,
          value: result.todaySchedule.isRestDay
            ? `今日（${result.todaySchedule.dayLabel}）休息不收垃圾`
            : `${result.todaySchedule.dayLabel} ${nearest.arriveTime} 抵達，可收：${result.todaySchedule.categories.join('、')}`,
        },
        '4042': {
          topicId: 4042,
          value: {
            stopName: nearest.name,
            stopLat: nearest.lat,
            stopLng: nearest.lng,
            userLat: lat,
            userLng: lng,
          },
        },
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        todaySchedule: result.todaySchedule,
        nextAvailable: result.nextAvailable,
        stops: result.stops,
        source: result.source,
        cards,
      },
    });
  } catch (err) {
    console.error('[GET /api/garbage/nearby] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤，請稍後再試' });
  }
});

module.exports = router;
