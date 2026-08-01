<script setup lang="ts">
import { useFormApi } from '~/composables/useFormApi'
import type { FeedbackAnswer } from '~/composables/useFormApi'

const { formData, loading, error, submitting, submitSuccess, fetchForm, submitFeedback } = useFormApi()

// 答案狀態：key = topicId
const answers = ref<Record<number, { optionIds: number[]; value: string | null }>>({})

// 聯絡資訊
const contactName = ref('')
const contactMobile = ref('')
const contactEmail = ref('')
const description = ref('')

onMounted(() => {
  fetchForm(1010)
})

// 初始化答案（表單載入後）
watch(() => formData.value, (form) => {
  if (!form) return
  for (const group of form.groups) {
    for (const topic of group.topics) {
      if (!answers.value[topic.id]) {
        answers.value[topic.id] = { optionIds: [], value: null }
      }
    }
  }
})

// 單選處理
function handleSingleSelect(topicId: number, optionId: number) {
  answers.value[topicId] = { optionIds: [optionId], value: null }
}

// 多選處理
function handleMultiSelect(topicId: number, optionId: number, checked: boolean) {
  const current = answers.value[topicId]?.optionIds || []
  if (checked) {
    answers.value[topicId] = { optionIds: [...current, optionId], value: null }
  } else {
    answers.value[topicId] = { optionIds: current.filter(id => id !== optionId), value: null }
  }
}

// 文字/日期/數字 輸入處理
function handleValueInput(topicId: number, value: string) {
  answers.value[topicId] = { optionIds: [], value }
}

// 送出表單
async function handleSubmit() {
  const feedbackAnswers: FeedbackAnswer[] = Object.entries(answers.value).map(([topicId, ans]) => ({
    topicId: Number(topicId),
    optionIds: ans.optionIds,
    value: ans.value,
  }))

  await submitFeedback(1010, {
    feedbackContent: { answers: feedbackAnswers },
    contactName: contactName.value || undefined,
    contactMobile: contactMobile.value || undefined,
    contactEmail: contactEmail.value || undefined,
    description: description.value || undefined,
  })
}

// 題目類型對應
function getTopicInputType(type: string): string {
  switch (type) {
    case '01': return 'radio'
    case '02': return 'checkbox'
    case '03': return 'text'
    case '04': return 'date'
    case '05': return 'number'
    case '06': return 'textarea'
    default: return 'text'
  }
}
</script>

<template>
  <div class="booking-form-module">
    <main class="booking-form-page" role="main">

      <!-- Loading 狀態 -->
      <div v-if="loading" class="bf-loading">
        <div class="bf-loading__spinner" />
        <p class="bf-loading__text">載入表單中...</p>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else-if="error && !formData" class="bf-error-card">
        <p class="bf-error-card__text">{{ error }}</p>
      </div>

      <!-- 送出成功 -->
      <div v-else-if="submitSuccess" class="bf-success-card">
        <span class="bf-success-card__icon">✅</span>
        <h2 class="bf-success-card__title">表單已送出</h2>
        <p class="bf-success-card__desc">感謝您的填寫，我們會盡快與您聯繫！</p>
        <NuxtLink to="/food" class="bf-success-card__link">返回食模組</NuxtLink>
      </div>

      <!-- 表單主體 -->
      <template v-else-if="formData">
        <!-- 表單標題 -->
        <div class="bf-header-card">
          <h1 class="bf-header-card__title">{{ formData.name }}</h1>
          <p v-if="formData.introContent" class="bf-header-card__intro">{{ formData.introContent }}</p>
          <p v-if="formData.noticeContent" class="bf-header-card__notice">⚠️ {{ formData.noticeContent }}</p>
        </div>

        <!-- 群組與題目 -->
        <div
          v-for="group in formData.groups"
          :key="group.id"
          class="bf-group-card"
        >
          <h2 class="bf-group-card__title">{{ group.name }}</h2>

          <div
            v-for="topic in group.topics"
            :key="topic.id"
            class="bf-topic"
          >
            <label class="bf-topic__label">
              {{ topic.title }}
              <span v-if="topic.isRequired === '1'" class="bf-topic__required">*</span>
            </label>
            <p v-if="topic.remark" class="bf-topic__remark">{{ topic.remark }}</p>

            <!-- 單選 (radio) -->
            <div v-if="getTopicInputType(topic.type) === 'radio'" class="bf-topic__options">
              <label
                v-for="option in topic.options"
                :key="option.id"
                class="bf-option bf-option--radio"
                :class="{ 'bf-option--selected': answers[topic.id]?.optionIds.includes(option.id) }"
              >
                <input
                  type="radio"
                  :name="`topic-${topic.id}`"
                  :value="option.id"
                  :checked="answers[topic.id]?.optionIds.includes(option.id)"
                  class="bf-option__input"
                  @change="handleSingleSelect(topic.id, option.id)"
                />
                <span class="bf-option__text">{{ option.optionName }}</span>
                <span v-if="option.unitPrice != null" class="bf-option__price">${{ option.unitPrice }}</span>
              </label>
            </div>

            <!-- 多選 (checkbox) -->
            <div v-else-if="getTopicInputType(topic.type) === 'checkbox'" class="bf-topic__options">
              <label
                v-for="option in topic.options"
                :key="option.id"
                class="bf-option bf-option--checkbox"
                :class="{ 'bf-option--selected': answers[topic.id]?.optionIds.includes(option.id) }"
              >
                <input
                  type="checkbox"
                  :value="option.id"
                  :checked="answers[topic.id]?.optionIds.includes(option.id)"
                  class="bf-option__input"
                  @change="handleMultiSelect(topic.id, option.id, ($event.target as HTMLInputElement).checked)"
                />
                <span class="bf-option__text">{{ option.optionName }}</span>
                <span v-if="option.unitPrice != null" class="bf-option__price">${{ option.unitPrice }}</span>
              </label>
            </div>

            <!-- 文字輸入 -->
            <input
              v-else-if="getTopicInputType(topic.type) === 'text'"
              type="text"
              class="bf-topic__text-input"
              :placeholder="topic.remark || '請輸入'"
              :value="answers[topic.id]?.value || ''"
              @input="handleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
            />

            <!-- 日期 -->
            <input
              v-else-if="getTopicInputType(topic.type) === 'date'"
              type="date"
              class="bf-topic__text-input"
              :value="answers[topic.id]?.value || ''"
              @input="handleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
            />

            <!-- 數字 -->
            <input
              v-else-if="getTopicInputType(topic.type) === 'number'"
              type="number"
              class="bf-topic__text-input"
              :placeholder="topic.remark || '請輸入數字'"
              :value="answers[topic.id]?.value || ''"
              @input="handleValueInput(topic.id, ($event.target as HTMLInputElement).value)"
            />

            <!-- Textarea -->
            <textarea
              v-else-if="getTopicInputType(topic.type) === 'textarea'"
              class="bf-topic__textarea"
              :placeholder="topic.remark || '請輸入'"
              :value="answers[topic.id]?.value || ''"
              rows="3"
              @input="handleValueInput(topic.id, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>

        <!-- 聯絡資訊 -->
        <div class="bf-group-card">
          <h2 class="bf-group-card__title">聯絡資訊</h2>

          <div class="bf-topic">
            <label class="bf-topic__label">聯絡人姓名</label>
            <input v-model="contactName" type="text" class="bf-topic__text-input" placeholder="請輸入姓名" />
          </div>

          <div class="bf-topic">
            <label class="bf-topic__label">手機號碼</label>
            <input v-model="contactMobile" type="tel" class="bf-topic__text-input" placeholder="0912345678" />
          </div>

          <div class="bf-topic">
            <label class="bf-topic__label">電子信箱</label>
            <input v-model="contactEmail" type="email" class="bf-topic__text-input" placeholder="example@email.com" />
          </div>

          <div class="bf-topic">
            <label class="bf-topic__label">特殊需求備註</label>
            <textarea v-model="description" class="bf-topic__textarea" placeholder="如有特殊需求請在此說明" rows="3" />
          </div>
        </div>

        <!-- 條款 -->
        <div v-if="formData.termsContent" class="bf-terms-card">
          <p class="bf-terms-card__text">{{ formData.termsContent }}</p>
        </div>

        <!-- 錯誤提示 -->
        <p v-if="error" class="bf-error-inline">{{ error }}</p>

        <!-- 送出按鈕 -->
        <button
          class="bf-submit-btn"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '送出中...' : '確認送出' }}
        </button>
      </template>
    </main>
  </div>
</template>

<style scoped>
/* ─── 模組 Token ─── */
.booking-form-module {
  --color-primary: #ff5252;
  --color-primary-light: #fff1f2;
  --color-secondary: #00a86b;
  --color-secondary-light: #d1fae5;
}

.booking-form-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* ─── Loading ─── */
.bf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
  gap: 12px;
}

.bf-loading__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f1f5f9;
  border-top-color: var(--color-primary, #ff5252);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bf-loading__text {
  margin: 0;
  font-size: 13px;
  color: #78716c;
}

/* ─── Error Card ─── */
.bf-error-card {
  background: #fef2f2;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.bf-error-card__text {
  margin: 0;
  font-size: 14px;
  color: #dc2626;
}

/* ─── Success Card ─── */
.bf-success-card {
  background: #fff;
  border-radius: 16px;
  padding: 32px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.bf-success-card__icon {
  font-size: 48px;
}

.bf-success-card__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1c1917;
}

.bf-success-card__desc {
  margin: 0;
  font-size: 14px;
  color: #78716c;
}

.bf-success-card__link {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: 10px;
  background: var(--color-primary, #ff5252);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}
.bf-success-card__link:hover {
  opacity: 0.88;
}

/* ─── Header Card ─── */
.bf-header-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bf-header-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1c1917;
}

.bf-header-card__intro {
  margin: 0;
  font-size: 13px;
  color: #78716c;
  line-height: 1.6;
}

.bf-header-card__notice {
  margin: 0;
  font-size: 12px;
  color: #9a3412;
  background: #fff7ed;
  border-radius: 8px;
  padding: 8px 12px;
}

/* ─── Group Card ─── */
.bf-group-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bf-group-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

/* ─── Topic ─── */
.bf-topic {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bf-topic__label {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.bf-topic__required {
  color: #ef4444;
  margin-left: 2px;
}

.bf-topic__remark {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}

/* ─── Options (Radio/Checkbox) ─── */
.bf-topic__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bf-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.bf-option:hover {
  border-color: var(--color-primary, #ff5252);
  background: var(--color-primary-light, #fff1f2);
}

.bf-option--selected {
  border-color: var(--color-primary, #ff5252);
  background: var(--color-primary-light, #fff1f2);
}

.bf-option__input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary, #ff5252);
  flex-shrink: 0;
}

.bf-option__text {
  flex: 1;
  font-size: 13px;
  color: #1c1917;
}

.bf-option__price {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary, #ff5252);
}

/* ─── Text Input ─── */
.bf-topic__text-input {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  color: #1c1917;
}
.bf-topic__text-input:focus {
  border-color: var(--color-primary, #ff5252);
}

/* ─── Textarea ─── */
.bf-topic__textarea {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  color: #1c1917;
}
.bf-topic__textarea:focus {
  border-color: var(--color-primary, #ff5252);
}

/* ─── Terms ─── */
.bf-terms-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px 14px;
}

.bf-terms-card__text {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

/* ─── Error inline ─── */
.bf-error-inline {
  margin: 0;
  font-size: 13px;
  color: #dc2626;
  text-align: center;
}

/* ─── Submit Button ─── */
.bf-submit-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary, #ff5252);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.04em;
}
.bf-submit-btn:hover:not(:disabled) {
  opacity: 0.88;
}
.bf-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
