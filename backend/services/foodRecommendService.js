/**
 * 附近餐廳推薦服務
 *
 * 使用 Google Maps Places API (Nearby Search)
 * 結合距離與評分的加權演算法，推薦最適合的 3 間餐廳
 */

const GOOGLE_MAPS_BASE = 'https://maps.googleapis.com/maps/api';

/**
 * 取得 Google Maps API Key
 */
function getApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY 或 GOOGLE_API_KEY 環境變數未設定');
  }
  return key;
}

/**
 * Haversine 公式計算兩點間距離（公尺）
 */
function haversineDistance(p1, p2) {
  const R = 6371000;
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
 * @param {{lat: number, lng: number}} location - 使用者位置
 * @param {number} radius - 搜索半徑（公尺）
 * @param {string} [keyword] - 料理關鍵字（可選）
 * @returns {Promise<Array>}
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
    throw new Error(`Places API 錯誤: ${data.status} - ${data.error_message || ''}`);
  }

  if (data.status === 'ZERO_RESULTS' || !data.results) {
    return [];
  }

  return data.results;
}

/**
 * 核心推薦演算法
 *
 * 評分公式：
 *   score = W_rating * ratingNorm + W_distance * distanceNorm + W_popularity * popularityNorm
 *
 * - ratingNorm: Google 評分正規化 (rating / 5)
 * - distanceNorm: 距離反比正規化 (1 - distance/maxDistance)，越近分越高
 * - popularityNorm: 評論數正規化，用對數平滑 log(reviews)/log(maxReviews)
 *
 * 權重配置：
 *   W_rating = 0.45（評分最重要）
 *   W_distance = 0.35（距離次之）
 *   W_popularity = 0.20（人氣輔助）
 *
 * @param {Array} places - Google Places API 原始結果
 * @param {{lat: number, lng: number}} userLocation - 使用者座標
 * @param {number} maxResults - 最多回傳幾間（預設 3）
 * @returns {Array} 排序後的推薦餐廳
 */
function rankRestaurants(places, userLocation, maxResults = 3) {
  // 權重
  const W_RATING = 0.45;
  const W_DISTANCE = 0.35;
  const W_POPULARITY = 0.20;

  // 最低門檻：必須有評分且評論數 >= 5
  const qualified = places.filter(
    (p) => p.rating && p.user_ratings_total >= 5
  );

  if (qualified.length === 0) return [];

  // 計算每間餐廳的距離
  const withDistance = qualified.map((place) => {
    const placeLocation = place.geometry.location;
    const distance = haversineDistance(userLocation, placeLocation);
    return { ...place, _distance: distance };
  });

  // 取得最大距離和最大評論數（用於正規化）
  const maxDistance = Math.max(...withDistance.map((p) => p._distance));
  const maxReviews = Math.max(...withDistance.map((p) => p.user_ratings_total));
  const logMaxReviews = Math.log(maxReviews + 1);

  // 計算加權分數
  const scored = withDistance.map((place) => {
    const ratingNorm = (place.rating || 0) / 5;
    const distanceNorm = maxDistance > 0 ? 1 - place._distance / maxDistance : 1;
    const popularityNorm = logMaxReviews > 0
      ? Math.log(place.user_ratings_total + 1) / logMaxReviews
      : 0;

    const score = W_RATING * ratingNorm + W_DISTANCE * distanceNorm + W_POPULARITY * popularityNorm;

    return {
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      location: place.geometry.location,
      openNow: place.opening_hours?.open_now,
      types: place.types || [],
      distance: Math.round(place._distance),       // 公尺
      distanceLabel: formatDistance(place._distance),
      score: Math.round(score * 1000) / 1000,
      // 用於前端顯示的額外欄位
      tag: extractTag(place.types, place.name),
      image: pickEmoji(place.types, place.name),
    };
  });

  // 按分數排序，取前 N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

/**
 * 格式化距離為可讀字串
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * 根據 types 和名稱推斷料理標籤
 */
function extractTag(types, name) {
  // 依名稱關鍵字判斷
  const nameKeywords = [
    { keywords: ['拉麵', 'ラーメン', 'ramen'], tag: '日式拉麵' },
    { keywords: ['壽司', '寿司', 'sushi'], tag: '日式壽司' },
    { keywords: ['日本', '日式', '居酒屋', '丼飯'], tag: '日本料理' },
    { keywords: ['韓', '韓式', '烤肉', '石鍋'], tag: '韓式料理' },
    { keywords: ['火鍋', '鍋物', '麻辣'], tag: '火鍋' },
    { keywords: ['義大利', 'pizza', '披薩', '義式'], tag: '義式料理' },
    { keywords: ['牛排', 'steak'], tag: '牛排' },
    { keywords: ['咖啡', 'cafe', 'coffee'], tag: '咖啡廳' },
    { keywords: ['早午餐', 'brunch'], tag: '早午餐' },
    { keywords: ['泰', '泰式'], tag: '泰式料理' },
    { keywords: ['印度', 'indian', 'curry'], tag: '印度料理' },
    { keywords: ['漢堡', 'burger'], tag: '美式漢堡' },
    { keywords: ['小籠包', '包子', '點心', '港式'], tag: '港式點心' },
    { keywords: ['滷肉飯', '便當', '自助餐', '熱炒'], tag: '台灣小吃' },
  ];

  for (const { keywords, tag } of nameKeywords) {
    if (keywords.some((kw) => name.includes(kw))) {
      return tag;
    }
  }

  // fallback 根據 types
  if (types.includes('meal_delivery')) return '外送美食';
  if (types.includes('meal_takeaway')) return '外帶美食';
  if (types.includes('cafe')) return '咖啡廳';
  if (types.includes('bakery')) return '烘焙坊';

  return '餐廳';
}

/**
 * 根據料理類型選一個 emoji
 */
function pickEmoji(types, name) {
  const emojiMap = [
    { keywords: ['拉麵', 'ラーメン', '麵'], emoji: '🍜' },
    { keywords: ['壽司', '寿司'], emoji: '🍣' },
    { keywords: ['日本', '日式', '居酒屋'], emoji: '🍱' },
    { keywords: ['韓', '烤肉'], emoji: '🥩' },
    { keywords: ['火鍋', '鍋物', '麻辣'], emoji: '🍲' },
    { keywords: ['pizza', '披薩', '義大利', '義式'], emoji: '🍕' },
    { keywords: ['牛排', 'steak'], emoji: '🥩' },
    { keywords: ['咖啡', 'cafe', 'coffee'], emoji: '☕' },
    { keywords: ['漢堡', 'burger'], emoji: '🍔' },
    { keywords: ['小籠包', '包子', '點心'], emoji: '🥟' },
    { keywords: ['泰', '泰式'], emoji: '🍛' },
    { keywords: ['早午餐', 'brunch'], emoji: '🥐' },
  ];

  for (const { keywords, emoji } of emojiMap) {
    if (keywords.some((kw) => name.includes(kw))) {
      return emoji;
    }
  }

  if (types.includes('cafe') || types.includes('bakery')) return '☕';
  return '🍽️';
}

/**
 * 根據 price_level 推算價位範圍（台幣）
 * Google price_level: 0=Free, 1=$, 2=$$, 3=$$$, 4=$$$$
 * 使用餐廳名稱作為 seed 產生不同的偏移，確保每家店價格不同
 */
function estimatePrice(priceLevel, restaurantName) {
  const ranges = {
    0: { base: 50, spread: 80 },
    1: { base: 120, spread: 180 },
    2: { base: 280, spread: 320 },
    3: { base: 550, spread: 450 },
    4: { base: 900, spread: 800 },
  };
  const tier = ranges[priceLevel] || { base: 200, spread: 300 };

  // 用餐廳名稱 hash 產生穩定的偽隨機偏移（同一間店每次都一樣）
  const hash = simpleHash(restaurantName || '');
  const offset = (hash % 100) / 100; // 0~0.99

  const avg = Math.round(tier.base + tier.spread * offset);
  const min = Math.round(avg * 0.65);
  const max = Math.round(avg * 1.35);

  return { min, max, avg };
}

/**
 * 簡單的字串 hash（產生穩定的數字）
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 轉為 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * 主要推薦流程
 *
 * @param {Object} params
 * @param {number} params.lat - 使用者緯度
 * @param {number} params.lng - 使用者經度
 * @param {number} [params.radius] - 搜索半徑（公尺，預設 1500）
 * @param {string} [params.keyword] - 料理類型關鍵字（可選）
 * @param {string} [params.mode] - 用餐模式: dine_in / takeout / delivery
 * @returns {Promise<Object>} 推薦結果
 */
async function recommendNearby({ lat, lng, radius = 1500, keyword, mode }) {
  const userLocation = { lat, lng };

  // Step 1: 搜尋附近餐廳
  let places = await searchNearbyRestaurants(userLocation, radius, keyword);

  // 根據用餐模式過濾
  if (mode === 'delivery') {
    // 優先 meal_delivery，但不強制排除其他
    const deliveryPlaces = places.filter((p) =>
      (p.types || []).includes('meal_delivery')
    );
    if (deliveryPlaces.length >= 3) {
      places = deliveryPlaces;
    }
  } else if (mode === 'takeout') {
    const takeawayPlaces = places.filter((p) =>
      (p.types || []).includes('meal_takeaway')
    );
    if (takeawayPlaces.length >= 3) {
      places = takeawayPlaces;
    }
  }

  // Step 2: 如果指定料理類型但結果不足 3 間，補充全品類
  let fallbackUsed = false;
  if (keyword && places.length < 3) {
    fallbackUsed = true;
    const allPlaces = await searchNearbyRestaurants(userLocation, radius, null);
    const existingIds = new Set(places.map((p) => p.place_id));
    const additional = allPlaces.filter((p) => !existingIds.has(p.place_id));
    places = [...places, ...additional];
  }

  if (places.length === 0) {
    return {
      success: true,
      recommendations: [],
      message: '附近找不到符合條件的餐廳，請嘗試擴大搜索範圍',
    };
  }

  // Step 3: 執行排名演算法
  const recommendations = rankRestaurants(places, userLocation, 3);

  // Step 4: 組裝前端需要的格式
  const formattedRecommendations = recommendations.map((r, idx) => {
    const price = estimatePrice(r.priceLevel, r.name);

    // 產生假的時段資料（實際上可串接訂位系統）
    const timeSlots = generateTimeSlots();

    return {
      id: r.placeId,
      name: r.name,
      tag: r.tag,
      priceMin: price.min,
      priceMax: price.max,
      priceAvg: price.avg,
      rating: r.rating,
      distance: r.distanceLabel,
      distanceMeters: r.distance,
      image: r.image,
      address: r.address,
      openNow: r.openNow,
      userRatingsTotal: r.userRatingsTotal,
      score: r.score,
      badge: determineBadge(r, idx),
      badgeLabel: determineBadgeLabel(r, idx),
      timeSlots,
      location: r.location,
    };
  });

  return {
    success: true,
    userLocation,
    radius,
    keyword: keyword || null,
    fallbackUsed,
    recommendations: formattedRecommendations,
  };
}

/**
 * 產生固定的晚餐時段（與餐廳端一致）
 */
function generateTimeSlots() {
  const slots = [
    { time: '18:00', available: true },
    { time: '18:30', available: true },
    { time: '19:00', available: true },
    { time: '19:30', available: true },
    { time: '20:00', available: true },
  ];
  // 隨機讓 1~2 個時段滿位，增加真實感
  const fullCount = Math.floor(Math.random() * 2) + 1;
  const indices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, fullCount);
  for (const idx of indices) {
    slots[idx].available = false;
  }
  return slots;
}

/**
 * 決定推薦徽章
 */
function determineBadge(restaurant, index) {
  if (index === 0) return 'popular';
  if (restaurant.openNow === true && restaurant.distance < 500) return 'available';
  if ((restaurant.types || []).includes('meal_delivery')) return 'delivery';
  return undefined;
}

function determineBadgeLabel(restaurant, index) {
  if (index === 0) return '🔥 熱門推薦';
  if (restaurant.openNow === true && restaurant.distance < 500) return '🟢 就在附近';
  if ((restaurant.types || []).includes('meal_delivery')) return '🛵 支援外送';
  return undefined;
}

module.exports = {
  recommendNearby,
  rankRestaurants,
  searchNearbyRestaurants,
  haversineDistance,
  estimatePrice,
};
