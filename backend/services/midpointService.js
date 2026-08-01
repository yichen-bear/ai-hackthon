/**
 * 多人中點餐廳推薦服務
 * 
 * 使用 Google Maps API（Geocoding / Places / Distance Matrix）
 * 搭配公平性 + 評分加權演算法，推薦最適合多人聚餐的餐廳
 */

const GOOGLE_MAPS_BASE = 'https://maps.googleapis.com/maps/api';

/**
 * 取得 Google Maps API Key
 * 支援 GOOGLE_MAPS_API_KEY 或 GOOGLE_API_KEY
 */
function getApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY 或 GOOGLE_API_KEY 環境變數未設定');
  }
  return key;
}

/**
 * 將地址文字轉為座標 (lat, lng)
 * @param {string} address - 地址文字
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string}>}
 */
async function geocodeAddress(address) {
  const key = getApiKey();
  const url = `${GOOGLE_MAPS_BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${key}&language=zh-TW&region=tw`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(`無法解析地址: "${address}" (status: ${data.status})`);
  }

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

/**
 * 計算多個座標的幾何中心
 * @param {{lat: number, lng: number}[]} points
 * @returns {{lat: number, lng: number}}
 */
function computeCentroid(points) {
  const n = points.length;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / n, lng: sum.lng / n };
}

/**
 * 計算搜索半徑（公尺）
 * 取最遠的人到中心的距離 × 0.7，上限 10km，下限 1km
 * @param {{lat: number, lng: number}} centroid
 * @param {{lat: number, lng: number}[]} points
 * @returns {number} 半徑（公尺）
 */
function computeSearchRadius(centroid, points) {
  const distances = points.map((p) => haversineDistance(centroid, p));
  const maxDist = Math.max(...distances);
  let radius = maxDist * 0.7;

  // 上下限
  radius = Math.max(radius, 1000);  // 至少 1km
  radius = Math.min(radius, 10000); // 最多 10km

  return Math.round(radius);
}

/**
 * Haversine 公式計算兩點間距離（公尺）
 */
function haversineDistance(p1, p2) {
  const R = 6371000; // 地球半徑（公尺）
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 使用 Google Places Nearby Search 搜尋附近餐廳
 * @param {{lat: number, lng: number}} location - 搜索中心
 * @param {number} radius - 搜索半徑（公尺）
 * @param {string} [keyword] - 料理類型關鍵字（可選）
 * @returns {Promise<Array>} 餐廳列表
 */
async function searchNearbyRestaurants(location, radius, keyword) {
  const key = getApiKey();
  let url = `${GOOGLE_MAPS_BASE}/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=restaurant&language=zh-TW&key=${key}`;

  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API 錯誤: ${data.status}`);
  }

  if (data.status === 'ZERO_RESULTS' || !data.results) {
    return [];
  }

  // 過濾掉沒有評分的、評分太少的餐廳
  return data.results
    .filter((place) => place.rating && place.user_ratings_total >= 10)
    .slice(0, 20) // 最多取 20 間候選
    .map((place) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      location: place.geometry.location,
      types: place.types || [],
      openNow: place.opening_hours?.open_now,
    }));
}

/**
 * 用 Distance Matrix API 計算交通時間
 * 對每組 (出發地 → 餐廳)，同時查 driving 和 transit，取最短時間
 * @param {{lat: number, lng: number}[]} origins - 所有人的出發座標
 * @param {{lat: number, lng: number}[]} destinations - 候選餐廳座標
 * @returns {Promise<Array<Array<{duration: number, mode: string}>>>}
 *   results[i][j] = 第 i 個人到第 j 間餐廳的最短交通時間與建議模式
 */
async function getDistanceMatrix(origins, destinations) {
  const key = getApiKey();

  const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
  const destinationsStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

  // 同時查 driving 和 transit
  const modes = ['driving', 'transit'];
  const requests = modes.map(async (mode) => {
    const url = `${GOOGLE_MAPS_BASE}/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&mode=${mode}&language=zh-TW&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      throw new Error(`Distance Matrix API 錯誤 (${mode}): ${data.status}`);
    }

    return { mode, data };
  });

  const results = await Promise.all(requests);

  // 組合結果：對每個 (人, 餐廳) 取最短時間
  const numOrigins = origins.length;
  const numDests = destinations.length;
  const matrix = [];

  for (let i = 0; i < numOrigins; i++) {
    const row = [];
    for (let j = 0; j < numDests; j++) {
      let bestDuration = Infinity;
      let bestMode = 'driving';

      for (const { mode, data } of results) {
        const element = data.rows[i].elements[j];
        if (element.status === 'OK') {
          const duration = element.duration.value; // 秒
          if (duration < bestDuration) {
            bestDuration = duration;
            bestMode = mode;
          }
        }
      }

      row.push({
        duration: bestDuration === Infinity ? null : Math.round(bestDuration / 60), // 轉為分鐘
        mode: bestMode,
      });
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * 計算標準差
 * @param {number[]} values
 * @returns {number}
 */
function standardDeviation(values) {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/**
 * 核心演算法：對候選餐廳進行評分排序
 * 
 * 硬門檻：
 * - max(交通時間) > 45 分鐘 → 排除
 * - max - min > 20 分鐘 → 排除（太不公平）
 * 
 * 評分公式：
 * score = 0.6 * fairness + 0.4 * rating_normalized
 * 
 * @param {Array} restaurants - 候選餐廳資料
 * @param {Array<Array<{duration: number, mode: string}>>} distanceMatrix
 * @returns {Array} 排序後的推薦結果
 */
function rankRestaurants(restaurants, distanceMatrix) {
  const MAX_TIME = 45;        // 硬門檻：最大交通時間（分鐘）
  const MAX_DIFF = 20;        // 硬門檻：最大時間差距（分鐘）
  const MAX_STD = 15;         // 用於正規化公平性分數的最大標準差

  const scored = [];

  for (let j = 0; j < restaurants.length; j++) {
    const restaurant = restaurants[j];

    // 取得每個人到這間餐廳的時間
    const times = distanceMatrix.map((row) => row[j]);
    const durations = times.map((t) => t.duration);

    // 跳過有人無法到達的餐廳
    if (durations.some((d) => d === null)) continue;

    const maxTime = Math.max(...durations);
    const minTime = Math.min(...durations);

    // 硬門檻篩選
    if (maxTime > MAX_TIME) continue;
    if (maxTime - minTime > MAX_DIFF) continue;

    // 計算公平性分數 (0~1)，標準差越小越公平
    const std = standardDeviation(durations);
    const fairness = Math.max(0, 1 - std / MAX_STD);

    // 評分正規化 (0~1)
    const ratingNormalized = (restaurant.rating || 0) / 5;

    // 加權總分
    const score = 0.6 * fairness + 0.4 * ratingNormalized;

    scored.push({
      ...restaurant,
      score: Math.round(score * 100) / 100,
      fairnessScore: Math.round(fairness * 100) / 100,
      ratingScore: Math.round(ratingNormalized * 100) / 100,
      travelDetails: times.map((t) => ({
        duration: t.duration,
        mode: t.mode,
        modeLabel: t.mode === 'transit' ? '大眾運輸' : '開車',
      })),
      maxTime,
      minTime,
      avgTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    });
  }

  // 按分數排序，取前 5
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

/**
 * 主要推薦流程
 * @param {Object} params
 * @param {string[]} params.addresses - 各人出發地址
 * @param {string} [params.cuisineType] - 指定料理類型（可選）
 * @returns {Promise<Object>} 推薦結果
 */
async function recommend({ addresses, cuisineType }) {
  if (!addresses || addresses.length < 2) {
    throw new Error('至少需要 2 個出發地址');
  }

  if (addresses.length > 10) {
    throw new Error('最多支援 10 人');
  }

  // Step 1: 地理編碼 — 將地址轉為座標
  const geocoded = await Promise.all(addresses.map((addr) => geocodeAddress(addr)));
  const origins = geocoded.map((g) => ({ lat: g.lat, lng: g.lng }));

  // Step 2: 計算幾何中心與搜索半徑
  const centroid = computeCentroid(origins);
  const radius = computeSearchRadius(centroid, origins);

  // Step 3: 搜尋附近餐廳
  let restaurants = await searchNearbyRestaurants(centroid, radius, cuisineType);

  // 如果指定料理類型但結果不足 3 間，退回全品類補足
  let fallbackUsed = false;
  if (cuisineType && restaurants.length < 3) {
    fallbackUsed = true;
    const allRestaurants = await searchNearbyRestaurants(centroid, radius, null);
    // 合併，去重
    const existingIds = new Set(restaurants.map((r) => r.placeId));
    const additional = allRestaurants.filter((r) => !existingIds.has(r.placeId));
    restaurants = [...restaurants, ...additional].slice(0, 20);
  }

  if (restaurants.length === 0) {
    return {
      success: true,
      centroid,
      radius,
      recommendations: [],
      message: '在此範圍內找不到符合條件的餐廳，請嘗試擴大搜索範圍或調整地址',
    };
  }

  // Step 4: 計算交通時間矩陣
  const destinations = restaurants.map((r) => r.location);
  const distanceMatrix = await getDistanceMatrix(origins, destinations);

  // Step 5: 評分排序
  const recommendations = rankRestaurants(restaurants, distanceMatrix);

  // 如果結果不足 3 且有指定料理但還沒 fallback，再試一次
  if (recommendations.length < 3 && cuisineType && !fallbackUsed) {
    const allRestaurants = await searchNearbyRestaurants(centroid, radius, null);
    const existingIds = new Set(restaurants.map((r) => r.placeId));
    const additional = allRestaurants.filter((r) => !existingIds.has(r.placeId));

    if (additional.length > 0) {
      const additionalDests = additional.map((r) => r.location);
      const additionalMatrix = await getDistanceMatrix(origins, additionalDests);
      const additionalRanked = rankRestaurants(additional, additionalMatrix);

      recommendations.push(...additionalRanked);
      recommendations.sort((a, b) => b.score - a.score);
      recommendations.splice(5); // 最多 5 個
    }
  }

  return {
    success: true,
    centroid,
    radius,
    origins: geocoded,
    fallbackUsed,
    cuisineType: cuisineType || null,
    recommendations,
  };
}

/**
 * 共乘路線建議
 * 
 * 新邏輯：每個人都可能是駕駛，計算任意一人開車去接另一人是否順路（繞路 < 10 分鐘）
 * 不再只看推薦時的交通模式，而是計算所有可能的組合
 * 
 * @param {Object} params
 * @param {{lat: number, lng: number}[]} params.origins - 各人出發座標
 * @param {{lat: number, lng: number}} params.destination - 餐廳座標
 * @param {{duration: number, mode: string}[]} params.travelDetails - 各人的交通明細（參考用）
 * @returns {Promise<Object>} 共乘建議
 */
async function suggestCarpool({ origins, destination, travelDetails }) {
  if (!origins || origins.length < 2) {
    throw new Error('至少需要 2 個出發地');
  }

  const MAX_DETOUR_MINUTES = 10; // 繞路容忍上限
  const key = getApiKey();

  // Step 1: 計算每個人直接開車到餐廳的時間
  const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
  const destStr = `${destination.lat},${destination.lng}`;
  const directUrl = `${GOOGLE_MAPS_BASE}/distancematrix/json?origins=${originsStr}&destinations=${destStr}&mode=driving&language=zh-TW&key=${key}`;

  const directRes = await fetch(directUrl);
  const directData = await directRes.json();

  if (directData.status !== 'OK') {
    return { success: true, carpoolGroups: [], message: '無法計算行車時間' };
  }

  const directDurations = directData.rows.map((row) => {
    if (row.elements[0].status === 'OK') {
      return Math.round(row.elements[0].duration.value / 60);
    }
    return null;
  });

  // Step 2: 計算每人之間的開車時間（person-to-person matrix）
  const p2pUrl = `${GOOGLE_MAPS_BASE}/distancematrix/json?origins=${originsStr}&destinations=${originsStr}&mode=driving&language=zh-TW&key=${key}`;
  const p2pRes = await fetch(p2pUrl);
  const p2pData = await p2pRes.json();

  if (p2pData.status !== 'OK') {
    return { success: true, carpoolGroups: [], message: '無法計算人際距離' };
  }

  // Step 3: 對每個可能的駕駛，看能否順路接其他人
  const carpoolGroups = [];

  for (let driverIdx = 0; driverIdx < origins.length; driverIdx++) {
    const driverDirect = directDurations[driverIdx];
    if (driverDirect === null) continue;

    const pickupCandidates = [];

    for (let passengerIdx = 0; passengerIdx < origins.length; passengerIdx++) {
      if (driverIdx === passengerIdx) continue;

      // driver → passenger 的時間
      const driverToPassengerEl = p2pData.rows[driverIdx].elements[passengerIdx];
      if (driverToPassengerEl.status !== 'OK') continue;
      const driverToPassenger = Math.round(driverToPassengerEl.duration.value / 60);

      // passenger → destination 的時間（從 directDurations 拿）
      // 注意：這裡需要的是 "從乘客位置開車到餐廳的時間"
      const passengerToDestination = directDurations[passengerIdx];
      if (passengerToDestination === null) continue;

      // 繞路時間 = (driver→passenger + passenger→destination) - driver直達
      const totalWithDetour = driverToPassenger + passengerToDestination;
      const detourMinutes = totalWithDetour - driverDirect;

      if (detourMinutes <= MAX_DETOUR_MINUTES) {
        pickupCandidates.push({
          passengerIndex: passengerIdx,
          passengerOrigin: origins[passengerIdx],
          driverToPassenger,
          passengerToDestination,
          totalTime: totalWithDetour,
          detourMinutes: Math.max(0, detourMinutes),
        });
      }
    }

    // 按繞路時間排序
    pickupCandidates.sort((a, b) => a.detourMinutes - b.detourMinutes);

    if (pickupCandidates.length > 0) {
      carpoolGroups.push({
        driverIndex: driverIdx,
        driverOrigin: origins[driverIdx],
        directDuration: driverDirect,
        pickups: pickupCandidates,
      });
    }
  }

  return {
    success: true,
    carpoolGroups,
    destination,
  };
}

module.exports = {
  recommend,
  suggestCarpool,
  geocodeAddress,
  computeCentroid,
  computeSearchRadius,
  searchNearbyRestaurants,
  getDistanceMatrix,
  rankRestaurants,
};
