/**
 * 碳排放計算純函數
 * 用於 CarbonTracker 元件與 RoutePlanner 路線碳排標示
 */

/** 交通方式類型 */
export type TransportMode = 'bus' | 'metro' | 'hsr' | 'train' | 'car' | 'motorcycle' | 'walk'

/**
 * 碳排放係數（每公里 g CO₂）
 * 資料來源：台灣環保署碳排放參考值
 */
const EMISSION_FACTORS: Record<TransportMode, number> = {
  car: 170,           // 汽車/叫車
  motorcycle: 103,    // 機車
  bus: 68,            // 公車
  metro: 35,          // 捷運
  train: 41,          // 台鐵
  hsr: 28,            // 高鐵
  walk: 0,            // 步行/單車
}

/**
 * 根據交通方式與距離計算碳排放量
 * @param mode 交通方式
 * @param distanceKm 距離（公里），必須 ≥ 0
 * @returns 碳排放量（g CO₂），始終 ≥ 0
 */
export function calculateEmission(mode: TransportMode, distanceKm: number): number {
  const safeDistance = isNaN(distanceKm) ? 0 : Math.max(0, distanceKm)
  const factor = EMISSION_FACTORS[mode] ?? 0
  return factor * safeDistance
}

/**
 * 計算碳排放進度百分比（clamp 0~100）
 * @param total 當前碳排放量（kg CO₂）
 * @param goal 目標碳排放量（kg CO₂），必須 > 0
 * @returns percentage（0~100）與 overLimit 旗標
 */
export function calculateCarbonProgress(
  total: number,
  goal: number
): { percentage: number; overLimit: boolean } {
  const safeTotal = isNaN(total) ? 0 : Math.max(0, total)
  const safeGoal = isNaN(goal) || goal <= 0 ? 1 : goal

  const raw = (safeTotal / safeGoal) * 100
  const percentage = Math.min(100, Math.max(0, raw))
  const overLimit = safeTotal > safeGoal

  return { percentage, overLimit }
}

/**
 * 取得碳排放係數表（供外部顯示用）
 */
export function getEmissionFactors(): Record<TransportMode, number> {
  return { ...EMISSION_FACTORS }
}
