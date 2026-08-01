/**
 * AI 菜單生成服務
 *
 * 使用 Groq LLM 根據餐廳名稱、料理類型、價位等資訊
 * 智慧生成合理的菜單品項（含品名、價格、熱量估算）
 * 帶有 in-memory cache，同一間餐廳不重複呼叫 LLM
 */

const { callFastModel } = require('./llmGateway');

/**
 * In-memory cache
 * key: restaurantId (placeId)
 * value: { items: MenuItem[], generatedAt: timestamp }
 */
const menuCache = new Map();

// Cache 過期時間：30 分鐘
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * 產生菜單的 system prompt
 */
const SYSTEM_PROMPT = `你是一個餐廳菜單生成助手。根據提供的餐廳資訊，生成該餐廳最可能提供的招牌菜品。

規則：
1. 生成 5 道菜品，必須符合該餐廳的料理類型和價位
2. 每道菜品包含：name（菜名）、price（價格，新台幣整數）、calories（估算熱量 kcal，整數）
3. 價格必須合理，符合提供的人均價位範圍
4. 熱量必須基於常見份量合理估算
5. 菜名必須使用繁體中文
6. 必須回傳合法 JSON 格式

回傳格式（嚴格遵守）：
{
  "items": [
    { "name": "菜品名稱", "price": 280, "calories": 450 },
    ...
  ]
}`;

/**
 * 根據餐廳資訊生成菜單
 *
 * @param {Object} params
 * @param {string} params.restaurantId - 餐廳 ID (placeId)，用於 cache key
 * @param {string} params.name - 餐廳名稱
 * @param {string} params.tag - 料理類型標籤（如 "日式拉麵"、"火鍋"）
 * @param {number} params.priceAvg - 人均消費（新台幣）
 * @param {number} [params.priceMin] - 最低價位
 * @param {number} [params.priceMax] - 最高價位
 * @returns {Promise<{items: Array<{name: string, price: number, calories: number}>}>}
 */
async function generateMenu({ restaurantId, name, tag, priceAvg, priceMin, priceMax }) {
  // 先查 cache
  if (restaurantId && menuCache.has(restaurantId)) {
    const cached = menuCache.get(restaurantId);
    if (Date.now() - cached.generatedAt < CACHE_TTL_MS) {
      return { items: cached.items, fromCache: true };
    }
    // 過期了，移除
    menuCache.delete(restaurantId);
  }

  // 組裝 user prompt
  const userPrompt = buildUserPrompt({ name, tag, priceAvg, priceMin, priceMax });

  // 呼叫 LLM
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  const rawContent = await callFastModel(messages);

  // Parse 回傳
  const menuData = parseMenuResponse(rawContent);

  if (!menuData || !menuData.items || menuData.items.length === 0) {
    // LLM 回傳格式不正確，使用 fallback
    const fallbackItems = generateFallbackMenu({ tag, priceAvg });
    return { items: fallbackItems, fromCache: false, fallback: true };
  }

  // 驗證 & 清理每個 item
  const cleanedItems = menuData.items
    .filter((item) => item.name && typeof item.price === 'number' && typeof item.calories === 'number')
    .slice(0, 5)
    .map((item) => ({
      name: String(item.name).trim(),
      price: Math.round(Math.max(0, item.price)),
      calories: Math.round(Math.max(0, item.calories)),
    }));

  if (cleanedItems.length === 0) {
    const fallbackItems = generateFallbackMenu({ tag, priceAvg });
    return { items: fallbackItems, fromCache: false, fallback: true };
  }

  // 存入 cache
  if (restaurantId) {
    menuCache.set(restaurantId, {
      items: cleanedItems,
      generatedAt: Date.now(),
    });
  }

  return { items: cleanedItems, fromCache: false, fallback: false };
}

/**
 * 組裝 user prompt
 */
function buildUserPrompt({ name, tag, priceAvg, priceMin, priceMax }) {
  let prompt = `請為以下餐廳生成菜單：\n`;
  prompt += `餐廳名稱：${name}\n`;
  prompt += `料理類型：${tag}\n`;
  prompt += `人均消費：約 NT$${priceAvg}\n`;

  if (priceMin && priceMax) {
    prompt += `價位範圍：NT$${priceMin} ~ NT$${priceMax}\n`;
  }

  prompt += `\n請生成 5 道最具代表性的招牌菜品，每道菜的單價應在人均消費的 30%~80% 之間。`;

  return prompt;
}

/**
 * 解析 LLM 回傳的 JSON
 */
function parseMenuResponse(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(rawContent.trim());
    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }
    // 有些 LLM 直接回 array
    if (Array.isArray(parsed)) {
      return { items: parsed };
    }
    return null;
  } catch (e) {
    // 嘗試從內容中提取 JSON
    const jsonMatch = rawContent.match(/\{[\s\S]*"items"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Fallback 菜單：當 LLM 失敗時，根據料理類型產生合理的預設菜單
 */
function generateFallbackMenu({ tag, priceAvg }) {
  const avg = priceAvg || 350;

  const menus = {
    '日式拉麵': [
      { name: '招牌豚骨拉麵', price: Math.round(avg * 0.6), calories: 650 },
      { name: '味噌叉燒拉麵', price: Math.round(avg * 0.7), calories: 720 },
      { name: '醬油拉麵', price: Math.round(avg * 0.5), calories: 580 },
      { name: '煎餃（6入）', price: Math.round(avg * 0.3), calories: 320 },
      { name: '唐揚雞', price: Math.round(avg * 0.35), calories: 380 },
    ],
    '火鍋': [
      { name: '經典麻辣鍋底', price: Math.round(avg * 0.4), calories: 200 },
      { name: '特選牛肉盤', price: Math.round(avg * 0.5), calories: 450 },
      { name: '綜合海鮮盤', price: Math.round(avg * 0.55), calories: 320 },
      { name: '手工豆腐', price: Math.round(avg * 0.2), calories: 180 },
      { name: '蔬菜拼盤', price: Math.round(avg * 0.25), calories: 120 },
    ],
    '咖啡廳': [
      { name: '拿鐵咖啡', price: Math.round(avg * 0.4), calories: 180 },
      { name: '手沖精品咖啡', price: Math.round(avg * 0.5), calories: 10 },
      { name: '可頌三明治', price: Math.round(avg * 0.55), calories: 420 },
      { name: '提拉米蘇', price: Math.round(avg * 0.45), calories: 350 },
      { name: '水果鬆餅', price: Math.round(avg * 0.6), calories: 480 },
    ],
    '日本料理': [
      { name: '綜合生魚片', price: Math.round(avg * 0.6), calories: 280 },
      { name: '鮭魚握壽司（3貫）', price: Math.round(avg * 0.45), calories: 240 },
      { name: '天婦羅定食', price: Math.round(avg * 0.7), calories: 580 },
      { name: '味噌湯', price: Math.round(avg * 0.2), calories: 80 },
      { name: '茶碗蒸', price: Math.round(avg * 0.25), calories: 120 },
    ],
    '韓式料理': [
      { name: '石鍋拌飯', price: Math.round(avg * 0.5), calories: 550 },
      { name: '韓式炸雞', price: Math.round(avg * 0.6), calories: 650 },
      { name: '海鮮煎餅', price: Math.round(avg * 0.45), calories: 420 },
      { name: '泡菜鍋', price: Math.round(avg * 0.55), calories: 380 },
      { name: '辣炒年糕', price: Math.round(avg * 0.35), calories: 450 },
    ],
  };

  // 嘗試匹配已知類型
  for (const [key, items] of Object.entries(menus)) {
    if (tag && tag.includes(key)) {
      return items;
    }
  }

  // 通用 fallback
  return [
    { name: '主廚推薦套餐', price: Math.round(avg * 0.7), calories: 650 },
    { name: '招牌特餐', price: Math.round(avg * 0.6), calories: 550 },
    { name: '季節限定料理', price: Math.round(avg * 0.65), calories: 480 },
    { name: '經典小品', price: Math.round(avg * 0.35), calories: 280 },
    { name: '主廚湯品', price: Math.round(avg * 0.25), calories: 150 },
  ];
}

/**
 * 清除指定餐廳的 cache（用於測試或手動刷新）
 */
function clearCache(restaurantId) {
  if (restaurantId) {
    menuCache.delete(restaurantId);
  } else {
    menuCache.clear();
  }
}

/**
 * 取得目前 cache 大小
 */
function getCacheSize() {
  return menuCache.size;
}

module.exports = {
  generateMenu,
  clearCache,
  getCacheSize,
  generateFallbackMenu,
  parseMenuResponse,
};
