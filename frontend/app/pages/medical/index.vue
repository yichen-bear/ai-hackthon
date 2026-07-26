<script setup lang="ts">
import SosHeader from '~/components/medical/SosHeader.vue'
import MedicalResourceCard from '~/components/medical/MedicalResourceCard.vue'
import HealthReminders from '~/components/medical/HealthReminders.vue'
import PrescriptionManager from '~/components/medical/PrescriptionManager.vue'
import MedicineDelivery from '~/components/medical/MedicineDelivery.vue'

// 設定頁面 lang 屬性
useHead({
  htmlAttrs: {
    lang: 'zh-TW',
  },
})

// ─── 響應式狀態 ───
const isAiTriggered = ref<boolean>(false)
const viewMode = ref<'list' | 'map'>('list')
const hasDeliveryOrder = ref<boolean>(false)

// ─── 緊急聯絡人（mock） ───
const emergencyContact = '0912-345-678'

// ─── HealthReminders mock 資料 ───
const waterIntake = ref(800)
const waterGoal = 2000
const vitamins = [
  { name: '維生素 D', time: '08:00' },
  { name: '魚油 Omega-3', time: '12:00' },
  { name: '鈣片', time: '20:00' },
]
const healthTip = '每天曬 15 分鐘太陽有助於維生素 D 的合成，建議選擇早晨或傍晚時段，避免正午直射。'

// ─── PrescriptionManager mock 資料 ───
const medications = [
  { id: 'med-1', name: '降血壓藥 Amlodipine', dosage: '10mg', schedule: '每日 1 次，早餐後' },
  { id: 'med-2', name: '降血糖藥 Metformin', dosage: '500mg', schedule: '每日 2 次，早晚飯後' },
]

// ─── MedicineDelivery mock 資料 ───
const currentDeliveryStage = ref<1 | 2 | 3 | 4>(1)
const estimatedMinutes = ref(25)

// ─── 事件處理 ───
function handleUpdateViewMode(mode: 'list' | 'map') {
  viewMode.value = mode
}

function handleDismissAi() {
  isAiTriggered.value = false
}

function handleSubmitAppointment(form: { name: string; phone: string; condition: string }) {
  console.log('預約掛號提交：', form)
  // TODO: 串接後端 API
}

function handleOrderConfirmed() {
  hasDeliveryOrder.value = true
}

// ─── Demo 用：模擬 AI 觸發 ───
function triggerAiDemo() {
  isAiTriggered.value = true
}

// ─── Demo 用：模擬送藥訂單確認 ───
function triggerDeliveryDemo() {
  hasDeliveryOrder.value = true
  currentDeliveryStage.value = 2
  estimatedMinutes.value = 18
}

// ─── Demo 用：重設所有狀態 ───
function resetDemo() {
  isAiTriggered.value = false
  hasDeliveryOrder.value = false
  currentDeliveryStage.value = 1
  estimatedMinutes.value = 25
  viewMode.value = 'list'
}
</script>

<template>
  <div class="medical-module">
    <main class="medical-page" role="main">

      <!-- SOS 緊急求助區塊 -->
      <SosHeader :emergency-contact="emergencyContact" />

      <!-- 醫療資源 / AI 診斷雙狀態卡片 -->
      <MedicalResourceCard
        :is-ai-triggered="isAiTriggered"
        :view-mode="viewMode"
        @update:view-mode="handleUpdateViewMode"
        @dismiss-ai="handleDismissAi"
        @submit-appointment="handleSubmitAppointment"
      />

      <!-- 每日健康追蹤 -->
      <HealthReminders
        :water-intake="waterIntake"
        :water-goal="waterGoal"
        :vitamins="vitamins"
        :health-tip="healthTip"
      />

      <!-- 處方管理 -->
      <PrescriptionManager :medications="medications" />

      <!-- 送藥追蹤 -->
      <MedicineDelivery
        :has-delivery-order="hasDeliveryOrder"
        :current-stage="currentDeliveryStage"
        :estimated-minutes="estimatedMinutes"
        @order-confirmed="handleOrderConfirmed"
      />

    </main>

    <!-- ═══════════════════════════════════
         Demo 控制面板（Hackathon 展示用）
         ═══════════════════════════════════ -->
    <div class="medical-demo-panel">
      <button
        class="medical-demo-btn medical-demo-btn--ai"
        :disabled="isAiTriggered"
        @click="triggerAiDemo"
      >
        🤖 AI 觸發
      </button>
      <button
        class="medical-demo-btn medical-demo-btn--delivery"
        :disabled="hasDeliveryOrder"
        @click="triggerDeliveryDemo"
      >
        🚚 模擬送藥
      </button>
      <button
        class="medical-demo-btn medical-demo-btn--reset"
        @click="resetDemo"
      >
        🔄 重設
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 醫療模組作用域 Token 覆寫 */
.medical-module {
  --color-primary: #2563eb;
  --color-primary-light: #eff6ff;
  --color-secondary: #16a34a;
  --color-secondary-light: #dcfce7;
}

.medical-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* ═══════════════════════════════
   Demo 控制面板（固定右下角）
   ═══════════════════════════════ */
.medical-demo-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 999;
}

.medical-demo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.15s, transform 0.1s;
  white-space: nowrap;
}

.medical-demo-btn:active {
  transform: scale(0.95);
}

.medical-demo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.medical-demo-btn--ai {
  background: #2563eb;
  color: #ffffff;
}

.medical-demo-btn--delivery {
  background: #16a34a;
  color: #ffffff;
}

.medical-demo-btn--reset {
  background: #78716c;
  color: #ffffff;
}
</style>
