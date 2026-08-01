# Design Document: Diagnosis to Clinic Redirect

## Architecture Overview

本功能為純前端重構，將 DiagnosisFlow 元件中 AI 診斷結果後的「預約掛號」流程從內部 multi-step booking 改為 emit 事件給父頁面，由父頁面（MedicalPage）負責切換 tab、篩選科別、並顯示 AI 推薦提示標籤。

### 變更範圍

1. **DiagnosisFlow.vue** — 移除 booking/confirm/success 步驟，改為 emit `go-to-clinic` 事件
2. **medical/index.vue** — 接收事件、切換 tab、設定篩選、顯示 AI 推薦 badge

無需新增元件或 composable。無後端變更。

---

## Components

### DiagnosisFlow.vue (修改)

**移除內容：**
- `FlowStep` type 中的 `'booking' | 'confirm' | 'success'` 值
- `ClinicInfo` 和 `AppointmentPayload` 的 import
- `selectedClinic`, `selectedSlot`, `visitType`, `patientName`, `patientPhone`, `nationalId`, `appointmentNumber` 等所有掛號相關 refs
- `startBooking()`, `selectClinic()`, `proceedToConfirm()`, `confirmAppointment()`, `maskNationalId()` 等函式
- Template 中 booking、confirm、success 步驟的所有區塊
- 對應的 scoped styles

**新增內容：**
- `defineEmits` 宣告 `go-to-clinic` 事件
- 結果頁面按鈕改為觸發 `emit('go-to-clinic', diagnosisResult.value.department)`

```typescript
// DiagnosisFlow.vue <script setup>
import { useDiagnosis } from '~/composables/useDiagnosis'

const emit = defineEmits<{
  'go-to-clinic': [department: string]
}>()

const {
  diagnosisResult, analyzing, error,
  analyzeSymptoms,
} = useDiagnosis()

type FlowStep = 'input' | 'analyzing' | 'result'
const step = ref<FlowStep>('input')

// ... symptom input logic unchanged ...

function handleGoToClinic() {
  if (diagnosisResult.value) {
    emit('go-to-clinic', diagnosisResult.value.department)
  }
}
```

### medical/index.vue (修改)

**新增狀態：**

```typescript
// AI 推薦 badge 狀態
const aiRecommendDept = ref<string | null>(null)
const showAiRecommendBadge = ref(false)
```

**修改 `goToClinicTab` 函式：**

```typescript
function goToClinicTab(department: string) {
  activeTab.value = 'clinic'
  currentAppointmentView.value = 'list'
  selectedDept.value = department
  aiRecommendDept.value = department
  showAiRecommendBadge.value = true
  searchNearby(department)
}
```

**新增 badge 關閉與 pill 選擇互動：**

```typescript
function dismissAiRecommendBadge() {
  showAiRecommendBadge.value = false
  aiRecommendDept.value = null
}

// 修改 pill 選擇邏輯 — 手動選擇其他科別時隱藏 badge
function selectDept(dept: string) {
  selectedDept.value = dept
  if (dept !== aiRecommendDept.value) {
    showAiRecommendBadge.value = false
  }
}
```

**Template 修改：**

```vue
<!-- DiagnosisFlow 加上事件監聽 -->
<DiagnosisFlow @go-to-clinic="goToClinicTab" />

<!-- AI 推薦 Badge（放在 clinic tab 的科別 pill bar 上方） -->
<div v-if="showAiRecommendBadge && aiRecommendDept" class="ai-recommend-badge">
  <span class="ai-recommend-badge__text">🤖 AI 建議科別：{{ aiRecommendDept }}</span>
  <button class="ai-recommend-badge__close" aria-label="關閉 AI 推薦提示" @click="dismissAiRecommendBadge">✕</button>
</div>

<!-- Pill bar 改用 selectDept 函式 -->
<button
  v-for="dept in availableDepartments"
  :key="dept"
  class="dept-pill"
  :class="{ 'dept-pill--active': selectedDept === dept }"
  @click="selectDept(dept)"
>
  {{ dept }}
</button>
```

---

## Interfaces

### Events

| Event | Source | Target | Payload | Description |
|-------|--------|--------|---------|-------------|
| `go-to-clinic` | DiagnosisFlow | medical/index.vue | `string` (department name) | 使用者點擊診斷結果的掛號按鈕時觸發 |

### State Changes on `go-to-clinic` Event

| State Variable | Before | After |
|---|---|---|
| `activeTab` | `'symptom'` | `'clinic'` |
| `currentAppointmentView` | any | `'list'` |
| `selectedDept` | any | received department value |
| `aiRecommendDept` | `null` | received department value |
| `showAiRecommendBadge` | `false` | `true` |

---

## Data Models

無新增 data model。本功能僅操作已有的前端 reactive state。

**新增 reactive refs（在 medical/index.vue）：**

```typescript
const aiRecommendDept = ref<string | null>(null)
const showAiRecommendBadge = ref(false)
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| `diagnosisResult` 為 `null` 時按鈕點擊 | `handleGoToClinic` 檢查 `diagnosisResult.value` 存在才 emit |
| 跳轉到 clinic tab 後 searchNearby 失敗 | 已有的 `clinicError` 狀態會顯示錯誤訊息和重試按鈕，無需額外處理 |
| AI 推薦的科別不存在於搜尋結果中 | pill bar 由 `availableDepartments` 動態計算，若該科別存在則高亮；若不存在則不高亮，不影響功能 |

---

## UI/UX Details

### AI Recommend Badge 樣式

```css
.ai-recommend-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border: 1.5px solid #99f6e4;
  border-radius: 12px;
}

.ai-recommend-badge__text {
  font-size: 13px;
  font-weight: 600;
  color: #115e59;
}

.ai-recommend-badge__close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(13, 148, 136, 0.1);
  color: #0d9488;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.ai-recommend-badge__close:hover {
  background: rgba(13, 148, 136, 0.2);
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Emit payload matches diagnosisResult.department

*For any* `DiagnosisResult` object with a non-empty `department` field, when the user triggers the go-to-clinic action, the emitted `go-to-clinic` event payload SHALL equal `diagnosisResult.department` exactly.

**Validates: Requirements 2.1, 2.2**

### Property 2: Event handler sets correct tab and department state

*For any* department string received via the `go-to-clinic` event, after `goToClinicTab(department)` executes, `activeTab` SHALL equal `'clinic'`, `selectedDept` SHALL equal the received department string, and `searchNearby` SHALL have been called with that department string as the keyword argument.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: AI badge text format

*For any* non-empty department string set as `aiRecommendDept`, when `showAiRecommendBadge` is `true`, the rendered badge text SHALL contain the string `AI 建議科別：{department}` where `{department}` is replaced with the exact `aiRecommendDept` value.

**Validates: Requirements 4.1**

### Property 4: Pill bar active state reflects selectedDept

*For any* department value assigned to `selectedDept` that exists in `availableDepartments`, the corresponding pill button SHALL have the active visual class applied, and no other pill SHALL have the active class.

**Validates: Requirements 4.4, 5.1**

### Property 5: Manual pill selection dismisses AI badge

*For any* department pill selected by the user that differs from the current `aiRecommendDept` value, `showAiRecommendBadge` SHALL become `false` after the selection.

**Validates: Requirements 5.2, 5.3**
