export interface WaterData {
  weight: number | null
  dailyTarget: number | null
  bottleCapacity: number | null
  cupsPerDay: number | null
}

export interface SupplementData {
  name: string | null
  frequency: string | null
  timing: string | null
  alarm: string | null
}

export interface HealthTrackerData {
  feedbackNo: string
  updatedAt: string
  water: WaterData
  supplement: SupplementData
}

export interface WaterLogData {
  date: string
  intake: number
}

export function useHealthTracker() {
  const data = ref<HealthTrackerData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { apiFetch } = useApi()

  // 每日飲水進度
  const waterLog = ref<WaterLogData>({ date: '', intake: 0 })
  const waterLogLoading = ref(false)

  /** 取得最新飲水/保健品設定 */
  async function fetchLatest() {
    loading.value = true
    error.value = null
    try {
      const json = await apiFetch<{ success: boolean; data: HealthTrackerData; message?: string }>('/api/health-tracker/latest')
      if (json.success) {
        data.value = json.data
      } else {
        error.value = json.message || '載入失敗'
      }
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '網路錯誤'
    } finally {
      loading.value = false
    }
  }

  /** 儲存飲水/保健品設定 (手動或 AI) */
  async function saveData(payload: { water?: Partial<WaterData>; supplement?: Partial<SupplementData> }) {
    try {
      const json = await apiFetch<{ success: boolean; message?: string }>('/api/health-tracker/save', {
        method: 'POST',
        body: payload,
      })
      if (json.success) {
        await fetchLatest() // 重新載入最新資料
      }
      return json
    } catch (e: any) {
      return { success: false, message: e?.message }
    }
  }

  /** 取得今日飲水進度 */
  async function fetchTodayWaterLog() {
    waterLogLoading.value = true
    try {
      const json = await apiFetch<{ success: boolean; data: WaterLogData }>('/api/health-tracker/water-log/today')
      if (json.success) {
        waterLog.value = json.data
      }
    } catch (e: any) {
      console.error('fetchTodayWaterLog error:', e?.message)
    } finally {
      waterLogLoading.value = false
    }
  }

  /** 新增飲水量 (累加) */
  async function addWaterIntake(amount: number) {
    try {
      const json = await apiFetch<{ success: boolean; data: WaterLogData }>('/api/health-tracker/water-log', {
        method: 'POST',
        body: { amount },
      })
      if (json.success) {
        waterLog.value = json.data
      }
      return json
    } catch (e: any) {
      return { success: false, message: e?.message }
    }
  }

  /** 歸零今日飲水量 */
  async function resetWaterLog() {
    try {
      const json = await apiFetch<{ success: boolean; data: WaterLogData }>('/api/health-tracker/water-log/reset', {
        method: 'POST',
      })
      if (json.success) {
        waterLog.value = json.data
      }
      return json
    } catch (e: any) {
      return { success: false, message: e?.message }
    }
  }

  return {
    data,
    loading,
    error,
    waterLog,
    waterLogLoading,
    fetchLatest,
    saveData,
    fetchTodayWaterLog,
    addWaterIntake,
    resetWaterLog,
  }
}
