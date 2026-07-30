<script setup lang="ts">
import { ref, computed } from 'vue'

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

/* ─── Tab 定義 ─── */
type TabKey = 'daily' | 'symptom' | 'clinic' | 'prescription' | 'pharmacy'

const activeTab = ref<TabKey>('daily')

const tabs: { key: TabKey; label: string }[] = [
  { key: 'daily', label: '今日健康紀錄' },
  { key: 'symptom', label: 'AI 診斷症狀' },
  { key: 'clinic', label: '門診掛號' },
  { key: 'prescription', label: '處方簽與送藥' },
  { key: 'pharmacy', label: '藥物辨識' },
]

/* ─── Tab 1: 今日健康紀錄 ─── */
const waterIntake = ref(1200)
const waterGoal = 2000
const waterPercent = computed(() => Math.min(100, (waterIntake.value / waterGoal) * 100))

const showToast = ref(false)
const toastMessage = ref('')

function addWater(amount: number) {
  waterIntake.value = Math.min(waterIntake.value + amount, 5000)
  toastMessage.value = `+${amount}ml 已記錄！`
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

interface Supplement {
  name: string
  time: string
  taken: boolean
}

const supplements = ref<Supplement[]>([
  { name: '綜合維他命', time: '隨餐', taken: false },
  { name: '深海魚油', time: '飯後', taken: false },
  { name: '益生菌', time: '睡前', taken: false },
])

/* ─── Tab 2: AI 診斷症狀 ─── */
interface SymptomTag {
  label: string
  selected: boolean
}

const symptomTags = ref<SymptomTag[]>([
  { label: '發燒 38℃', selected: false },
  { label: '咳嗽/喉嚨痛', selected: false },
  { label: '頭痛', selected: false },
  { label: '流鼻水', selected: false },
  { label: '肌肉痠痛', selected: false },
  { label: '腹瀉', selected: false },
])

const useDefaultHistory = ref(true)
const showAiDiagnosis = computed(() => symptomTags.value.some(t => t.selected))

/* ─── Tab 3: 門診掛號 ─── */
const clinics = [
  { name: '康健家醫診所', distance: '步行 5 分鐘', currentNumber: 15, myNumber: 19, waitMinutes: 32 },
  { name: '仁愛耳鼻喉科', distance: '步行 8 分鐘', currentNumber: 22, myNumber: 25, waitMinutes: 18 },
  { name: '安心小兒科', distance: '步行 12 分鐘', currentNumber: 8, myNumber: 12, waitMinutes: 45 },
]

/* ─── Tab 4: 處方簽與送藥 ─── */
const prescriptionUploaded = ref(false)
const deliveryStage = ref<1 | 2 | 3>(1)
const deliveryEta = ref(15)

function uploadPrescription() {
  prescriptionUploaded.value = true
}

/* ─── Tab 5: 藥物辨識 ─── */
const drugSearchQuery = ref('')
const drugAppearance = ref('')

const drugResults = [
  { name: 'Acetaminophen 500mg', appearance: '白色圓形錠劑', indication: '解熱鎮痛', stock: true },
  { name: 'Ibuprofen 200mg', appearance: '橘色膠囊', indication: '消炎止痛', stock: true },
  { name: 'Amoxicillin 250mg', appearance: '紅白膠囊', indication: '抗生素', stock: false },
]

const filteredDrugs = computed(() => {
  return drugResults.filter(d => {
    const q = drugSearchQuery.value.toLowerCase()
    const a = drugAppearance.value.toLowerCase()
    const matchName = !q || d.name.toLowerCase().includes(q)
    const matchAppearance = !a || d.appearance.includes(a)
    return matchName && matchAppearance
  })
})
</script>

<template>
  <div class="medical-module">
    <main class="medical-page" role="main">

      <!-- ═══ 功能切換 Bar ═══ -->
      <nav class="feature-bar" aria-label="功能切換">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="feature-bar__tab"
          :class="{ 'feature-bar__tab--active': activeTab === tab.key }"
          :aria-pressed="activeTab === tab.key ? 'true' : 'false'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Toast 通知 -->
      <Transition name="toast-fade">
        <div v-if="showToast" class="toast-notification">
          ✅ {{ toastMessage }}
        </div>
      </Transition>

      <!-- ═══ Tab 1: 今日健康紀錄 ═══ -->
      <section v-if="activeTab === 'daily'" class="tab-content">

        <!-- 🥤 今日飲水追蹤 -->
        <div class="med-card">
          <h3 class="med-card__title">🥤 今日飲水追蹤</h3>
          <p class="med-card__water-text">
            今日喝水：<strong>{{ waterIntake.toLocaleString() }}</strong> / {{ waterGoal.toLocaleString() }} ml
          </p>
          <div class="water-bar">
            <div class="water-bar__fill" :style="{ width: waterPercent + '%' }" />
          </div>
          <div class="water-actions">
            <button class="water-btn" @click="addWater(250)">+ 250ml</button>
            <button class="water-btn" @click="addWater(500)">+ 500ml</button>
          </div>
        </div>

        <!-- 💊 保健品追蹤清單 -->
        <div class="med-card">
          <h3 class="med-card__title">💊 保健品追蹤清單</h3>
          <div class="supplement-list">
            <div v-for="(item, idx) in supplements" :key="idx" class="supplement-item">
              <div class="supplement-item__info">
                <span class="supplement-item__name">{{ item.name }}</span>
                <span class="supplement-item__time">({{ item.time }})</span>
              </div>
              <button
                class="supplement-toggle"
                :class="{ 'supplement-toggle--taken': item.taken }"
                @click="item.taken = !item.taken"
              >
                {{ item.taken ? '✅ 已吃' : '⭕ 未吃' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 🤖 今日 AI 健康提醒卡片 -->
        <div class="ai-health-card">
          <h3 class="ai-health-card__title">🤖 今日 AI 健康提醒</h3>
          <p class="ai-health-card__text">
            今日台北氣溫較高，請注意多補充水分！昨晚睡眠稍不足，建議補充電解質與維生素 B 群。
          </p>
        </div>
      </section>

      <!-- ═══ Tab 2: AI 診斷症狀 ═══ -->
      <section v-else-if="activeTab === 'symptom'" class="tab-content">

        <!-- 症狀快速標籤 -->
        <div class="med-card">
          <h3 class="med-card__title">🏷️ 症狀快速標籤</h3>
          <div class="symptom-tags">
            <button
              v-for="(tag, idx) in symptomTags"
              :key="idx"
              class="symptom-badge"
              :class="{ 'symptom-badge--active': tag.selected }"
              @click="tag.selected = !tag.selected"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>

        <!-- 病歷資料確認 -->
        <div class="med-card">
          <h3 class="med-card__title">📋 病歷資料確認</h3>
          <div class="history-toggle">
            <button
              class="history-btn"
              :class="{ 'history-btn--active': useDefaultHistory }"
              @click="useDefaultHistory = true"
            >帶入預設病歷/過敏史</button>
            <button
              class="history-btn"
              :class="{ 'history-btn--active': !useDefaultHistory }"
              @click="useDefaultHistory = false"
            >重新詢問</button>
          </div>
        </div>

        <!-- 🤖 AI 診斷結果卡片 -->
        <div v-if="showAiDiagnosis" class="ai-diagnosis-card">
          <h3 class="ai-diagnosis-card__title">🤖 AI 診斷結果</h3>
          <p class="ai-diagnosis-card__text">
            AI 評估：疑似<strong>急性上呼吸道感染</strong>，建議就醫並多休息、補充水分。
          </p>
          <button class="ai-diagnosis-card__btn">
            🚀 帶入診斷為您掛號
          </button>
        </div>
      </section>

      <!-- ═══ Tab 3: 門診掛號 ═══ -->
      <section v-else-if="activeTab === 'clinic'" class="tab-content">

        <!-- 診所清單與實時叫號 -->
        <div v-for="clinic in clinics" :key="clinic.name" class="med-card clinic-card">
          <h3 class="med-card__title">🏥 {{ clinic.name }}</h3>
          <p class="clinic-card__distance">📍 {{ clinic.distance }}</p>
          <div class="clinic-card__numbers">
            <div class="clinic-num">
              <span class="clinic-num__label">目前叫號</span>
              <span class="clinic-num__value">{{ clinic.currentNumber }} 號</span>
            </div>
            <div class="clinic-num">
              <span class="clinic-num__label">您的號碼</span>
              <span class="clinic-num__value clinic-num__value--mine">{{ clinic.myNumber }} 號</span>
            </div>
            <div class="clinic-num">
              <span class="clinic-num__label">⏱️ 預估等候</span>
              <span class="clinic-num__value">約 {{ clinic.waitMinutes }} 分鐘</span>
            </div>
          </div>
        </div>

        <!-- 急救通報 -->
        <div class="emergency-card">
          <a href="tel:119" class="emergency-btn">
            🚨 一鍵撥打 119 / 緊急聯絡人
          </a>
        </div>
      </section>

      <!-- ═══ Tab 4: 處方簽與送藥 ═══ -->
      <section v-else-if="activeTab === 'prescription'" class="tab-content">

        <!-- 📷 拍照上傳處方簽 -->
        <div class="med-card">
          <h3 class="med-card__title">📷 拍照上傳處方簽</h3>
          <div v-if="!prescriptionUploaded" class="upload-area" @click="uploadPrescription">
            <span class="upload-area__icon">📄</span>
            <span class="upload-area__text">點擊拍照或上傳處方簽</span>
          </div>
          <div v-else class="upload-success">
            <span>✅ 處方簽已上傳成功</span>
            <p class="upload-success__note">慢性病連續處方箋提醒：下次領藥日 2026/08/15</p>
          </div>
        </div>

        <!-- 🛵 宅配送藥動態 -->
        <div class="med-card">
          <h3 class="med-card__title">🛵 宅配送藥動態</h3>
          <div class="delivery-progress">
            <div class="delivery-step" :class="{ 'delivery-step--active': deliveryStage >= 1 }">
              <span class="delivery-step__dot" />
              <span class="delivery-step__label">藥師調劑中</span>
            </div>
            <div class="delivery-step" :class="{ 'delivery-step--active': deliveryStage >= 2 }">
              <span class="delivery-step__dot" />
              <span class="delivery-step__label">外送員取件</span>
            </div>
            <div class="delivery-step" :class="{ 'delivery-step--active': deliveryStage >= 3 }">
              <span class="delivery-step__dot" />
              <span class="delivery-step__label">送達</span>
            </div>
          </div>
          <p class="delivery-eta">
            🛵 藥師外送中 — ETA <strong>{{ deliveryEta }} 分鐘</strong>
          </p>
        </div>
      </section>

      <!-- ═══ Tab 5: 藥物辨識 ═══ -->
      <section v-else-if="activeTab === 'pharmacy'" class="tab-content">

        <!-- 學名與外觀搜尋 -->
        <div class="med-card">
          <h3 class="med-card__title">🔍 藥品搜尋</h3>
          <input
            v-model="drugSearchQuery"
            class="med-input"
            placeholder="輸入藥品學名（如 Acetaminophen 500mg）"
          />
          <input
            v-model="drugAppearance"
            class="med-input"
            placeholder="外觀特徵篩選（如 白色圓形錠劑）"
          />
        </div>

        <!-- 藥品圖鑑卡片 -->
        <div v-for="drug in filteredDrugs" :key="drug.name" class="med-card drug-card">
          <div class="drug-card__header">
            <span class="drug-card__name">{{ drug.name }}</span>
            <span
              class="drug-card__stock"
              :class="drug.stock ? 'drug-card__stock--yes' : 'drug-card__stock--no'"
            >
              {{ drug.stock ? '🟢 健保藥局有現貨' : '🔴 目前缺貨' }}
            </span>
          </div>
          <p class="drug-card__appearance">外觀：{{ drug.appearance }}</p>
          <p class="drug-card__indication">適應症：{{ drug.indication }}</p>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* ─── 醫療模組 Token ─── */
.medical-module {
  --color-primary: #0d9488;
  --color-primary-light: #ccfbf1;
  --color-primary-dark: #115e59;
}

.medical-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

/* ═══ Feature Bar ═══ */
.feature-bar {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.feature-bar::-webkit-scrollbar { display: none; }

.feature-bar__tab {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  text-align: center;
}

.feature-bar__tab--active {
  background: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ═══ Toast 通知 ═══ */
.toast-notification {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: #fff;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  z-index: 1000;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* ═══ Tab Content ═══ */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ═══ 共用醫療卡片 ═══ */
.med-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.med-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

/* ═══ Tab 1: 飲水追蹤 ═══ */
.med-card__water-text {
  margin: 0;
  font-size: 20px;
  color: #1c1917;
}

.water-bar {
  height: 16px;
  background: #e0f2fe;
  border-radius: 9999px;
  overflow: hidden;
}

.water-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.water-actions {
  display: flex;
  gap: 10px;
}

.water-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.water-btn:active {
  background: var(--color-primary-dark);
}

/* 保健品追蹤 */
.supplement-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.supplement-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f0fdfa;
  border-radius: 10px;
}

.supplement-item__info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.supplement-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.supplement-item__time {
  font-size: 12px;
  color: #78716c;
}

.supplement-toggle {
  padding: 6px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.supplement-toggle--taken {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* AI 健康提醒卡片 */
.ai-health-card {
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #99f6e4;
}

.ai-health-card__title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.ai-health-card__text {
  margin: 0;
  font-size: 13px;
  color: #115e59;
  line-height: 1.7;
}

/* ═══ Tab 2: AI 診斷症狀 ═══ */
.symptom-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.symptom-badge {
  padding: 8px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.symptom-badge--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.history-toggle {
  display: flex;
  gap: 8px;
}

.history-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.history-btn--active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

/* AI 診斷結果卡片 */
.ai-diagnosis-card {
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #99f6e4;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-diagnosis-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-primary-dark);
}

.ai-diagnosis-card__text {
  margin: 0;
  font-size: 13px;
  color: #115e59;
  line-height: 1.7;
}

.ai-diagnosis-card__btn {
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.ai-diagnosis-card__btn:active {
  background: var(--color-primary-dark);
}

/* ═══ Tab 3: 門診掛號 ═══ */
.clinic-card__distance {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}

.clinic-card__numbers {
  display: flex;
  gap: 12px;
}

.clinic-num {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: #f0fdfa;
  border-radius: 10px;
}

.clinic-num__label {
  font-size: 11px;
  color: #78716c;
}

.clinic-num__value {
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.clinic-num__value--mine {
  color: var(--color-primary);
}

/* 急救通報 */
.emergency-card {
  margin-top: 8px;
}

.emergency-btn {
  display: block;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: #dc2626;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* ═══ Tab 4: 處方簽與送藥 ═══ */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  border: 2px dashed #99f6e4;
  border-radius: 12px;
  background: #f0fdfa;
  cursor: pointer;
  transition: border-color 0.15s;
}
.upload-area:hover {
  border-color: var(--color-primary);
}

.upload-area__icon {
  font-size: 32px;
}

.upload-area__text {
  font-size: 13px;
  color: #78716c;
}

.upload-success {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: #f0fdfa;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.upload-success__note {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  color: #78716c;
}

/* 送藥進度 */
.delivery-progress {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 0;
}

.delivery-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.delivery-step::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e2e8f0;
  z-index: 0;
}

.delivery-step:last-child::after {
  display: none;
}

.delivery-step--active::after {
  background: var(--color-primary);
}

.delivery-step__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e2e8f0;
  z-index: 1;
  transition: background 0.3s;
}

.delivery-step--active .delivery-step__dot {
  background: var(--color-primary);
}

.delivery-step__label {
  font-size: 11px;
  color: #78716c;
  text-align: center;
}

.delivery-step--active .delivery-step__label {
  color: var(--color-primary-dark);
  font-weight: 600;
}

.delivery-eta {
  margin: 0;
  font-size: 14px;
  color: var(--color-primary-dark);
  text-align: center;
  padding: 10px;
  background: #f0fdfa;
  border-radius: 10px;
}

/* ═══ Tab 5: 藥物辨識 ═══ */
.med-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.med-input:focus {
  border-color: var(--color-primary);
}

.drug-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.drug-card__name {
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
}

.drug-card__stock {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 9999px;
}

.drug-card__stock--yes {
  background: #d1fae5;
  color: #065f46;
}

.drug-card__stock--no {
  background: #fee2e2;
  color: #991b1b;
}

.drug-card__appearance,
.drug-card__indication {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}
</style>
