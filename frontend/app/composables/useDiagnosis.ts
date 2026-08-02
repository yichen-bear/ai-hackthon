export interface DiagnosisCause {
  name: string
  probability: number
  description: string
}

export interface DiagnosisResult {
  symptoms: string
  causes: DiagnosisCause[]
  department: string
  departmentAlternatives: string[]
  advice: string
  severity: 'low' | 'medium' | 'high'
  disclaimer: string
}

export interface ClinicInfo {
  id: string
  name: string
  department: string
  distance: string
  hours: { morning: string | null; afternoon: string | null; evening: string | null }
  availableSlots: string[]
}

export interface AppointmentData {
  feedbackNo: string
  createdAt: string
  symptoms: string | null
  department: string | null
  clinicName: string | null
  appointmentTime: string | null
  visitType: string | null
  patientName: string | null
  phone: string | null
  nationalIdMasked: string
}

export interface AppointmentPayload {
  symptoms: string
  department: string
  clinicName: string
  appointmentTime: string
  visitType: string
  patientName: string
  phone: string
  nationalId: string
}

export function useDiagnosis() {
  const diagnosisResult = ref<DiagnosisResult | null>(null)
  const clinics = ref<ClinicInfo[]>([])
  const latestAppointment = ref<AppointmentData | null>(null)
  const analyzing = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const { apiFetch } = useApi()

  async function analyzeSymptoms(symptoms: string) {
    analyzing.value = true
    error.value = null
    diagnosisResult.value = null
    try {
      const json = await apiFetch<{ success: boolean; data: DiagnosisResult; message?: string }>('/api/diagnosis/analyze', {
        method: 'POST',
        body: { symptoms },
      })
      if (json.success) {
        diagnosisResult.value = json.data
      } else {
        error.value = json.message || 'AI 分析失敗'
      }
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '網路錯誤'
    } finally {
      analyzing.value = false
    }
  }

  async function fetchClinics(department?: string) {
    try {
      const params: Record<string, string> = {}
      if (department) params.department = department
      const json = await apiFetch<{ success: boolean; data: ClinicInfo[] }>('/api/diagnosis/clinics', { params })
      if (json.success) {
        clinics.value = json.data
      }
    } catch (e: any) {
      console.error('fetchClinics error:', e.message)
    }
  }

  async function submitAppointment(payload: AppointmentPayload) {
    submitting.value = true
    error.value = null
    try {
      const json = await apiFetch<{ success: boolean; data: any; message?: string }>('/api/diagnosis/appointment', {
        method: 'POST',
        body: payload,
      })
      if (json.success) {
        return json.data
      } else {
        error.value = json.message || '掛號失敗'
        return null
      }
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '網路錯誤'
      return null
    } finally {
      submitting.value = false
    }
  }

  async function fetchLatestAppointment() {
    try {
      const json = await apiFetch<{ success: boolean; data: AppointmentData }>('/api/diagnosis/latest-appointment')
      if (json.success) {
        latestAppointment.value = json.data
      }
    } catch (e: any) {
      console.error('fetchLatestAppointment error:', e.message)
    }
  }

  return {
    diagnosisResult,
    clinics,
    latestAppointment,
    analyzing,
    submitting,
    error,
    analyzeSymptoms,
    fetchClinics,
    submitAppointment,
    fetchLatestAppointment,
  }
}
