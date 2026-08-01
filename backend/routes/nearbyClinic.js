const express = require('express');
const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * GET /api/nearby-clinic
 * 查詢附近醫療資源（診所、醫院）
 * Query params:
 *   lat - 使用者緯度
 *   lng - 使用者經度
 *   radius - 搜尋半徑（公尺，預設 3000）
 *   keyword - 額外關鍵字篩選（可選）
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 3000, keyword = '' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: '缺少 lat 或 lng 參數' });
    }

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Google API Key 未設定' });
    }

    // 使用 Google Places Nearby Search (New) 搜尋附近醫療設施
    const places = await searchNearbyPlaces(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius, 10),
      keyword
    );

    res.json({ results: places });
  } catch (err) {
    console.error('[nearbyClinic] Error:', err.message);
    res.status(500).json({ error: '搜尋附近醫療資源失敗', detail: err.message });
  }
});

/**
 * 呼叫 Google Places API (Text Search) 搜尋附近的診所/醫院
 * 使用 Text Search 以便取得 opening_hours 等完整資訊
 */
async function searchNearbyPlaces(lat, lng, radius, keyword) {
  // 使用 Places API (Text Search) 搜尋醫療設施
  const searchQuery = keyword ? `${keyword} 診所 醫院` : '診所 醫院 診所';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
    `query=${encodeURIComponent(searchQuery)}` +
    `&location=${lat},${lng}` +
    `&radius=${radius}` +
    `&type=hospital|doctor|health` +
    `&language=zh-TW` +
    `&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
  }

  if (!data.results || data.results.length === 0) {
    return [];
  }

  // 整理結果並計算距離
  const places = data.results.map((place) => {
    const distance = calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
    const department = classifyDepartment(place.name, place.types);
    const isOpen = place.opening_hours?.open_now ?? null;

    return {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || '',
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      distance, // 公尺
      distanceLabel: formatDistance(distance),
      department,
      rating: place.rating || null,
      userRatingsTotal: place.user_ratings_total || 0,
      isOpen,
      openingHours: place.opening_hours || null,
      icon: place.icon || '',
      types: place.types || [],
    };
  });

  // 排序邏輯：營業中的排前面，已關閉的排後面；同狀態內按距離排序
  places.sort((a, b) => {
    // isOpen: true > null > false
    const openScore = (v) => {
      if (v === true) return 0;
      if (v === null) return 1;
      return 2;
    };
    const scoreA = openScore(a.isOpen);
    const scoreB = openScore(b.isOpen);
    if (scoreA !== scoreB) return scoreA - scoreB;
    // 同狀態按距離排序
    return a.distance - b.distance;
  });

  return places;
}

/**
 * GET /api/nearby-clinic/:placeId/details
 * 取得單一地點的詳細資訊（營業時間等）
 */
router.get('/:placeId/details', async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({ error: '缺少 placeId' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${encodeURIComponent(placeId)}` +
      `&fields=name,formatted_address,formatted_phone_number,opening_hours,geometry,rating,user_ratings_total,website,url` +
      `&language=zh-TW` +
      `&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(404).json({ error: '找不到此地點', detail: data.status });
    }

    const place = data.result;
    res.json({
      placeId,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      googleMapsUrl: place.url || null,
      rating: place.rating || null,
      userRatingsTotal: place.user_ratings_total || 0,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      openingHours: place.opening_hours ? {
        isOpen: place.opening_hours.open_now ?? null,
        weekdayText: place.opening_hours.weekday_text || [],
        periods: place.opening_hours.periods || [],
      } : null,
    });
  } catch (err) {
    console.error('[nearbyClinic details] Error:', err.message);
    res.status(500).json({ error: '取得地點詳情失敗', detail: err.message });
  }
});

/**
 * 根據名稱和類型判斷科別
 */
function classifyDepartment(name, types) {
  // 科別關鍵字對應
  const deptMap = [
    { keywords: ['耳鼻喉'], dept: '耳鼻喉科' },
    { keywords: ['眼科'], dept: '眼科' },
    { keywords: ['牙', '齒', '口腔'], dept: '牙科' },
    { keywords: ['皮膚'], dept: '皮膚科' },
    { keywords: ['小兒', '兒科', '兒童'], dept: '小兒科' },
    { keywords: ['婦產', '婦科', '產科'], dept: '婦產科' },
    { keywords: ['骨科', '骨外'], dept: '骨科' },
    { keywords: ['復健', '物理治療'], dept: '復健科' },
    { keywords: ['心臟', '心血管'], dept: '心臟科' },
    { keywords: ['神經', '腦'], dept: '神經科' },
    { keywords: ['泌尿'], dept: '泌尿科' },
    { keywords: ['精神', '身心'], dept: '精神科' },
    { keywords: ['中醫'], dept: '中醫科' },
    { keywords: ['家醫', '家庭醫'], dept: '家醫科' },
    { keywords: ['內科'], dept: '一般內科' },
    { keywords: ['外科'], dept: '外科' },
    { keywords: ['整形', '醫美'], dept: '整形外科' },
    { keywords: ['腸胃', '肝膽', '胃腸'], dept: '腸胃科' },
    { keywords: ['藥局', '藥房'], dept: '藥局' },
  ];

  for (const { keywords, dept } of deptMap) {
    if (keywords.some((kw) => name.includes(kw))) {
      return dept;
    }
  }

  // 根據 types 判斷
  if (types.includes('pharmacy')) return '藥局';
  if (types.includes('dentist')) return '牙科';
  if (types.includes('doctor') || types.includes('health')) return '一般門診';
  if (types.includes('hospital')) return '綜合醫院';

  return '一般門診';
}

/**
 * Haversine 公式計算兩點間距離（公尺）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半徑（公尺）
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 格式化距離顯示
 */
function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

module.exports = router;
