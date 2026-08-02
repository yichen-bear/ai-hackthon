export interface FormOption {
  id: number
  optionName: string
  unitPrice: number | null
  isQuantity: string | null
  minQuantity: number | null
  maxQuantity: number | null
  sort: number
  feature: Record<string, any> | null
}

export interface FormTopic {
  id: number
  type: string
  title: string
  remark: string | null
  isRequired: string
  sort: number
  feature: Record<string, any> | null
  options: FormOption[]
}

export interface FormGroup {
  id: number
  name: string
  sort: number
  feature: Record<string, any> | null
  topics: FormTopic[]
}

export interface FormData {
  id: number
  name: string
  type: string
  subType: string
  introContent: string | null
  noticeContent: string | null
  termsContent: string | null
  feature: Record<string, any> | null
  groups: FormGroup[]
}

export interface FeedbackAnswer {
  topicId: number
  optionIds: number[]
  value: string | null
}

export interface FeedbackPayload {
  feedbackContent: { answers: FeedbackAnswer[] }
  contactName?: string
  contactMobile?: string
  contactEmail?: string
  description?: string
}

export function useFormApi() {
  const formData = ref<FormData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const submitting = ref(false)
  const submitSuccess = ref(false)
  const { apiFetch } = useApi()

  async function fetchForm(formId: number) {
    loading.value = true
    error.value = null
    try {
      const json = await apiFetch<{ success: boolean; data: FormData; message?: string }>(`/api/forms/${formId}`)
      if (json.success) {
        formData.value = json.data
      } else {
        error.value = json.message || '載入表單失敗'
      }
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '網路錯誤'
    } finally {
      loading.value = false
    }
  }

  async function submitFeedback(formId: number, payload: FeedbackPayload) {
    submitting.value = true
    submitSuccess.value = false
    error.value = null
    try {
      const json = await apiFetch<{ success: boolean; message?: string }>(`/api/forms/${formId}/feedback`, {
        method: 'POST',
        body: payload,
      })
      if (json.success) {
        submitSuccess.value = true
      } else {
        error.value = json.message || '送出失敗'
      }
      return json
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '網路錯誤'
      return { success: false, message: error.value }
    } finally {
      submitting.value = false
    }
  }

  return {
    formData,
    loading,
    error,
    submitting,
    submitSuccess,
    fetchForm,
    submitFeedback,
  }
}
