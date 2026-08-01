<script setup lang="ts">
import { useDiagnosis } from '~/composables/useDiagnosis'

const emit = defineEmits<{
  'go-to-clinic': [department: string]
}>()

const {
  diagnosisResult,
  analyzing, error,
  analyzeSymptoms,
} = useDiagnosis()

type FlowStep = 'input' | 'analyzing' | 'result'
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

function resetFlow() {
  step.value = 'input'
  symptomText.value = ''
}

function handleGoToClinic() {
  if (diagnosisResult.value) {
    emit('go-to-clinic', diagnosisResult.value.department)
  }
}
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

        <button class="dx-book-btn" @click="handleGoToClinic">
          ➔ 需要幫你預約附近的診所掛號嗎？
        </button>
      </div>
    </template>

    <!-- 底部免責聲明 -->
    <div class="dx-disclaimer-box">
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

.dx-error { margin: 0; font-size: 13px; color: #dc2626; text-align: center; }

.dx-disclaimer-box {
  padding: 12px 14px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;
}
.dx-disclaimer-box p { margin: 0; font-size: 11px; color: #991b1b; line-height: 1.6; }
</style>
