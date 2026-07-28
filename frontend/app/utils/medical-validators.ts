/**
 * 醫療模組共用純邏輯函數
 * Medical Module shared pure logic functions
 */

// --- 型別定義 ---

export interface AppointmentFormInput {
  name: string
  phone: string
  condition: string
}

export interface AppointmentFormErrors {
  name?: string
  phone?: string
  condition?: string
}

export interface AppointmentFormResult {
  valid: boolean
  errors: AppointmentFormErrors
}

export interface PrescriptionFileInput {
  type: string
  size: number
}

export interface PrescriptionFileResult {
  valid: boolean
  error?: string
}

export interface WaterProgressResult {
  percentage: number
  overLimit: boolean
}

// --- 常數 ---

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic'] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// --- 函數實作 ---

/**
 * 驗證預約掛號表單
 * Validates: Requirements 4.5, 4.6
 */
export function validateAppointmentForm({ name, phone, condition }: AppointmentFormInput): AppointmentFormResult {
  const errors: AppointmentFormErrors = {}

  const trimmedName = name.trim()
  if (trimmedName.length < 1 || trimmedName.length > 50) {
    errors.name = '姓名為必填，長度 1-50 字元'
  }

  if (!/^\d{7,15}$/.test(phone)) {
    errors.phone = '電話為必填，7-15 位數字'
  }

  const trimmedCondition = condition.trim()
  if (trimmedCondition.length < 1 || trimmedCondition.length > 200) {
    errors.condition = '症狀描述為必填，長度 1-200 字元'
  }

  const valid = Object.keys(errors).length === 0

  return { valid, errors }
}

/**
 * 驗證處方箋上傳檔案
 * Validates: Requirements 6.1
 */
export function validatePrescriptionFile(file: PrescriptionFileInput): PrescriptionFileResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return { valid: false, error: '僅支援 JPEG、PNG、HEIC 格式' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '檔案大小不可超過 10MB' }
  }

  return { valid: true }
}

/**
 * 計算飲水量進度百分比
 * Validates: Requirements 5.1, 5.5
 */
export function calculateWaterProgress(intake: number, goal: number): WaterProgressResult {
  const percentage = Math.min(100, Math.max(0, (intake / goal) * 100))
  const overLimit = intake > goal

  return { percentage, overLimit }
}

/**
 * 篩選並排序醫療設施列表
 * Validates: Requirements 3.3, 3.4, 3.8
 */
export function filterFacilities<T extends { distance: number }>(facilities: T[], maxCount: number = 20): T[] {
  const sorted = [...facilities].sort((a, b) => a.distance - b.distance)
  return sorted.slice(0, maxCount)
}

/**
 * 藥物名稱搜尋
 * Validates: Requirements 6.3
 */
export function searchDrugs<T extends { name: string }>(keyword: string, database: T[], maxResults: number = 10): T[] {
  if (keyword === '') {
    return []
  }

  const lowerKeyword = keyword.toLowerCase()
  const matched = database.filter(drug => drug.name.toLowerCase().includes(lowerKeyword))

  return matched.slice(0, maxResults)
}

/**
 * 送藥追蹤階段狀態判定
 * Validates: Requirements 7.3
 */
export function getDeliveryStageStatus(currentStage: number, stageIndex: number): 'done' | 'current' | 'pending' {
  if (stageIndex < currentStage) {
    return 'done'
  }
  if (stageIndex === currentStage) {
    return 'current'
  }
  return 'pending'
}
