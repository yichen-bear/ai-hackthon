<script setup lang="ts">
import { useDiagnosis } from '~/composables/useDiagnosis'
import type { ClinicInfo, AppointmentPayload } from '~/composables/useDiagnosis'

const {
  diagnosisResult, clinics, latestAppointment,
  analyzing, submitting, error,
  analyzeSymptoms, fetchClinics, submitAppointment, fetchLatestAppointment,
} = useDiagnosis()

type FlowStep = 'input' | 'analyzing' | 'result' | 'booking' | 'confirm' | 'success'
const step = ref<FlowStep>('input')

// Step 1: 症狀輸入
const symptomText = ref('')
const symptomPills = [
  { label: '發燒', text: '發燒，體溫約 38 度' },
  { label: '咳嗽/喉嚨痛', text: '咳嗽、喉嚨痛' },
  { label: '頭痛頭暈', text: '頭痛、頭暈' },
  { label: '腸胃不適', text: '腸胃不適、噁心想吐' },
  { label: '皮膚紅疹', text: '皮膚出現紅疹' },
]

function appendSymptom(text: string) {
  if (symptomText.value && !symptomText.value.endsWith('、')) symptomText.value += '、'
  symptomText.value += text
}

async function startAnalysis() {
  if (!symptomText.value.trim()) return
  step.value = 'analyzing'
  await analyzeSymptoms(symptomText.value.trim())
  step.value = diagnosisResult.value ? 'result' : 'input'
}

// Step 3: 掛號流程
const selectedClinic = ref<ClinicInfo | null>(null)
const selectedSlot = ref('')
const visitType = ref<'初診' | '複診'>('初診')
const patientName = ref('王小明')
const patientPhone = ref('0912-345-678')
const nationalId = ref('A123456789')
const appointmentNumber = ref(0)

async function startBooking() {
  step.value = 'booking'
  if (diagnosisResult.value) {
    await fetchClinics(diagnosisResult.value.department)
  } else {
    await fetchClinics()
  }
}

function selectClinic(clinic: ClinicInfo) {
  selectedClinic.value = clinic
  selectedSlot.value = ''
}

function proceedToConfirm() {
  if (!selectedClinic.value || !selectedSlot.value) return
  step.value = 'confirm'
}

async function confirmAppointment() {
  if (!selectedClinic.value) return
  const payload: AppointmentPayload = {
    symptoms: diagnosisResult.value?.symptoms || symptomText.value,
    department: diagnosisResult.value?.department || '',
    clinicName: selectedClinic.value.name,
    appointmentTime: selectedSlot.value,
    visitType: visitType.value,
    patientName: patientName.value,
    phone: patientPhone.value,
    nationalId: nationalId.value,
  }
  const result = await submitAppointment(payload)
  if (result) {
    appointmentNumber.value = result.appointmentNumber
    step.value = 'success'
    await fetchLatestAppointment()
  }
}

function maskNationalId(id: string) {
  if (id.length >= 6) return id.slice(0, 4) + '***' + id.slice(-3)
  return id
}

function resetFlow() {
  step.value = 'input'
  symptomText.value = ''
  selectedClinic.value = null
  selectedSlot.value = ''
}

onMounted(() => { fetchLatestAppointment() })
</script>

<template>
  <div class="dx-flow">

    <!-- ═══ Step 1: 症狀輸入 ═══ -->
    <div v-if="step === 'input'" class="dx-card">
      <h3 class="dx-card__title">🩺 AI 智慧症狀初步分析</h3>
      <p class="dx-card__subtitle">請描述您的不適症狀，AI 將為您評估可能原因與建議科別</p>

      <textarea
        v-model="symptomText"
        class="dx-textarea"
        placeholder="例如：從昨天晚上開始頭痛、喉嚨痛，體溫約 37.8 度..."
        rows="4"
      />

      <div class="dx-pills">
        <button v-for="pill in symptomPills" :key="pill.label" class="dx-pill" @click="appendSymptom(pill.text)">
          {{ pill.label }}
        </button>
      </div>

      <button class="dx-analyze-btn" :disabled="!symptomText.trim()" @click="startAnalysis">
        🔬 開始 AI 智慧症狀分析
      </button>

      <p v-if="error" class="dx-error">{{ error }}</p>
    </div>

    <!-- ═══ Step 2: 分析中 ═══ -->
    <div v-else-if="step === 'analyzing'" class="dx-card dx-card--center">
      <div class="dx-spinner" />
      <p class="dx-analyzing-text">AI 正在分析您的症狀...</p>
    </div>

    <!-- ═══ Step 3: 分析結果 ═══ -->
    <template v-else-if="step === 'result' && diagnosisResult">
      <div class="dx-card dx-card--result">
        <h3 class="dx-card__title">🤖 AI 分析結果</h3>

        <div class="dx-causes">
          <div v-for="cause in diagnosisResult.causes" :key="cause.name" class="dx-cause">
            <div class="dx-cause__header">
              <span class="dx-cause__name">{{ cause.name }}</span>
              <span class="dx-cause__pct">{{ cause.probability }}%</span>
            </div>
            <div class="dx-cause__bar"><div class="dx-cause__fill" :style="{ width: cause.probability + '%' }" /></div>
            <p class="dx-cause__desc">{{ cause.description }}</p>
          </div>
        </div>

        <div class="dx-dept-row">
          <span class="dx-dept-label">推薦科別：</span>
          <span class="dx-dept-badge">{{ diagnosisResult.department }}</span>
          <span v-for="alt in diagnosisResult.departmentAlternatives" :key="alt" class="dx-dept-badge dx-dept-badge--alt">{{ alt }}</span>
        </div>

        <div v-if="diagnosisResult.advice" class="dx-advice">
          <p>💡 {{ diagnosisResult.advice }}</p>
        </div>

        <p class="dx-disclaimer">{{ diagnosisResult.disclaimer }}</p>

        <button class="dx-book-btn" @click="startBooking">
          ➔ 需要幫你預約附近的診所掛號嗎？
        </button>
      </div>
    </template>

    <!-- ═══ Step 4: 掛號流程 ═══ -->
    <template v-else-if="step === 'booking'">
      <div class="dx-card">
        <button class="dx-back-btn" @click="step = 'result'">← 返回分析結果</button>
        <h3 class="dx-card__title">🏥 選擇診所</h3>

        <div class="dx-clinic-list">
          <div
            v-for="c in clinics" :key="c.id"
            class="dx-clinic-item"
            :class="{ 'dx-clinic-item--selected': selectedClinic?.id === c.id }"
            @click="selectClinic(c)"
          >
            <div class="dx-clinic-item__info">
              <span class="dx-clinic-item__name">{{ c.name }}</span>
              <span class="dx-clinic-item__meta">{{ c.department }} · 📍 {{ c.distance }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedClinic" class="dx-card">
        <h3 class="dx-card__title">🕐 選擇看診時段</h3>
        <div class="dx-slots">
          <button
            v-for="slot in selectedClinic.availableSlots" :key="slot"
            class="dx-slot-btn" :class="{ 'dx-slot-btn--active': selectedSlot === slot }"
            @click="selectedSlot = slot"
          >{{ slot }}</button>
        </div>

        <div class="dx-field">
          <span class="dx-field__label">初複診</span>
          <div class="dx-visit-group">
            <button class="dx-visit-btn" :class="{ 'dx-visit-btn--active': visitType === '初診' }" @click="visitType = '初診'">初診</button>
            <button class="dx-visit-btn" :class="{ 'dx-visit-btn--active': visitType === '複診' }" @click="visitType = '複診'">複診</button>
          </div>
        </div>

        <button class="dx-next-btn" :disabled="!selectedSlot" @click="proceedToConfirm">
          下一步：確認基本資料
        </button>
      </div>
    </template>

    <!-- ═══ Step 5: 資料核對 ═══ -->
    <div v-else-if="step === 'confirm'" class="dx-card">
      <button class="dx-back-btn" @click="step = 'booking'">← 返回選擇</button>
      <h3 class="dx-card__title">📋 核對掛號資料</h3>

      <div class="dx-confirm-summary">
        <div class="dx-confirm-row"><span>診所</span><strong>{{ selectedClinic?.name }}</strong></div>
        <div class="dx-confirm-row"><span>時段</span><strong>{{ selectedSlot }}</strong></div>
        <div class="dx-confirm-row"><span>類別</span><strong>{{ visitType }}</strong></div>
      </div>

      <div class="dx-form-fields">
        <label class="dx-form-label">
          👤 姓名
          <input v-model="patientName" type="text" class="dx-form-input" />
        </label>
        <label class="dx-form-label">
          📞 電話
          <input v-model="patientPhone" type="tel" class="dx-form-input" />
        </label>
        <label class="dx-form-label">
          🆔 身分證字號
          <input v-model="nationalId" type="text" class="dx-form-input" maxlength="10" />
        </label>
      </div>

      <p v-if="error" class="dx-error">{{ error }}</p>

      <button class="dx-submit-btn" :disabled="submitting || !patientName || !patientPhone" @click="confirmAppointment">
        {{ submitting ? '送出中...' : '✅ 確認送出預約掛號' }}
      </button>
    </div>

    <!-- ═══ Step 6: 成功 ═══ -->
    <template v-else-if="step === 'success'">
      <div class="dx-card dx-card--success">
        <span class="dx-success-icon">🎉</span>
        <h3 class="dx-card__title">掛號成功！</h3>
        <p class="dx-success-number">掛號號碼：<strong>{{ appointmentNumber }} 號</strong></p>
      </div>

      <div v-if="latestAppointment" class="dx-card">
        <h3 class="dx-card__title">📋 掛號預約確認</h3>
        <div class="dx-confirm-summary">
          <div class="dx-confirm-row"><span>診所</span><strong>{{ latestAppointment.clinicName }}</strong></div>
          <div class="dx-confirm-row"><span>時間</span><strong>{{ latestAppointment.appointmentTime }}</strong></div>
          <div class="dx-confirm-row"><span>類別</span><strong>{{ latestAppointment.visitType }}</strong></div>
          <div class="dx-confirm-row"><span>姓名</span><strong>{{ latestAppointment.patientName }}</strong></div>
          <div class="dx-confirm-row"><span>電話</span><strong>{{ latestAppointment.phone }}</strong></div>
          <div class="dx-confirm-row"><span>身分證</span><strong>{{ latestAppointment.nationalIdMasked }}</strong></div>
        </div>
        <div v-if="latestAppointment.department" class="dx-dept-row">
          <span class="dx-dept-label">科別：</span>
          <span class="dx-dept-badge">{{ latestAppointment.department }}</span>
        </div>
      </div>

      <button class="dx-reset-btn" @click="resetFlow">返回重新分析</button>

      <div class="dx-disclaimer-box">
        <p>⚠️ 本 AI 分析結果僅供衛教資訊與就醫參考，不可作為正式醫療診斷依據。如有緊急狀況請撥打 119。</p>
      </div>
    </template>

    <!-- 底部免責聲明 (非成功頁) -->
    <div v-if="step !== 'success'" class="dx-disclaimer-box">
      <p>⚠️ 注意：本 AI 分析結果僅供衛教資訊與就醫參考，不可作為正式醫療診斷依據。如有緊急狀況請撥打 119。</p>
    </div>
  </div>
</template>

<style scoped>
.dx-flow { display: flex; flex-direction: column; gap: 16px; }

.dx-card {
  background: #fff;
  border-radius: 1rem;
  padding: 20px 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dx-card--center { align-items: center; padding: 40px 16px; }
.dx-card--result { border: 1px solid #99f6e4; background: linear-gradient(135deg, #f0fdfa, #ecfdf5); }
.dx-card--success { align-items: center; text-align: center; }

.dx-card__title { margin: 0; font-size: 16px; font-weight: 700; color: #1c1917; }
.dx-card__subtitle { margin: 0; font-size: 13px; color: #78716c; line-height: 1.5; }

.dx-textarea {
  width: 100%; padding: 14px; border: 1.5px solid #e2e8f0; border-radius: 12px;
  font-size: 14px; font-family: inherit; line-height: 1.6; resize: vertical; outline: none;
  box-sizing: border-box; transition: border-color 0.2s;
}
.dx-textarea:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }

.dx-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.dx-pill {
  padding: 7px 14px; border: 1.5px solid #e2e8f0; border-radius: 9999px;
  background: #fff; color: #44403c; font-size: 13px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.dx-pill:hover { background: #ccfbf1; border-color: #0d9488; color: #115e59; }

.dx-analyze-btn {
  width: 100%; padding: 14px 20px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6); color: #fff;
  font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.dx-analyze-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,148,136,0.35); }
.dx-analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dx-spinner {
  width: 32px; height: 32px; border: 3px solid rgba(13,148,136,0.2);
  border-top-color: #0d9488; border-radius: 50%; animation: dx-spin 0.7s linear infinite;
}
@keyframes dx-spin { to { transform: rotate(360deg); } }
.dx-analyzing-text { margin: 0; font-size: 14px; font-weight: 600; color: #115e59; }

.dx-causes { display: flex; flex-direction: column; gap: 12px; }
.dx-cause { display: flex; flex-direction: column; gap: 4px; }
.dx-cause__header { display: flex; justify-content: space-between; align-items: center; }
.dx-cause__name { font-size: 14px; font-weight: 600; color: #1c1917; }
.dx-cause__pct { font-size: 13px; font-weight: 700; color: #0d9488; }
.dx-cause__bar { height: 10px; background: #e0f2fe; border-radius: 9999px; overflow: hidden; }
.dx-cause__fill { height: 100%; background: linear-gradient(90deg, #0d9488, #2dd4bf); border-radius: 9999px; transition: width 0.6s; }
.dx-cause__desc { margin: 0; font-size: 12px; color: #78716c; }

.dx-dept-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.dx-dept-label { font-size: 13px; font-weight: 600; color: #44403c; }
.dx-dept-badge { padding: 5px 12px; border-radius: 9999px; background: #0d9488; color: #fff; font-size: 12px; font-weight: 700; }
.dx-dept-badge--alt { background: #0ea5e9; }

.dx-advice { background: #fff; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0; font-size: 13px; color: #57534e; }
.dx-advice p { margin: 0; }

.dx-disclaimer { margin: 0; font-size: 11px; color: #a8a29e; line-height: 1.5; }

.dx-book-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #1e40af, #3b82f6); color: #fff;
  font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.dx-book-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(30,64,175,0.3); }

.dx-back-btn {
  align-self: flex-start; padding: 8px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: #fff; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s;
}
.dx-back-btn:hover { border-color: #0d9488; color: #0d9488; }

.dx-clinic-list { display: flex; flex-direction: column; gap: 8px; }
.dx-clinic-item {
  padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.15s;
}
.dx-clinic-item:hover { border-color: #0d9488; background: #f0fdfa; }
.dx-clinic-item--selected { border-color: #0d9488; background: #ccfbf1; }
.dx-clinic-item__info { display: flex; flex-direction: column; gap: 2px; }
.dx-clinic-item__name { font-size: 14px; font-weight: 600; color: #1c1917; }
.dx-clinic-item__meta { font-size: 12px; color: #78716c; }

.dx-slots { display: flex; flex-wrap: wrap; gap: 8px; }
.dx-slot-btn {
  padding: 8px 14px; border: 1.5px solid #e2e8f0; border-radius: 9999px;
  background: #fff; color: #44403c; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all 0.15s;
}
.dx-slot-btn--active { background: #0d9488; border-color: #0d9488; color: #fff; }

.dx-field { display: flex; flex-direction: column; gap: 6px; }
.dx-field__label { font-size: 12px; font-weight: 600; color: #44403c; }
.dx-visit-group { display: flex; gap: 8px; }
.dx-visit-btn {
  flex: 1; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: #fff; color: #78716c; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s;
}
.dx-visit-btn--active { background: #ccfbf1; border-color: #0d9488; color: #115e59; }

.dx-next-btn {
  width: 100%; padding: 12px; border: none; border-radius: 12px;
  background: #0d9488; color: #fff; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s;
}
.dx-next-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dx-next-btn:hover:not(:disabled) { background: #115e59; }

.dx-confirm-summary { display: flex; flex-direction: column; gap: 8px; }
.dx-confirm-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #78716c;
}
.dx-confirm-row strong { color: #1c1917; }

.dx-form-fields { display: flex; flex-direction: column; gap: 12px; }
.dx-form-label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; color: #44403c; }
.dx-form-input {
  padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.15s;
}
.dx-form-input:focus { border-color: #0d9488; }

.dx-submit-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6); color: #fff;
  font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s;
}
.dx-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dx-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,148,136,0.35); }

.dx-success-icon { font-size: 48px; }
.dx-success-number { margin: 0; font-size: 18px; color: #0d9488; }

.dx-reset-btn {
  padding: 12px 20px; border: 1.5px solid #e2e8f0; border-radius: 12px;
  background: #fff; color: #44403c; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s;
  align-self: center;
}
.dx-reset-btn:hover { border-color: #0d9488; color: #0d9488; }

.dx-error { margin: 0; font-size: 13px; color: #dc2626; text-align: center; }

.dx-disclaimer-box {
  padding: 12px 14px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;
}
.dx-disclaimer-box p { margin: 0; font-size: 11px; color: #991b1b; line-height: 1.6; }
</style>
