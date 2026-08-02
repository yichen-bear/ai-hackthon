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

export function useHealthTracker() {
  const data = ref<HealthTrackerData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { apiFetch } = useApi()

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

  return {
    data,
    loading,
    error,
    fetchLatest,
    saveData,
  }
}
