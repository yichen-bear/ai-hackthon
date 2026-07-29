/**
 * 樂模組 AI Agent 情境意圖匹配推薦邏輯
 * 供全站 AI Agent 呼叫，分析用戶輸入並返回娛樂推薦
 */

import type { EntertainmentRecommendation, RecommendScenario, RecommendedEvent } from '~/types/entertainment'

// 意圖匹配規則
const INTENT_RULES: { pattern: RegExp; scenario: RecommendScenario; message: string }[] = [
  {
    pattern: /約會|另一半|浪漫|情侶|紀念日/,
    scenario: 'date',
    message: '浪漫約會推薦！這些展覽和演出很適合兩個人一起看。',
  },
  {
    pattern: /小孩|親子|家庭|帶孩子|兒童|全家/,
    scenario: 'family',
    message: '親子同樂首選！推薦適合全家大小的體驗活動。',
  },
  {
    pattern: /朋友|聚會|一群人|同事|慶祝|揪團/,
    scenario: 'friends',
    message: '呼朋引伴一起嗨！這些活動很適合約朋友一起參加。',
  },
  {
    pattern: /週末|放假|出去玩|無聊|休息|散步|走走/,
    scenario: 'weekend',
    message: '週末想出去走走？為你推薦這些熱門活動！',
  },
]

// 各情境的預設推薦活動
const SCENARIO_EVENTS: Record<RecommendScenario, RecommendedEvent[]> = {
  weekend: [
    { id: 'evt-3', type: 'exhibition', title: 'teamLab 未來遊樂園', date: '2026-08-01', venue: '國立臺灣科學教育館', price: '$380 起', coverImage: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { id: 'evt-1', type: 'baseball', title: '統一獅 vs 中信兄弟', date: '2026-08-02', venue: '台南亞太棒球中心', price: '$300 起', coverImage: 'linear-gradient(135deg, #f59e0b, #ea580c)' },
    { id: 'exp-1', type: 'experience', title: '星巴克咖啡拉花教室', date: '2026-08-10', venue: '星巴克典藏門市', price: '$450', coverImage: 'linear-gradient(135deg, #10b981, #059669)' },
  ],
  date: [
    { id: 'evt-3', type: 'exhibition', title: 'teamLab 未來遊樂園', date: '2026-08-01', venue: '國立臺灣科學教育館', price: '$380 起', coverImage: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { id: 'evt-5', type: 'theater', title: '《小王子》音樂劇', date: '2026-09-06', venue: '國家兩廳院', price: '$800 起', coverImage: 'linear-gradient(135deg, #f472b6, #ec4899)' },
    { id: 'evt-4', type: 'concert', title: '告五人巡迴演唱會', date: '2026-08-23', venue: '台北小巨蛋', price: '$1,200 起', coverImage: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  ],
  family: [
    { id: 'evt-3', type: 'exhibition', title: 'teamLab 未來遊樂園', date: '2026-08-01', venue: '國立臺灣科學教育館', price: '$380 起', coverImage: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { id: 'exp-2', type: 'experience', title: '7-11 手作甜點體驗', date: '2026-08-17', venue: '7-11 信義旗艦店', price: '$350', coverImage: 'linear-gradient(135deg, #f472b6, #ec4899)' },
    { id: 'evt-5', type: 'theater', title: '《小王子》音樂劇', date: '2026-09-06', venue: '國家兩廳院', price: '$800 起', coverImage: 'linear-gradient(135deg, #f472b6, #ec4899)' },
  ],
  friends: [
    { id: 'evt-1', type: 'baseball', title: '統一獅 vs 中信兄弟', date: '2026-08-02', venue: '台南亞太棒球中心', price: '$300 起', coverImage: 'linear-gradient(135deg, #f59e0b, #ea580c)' },
    { id: 'evt-4', type: 'concert', title: '告五人巡迴演唱會', date: '2026-08-23', venue: '台北小巨蛋', price: '$1,200 起', coverImage: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { id: 'exp-1', type: 'experience', title: '星巴克咖啡拉花教室', date: '2026-08-10', venue: '星巴克典藏門市', price: '$450', coverImage: 'linear-gradient(135deg, #10b981, #059669)' },
  ],
}

/**
 * 分析用戶輸入意圖，返回娛樂推薦結果（standalone export for testing）
 */
export function matchIntent(input: string): EntertainmentRecommendation {
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(input)) {
      return {
        scenario: rule.scenario,
        message: rule.message,
        events: SCENARIO_EVENTS[rule.scenario],
        triggerText: input,
      }
    }
  }

  return {
    scenario: 'weekend',
    message: '為你推薦近期熱門活動！',
    events: SCENARIO_EVENTS.weekend,
    triggerText: input || undefined,
  }
}

export function useEntertainmentAgent() {
  return {
    matchIntent,
  }
}
