# 技術設計文件：門診掛號預約模組（Clinic Appointment Booking）

## 概覽

本設計將醫療模組中的門診掛號流程從「撥打電話預約」升級為「線上預約表單」。病患在診所詳情頁點擊按鈕後進入預約表單，填寫個人資料與選擇就診時段後提交。診所端管理後台從資料庫即時讀取預約記錄，取代現有的 mock 資料。

**技術棧：**
- Frontend: Nuxt 4 + Vue 3 + TypeScript（`<script setup lang="ts">`）
- Backend: Express.js + CommonJS + Prisma ORM（PostgreSQL）
- 資料模型：複用 `PmsFormFeedback`（formId: 1020），不新增 Prisma model
- API 通訊：`$fetch` / `useFetch`（Nuxt 內建）

**核心設計決策：**
1. 在 `medical/index.vue` 新增 `'booking'` 至 `AppointmentView` type，作為表單頁面視圖狀態
2. 擴充現有 `POST /api/diagnosis/appointment` endpoint，新增 `age`、`date`、`session` 欄位存入 feedbackContent
3. 新增 `GET /api/diagnosis/appointments` endpoint 供管理後台讀取所有掛號記錄
4. 管理後台以 API 資料取代 `mockAppointments`，支援手動重新整理
5. 表單預填：隨機年齡（25-65）、隨機身分證字號（A-Z + 9 位數字）
6. 日期選擇：原生 HTML `<input type="date">`
7. 時段選擇：三個按鈕（早診/午診/晚診）

---

## 架構

### 高層次變更範圍

```
frontend/app/pages/medical/index.vue     ← 新增 'booking' view + 表單 UI
backend/routes/diagnosis.js              ← 擴充 POST + 新增 GET endpoint
frontend/app/pages/admin/medical.vue     ← API 取代 mock + 重新整理按鈕
```

### 元件狀態機（門診掛號 Tab）

```
  currentAppointmentView
         │
         ▼
┌──────────┐  點擊診所卡片  ┌──────────┐  點擊「AI 自動填入  ┌──────────┐
│   list   │ ──────────────►│  detail  │  預約表單」按鈕    │ booking  │
│ (診所列表)│               │(診所詳情) │ ─────────────────►│(預約表單) │
│          │◄────────────── │          │◄──────────────────│          │
└──────────┘   返回列表      └──────────┘  提交成功/取消返回  └──────────┘
```

### 資料流向

```
[病患] 填寫表單
    │
    ▼ $fetch POST /api/diagnosis/appointment
    │   body: { patientName, phone, nationalId, age, date, session, clinicName }
    │
    ▼ [Backend] 建立 PmsFormFeedback 記錄
    │   feedbackContent: { ...existing, '4036': age, '4037': date, '4038': session }
    │
    ▼ Response: { feedbackNo, appointmentNumber }
    │
    ▼ [病患] 顯示成功 → 返回 detail view

[管理者] 開啟/重新整理 Admin_Panel
    │
    ▼ $fetch GET /api/diagnosis/appointments
    │
    ▼ [Backend] 查詢 PmsFormFeedback WHERE formId=1020
    │   → 解析 feedbackContent → 組裝回應格式
    │
    ▼ Response: [{ id, name, age, phone, nationalId, date, session, clinicName, status, createdAt }]
    │
    ▼ [Admin_Panel] 渲染卡片 + 狀態篩選
```

---

## 元件介面定義

### 前端型別（medical/index.vue 內部）

```typescript
// AppointmentView 新增 'booking'
type AppointmentView = 'list' | 'form' | 'detail' | 'booking'

// 預約表單資料模型
interface BookingFormData {
  patientName: string
  phone: string
  nationalId: string
  age: number
  date: string          // ISO date string: 'YYYY-MM-DD'
  session: '早診' | '午診' | '晚診' | ''
  clinicName: string
}

// 表單驗證錯誤
interface BookingFormErrors {
  patientName?: string
  phone?: string
  date?: string
  session?: string
}
```

### 後端 API 介面

#### POST /api/diagnosis/appointment（擴充）

```typescript
// Request Body（新增欄位以 * 標示）
interface AppointmentRequest {
  symptoms?: string
  department?: string
  clinicName: string
  appointmentTime?: string
  visitType?: string
  patientName: string
  phone: string
  nationalId?: string
  age?: number            // * 新增
  date?: string           // * 新增（'YYYY-MM-DD'）
  session?: string        // * 新增（'早診' | '午診' | '晚診'）
}

// Response (201)
interface AppointmentResponse {
  success: true
  data: {
    feedbackNo: string
    appointmentNumber: number
  }
}
```

#### GET /api/diagnosis/appointments（新增）

```typescript
// Response (200)
interface AppointmentsListResponse {
  success: true
  data: AppointmentRecord[]
}

interface AppointmentRecord {
  id: number
  name: string
  age: string
  phone: string
  nationalId: string       // 遮蔽後的身分證（前4後3, 中間 ***）
  date: string
  session: string
  clinicName: string
  status: string           // FEEDBACK_STATUS value ('01'=pending, '02'=approved, '03'=completed)
  createdAt: string        // ISO datetime
}
```

### Admin Panel 介面（admin/medical.vue）

```typescript
// 取代 mockAppointments 的 API 資料型別
interface AdminAppointment {
  id: number
  name: string
  age: number | string
  phone: string
  nationalId: string
  date: string
  session: string
  clinicName: string
  status: 'pending' | 'approved' | 'completed'
  createdAt: string
}
```

---

## 實作細節

### 1. 前端：預約表單視圖（medical/index.vue）

**進入條件：** 病患在 `detail` view 中點擊「AI 自動填入預約表單」按鈕

**預填邏輯：**
```typescript
function generateRandomAge(): number {
  return Math.floor(Math.random() * (65 - 25 + 1)) + 25
}

function generateRandomNationalId(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')
  return letter + digits
}
```

**表單驗證邏輯：**
```typescript
function validateBookingForm(form: BookingFormData): BookingFormErrors {
  const errors: BookingFormErrors = {}
  if (!form.patientName.trim()) errors.patientName = '請填寫姓名'
  if (!form.phone.trim()) errors.phone = '請填寫電話'
  if (!form.date) errors.date = '請選擇就診日期'
  if (!form.session) errors.session = '請選擇門診時段'
  return errors
}
```

**提交流程：**
1. 驗證表單 → 若有錯誤顯示錯誤訊息
2. 呼叫 `$fetch('/api/diagnosis/appointment', { method: 'POST', body: formData })`
3. 成功：顯示 toast「預約成功！掛號號碼：${appointmentNumber}」→ 切回 `detail` view
4. 400 錯誤：顯示後端回傳的 message
5. 500/其他錯誤：顯示「系統錯誤，請稍後再試」

### 2. 後端：擴充 POST /api/diagnosis/appointment

在現有 `feedbackContent` 物件中新增三個 topicId：

```javascript
const feedbackContent = {
  // ...existing fields (4028-4035)
  '4036': { topicId: 4036, value: age != null ? String(age) : '' },
  '4037': { topicId: 4037, value: date || '' },
  '4038': { topicId: 4038, value: session || '' },
};
```

從 `req.body` 解構新增 `age`, `date`, `session` 欄位。既有欄位與邏輯不變。

### 3. 後端：新增 GET /api/diagnosis/appointments

```javascript
router.get('/appointments', async (req, res) => {
  try {
    const feedbacks = await prisma.pmsFormFeedback.findMany({
      where: { formId: 1020 },
      orderBy: { creTime: 'desc' },
    });

    const data = feedbacks.map(fb => {
      const c = fb.feedbackContent || {};
      const getValue = (key) => {
        const entry = c[key];
        return entry && typeof entry === 'object' && 'value' in entry ? entry.value : (entry || '');
      };

      // 身分證遮蔽
      let nationalId = getValue('4035');
      if (nationalId.length >= 6) {
        nationalId = nationalId.slice(0, 4) + '***' + nationalId.slice(-3);
      }

      return {
        id: fb.id,
        name: getValue('4033'),
        age: getValue('4036'),
        phone: getValue('4034'),
        nationalId,
        date: getValue('4037'),
        session: getValue('4038'),
        clinicName: getValue('4030'),
        status: fb.status,          // '01'=pending, '02'=approved, '03'=completed
        createdAt: fb.creTime?.toISOString() || '',
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[GET /api/diagnosis/appointments] error:', err.message);
    return res.status(500).json({ success: false, message: '系統錯誤' });
  }
});
```

### 4. Admin Panel：API 整合（admin/medical.vue）

**替換策略：**
- 移除 `mockAppointments` 硬編碼資料
- 新增 `appointments` ref + `fetchAppointments()` 函式
- `onMounted` 時自動呼叫 API
- 新增「重新整理」按鈕觸發 `fetchAppointments()`
- 狀態映射：`'01'` → `'pending'`, `'02'` → `'approved'`, `'03'` → `'completed'`

**批准預約：**
- 呼叫後端 PATCH endpoint（或直接在前端更新 status 並重新整理）
- Hackathon 最小方案：前端暫時只做本地狀態更新 + 顯示 toast

---

## 資料模型

### feedbackContent 欄位對照表（formId: 1020）

| topicId | 欄位 | 說明 |
|---------|------|------|
| 4028 | symptoms | 症狀描述 |
| 4029 | department | 建議科別 |
| 4030 | clinicName | 診所名稱 |
| 4031 | appointmentTime | 掛號時間（舊格式） |
| 4032 | visitType | 初診/複診 |
| 4033 | patientName | 病患姓名 |
| 4034 | phone | 電話 |
| 4035 | nationalId | 身分證字號 |
| 4036 | age | 年齡（**新增**） |
| 4037 | date | 就診日期 YYYY-MM-DD（**新增**） |
| 4038 | session | 門診時段：早診/午診/晚診（**新增**） |

### 狀態碼對照

| FEEDBACK_STATUS | 前端顯示 | Admin Filter |
|-----------------|----------|--------------|
| `'01'` (PENDING) | 待確認 | `pending` |
| `'02'` (PROCESSING) | 已確認 | `approved` (today) |
| `'03'` (COMPLETED) | 已完成 | `completed` |

---

## 錯誤處理

### 前端錯誤處理

| 場景 | 處理方式 | UX 表現 |
|------|----------|---------|
| 表單驗證失敗 | 阻止提交，顯示對應欄位錯誤訊息 | 紅色文字提示於欄位下方 |
| POST 回傳 400 | 顯示後端 `message` 內容 | Toast 或 alert |
| POST 回傳 500 | 顯示「系統錯誤，請稍後再試」 | Toast |
| 網路斷線 | 捕獲 fetch error，顯示通用錯誤 | Toast |
| GET appointments 失敗 | 顯示錯誤提示 + 重試按鈕 | Admin 卡片區顯示 fallback |

### 後端錯誤處理

| 場景 | 處理方式 | HTTP 回應 |
|------|----------|-----------|
| 缺少必填欄位（clinicName, patientName, phone） | 回傳 400 + 錯誤描述 | `{ success: false, message: '缺少必要的掛號資料' }` |
| formId 1020 表單不存在 | 回傳 404 | `{ success: false, message: '找不到表單' }` |
| Prisma 操作失敗 | 記錄 error log，回傳 500 | `{ success: false, message: '系統錯誤' }` |
| feedbackContent 解析異常 | 個別欄位回傳空字串，不中斷整體 | 正常 200（部分欄位為空） |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 年齡預填值域不變式

*For any* invocation of the age pre-fill generator, the produced value SHALL be an integer in the closed interval [25, 65].

**Validates: Requirements 2.2**

### Property 2: 身分證字號格式不變式

*For any* invocation of the nationalId generator, the produced value SHALL match the regex pattern `/^[A-Z]\d{9}$/` (exactly one uppercase letter followed by exactly 9 digits, total length 10).

**Validates: Requirements 2.3**

### Property 3: 掛號資料儲存 Round-Trip

*For any* valid appointment submission containing age, date, and session fields, after the POST endpoint stores the record, retrieving it via GET endpoint SHALL return the same age, date, and session values at their designated topicIds (4036, 4037, 4038 respectively).

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 4: 成功建立回應格式不變式

*For any* valid appointment POST request that successfully creates a record, the response SHALL have HTTP status 201 and contain a non-empty string `feedbackNo` and a positive integer `appointmentNumber`.

**Validates: Requirements 4.5**

### Property 5: GET 回應欄位完整性

*For any* stored appointment record (PmsFormFeedback with formId=1020), the GET /api/diagnosis/appointments response item SHALL contain all required fields: id (number), name (string), age (string), phone (string), nationalId (string), date (string), session (string), clinicName (string), status (string), createdAt (string).

**Validates: Requirements 5.3**

### Property 6: 狀態篩選正確性

*For any* set of appointment records with mixed statuses, filtering by a specific status category SHALL return only records whose status matches that category, and the union of all filtered sets SHALL equal the full unfiltered set.

**Validates: Requirements 6.2**

---

## 測試策略

### 測試類型分佈

| 類型 | 適用場景 | 工具 |
|------|----------|------|
| **Property Test** | 預填產生器、資料儲存 round-trip、回應格式、篩選邏輯 | Vitest + fast-check |
| **Example Test** | UI 狀態切換、表單驗證、元件渲染、錯誤處理 | Vitest + @vue/test-utils |
| **Integration Test** | 完整 POST/GET 流程、Admin 資料載入 | Vitest + supertest（mock Prisma） |

### Property Test 配置

```typescript
import * as fc from 'fast-check'

// Property 1: 年齡預填值域
it('Feature: clinic-appointment-booking, Property 1: age pre-fill is always in [25, 65]', () => {
  fc.assert(
    fc.property(fc.integer(), (_seed) => {
      const age = generateRandomAge()
      return age >= 25 && age <= 65 && Number.isInteger(age)
    }),
    { numRuns: 100 }
  )
})

// Property 2: 身分證字號格式
it('Feature: clinic-appointment-booking, Property 2: nationalId format always valid', () => {
  fc.assert(
    fc.property(fc.integer(), (_seed) => {
      const id = generateRandomNationalId()
      return /^[A-Z]\d{9}$/.test(id)
    }),
    { numRuns: 100 }
  )
})

// Property 6: 狀態篩選正確性
it('Feature: clinic-appointment-booking, Property 6: status filter partitions correctly', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        id: fc.integer(),
        status: fc.constantFrom('pending', 'approved', 'completed'),
        name: fc.string(),
      }), { minLength: 0, maxLength: 50 }),
      fc.constantFrom('pending', 'approved', 'completed'),
      (appointments, filterStatus) => {
        const filtered = appointments.filter(a => a.status === filterStatus)
        return filtered.every(a => a.status === filterStatus)
      }
    ),
    { numRuns: 100 }
  )
})
```

### Example Test 重點

| 範圍 | 測試重點 | 數量 |
|------|----------|------|
| 表單 UI | 欄位渲染、預填值存在、Session 按鈕、日期 input | 4 |
| 表單驗證 | 空姓名/空電話/無日期/無時段 各觸發正確錯誤 | 4 |
| 提交流程 | 成功提交 → toast + 導航、400 錯誤、500 錯誤 | 3 |
| Admin | API 呼叫、卡片渲染、篩選切換、批准按鈕 | 4 |
| 入口替換 | 按鈕存在、點擊切換至 booking view、clinicName 傳遞 | 3 |
