<script setup lang="ts">
import { ref, computed } from 'vue'
import { filterFacilities, validateAppointmentForm } from '~/utils/medical-validators'

/* ─── 型別定義 ─── */

interface Facility {
  id: string
  name: string
  type: 'clinic' | 'pharmacy'
  distance: number
  distanceLabel: string
  department?: string
}

interface MedicalResourceCardProps {
  isAiTriggered: boolean
  viewMode: 'list' | 'map'
}

/* ─── Props & Emits ─── */

defineProps<MedicalResourceCardProps>()

const emit = defineEmits<{
  'update:viewMode': [mode: 'list' | 'map']
  'dismiss-ai': []
  'book-appointment': [facilityId: string]
  'submit-appointment': [form: { name: string; phone: string; condition: string }]
}>()

/* ─── Mock 設施資料 ─── */

const allFacilities: Facility[] = [
  { id: 'ntu-hospital', name: '台大醫院', type: 'clinic', distance: 0.5, distanceLabel: '0.5 km', department: '家醫科' },
  { id: 'cosmed-xinyi', name: '康是美 信義店', type: 'pharmacy', distance: 0.8, distanceLabel: '0.8 km' },
  { id: 'mackay-hospital', name: '馬偕醫院', type: 'clinic', distance: 1.2, distanceLabel: '1.2 km', department: '內科' },
  { id: 'watsons-101', name: '屈臣氏 101店', type: 'pharmacy', distance: 1.5, distanceLabel: '1.5 km' },
  { id: 'cathay-hospital', name: '國泰醫院', type: 'clinic', distance: 2.0, distanceLabel: '2.0 km', department: '外科' },
]

/* ─── 計算屬性 ─── */

const sortedFacilities = computed(() => filterFacilities(allFacilities, 20))

/* ─── AI 診斷 State B ─── */

// AI 診斷 mock 資料
const mockDiagnosis = {
  conditionName: '季節性過敏性鼻炎',
  description: '根據您描述的症狀（鼻塞、打噴嚏、流鼻水、眼睛癢），初步判斷可能為季節性過敏反應，建議就診耳鼻喉科進一步確認。',
  suggestedDepartment: '耳鼻喉科',
}

// 預填表單資料（模擬 AI 帶入會員資料）
const formName = ref('陳小明')
const formPhone = ref('0912345678')
const formCondition = ref('季節性過敏性鼻炎')
const formErrors = ref<{ name?: string; phone?: string; condition?: string }>({})

function handleSubmitForm() {
  const result = validateAppointmentForm({
    name: formName.value,
    phone: formPhone.value,
    condition: formCondition.value,
  })

  if (!result.valid) {
    formErrors.value = result.errors
    return
  }

  formErrors.value = {}
  emit('submit-appointment', {
    name: formName.value,
    phone: formPhone.value,
    condition: formCondition.value,
  })
}

/* ─── 輔助函數 ─── */

function getFacilityIcon(type: 'clinic' | 'pharmacy'): string {
  return type === 'clinic' ? '🏥' : '💊'
}

function getFacilityTypeLabel(type: 'clinic' | 'pharmacy'): string {
  return type === 'clinic' ? '診所' : '藥局'
}
</script>

<template>
  <div class="mc__resource">
    <!-- ════════════════════════════════
         State A：醫療資源列表 / 地圖
         ════════════════════════════════ -->
    <template v-if="!isAiTriggered">
      <!-- 標題 -->
      <div class="mc__resource-header">
        <span class="mc__resource-title">📋 附近醫療資源</span>
      </div>

      <!-- 切換 Tabs -->
      <div class="mc__resource-tabs">
        <button
          class="mc__resource-tab"
          :class="{ 'mc__resource-tab--active': viewMode === 'list' }"
          @click="emit('update:viewMode', 'list')"
        >
          📋 列表模式
        </button>
        <button
          class="mc__resource-tab"
          :class="{ 'mc__resource-tab--active': viewMode === 'map' }"
          @click="emit('update:viewMode', 'map')"
        >
          🗺️ 地圖模式
        </button>
      </div>

      <!-- 列表模式 -->
      <div v-if="viewMode === 'list'" class="mc__resource-list">
        <!-- 空狀態 -->
        <div v-if="sortedFacilities.length === 0" class="mc__resource-empty">
          附近沒有找到醫療設施，請嘗試擴大搜尋範圍
        </div>

        <!-- 設施卡片列表 -->
        <div
          v-for="facility in sortedFacilities"
          :key="facility.id"
          class="mc__resource-item"
        >
          <div class="mc__resource-item-info">
            <span class="mc__resource-item-icon">{{ getFacilityIcon(facility.type) }}</span>
            <div class="mc__resource-item-details">
              <span class="mc__resource-item-name">{{ facility.name }}</span>
              <span class="mc__resource-item-meta">
                {{ getFacilityTypeLabel(facility.type) }} · {{ facility.distanceLabel }}
              </span>
            </div>
          </div>
          <button
            class="mc__resource-book-btn"
            @click="emit('book-appointment', facility.id)"
          >
            線上預約
          </button>
        </div>
      </div>

      <!-- 地圖模式（placeholder） -->
      <div v-else class="mc__resource-map">
        <div class="mc__resource-map-placeholder">
          🗺️ 地圖載入中...
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════
         State B：AI 診斷建議
         ════════════════════════════════ -->
    <template v-else>
      <!-- 頂部：標題 + 返回 -->
      <div class="mc__resource-ai-header">
        <span class="mc__resource-ai-title">🤖 AI 診斷建議</span>
        <button class="mc__resource-ai-dismiss" @click="emit('dismiss-ai')">
          ← 返回列表
        </button>
      </div>

      <!-- 診斷結果卡片 -->
      <div class="mc__resource-diagnosis">
        <div class="mc__resource-diagnosis-row">
          <span class="mc__resource-diagnosis-label">症狀：</span>
          <span class="mc__resource-diagnosis-value">{{ mockDiagnosis.conditionName }}</span>
        </div>
        <div class="mc__resource-diagnosis-row">
          <span class="mc__resource-diagnosis-label">說明：</span>
          <span class="mc__resource-diagnosis-value">{{ mockDiagnosis.description }}</span>
        </div>
        <div class="mc__resource-diagnosis-row">
          <span class="mc__resource-diagnosis-label">建議科別：</span>
          <span class="mc__resource-diagnosis-value mc__resource-diagnosis-dept">{{ mockDiagnosis.suggestedDepartment }}</span>
        </div>
      </div>

      <!-- AI 預填提示條 -->
      <div class="mc__resource-ai-hint">
        ✨ AI 已為你預填掛號資料
      </div>

      <!-- 預約表單 -->
      <div class="mc__resource-form">
        <!-- 姓名 -->
        <div class="mc__resource-form-group">
          <label class="mc__resource-form-label" for="ai-form-name">👤 姓名</label>
          <input
            id="ai-form-name"
            v-model="formName"
            type="text"
            class="mc__resource-form-input"
            :class="{ 'mc__resource-form-input--error': formErrors.name }"
            :aria-describedby="formErrors.name ? 'ai-form-name-error' : undefined"
          />
          <span
            v-if="formErrors.name"
            id="ai-form-name-error"
            class="mc__resource-form-error"
          >{{ formErrors.name }}</span>
        </div>

        <!-- 電話 -->
        <div class="mc__resource-form-group">
          <label class="mc__resource-form-label" for="ai-form-phone">📞 電話</label>
          <input
            id="ai-form-phone"
            v-model="formPhone"
            type="tel"
            class="mc__resource-form-input"
            :class="{ 'mc__resource-form-input--error': formErrors.phone }"
            :aria-describedby="formErrors.phone ? 'ai-form-phone-error' : undefined"
          />
          <span
            v-if="formErrors.phone"
            id="ai-form-phone-error"
            class="mc__resource-form-error"
          >{{ formErrors.phone }}</span>
        </div>

        <!-- 症狀 -->
        <div class="mc__resource-form-group">
          <label class="mc__resource-form-label" for="ai-form-condition">🩺 症狀</label>
          <input
            id="ai-form-condition"
            v-model="formCondition"
            type="text"
            class="mc__resource-form-input"
            :class="{ 'mc__resource-form-input--error': formErrors.condition }"
            :aria-describedby="formErrors.condition ? 'ai-form-condition-error' : undefined"
          />
          <span
            v-if="formErrors.condition"
            id="ai-form-condition-error"
            class="mc__resource-form-error"
          >{{ formErrors.condition }}</span>
        </div>
      </div>

      <!-- 確認預約按鈕 -->
      <button class="mc__resource-submit-btn" @click="handleSubmitForm">
        確認預約掛號
      </button>
    </template>
  </div>
</template>

<style scoped>
/* ── 卡片容器 ── */
.mc__resource {
  background-color: #ffffff;
  background-color: var(--color-bg-card, #ffffff);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: 16px;
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── 標題 ── */
.mc__resource-header {
  display: flex;
  align-items: center;
}

.mc__resource-title {
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

/* ── 切換 Tabs ── */
.mc__resource-tabs {
  display: flex;
  gap: 8px;
  gap: var(--space-2, 8px);
}

.mc__resource-tab {
  flex: 1;
  padding: 8px 12px;
  border-radius: 9999px;
  border-radius: var(--radius-full, 9999px);
  border: 1.5px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #ffffff;
  background: var(--color-bg-card, #ffffff);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.mc__resource-tab--active {
  background: #2563eb;
  background: var(--color-primary, #2563eb);
  border-color: #2563eb;
  border-color: var(--color-primary, #2563eb);
  color: #ffffff;
}

/* ── 列表模式 ── */
.mc__resource-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mc__resource-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #ffffff;
  transition: box-shadow 0.15s;
}

.mc__resource-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.mc__resource-item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.mc__resource-item-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.mc__resource-item-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mc__resource-item-name {
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mc__resource-item-meta {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

/* ── 線上預約按鈕 ── */
.mc__resource-book-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 9999px;
  border-radius: var(--radius-full, 9999px);
  border: 1.5px solid #2563eb;
  border-color: var(--color-primary, #2563eb);
  color: #2563eb;
  color: var(--color-primary, #2563eb);
  background: transparent;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.mc__resource-book-btn:hover {
  background: #2563eb;
  background: var(--color-primary, #2563eb);
  color: #ffffff;
}

/* ── 地圖模式 placeholder ── */
.mc__resource-map {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.mc__resource-map-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background: #f1f5f9;
  background: var(--color-progress-bg, #f1f5f9);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 500;
}

/* ── 空狀態 ── */
.mc__resource-empty {
  padding: 24px 16px;
  text-align: center;
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  line-height: 1.6;
}

/* ── State B: AI 診斷 ── */
.mc__resource-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mc__resource-ai-title {
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.mc__resource-ai-dismiss {
  background: none;
  border: none;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color 0.15s;
}

.mc__resource-ai-dismiss:hover {
  color: #2563eb;
  color: var(--color-primary, #2563eb);
}

/* 診斷結果卡片 */
.mc__resource-diagnosis {
  padding: 12px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #fafaf9;
  background: var(--color-bg-page, #fafaf9);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mc__resource-diagnosis-row {
  display: flex;
  gap: 4px;
  line-height: 1.5;
}

.mc__resource-diagnosis-label {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  flex-shrink: 0;
  font-weight: 500;
}

.mc__resource-diagnosis-value {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
}

.mc__resource-diagnosis-dept {
  color: #2563eb;
  color: var(--color-primary, #2563eb);
  font-weight: 700;
}

/* AI 預填提示條 */
.mc__resource-ai-hint {
  font-size: 12px;
  color: #16a34a;
  color: var(--color-secondary, #16a34a);
  background: #dcfce7;
  background: var(--color-secondary-light, #dcfce7);
  border-radius: 8px;
  padding: 6px 12px;
  font-weight: 500;
}

/* 預約表單 */
.mc__resource-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mc__resource-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mc__resource-form-label {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  font-weight: 500;
}

.mc__resource-form-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  background: #ffffff;
  background: var(--color-bg-card, #ffffff);
  font-size: 15px;
  font-size: var(--text-base, 15px);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.mc__resource-form-input:focus {
  border-color: #2563eb;
  border-color: var(--color-primary, #2563eb);
}

.mc__resource-form-input--error {
  border-color: #e11d48;
  border-color: var(--color-accent-red, #e11d48);
}

.mc__resource-form-error {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  color: #e11d48;
  color: var(--color-accent-red, #e11d48);
  line-height: 1.4;
}

/* 確認預約按鈕 */
.mc__resource-submit-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background-color: #2563eb;
  background-color: var(--color-primary, #2563eb);
  color: #ffffff;
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.04em;
}

.mc__resource-submit-btn:hover { opacity: 0.88; }
</style>
