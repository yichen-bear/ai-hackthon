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

const API_BASE = 'http://localhost:3001/api'

export function useHealthTracker() {
  const data = ref<HealthTrackerData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLatest() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/health-tracker/latest`)
      const json = await res.json()
      if (json.success) {
        data.value = json.data
      } else {
        error.value = json.message || '載入失敗'
      }
    } catch (e: any) {
      error.value = e.message || '網路錯誤'
    } finally {
      loading.value = false
    }
  }

  async function saveData(payload: { water?: Partial<WaterData>; supplement?: Partial<SupplementData> }) {
    try {
      const res = await fetch(`${API_BASE}/health-tracker/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        await fetchLatest() // 重新載入最新資料
      }
      return json
    } catch (e: any) {
      return { success: false, message: e.message }
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
