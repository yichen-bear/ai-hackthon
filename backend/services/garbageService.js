'use strict';

/**
 * 台北市垃圾車清運點服務
 * 呼叫台北市政府公開資料 API，計算距離、過濾排序並回傳最近清運點。
 * Fallback：API 不可用時回傳預設站點資料。
 */

const TAIPEI_GARBAGE_API =
  'https://data.taipei/api/v1/dataset/a6e90031-7ec4-4089-afb5-361a4efe7202?scope=resourceAquire';

// ─── 預設 Fallback 站點（信義區常見清運點） ───
const FALLBACK_STOPS = [
  { name: '信義路四段265巷口', lat: 25.0330, lng: 121.5560, arriveTime: '1910', leaveTime: '1920', district: '信義區' },
  { name: '忠孝東路五段210號前', lat: 25.0408, lng: 121.5680, arriveTime: '1930', leaveTime: '1940', district: '信義區' },
  { name: '松山路450號旁', lat: 25.0450, lng: 121.5770, arriveTime: '2015', leaveTime: '2025', district: '信義區' },
  { name: '基隆路一段180號前', lat: 25.0370, lng: 121.5620, arriveTime: '1945', leaveTime: '1955', district: '信義區' },
  { name: '光復南路420巷口', lat: 25.0385, lng: 121.5575, arriveTime: '2000', leaveTime: '2010', district: '信義區' },
];

// ─── 台北市垃圾回收星期規則 ───
const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

/**
 * 取得指定星期幾可收取的垃圾類別
 * @param {number} dayOfWeek - 0=週日, 1=週一 ... 6=週六
 * @returns {{ categories: string[], dayLabel: string, isRestDay: boolean }}
 */
function getScheduleByDay(dayOfWeek) {
  const dayLabel = DAY_LABELS[dayOfWeek] || '未知';

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
 * @param {Date} now
 * @returns {{ dayLabel: string, categories: string[], daysUntil: number }}
 */
function getNextAvailableDay(now) {
  for (let offset = 1; offset <= 7; offset++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + offset);
    const schedule = getScheduleByDay(futureDate.getDay());
    if (!schedule.isRestDay) {
      return { dayLabel: schedule.dayLabel, categories: schedule.categories, daysUntil: offset };
    }
  }
  return { dayLabel: '週一', categories: ['一般垃圾'], daysUntil: 1 };
}

/**
 * Haversine 公式計算兩點距離（公尺）
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 估算步行時間（分鐘），平均步行速度 80m/min
 */
function estimateWalkMinutes(meters) {
  return Math.ceil(meters / 80);
}

/**
 * 將 API 回傳的時間字串 "1630" 轉為 { hour, minute }
 */
function parseTime(timeStr) {
  const str = String(timeStr).padStart(4, '0');
  return { hour: parseInt(str.slice(0, 2), 10), minute: parseInt(str.slice(2, 4), 10) };
}

/**
 * 格式化為 HH:MM
 */
function formatTime(timeStr) {
  const { hour, minute } = parseTime(timeStr);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * 計算距離到達的剩餘分鐘數
 */
function minutesUntilArrival(nowHour, nowMinute, arriveHour, arriveMinute) {
  return (arriveHour * 60 + arriveMinute) - (nowHour * 60 + nowMinute);
}

/**
 * 呼叫台北市公開 API 取得所有清運點資料
 * @param {number} limit - 取得筆數上限（API 預設 1000）
 * @returns {Promise<Array>} 原始清運點資料陣列
 */
async function fetchTaipeiGarbageStops(limit = 4500) {
  const url = `${TAIPEI_GARBAGE_API}&limit=${limit}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.result && Array.isArray(data.result.results)) {
      return data.result.results;
    }
    throw new Error('Unexpected API response structure');
  } catch (err) {
    clearTimeout(timeout);
    console.error('[garbageService] 台北市 API 呼叫失敗:', err.message);
    return null; // 回傳 null 讓呼叫端走 fallback
  }
}

/**
 * 主要服務函式：查詢使用者附近最近的清運點
 *
 * @param {number} userLat - 使用者緯度
 * @param {number} userLng - 使用者經度
 * @param {object} [options]
 * @param {number} [options.topN=3] - 回傳最近幾個點
 * @returns {Promise<object>} 包含 todaySchedule, nextAvailable, stops
 */
async function getNearbyStops(userLat, userLng, options = {}) {
  const topN = options.topN || 3;

  // 取得台北時區的今天星期幾與時間
  const now = new Date();
  const taipeiOffset = 8 * 60; // UTC+8
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const taipeiTotalMin = utcMinutes + taipeiOffset;
  const taipeiHour = Math.floor(taipeiTotalMin / 60) % 24;
  const taipeiMinute = taipeiTotalMin % 60;

  const taipeiDate = new Date(now.getTime() + taipeiOffset * 60 * 1000);
  const dayOfWeek = taipeiDate.getUTCDay();

  const todaySchedule = getScheduleByDay(dayOfWeek);
  const nextAvailable = todaySchedule.isRestDay ? getNextAvailableDay(now) : null;

  // 嘗試從真實 API 取得資料
  let rawStops = await fetchTaipeiGarbageStops();
  let useFallback = false;

  if (!rawStops || rawStops.length === 0) {
    useFallback = true;
  }

  let processedStops;

  if (useFallback) {
    // Fallback：使用預設站點
    console.warn('[garbageService] 使用 fallback 預設站點資料');
    processedStops = FALLBACK_STOPS.map((stop) => {
      const distance = haversineDistance(userLat, userLng, stop.lat, stop.lng);
      const adjustedDist = Math.round(distance * 1.3); // 路網修正
      const { hour, minute } = parseTime(stop.arriveTime);
      const minsLeft = minutesUntilArrival(taipeiHour, taipeiMinute, hour, minute);

      return {
        id: `fallback-${stop.name}`,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        district: stop.district,
        distanceMeters: adjustedDist,
        walkMinutes: estimateWalkMinutes(adjustedDist),
        arriveTime: formatTime(stop.arriveTime),
        leaveTime: formatTime(stop.leaveTime),
        minutesLeft: minsLeft,
        urgent: minsLeft > 0 && minsLeft <= 15,
        categories: todaySchedule.isRestDay ? [] : todaySchedule.categories,
      };
    });
  } else {
    // 真實 API 資料處理
    processedStops = rawStops
      .filter((item) => {
        // 必須有有效經緯度
        const lat = parseFloat(item['緯度']);
        const lng = parseFloat(item['經度']);
        return !isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0;
      })
      .map((item) => {
        const lat = parseFloat(item['緯度']);
        const lng = parseFloat(item['經度']);
        const distance = haversineDistance(userLat, userLng, lat, lng);
        const adjustedDist = Math.round(distance * 1.3);
        const { hour, minute } = parseTime(item['抵達時間']);
        const minsLeft = minutesUntilArrival(taipeiHour, taipeiMinute, hour, minute);

        return {
          id: `tp-${item['_id'] || item['局編']}-${item['車次']}`,
          name: item['地點'] || '未知地點',
          lat,
          lng,
          district: item['行政區'] || '',
          route: item['路線'] || '',
          vehicleNo: item['車號'] || '',
          trip: item['車次'] || '',
          distanceMeters: adjustedDist,
          walkMinutes: estimateWalkMinutes(adjustedDist),
          arriveTime: formatTime(item['抵達時間']),
          leaveTime: formatTime(item['離開時間']),
          minutesLeft: minsLeft,
          urgent: minsLeft > 0 && minsLeft <= 15,
          categories: todaySchedule.isRestDay ? [] : todaySchedule.categories,
        };
      });
  }

  // 過濾：僅保留尚未離開的清運點（minutesLeft > 0 代表垃圾車尚未抵達或正在停留）
  const activeStops = processedStops.filter((s) => s.minutesLeft > -10);

  // 排序：距離最近優先
  activeStops.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // 取前 N 個
  const topStops = activeStops.slice(0, topN);

  return {
    todaySchedule,
    nextAvailable,
    stops: topStops,
    source: useFallback ? 'fallback' : 'taipei-opendata',
  };
}

module.exports = {
  getNearbyStops,
  getScheduleByDay,
  getNextAvailableDay,
  haversineDistance,
  fetchTaipeiGarbageStops,
  // 匯出供測試用
  FALLBACK_STOPS,
  formatTime,
  parseTime,
};
