'use strict';

const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const { FEEDBACK_STATUS, READ_STATUS, PLATFORM_CODE } = require('../constants/status');

/**
 * 垃圾車到達清運點查詢與導航提醒 API
 * form_id = 1030
 * Topic 4039: 清運點與距離
 * Topic 4040: 時間與類別
 * Topic 4041: 鬧鐘提醒設定
 * Topic 4042: 導航經緯度
 */

const WASTE_FORM_ID = 1030;
const TOPIC_STOP_DISTANCE = 4039;
const TOPIC_TIME_CATEGORIES = 4040;
const TOPIC_REMINDER = 4041;
const TOPIC_NAVIGATION = 4042;

// ─── 台北市清運點資料（信義區示範） ───
// 實務上應從開放資料 API 或資料庫取得，此處以信義區常見清運點示範
const TAIPEI_TRUCK_STOPS = [
  {
    id: 'stop-1',
    name: '信義路四段265巷口',
    lat: 25.0330,
    lng: 121.5560,
    arriveTime: '19:10',
    arriveHour: 19,
    arriveMinute: 10,
  },
  {
    id: 'stop-2',
    name: '忠孝東路五段210號前',
    lat: 25.0408,
    lng: 121.5680,
    arriveTime: '19:30',
    arriveHour: 19,
    arriveMinute: 30,
  },
  {
    id: 'stop-3',
    name: '松山路450號旁',
    lat: 25.0450,
    lng: 121.5770,
    arriveTime: '20:15',
    arriveHour: 20,
    arriveMinute: 15,
  },
  {
    id: 'stop-4',
    name: '基隆路一段180號前',
    lat: 25.0370,
    lng: 121.5620,
    arriveTime: '19:45',
    arriveHour: 19,
    arriveMinute: 45,
  },
  {
    id: 'stop-5',
    name: '光復南路420巷口',
    lat: 25.0385,
    lng: 121.5575,
    arriveTime: '20:00',
    arriveHour: 20,
    arriveMinute: 0,
  },
];

// ─── 台北市垃圾回收星期規則 ───

/**
 * 取得指定星期幾可收取的垃圾類別
 * @param {number} dayOfWeek - 0=週日, 1=週一 ... 6=週六
 * @returns {{ categories: string[], dayLabel: string, isRestDay: boolean }}
 */
function getTaipeiScheduleByDay(dayOfWeek) {
  const dayLabels = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const dayLabel = dayLabels[dayOfWeek] || '未知';

  switch (dayOfWeek) {
    case 1: // 週一
    case 5: // 週五
      return {
        categories: ['一般垃圾', '養豬廚餘', '堆肥廚餘', '平面類（紙類、塑膠袋）'],
        dayLabel,
        isRestDay: false,
      };
    case 2: // 週二
    case 4: // 週四
    case 6: // 週六
      return {
        categories: ['一般垃圾', '立體類（寶特瓶、鋁罐、金屬、乾電池）', '資源回收'],
        dayLabel,
        isRestDay: false,
      };
    case 0: // 週日
    case 3: // 週三
    default:
      return {
        categories: [],
        dayLabel,
        isRestDay: true,
      };
  }
}

/**
 * 取得下一個可收垃圾的日期與類別
 * @param {Date} now - 目前時間
 * @returns {{ dayLabel: string, categories: string[], daysUntil: number }}
 */
function getNextAvailableDay(now) {
  for (let offset = 1; offset <= 7; offset++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + offset);
    const schedule = getTaipeiScheduleByDay(futureDate.getDay());
    if (!schedule.isRestDay) {
      return {
        dayLabel: schedule.dayLabel,
        categories: schedule.categories,
        daysUntil: offset,
      };
    }
  }
  return { dayLabel: '週一', categories: ['一般垃圾'], daysUntil: 1 };
}

/**
 * 計算兩點之間的直線距離（Haversine 公式）
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} 距離（公尺）
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半徑（公尺）
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 估算步行時間（分鐘），以平均步行速度 80m/min 估算
 * @param {number} distanceMeters
 * @returns {number}
 */
function estimateWalkMinutes(distanceMeters) {
  return Math.ceil(distanceMeters / 80);
}

/**
 * 計算清運點距離到達的剩餘分鐘數
 * @param {Date} now
 * @param {number} arriveHour
 * @param {number} arriveMinute
 * @returns {number} 剩餘分鐘（若已過則為負數）
 */
function minutesUntilArrival(now, arriveHour, arriveMinute) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const arriveMinutes = arriveHour * 60 + arriveMinute;
  return arriveMinutes - nowMinutes;
}

/**
 * 透過 Google Maps Distance Matrix API 取得步行距離與時間
 * 若 API Key 未設定，fallback 使用 Haversine 直線距離
 * @param {number} originLat
 * @param {number} originLng
 * @param {Array<{lat: number, lng: number}>} destinations
 * @returns {Promise<Array<{distanceMeters: number, durationMinutes: number}>>}
 */
async function getWalkingDistances(originLat, originLng, destinations) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // Fallback: 使用 Haversine 直線距離 × 1.3（路網修正係數）
    return destinations.map((dest) => {
      const straight = haversineDistance(originLat, originLng, dest.lat, dest.lng);
      const adjusted = Math.round(straight * 1.3);
      return {
        distanceMeters: adjusted,
        durationMinutes: estimateWalkMinutes(adjusted),
      };
    });
  }

  // 使用 Google Maps Distance Matrix API
  try {
    const destinationsStr = destinations
      .map((d) => `${d.lat},${d.lng}`)
      .join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destinationsStr}&mode=walking&language=zh-TW&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows && data.rows[0]) {
      return data.rows[0].elements.map((element, idx) => {
        if (element.status === 'OK') {
          return {
            distanceMeters: element.distance.value,
            durationMinutes: Math.ceil(element.duration.value / 60),
          };
        }
        // Fallback for individual element failure
        const straight = haversineDistance(originLat, originLng, destinations[idx].lat, destinations[idx].lng);
        const adjusted = Math.round(straight * 1.3);
        return {
          distanceMeters: adjusted,
          durationMinutes: estimateWalkMinutes(adjusted),
        };
      });
    }

    // API 回傳錯誤，使用 fallback
    return destinations.map((dest) => {
      const straight = haversineDistance(originLat, originLng, dest.lat, dest.lng);
      const adjusted = Math.round(straight * 1.3);
      return {
        distanceMeters: adjusted,
        durationMinutes: estimateWalkMinutes(adjusted),
      };
    });
  } catch (err) {
    console.error('[truckSchedule] Google Maps API error:', err.message);
    return destinations.map((dest) => {
      const straight = haversineDistance(originLat, originLng, dest.lat, dest.lng);
      const adjusted = Math.round(straight * 1.3);
      return {
        distanceMeters: adjusted,
        durationMinutes: estimateWalkMinutes(adjusted),
      };
    });
  }
}

/**
 * 產生 feedbackNo
 * @returns {string}
 */
function generateFeedbackNo() {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  let randomPart = '';
  while (randomPart.length < 8) {
    randomPart += Math.random().toString(36).slice(2);
  }
  return datePart + randomPart.slice(0, 8);
}

/**
 * POST /api/truck-schedule/nearby
 *
 * 根據使用者經緯度，回傳最近 2~3 個清運點、今日可收類別、到達時間。
 *
 * Request Body:
 * {
 *   "lat": 25.033,
 *   "lng": 121.556
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "todaySchedule": { "dayLabel", "categories", "isRestDay" },
 *     "nextAvailable": { "dayLabel", "categories", "daysUntil" } | null,
 *     "stops": [{ "id", "name", "lat", "lng", "distanceMeters", "walkMinutes", "arriveTime", "minutesLeft", "urgent", "categories" }]
 *   }
 * }
 */
router.post('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: '請提供有效的經緯度 (lat, lng)',
      });
    }

    // 取得今日星期與可收類別
    const now = new Date();
    // 轉換為台北時區 (UTC+8)
    const taipeiOffset = 8 * 60;
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const taipeiMinutes = utcMinutes + taipeiOffset;
    const taipeiHour = Math.floor(taipeiMinutes / 60) % 24;
    const taipeiMinute = taipeiMinutes % 60;

    // 台北時區的星期幾
    const taipeiDate = new Date(now.getTime() + taipeiOffset * 60 * 1000);
    const dayOfWeek = taipeiDate.getUTCDay();

    const todaySchedule = getTaipeiScheduleByDay(dayOfWeek);
    const nextAvailable = todaySchedule.isRestDay ? getNextAvailableDay(now) : null;

    // 計算各清運點距離
    const distances = await getWalkingDistances(
      lat, lng,
      TAIPEI_TRUCK_STOPS.map((s) => ({ lat: s.lat, lng: s.lng }))
    );

    // 組合清運點資料並依距離排序
    const stopsWithDistance = TAIPEI_TRUCK_STOPS.map((stop, idx) => {
      const dist = distances[idx];
      const minsLeft = minutesUntilArrival(
        { getHours: () => taipeiHour, getMinutes: () => taipeiMinute },
        stop.arriveHour,
        stop.arriveMinute
      );

      return {
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        distanceMeters: dist.distanceMeters,
        walkMinutes: dist.durationMinutes,
        arriveTime: stop.arriveTime,
        minutesLeft: minsLeft,
        urgent: minsLeft > 0 && minsLeft <= 15,
        categories: todaySchedule.isRestDay ? [] : todaySchedule.categories,
      };
    })
      .filter((s) => s.minutesLeft > 0) // 僅顯示尚未到達的清運點
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3); // 取最近 3 個

    // 寫入 DB (Topic 4039, 4040)
    if (stopsWithDistance.length > 0) {
      const nearest = stopsWithDistance[0];
      try {
        const feedbackNo = generateFeedbackNo();
        const feedbackContent = {
          [String(TOPIC_STOP_DISTANCE)]: {
            topicId: TOPIC_STOP_DISTANCE,
            value: `${nearest.name}（距離 ${nearest.distanceMeters} 公尺，步行約 ${nearest.walkMinutes} 分鐘）`,
          },
          [String(TOPIC_TIME_CATEGORIES)]: {
            topicId: TOPIC_TIME_CATEGORIES,
            value: `${todaySchedule.dayLabel} ${nearest.arriveTime} 到達，可收：${todaySchedule.categories.join('、')}`,
          },
        };

        await prisma.pmsFormFeedback.create({
          data: {
            feedbackNo,
            serviceId: 1,
            platformCode: PLATFORM_CODE.WEB,
            formId: WASTE_FORM_ID,
            feedbackContent,
            formType: '01',
            isRead: READ_STATUS.UNREAD,
            status: FEEDBACK_STATUS.PENDING,
            inbrAccountId: '00000000-0000-0000-0000-000000000001',
            creTime: new Date(),
            updTime: new Date(),
          },
        });
      } catch (dbErr) {
        console.error('[truck-schedule] DB write error (4039/4040):', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        todaySchedule,
        nextAvailable,
        stops: stopsWithDistance,
      },
    });
  } catch (err) {
    console.error('[POST /api/truck-schedule/nearby] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/truck-schedule/set-reminder
 *
 * 設定垃圾車到達前 10 分鐘提醒，寫入 Topic 4041
 *
 * Request Body:
 * {
 *   "stopId": "stop-1",
 *   "stopName": "信義路四段265巷口",
 *   "reminderTime": "19:00",
 *   "arriveTime": "19:10"
 * }
 */
router.post('/set-reminder', async (req, res) => {
  try {
    const { stopId, stopName, reminderTime, arriveTime } = req.body;

    if (!stopId || !stopName) {
      return res.status(400).json({ success: false, message: '缺少必要參數' });
    }

    // 寫入 DB (Topic 4041)
    try {
      const feedbackNo = generateFeedbackNo();
      const feedbackContent = {
        [String(TOPIC_REMINDER)]: {
          topicId: TOPIC_REMINDER,
          value: `已設定提醒：${stopName} 於 ${reminderTime} 提醒（垃圾車 ${arriveTime} 到達）`,
        },
      };

      await prisma.pmsFormFeedback.create({
        data: {
          feedbackNo,
          serviceId: 1,
          platformCode: PLATFORM_CODE.WEB,
          formId: WASTE_FORM_ID,
          feedbackContent,
          formType: '01',
          isRead: READ_STATUS.UNREAD,
          status: FEEDBACK_STATUS.PENDING,
          inbrAccountId: '00000000-0000-0000-0000-000000000001',
          creTime: new Date(),
          updTime: new Date(),
        },
      });
    } catch (dbErr) {
      console.error('[truck-schedule] DB write error (4041):', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        message: `已設定提醒：將於 ${reminderTime} 提醒您前往 ${stopName} 丟垃圾`,
        reminderTime,
        stopName,
      },
    });
  } catch (err) {
    console.error('[POST /api/truck-schedule/set-reminder] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

/**
 * POST /api/truck-schedule/navigate
 *
 * 記錄使用者開啟導航（寫入 Topic 4042）並回傳導航所需資訊
 *
 * Request Body:
 * {
 *   "stopId": "stop-1",
 *   "stopName": "信義路四段265巷口",
 *   "stopLat": 25.0330,
 *   "stopLng": 121.5560,
 *   "userLat": 25.033,
 *   "userLng": 121.556
 * }
 */
router.post('/navigate', async (req, res) => {
  try {
    const { stopId, stopName, stopLat, stopLng, userLat, userLng } = req.body;

    if (!stopId || typeof stopLat !== 'number' || typeof stopLng !== 'number') {
      return res.status(400).json({ success: false, message: '缺少必要參數' });
    }

    // 寫入 DB (Topic 4042)
    try {
      const feedbackNo = generateFeedbackNo();
      const feedbackContent = {
        [String(TOPIC_NAVIGATION)]: {
          topicId: TOPIC_NAVIGATION,
          value: JSON.stringify({
            stopName,
            stopLat,
            stopLng,
            userLat,
            userLng,
            navigatedAt: new Date().toISOString(),
          }),
        },
      };

      await prisma.pmsFormFeedback.create({
        data: {
          feedbackNo,
          serviceId: 1,
          platformCode: PLATFORM_CODE.WEB,
          formId: WASTE_FORM_ID,
          feedbackContent,
          formType: '01',
          isRead: READ_STATUS.UNREAD,
          status: FEEDBACK_STATUS.PENDING,
          inbrAccountId: '00000000-0000-0000-0000-000000000001',
          creTime: new Date(),
          updTime: new Date(),
        },
      });
    } catch (dbErr) {
      console.error('[truck-schedule] DB write error (4042):', dbErr.message);
    }

    // 回傳導航用資料（含 Google Maps Embed URL）
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const directionsUrl = apiKey
      ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${userLat},${userLng}&destination=${stopLat},${stopLng}&mode=walking`
      : null;

    // 外部 Google Maps 導航連結（無需 API Key）
    const externalNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${stopLat},${stopLng}&travelmode=walking`;

    return res.status(200).json({
      success: true,
      data: {
        stopName,
        stopLat,
        stopLng,
        directionsEmbedUrl: directionsUrl,
        externalNavUrl,
      },
    });
  } catch (err) {
    console.error('[POST /api/truck-schedule/navigate] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});

module.exports = router;
