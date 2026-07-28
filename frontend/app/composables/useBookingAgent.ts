/**
 * useBookingAgent - AI Agent 推薦邏輯封裝
 * 分析用戶輸入關鍵字，返回預模組商品推薦結果
 * 供全站 AI Agent 呼叫，不建立獨立元件
 */

import type { BookingRecommendation, RecommendedProduct } from './useBookingState'

interface KeywordRule {
  keywords: string[]
  channel: 'preorder' | 'groupbuy'
  message: string
  products: RecommendedProduct[]
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ['衛生紙', '洗衣精', '日用品', '箱購', '補貨', '洗碗精', '垃圾袋', '牙膏', '洗髮精'],
    channel: 'groupbuy',
    message: '看起來您需要補充日用品，推薦 i划算 的箱購優惠！',
    products: [
      { id: 'gb-1', name: '舒潔衛生紙 72包/箱', price: 699, channel: 'groupbuy' },
      { id: 'gb-2', name: '白蘭洗衣精 4瓶裝', price: 389, channel: 'groupbuy' },
    ],
  },
  {
    keywords: ['團購', '揪團', '辦公室', '同事', '一起買', '公司'],
    channel: 'groupbuy',
    message: '揪團更划算！推薦 i划算 的社群團購，門市取貨超方便。',
    products: [
      { id: 'gb-4', name: '可口可樂 24罐裝', price: 299, channel: 'groupbuy' },
      { id: 'gb-1', name: '舒潔衛生紙 72包/箱', price: 699, channel: 'groupbuy' },
    ],
  },
  {
    keywords: ['禮盒', '送禮', '節慶', '中秋', '過年', '限量', '伴手禮', '年節', '端午'],
    channel: 'preorder',
    message: '送禮首選！推薦 i預購 的精選禮盒，提早預購享優惠。',
    products: [
      { id: 'po-1', name: '中秋限定鳳梨酥禮盒', price: 580, channel: 'preorder' },
      { id: 'po-2', name: '微熱山丘蘋果酥禮盒', price: 380, channel: 'preorder' },
    ],
  },
  {
    keywords: ['名店', '蛋糕', '甜點', '美食', '排隊', '網紅'],
    channel: 'preorder',
    message: '免排隊！i預購 名店美食直接預購，到店取貨。',
    products: [
      { id: 'po-2', name: '微熱山丘蘋果酥禮盒', price: 380, channel: 'preorder' },
      { id: 'po-3', name: '星巴克聯名咖啡禮盒', price: 999, channel: 'preorder' },
    ],
  },
]

const DEFAULT_RECOMMENDATION: BookingRecommendation = {
  channel: 'preorder',
  message: '為您精選熱門商品，限時優惠別錯過！',
  products: [
    { id: 'po-1', name: '中秋限定鳳梨酥禮盒', price: 580, channel: 'preorder' },
    { id: 'gb-4', name: '可口可樂 24罐裝', price: 299, channel: 'groupbuy' },
  ],
  keywords: [],
}

/**
 * 分析用戶輸入關鍵字，返回推薦結果
 * 保證任何輸入都返回有效 BookingRecommendation
 */
export function matchKeywords(input: string): BookingRecommendation {
  if (!input || input.trim().length === 0) {
    return { ...DEFAULT_RECOMMENDATION }
  }

  const normalizedInput = input.toLowerCase().trim()

  for (const rule of KEYWORD_RULES) {
    const matchedKeywords = rule.keywords.filter((kw) => normalizedInput.includes(kw))
    if (matchedKeywords.length > 0) {
      return {
        channel: rule.channel,
        message: rule.message,
        products: rule.products.slice(0, 3),
        keywords: matchedKeywords,
      }
    }
  }

  // 無匹配：返回預設推薦
  return { ...DEFAULT_RECOMMENDATION }
}

export function useBookingAgent() {
  return {
    matchKeywords,
  }
}
