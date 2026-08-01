<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HealthTracker from '~/components/medical/HealthTracker.vue'
import DiagnosisFlow from '~/components/medical/DiagnosisFlow.vue'

useHead({
  htmlAttrs: { lang: 'zh-TW' },
})

/* ─── Tab 定義 ─── */
type TabKey = 'daily' | 'symptom' | 'clinic' | 'prescription' | 'pharmacy'

const activeTab = ref<TabKey>('daily')

const tabs: { key: TabKey; label: string }[] = [
  { key: 'daily', label: '健康紀錄' },
  { key: 'symptom', label: 'AI 診斷' },
  { key: 'clinic', label: '門診掛號' },
  { key: 'prescription', label: '處方簽' },
  { key: 'pharmacy', label: '藥物辨識' },
]

/* ─── Tab 1: 今日健康紀錄 ─── */

// 飲水追蹤
const isEditingWater = ref(false)
const dailyWaterGoal = ref(2000)
const cupCapacity = ref(600)
const waterIntake = ref(1200)
const waterPercent = computed(() => Math.min(100, (waterIntake.value / dailyWaterGoal.value) * 100))

const showToast = ref(false)
const toastMessage = ref('')

function addWater(amount: number) {
  waterIntake.value = Math.min(waterIntake.value + amount, 10000)
  toastMessage.value = `+${amount}ml 已記錄！`
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

function saveWaterSettings() {
  isEditingWater.value = false
  toastMessage.value = '水壺設定已儲存！'
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

// 保健品追蹤
const isEditingSupplements = ref(false)

interface Supplement {
  name: string
  frequency: string
  timing: string
  alarmTime: string
  alarmEnabled: boolean
  taken: boolean
}

const frequencyOptions = ['一天 1 次', '一天 2 次', '一天 3 次']
const timingOptions = ['飯前', '飯後', '隨餐', '睡前']

const supplements = ref<Supplement[]>([
  { name: '綜合維他命', frequency: '一天 1 次', timing: '隨餐', alarmTime: '08:00', alarmEnabled: true, taken: false },
  { name: '深海魚油', frequency: '一天 1 次', timing: '飯後', alarmTime: '12:30', alarmEnabled: false, taken: false },
  { name: '益生菌', frequency: '一天 1 次', timing: '睡前', alarmTime: '22:00', alarmEnabled: true, taken: false },
])

function addSupplement() {
  supplements.value.push({
    name: '',
    frequency: '一天 1 次',
    timing: '飯後',
    alarmTime: '08:00',
    alarmEnabled: false,
    taken: false,
  })
}

function removeSupplement(index: number) {
  supplements.value.splice(index, 1)
}

function saveSupplements() {
  isEditingSupplements.value = false
  toastMessage.value = '保健品清單已儲存並連動鬧鐘！'
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

/* ─── AI 健康追蹤同步 ─── */
function handleHealthDataUpdated() {
  // 當 AI 資料更新時，同步更新本地飲水設定
}

/* ─── Tab 2: AI 智慧症狀分析 ─── */
const symptomText = ref('')
const isAnalyzing = ref(false)
const analysisComplete = ref(false)

const symptomPills = [
  { label: '發燒', text: '發燒，體溫約 38 度' },
  { label: '咳嗽/喉嚨痛', text: '咳嗽、喉嚨痛' },
  { label: '頭痛頭暈', text: '頭痛、頭暈' },
  { label: '腸胃不適', text: '腸胃不適、噁心想吐' },
  { label: '皮膚紅疹', text: '皮膚出現紅疹' },
]

function appendSymptom(text: string) {
  if (symptomText.value && !symptomText.value.endsWith('、') && !symptomText.value.endsWith('，')) {
    symptomText.value += '、'
  }
  symptomText.value += text
}

function startAnalysis() {
  if (!symptomText.value.trim()) return
  isAnalyzing.value = true
  analysisComplete.value = false
  setTimeout(() => {
    isAnalyzing.value = false
    analysisComplete.value = true
  }, 1500)
}

const recommendedDept = ref('耳鼻喉科')

function goToClinicTab() {
  selectedDept.value = recommendedDept.value
  activeTab.value = 'clinic'
  currentAppointmentView.value = 'list'
}

/* ─── Tab 3: 門診掛號 ─── */
type AppointmentView = 'list' | 'form'
const currentAppointmentView = ref<AppointmentView>('list')

const deptOptions = ['耳鼻喉科', '一般內科', '家醫科', '皮膚科', '小兒科']
const selectedDept = ref('耳鼻喉科')

interface Clinic {
  name: string
  dept: string
  status: string
  distance: string
  currentNumber: number
  waitingCount: number
}

const clinicList = ref<Clinic[]>([
  { name: '信義耳鼻喉科診所', dept: '耳鼻喉科', status: '🟢 看診中', distance: '450m', currentNumber: 28, waitingCount: 3 },
  { name: '康健家醫診所', dept: '家醫科', status: '🟢 看診中', distance: '600m', currentNumber: 15, waitingCount: 5 },
  { name: '仁愛內科診所', dept: '一般內科', status: '🟢 看診中', distance: '800m', currentNumber: 22, waitingCount: 2 },
  { name: '美麗皮膚科診所', dept: '皮膚科', status: '🟢 看診中', distance: '1.2km', currentNumber: 10, waitingCount: 4 },
  { name: '安心小兒科', dept: '小兒科', status: '🟢 看診中', distance: '950m', currentNumber: 8, waitingCount: 6 },
])

const filteredClinics = computed(() => {
  return clinicList.value.filter(c => c.dept === selectedDept.value)
})

// 預約表單
const selectedClinic = ref<Clinic | null>(null)
const selectedDoctor = ref('張醫師 (耳鼻喉專科)')
const visitType = ref<'revisit' | 'first'>('revisit')
const appointmentDate = ref('')
const appointmentSlot = ref('早診 09:00')
const appointmentConfirmed = ref(false)
const appointmentNumber = ref(12)

const doctorOptions = ['張醫師 (耳鼻喉專科)', '李醫師 (一般內科)', '王醫師 (家醫科)']
const slotOptions = ['早診 09:00', '午診 14:00', '晚診 18:30']

function openAppointmentForm(clinic: Clinic) {
  selectedClinic.value = clinic
  appointmentConfirmed.value = false
  currentAppointmentView.value = 'form'
}

function confirmAppointment() {
  appointmentNumber.value = Math.floor(Math.random() * 20) + 5
  appointmentConfirmed.value = true
  toastMessage.value = `掛號成功！您的掛號號碼為 ${appointmentNumber.value} 號`
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 3000)
}

/* ─── Tab 4: 處方簽與送藥 ─── */
type PrescriptionStep = 'upload' | 'recognizing' | 'detail' | 'fulfillment' | 'delivery'
const rxStep = ref<PrescriptionStep>('upload')

const rxReminderEnabled = ref(true)
const rxFulfillmentMethod = ref<'pharmacy' | 'delivery' | null>(null)
const rxDeliveryConfirmed = ref(false)
const rxDeliveryStage = ref<1 | 2 | 3>(1)

function uploadPrescription() {
  rxStep.value = 'recognizing'
  setTimeout(() => {
    rxStep.value = 'detail'
  }, 1000)
}

function proceedToFulfillment() {
  rxStep.value = 'fulfillment'
}

function selectFulfillment(method: 'pharmacy' | 'delivery') {
  rxFulfillmentMethod.value = method
}

function confirmDelivery() {
  rxDeliveryConfirmed.value = true
  rxStep.value = 'delivery'
  // 模擬進度
  rxDeliveryStage.value = 1
  setTimeout(() => { rxDeliveryStage.value = 2 }, 3000)
}

function reservePharmacy() {
  toastMessage.value = '藥局預約成功！請於營業時間內前往取藥'
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 3000)
}

/* ─── Tab 5: 藥物辨識 ─── */
type DrugView = 'search' | 'pharmacy'
const drugView = ref<DrugView>('search')

const drugSearchQuery = ref('')
const drugColorFilter = ref('')
const drugShapeFilter = ref('')

interface DrugItem {
  許可證字號: string
  中文品名: string
  英文品名: string
  形狀: string
  特殊劑型: string
  顏色: string
  特殊氣味: string
  刻痕: string
  外觀尺寸: string
  標註一: string | null
  標註二: string | null
  外觀圖檔連結: string
}

const drugDatabase = ref<DrugItem[]>([])
const drugLoading = ref(false)
const drugError = ref('')

const colorOptions = computed(() => {
  const colors = new Set<string>()
  drugDatabase.value.forEach(d => {
    if (d.顏色) {
      d.顏色.split(';;;').forEach(c => {
        const trimmed = c.trim()
        if (trimmed) colors.add(trimmed)
      })
    }
  })
  return ['', ...Array.from(colors).sort()]
})

const shapeOptions = computed(() => {
  const shapes = new Set<string>()
  drugDatabase.value.forEach(d => {
    if (d.形狀) {
      d.形狀.split(';;;').forEach(s => {
        const trimmed = s.trim()
        if (trimmed) shapes.add(trimmed)
      })
    }
  })
  return ['', ...Array.from(shapes).sort()]
})

onMounted(async () => {
  drugLoading.value = true
  drugError.value = ''
  try {
    const res = await fetch('/medicine/42_5.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    drugDatabase.value = await res.json()
  } catch (e: any) {
    drugError.value = e.message || '載入藥品資料失敗'
  } finally {
    drugLoading.value = false
  }
})

const drugSearchActive = ref(false)

function triggerDrugSearch() {
  drugSearchActive.value = true
}

const filteredDrugs = computed(() => {
  if (!drugSearchActive.value) return []
  return drugDatabase.value.filter(d => {
    const q = drugSearchQuery.value.toLowerCase()
    const matchQuery = !q ||
      d.中文品名?.toLowerCase().includes(q) ||
      d.英文品名?.toLowerCase().includes(q) ||
      d.許可證字號?.toLowerCase().includes(q) ||
      (d.標註一 && d.標註一.toLowerCase().includes(q)) ||
      (d.標註二 && d.標註二.toLowerCase().includes(q))
    const matchColor = !drugColorFilter.value || (d.顏色 && d.顏色.split(';;;').some(c => c.trim() === drugColorFilter.value))
    const matchShape = !drugShapeFilter.value || (d.形狀 && d.形狀.split(';;;').some(s => s.trim() === drugShapeFilter.value))
    return matchQuery && matchColor && matchShape
  })
})

// 藥局庫存子頁面
const selectedDrug = ref<DrugItem | null>(null)

interface PharmacyStock {
  name: string
  distance: string
  stock: 'high' | 'low' | 'none'
  stockLabel: string
  phone: string
}

const nearbyPharmacies = ref<PharmacyStock[]>([
  { name: '大樹藥局 信義店', distance: '300m', stock: 'high', stockLabel: '🟢 現貨充裕', phone: '02-2720-1234' },
  { name: '杏一藥局 莊敬店', distance: '650m', stock: 'low', stockLabel: '🟡 剩餘少量', phone: '02-2725-5678' },
  { name: '啄木鳥藥局 忠孝店', distance: '1.1km', stock: 'none', stockLabel: '🔴 目前缺貨', phone: '02-2771-9012' },
])

function openPharmacyView(drug: DrugItem) {
  selectedDrug.value = drug
  drugView.value = 'pharmacy'
}

function backToDrugSearch() {
  drugView.value = 'search'
}

function addToTracking(drug: DrugItem) {
  toastMessage.value = `已將「${drug.中文品名}」加入藥品追蹤！`
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}
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

        <!-- AI 同步健康追蹤卡片 -->
        <HealthTracker @data-updated="handleHealthDataUpdated" />

        <!-- 🥤 今日飲水追蹤 -->
        <div class="med-card med-card--rounded">
          <div class="med-card__header">
            <h3 class="med-card__title">🥤 今日飲水追蹤</h3>
            <button
              class="edit-pencil-btn"
              aria-label="編輯飲水設定"
              @click="isEditingWater = !isEditingWater"
            >✏️</button>
          </div>

          <!-- 編輯模式 -->
          <Transition name="card-slide">
            <div v-if="isEditingWater" class="edit-form">
              <label class="edit-form__label">
                每日目標水量 (ml)
                <input
                  v-model.number="dailyWaterGoal"
                  type="number"
                  min="500"
                  max="10000"
                  class="edit-form__input"
                />
              </label>
              <label class="edit-form__label">
                我的水壺/水杯容量 (ml)
                <input
                  v-model.number="cupCapacity"
                  type="number"
                  min="100"
                  max="3000"
                  class="edit-form__input"
                />
              </label>
              <button class="save-btn" @click="saveWaterSettings">
                💾 儲存水壺設定
              </button>
            </div>
          </Transition>

          <!-- 檢視模式 -->
          <Transition name="card-slide">
            <div v-if="!isEditingWater" class="view-mode">
              <p class="med-card__water-text">
                今日喝水：<strong>{{ waterIntake.toLocaleString() }}</strong> / {{ dailyWaterGoal.toLocaleString() }} ml
              </p>
              <div class="water-bar">
                <div class="water-bar__fill" :style="{ width: waterPercent + '%' }" />
              </div>
              <div class="water-actions">
                <button class="water-btn water-btn--cup" @click="addWater(cupCapacity)">
                  🥤 喝完一杯 (+{{ cupCapacity }}ml)
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 💊 保健品追蹤清單 -->
        <div class="med-card med-card--rounded">
          <div class="med-card__header">
            <h3 class="med-card__title">💊 保健品追蹤清單</h3>
            <button
              class="edit-pencil-btn"
              aria-label="編輯保健品清單"
              @click="isEditingSupplements = !isEditingSupplements"
            >✏️</button>
          </div>

          <!-- 編輯模式 -->
          <Transition name="card-slide">
            <div v-if="isEditingSupplements" class="edit-form">
              <TransitionGroup name="list-item" tag="div" class="supplement-edit-list">
                <div
                  v-for="(item, idx) in supplements"
                  :key="idx"
                  class="supplement-edit-row"
                >
                  <input
                    v-model="item.name"
                    type="text"
                    class="edit-form__input edit-form__input--name"
                    placeholder="名稱（如 B群）"
                  />
                  <select v-model="item.frequency" class="edit-form__select">
                    <option v-for="opt in frequencyOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select v-model="item.timing" class="edit-form__select">
                    <option v-for="opt in timingOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <div class="alarm-group">
                    <input
                      v-model="item.alarmTime"
                      type="time"
                      class="edit-form__input edit-form__input--time"
                    />
                    <label class="alarm-toggle">
                      <input
                        v-model="item.alarmEnabled"
                        type="checkbox"
                        class="alarm-toggle__checkbox"
                      />
                      <span class="alarm-toggle__label">{{ item.alarmEnabled ? '🔔' : '🔕' }}</span>
                    </label>
                  </div>
                  <button
                    class="delete-row-btn"
                    aria-label="刪除此保健品"
                    @click="removeSupplement(idx)"
                  >🗑️</button>
                </div>
              </TransitionGroup>

              <div class="supplement-edit-actions">
                <button class="add-row-btn" @click="addSupplement">
                  ➕ 新增保健品/藥品
                </button>
                <button class="save-btn" @click="saveSupplements">
                  💾 儲存清單並連動鬧鐘
                </button>
              </div>
            </div>
          </Transition>

          <!-- 檢視模式 -->
          <Transition name="card-slide">
            <div v-if="!isEditingSupplements" class="supplement-list">
              <div v-for="(item, idx) in supplements" :key="idx" class="supplement-item">
                <div class="supplement-item__info">
                  <span class="supplement-item__name">{{ item.name }}</span>
                  <span class="supplement-item__badge">{{ item.timing }}</span>
                  <span class="supplement-item__freq">{{ item.frequency }}</span>
                  <span v-if="item.alarmEnabled" class="supplement-item__alarm">⏰ {{ item.alarmTime }}</span>
                </div>
                <button
                  class="supplement-toggle"
                  :class="{ 'supplement-toggle--taken': item.taken }"
                  @click="item.taken = !item.taken"
                >
                  {{ item.taken ? '✅ 已服用' : '💊 點擊打卡' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 🤖 今日 AI 健康提醒卡片 -->
        <div class="ai-health-card">
          <h3 class="ai-health-card__title">🤖 今日 AI 健康提醒</h3>
          <p class="ai-health-card__text">
            今日台北氣溫較高，請注意多補充水分！昨晚睡眠稍不足，建議補充電解質與維生素 B 群。
          </p>
        </div>
      </section>

      <!-- ═══ Tab 2: AI 智慧症狀分析 ═══ -->
      <section v-else-if="activeTab === 'symptom'" class="tab-content">
        <DiagnosisFlow />
      </section>

      <!-- ═══ Tab 3: 門診掛號 ═══ -->
      <section v-else-if="activeTab === 'clinic'" class="tab-content">

        <!-- 列表視圖 -->
        <Transition name="page-slide" mode="out-in">
          <div v-if="currentAppointmentView === 'list'" key="list" class="appointment-list-view">

            <!-- 科別篩選 Pill Bar -->
            <div class="dept-pill-bar">
              <button
                v-for="dept in deptOptions"
                :key="dept"
                class="dept-pill"
                :class="{ 'dept-pill--active': selectedDept === dept }"
                @click="selectedDept = dept"
              >
                {{ dept }}
              </button>
            </div>

            <!-- 診所卡片清單 -->
            <div v-for="clinic in filteredClinics" :key="clinic.name" class="clinic-card-v2">
              <div class="clinic-card-v2__top">
                <div class="clinic-card-v2__info">
                  <h4 class="clinic-card-v2__name">🏥 {{ clinic.name }}</h4>
                  <div class="clinic-card-v2__meta">
                    <span class="clinic-card-v2__status">{{ clinic.status }}</span>
                    <span class="clinic-card-v2__distance">📍 {{ clinic.distance }}</span>
                  </div>
                </div>
              </div>
              <div class="clinic-card-v2__badges">
                <span class="clinic-badge">目前叫號：{{ clinic.currentNumber }} 號</span>
                <span class="clinic-badge">現場等候：{{ clinic.waitingCount }} 人</span>
              </div>
              <div class="clinic-card-v2__actions">
                <button class="clinic-action-btn clinic-action-btn--secondary">
                  📋 實時叫號
                </button>
                <button class="clinic-action-btn clinic-action-btn--primary" @click="openAppointmentForm(clinic)">
                  🗓️ 門診預約
                </button>
              </div>
            </div>

            <p v-if="filteredClinics.length === 0" class="no-clinic-text">
              目前此科別無可預約診所
            </p>
          </div>

          <!-- 預約表單視圖 -->
          <div v-else key="form" class="appointment-form-view">

            <!-- 頂部導覽 -->
            <div class="form-nav">
              <button class="form-nav__back" @click="currentAppointmentView = 'list'">
                ← 返回
              </button>
              <span class="form-nav__title">🏥 {{ selectedClinic?.name }}</span>
            </div>

            <!-- AI 提示列 -->
            <div class="ai-prefill-hint">
              🤖 AI 已為您預填病歷資料與建議科別
            </div>

            <!-- 就診人資料 -->
            <div class="patient-info-card">
              <h4 class="patient-info-card__title">👤 就診人資料</h4>
              <div class="patient-info-card__rows">
                <div class="patient-row">
                  <span class="patient-row__label">就診姓名</span>
                  <span class="patient-row__value">王小明</span>
                </div>
                <div class="patient-row">
                  <span class="patient-row__label">身分證字號</span>
                  <span class="patient-row__value">A123***789</span>
                </div>
                <div class="patient-row">
                  <span class="patient-row__label">電話</span>
                  <span class="patient-row__value">0912-345-678</span>
                </div>
              </div>
            </div>

            <!-- 門診選項卡片 -->
            <div class="appointment-options-card">
              <h4 class="appointment-options-card__title">📋 門診選項</h4>

              <!-- 選擇醫師 -->
              <label class="form-field">
                <span class="form-field__label">選擇醫師</span>
                <select v-model="selectedDoctor" class="form-field__select">
                  <option v-for="doc in doctorOptions" :key="doc" :value="doc">{{ doc }}</option>
                </select>
              </label>

              <!-- 就診類別 -->
              <div class="form-field">
                <span class="form-field__label">就診類別</span>
                <div class="visit-type-group">
                  <button
                    class="visit-type-btn"
                    :class="{ 'visit-type-btn--active': visitType === 'revisit' }"
                    @click="visitType = 'revisit'"
                  >複診</button>
                  <button
                    class="visit-type-btn"
                    :class="{ 'visit-type-btn--active': visitType === 'first' }"
                    @click="visitType = 'first'"
                  >初診</button>
                </div>
              </div>

              <!-- 選擇日期 -->
              <label class="form-field">
                <span class="form-field__label">選擇日期</span>
                <input v-model="appointmentDate" type="date" class="form-field__input" />
              </label>

              <!-- 選擇時段 -->
              <div class="form-field">
                <span class="form-field__label">選擇時段</span>
                <div class="slot-group">
                  <button
                    v-for="slot in slotOptions"
                    :key="slot"
                    class="slot-btn"
                    :class="{ 'slot-btn--active': appointmentSlot === slot }"
                    @click="appointmentSlot = slot"
                  >{{ slot }}</button>
                </div>
              </div>
            </div>

            <!-- 確認送出 -->
            <button class="confirm-appointment-btn" @click="confirmAppointment">
              ✅ 確認送出預約掛號
            </button>

            <!-- 預約成功提示 -->
            <Transition name="result-slide">
              <div v-if="appointmentConfirmed" class="appointment-success">
                <span class="appointment-success__icon">🎉</span>
                <p class="appointment-success__text">
                  掛號成功！您的掛號號碼為 <strong>{{ appointmentNumber }} 號</strong>
                </p>
              </div>
            </Transition>
          </div>
        </Transition>

      </section>

      <!-- ═══ Tab 4: 處方簽與送藥 ═══ -->
      <section v-else-if="activeTab === 'prescription'" class="tab-content">

        <!-- Step 0: 📷 拍照上傳處方簽 -->
        <div v-if="rxStep === 'upload'" class="rx-card">
          <h3 class="rx-card__title">📷 拍照上傳處方簽</h3>
          <div class="upload-area" @click="uploadPrescription">
            <span class="upload-area__icon">📄</span>
            <span class="upload-area__text">點擊拍照或上傳處方簽</span>
          </div>
        </div>

        <!-- Step 0.5: AI 辨識動畫 -->
        <div v-if="rxStep === 'recognizing'" class="rx-card rx-recognizing">
          <div class="rx-recognizing__spinner" />
          <p class="rx-recognizing__text">AI 正在解析慢箋內容與領藥次數...</p>
        </div>

        <!-- Step 1: AI 慢箋辨識與提醒確認 -->
        <Transition name="result-slide">
          <div v-if="rxStep === 'detail'" class="rx-detail-section">
            <div class="rx-card">
              <h3 class="rx-card__title">📑 AI 慢箋辨識結果</h3>
              <div class="rx-status-badges">
                <span class="rx-badge rx-badge--primary">第 2 次領藥 (共 3 次)</span>
                <span class="rx-badge rx-badge--outline">建議領藥區間：2026/08/05 - 08/12</span>
              </div>

              <!-- 藥品清單 -->
              <div class="rx-drug-list">
                <div class="rx-drug-item">
                  <span class="rx-drug-item__name">💊 降血糖藥 Metformin 500mg</span>
                  <span class="rx-drug-item__dosage">每日 2 次 / 飯後</span>
                </div>
                <div class="rx-drug-item">
                  <span class="rx-drug-item__name">💊 降血壓藥 Amlodipine 5mg</span>
                  <span class="rx-drug-item__dosage">每日 1 次 / 早起</span>
                </div>
              </div>

              <!-- 領藥提醒 -->
              <div class="rx-reminder-row">
                <span class="rx-reminder-row__text">🔔 於領藥首日 (08/05) 發送取藥提醒推播</span>
                <label class="rx-switch">
                  <input v-model="rxReminderEnabled" type="checkbox" class="rx-switch__input" />
                  <span class="rx-switch__slider" />
                </label>
              </div>
            </div>

            <button class="rx-next-btn" @click="proceedToFulfillment">
              ➔ 下一步：選擇領藥方式
            </button>
          </div>
        </Transition>

        <!-- Step 2: 選擇領藥模式 -->
        <Transition name="result-slide">
          <div v-if="rxStep === 'fulfillment'" class="rx-fulfillment-section">
            <div class="rx-card">
              <h3 class="rx-card__title">🛵 選擇領藥方式</h3>
              <div class="rx-fulfillment-options">
                <button
                  class="rx-option-card"
                  :class="{ 'rx-option-card--active': rxFulfillmentMethod === 'pharmacy' }"
                  @click="selectFulfillment('pharmacy')"
                >
                  <span class="rx-option-card__icon">🏪</span>
                  <span class="rx-option-card__label">預約合作藥局親領</span>
                </button>
                <button
                  class="rx-option-card"
                  :class="{ 'rx-option-card--active': rxFulfillmentMethod === 'delivery' }"
                  @click="selectFulfillment('delivery')"
                >
                  <span class="rx-option-card__icon">🚚</span>
                  <span class="rx-option-card__label">申請專人宅配送藥到府</span>
                </button>
              </div>
            </div>

            <!-- 藥局親領詳情 -->
            <Transition name="card-slide">
              <div v-if="rxFulfillmentMethod === 'pharmacy'" class="rx-card">
                <h4 class="rx-card__subtitle">📍 附近有庫存的合作藥局</h4>
                <div class="rx-pharmacy-item" @click="reservePharmacy">
                  <div class="rx-pharmacy-item__info">
                    <span class="rx-pharmacy-item__name">大樹藥局 信義店</span>
                    <span class="rx-pharmacy-item__meta">距離 300m · 🟢 有現貨</span>
                  </div>
                  <button class="rx-pharmacy-item__btn">預約保留</button>
                </div>
                <div class="rx-pharmacy-item" @click="reservePharmacy">
                  <div class="rx-pharmacy-item__info">
                    <span class="rx-pharmacy-item__name">啄木鳥藥局 忠孝店</span>
                    <span class="rx-pharmacy-item__meta">距離 650m · 🟢 有現貨</span>
                  </div>
                  <button class="rx-pharmacy-item__btn">預約保留</button>
                </div>
              </div>
            </Transition>

            <!-- 宅配送藥表單 -->
            <Transition name="card-slide">
              <div v-if="rxFulfillmentMethod === 'delivery'" class="rx-card">
                <h4 class="rx-card__subtitle">📦 配送資訊確認</h4>
                <div class="rx-delivery-info">
                  <div class="rx-info-row">
                    <span class="rx-info-row__label">配送地址</span>
                    <span class="rx-info-row__value">台北市信義區信義路五段 7 號 12 樓</span>
                  </div>
                  <div class="rx-info-row">
                    <span class="rx-info-row__label">聯絡電話</span>
                    <span class="rx-info-row__value">0912-345-678</span>
                  </div>
                </div>
                <button class="rx-next-btn" @click="confirmDelivery">
                  ✅ 確認無誤，送出宅配送藥申請
                </button>
              </div>
            </Transition>
          </div>
        </Transition>

        <!-- Step 3: 宅配送藥進度追蹤 -->
        <Transition name="result-slide">
          <div v-if="rxStep === 'delivery'" class="rx-card">
            <h3 class="rx-card__title">📦 宅配送藥進度</h3>
            <div class="rx-timeline">
              <div class="rx-timeline-item" :class="{ 'rx-timeline-item--done': rxDeliveryStage >= 1 }">
                <span class="rx-timeline-item__dot">✅</span>
                <span class="rx-timeline-item__text">處方籤藥師核對與調劑中</span>
              </div>
              <div class="rx-timeline-item" :class="{ 'rx-timeline-item--done': rxDeliveryStage >= 2 }">
                <span class="rx-timeline-item__dot">🛵</span>
                <span class="rx-timeline-item__text">專人送藥中 (預計 14:30 前送達)</span>
              </div>
              <div class="rx-timeline-item" :class="{ 'rx-timeline-item--done': rxDeliveryStage >= 3 }">
                <span class="rx-timeline-item__dot">📦</span>
                <span class="rx-timeline-item__text">簽收與藥師遠端衛教確認</span>
              </div>
            </div>
          </div>
        </Transition>

      </section>

      <!-- ═══ Tab 5: 藥物辨識 ═══ -->
      <section v-else-if="activeTab === 'pharmacy'" class="tab-content">

        <Transition name="page-slide" mode="out-in">
          <!-- 搜尋視圖 -->
          <div v-if="drugView === 'search'" key="drug-search" class="drug-search-view">

            <!-- 搜尋與篩選 -->
            <div class="drug-search-card">
              <h3 class="drug-search-card__title">🔍 藥物外觀辨識搜尋</h3>
              <input
                v-model="drugSearchQuery"
                class="drug-search-input"
                placeholder="搜尋藥名、許可證字號或藥錠刻字 (如：FY T061)..."
              />
              <div class="drug-filter-row">
                <select v-model="drugColorFilter" class="drug-filter-select">
                  <option value="">顏色（全部）</option>
                  <option v-for="c in colorOptions.slice(1)" :key="c" :value="c">{{ c }}</option>
                </select>
                <select v-model="drugShapeFilter" class="drug-filter-select">
                  <option value="">形狀（全部）</option>
                  <option v-for="s in shapeOptions.slice(1)" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <button class="drug-search-btn" @click="triggerDrugSearch">
                🔍 搜尋藥品
              </button>
            </div>

            <!-- 載入中 -->
            <div v-if="drugLoading" class="drug-loading-state">
              <div class="drug-loading-spinner" />
              <p class="drug-loading-text">正在載入藥品資料庫...</p>
            </div>

            <!-- 載入錯誤 -->
            <div v-else-if="drugError" class="drug-error-state">
              <p class="drug-error-text">⚠️ {{ drugError }}</p>
            </div>

            <!-- 尚未搜尋 -->
            <div v-else-if="!drugSearchActive" class="drug-empty-text">
              請輸入搜尋條件後點擊「搜尋藥品」按鈕
            </div>

            <!-- 搜尋結果 -->
            <template v-else>
              <div v-for="(drug, idx) in filteredDrugs" :key="drug.許可證字號 + idx" class="drug-result-card">
                <div class="drug-result-card__image">
                  <img
                    :src="drug.外觀圖檔連結"
                    :alt="drug.中文品名"
                    class="drug-result-card__img"
                    loading="lazy"
                  />
                </div>
                <div class="drug-result-card__body">
                  <h4 class="drug-result-card__name-cn">{{ drug.中文品名 }}</h4>
                  <p class="drug-result-card__name-en">{{ drug.英文品名 }}</p>
                  <p class="drug-result-card__license">{{ drug.許可證字號 }}</p>
                  <div class="drug-feature-badges">
                    <span class="drug-badge">⚪ {{ drug.顏色 }}</span>
                    <span class="drug-badge">🟢 {{ drug.形狀 }}</span>
                    <span class="drug-badge">✍️ {{ drug.刻痕 }}</span>
                    <span class="drug-badge">📏 {{ drug.外觀尺寸 }}mm</span>
                  </div>
                  <div v-if="drug.標註一 || drug.標註二" class="drug-imprint-info">
                    <span v-if="drug.標註一" class="drug-badge">🔤 {{ drug.標註一 }}</span>
                    <span v-if="drug.標註二" class="drug-badge">🔤 {{ drug.標註二 }}</span>
                  </div>
                  <div class="drug-result-card__actions">
                    <button class="drug-action-btn drug-action-btn--secondary" @click="addToTracking(drug)">
                      ⭐ 加入追蹤
                    </button>
                    <button class="drug-action-btn drug-action-btn--primary" @click="openPharmacyView(drug)">
                      🏪 查詢現貨藥局
                    </button>
                  </div>
                </div>
              </div>

              <p v-if="filteredDrugs.length === 0" class="drug-empty-text">
                查無符合條件的藥品，請調整搜尋條件
              </p>
            </template>
          </div>

          <!-- 藥局庫存視圖 -->
          <div v-else key="drug-pharmacy" class="drug-pharmacy-view">
            <button class="drug-pharmacy-back" @click="backToDrugSearch">
              ← 返回藥物搜尋列表
            </button>

            <div class="drug-pharmacy-header">
              <h3 class="drug-pharmacy-header__title">
                備有【{{ selectedDrug?.中文品名 }}】現貨之健保藥局
              </h3>
            </div>

            <div v-for="pharm in nearbyPharmacies" :key="pharm.name" class="pharmacy-stock-card">
              <div class="pharmacy-stock-card__top">
                <div class="pharmacy-stock-card__info">
                  <span class="pharmacy-stock-card__name">🏪 {{ pharm.name }}</span>
                  <span class="pharmacy-stock-card__distance">📍 {{ pharm.distance }}</span>
                </div>
                <span
                  class="pharmacy-stock-badge"
                  :class="{
                    'pharmacy-stock-badge--high': pharm.stock === 'high',
                    'pharmacy-stock-badge--low': pharm.stock === 'low',
                    'pharmacy-stock-badge--none': pharm.stock === 'none',
                  }"
                >{{ pharm.stockLabel }}</span>
              </div>
              <div class="pharmacy-stock-card__actions">
                <a href="#" class="pharmacy-action-btn">🗺️ 導航</a>
                <a :href="'tel:' + pharm.phone" class="pharmacy-action-btn">📞 電話聯絡</a>
              </div>
            </div>
          </div>
        </Transition>

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

.med-card--rounded {
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.med-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.med-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

/* ═══ 編輯鉛筆按鈕 ═══ */
.edit-pencil-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.edit-pencil-btn:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  transform: scale(1.08);
}

/* ═══ 編輯表單共用 ═══ */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #44403c;
}

.edit-form__input {
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
.edit-form__input:focus {
  border-color: var(--color-primary);
}

.edit-form__input--name {
  flex: 1;
}

.edit-form__input--time {
  width: 110px;
}

.edit-form__select {
  padding: 9px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
}
.edit-form__select:focus {
  border-color: var(--color-primary);
}

/* 儲存按鈕 */
.save-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.save-btn:hover {
  background: var(--color-primary-dark);
}
.save-btn:active {
  transform: scale(0.97);
}

/* ═══ 卡片切換動畫 ═══ */
.card-slide-enter-active,
.card-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.card-slide-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}
.card-slide-enter-to {
  opacity: 1;
  max-height: 600px;
  transform: translateY(0);
}
.card-slide-leave-from {
  opacity: 1;
  max-height: 600px;
  transform: translateY(0);
}
.card-slide-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}

/* 列表項目增刪動畫 */
.list-item-enter-active,
.list-item-leave-active {
  transition: all 0.3s ease;
}
.list-item-enter-from,
.list-item-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

/* ═══ Tab 1: 飲水追蹤 ═══ */
.view-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
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
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.water-btn:hover {
  background: var(--color-primary-dark);
}
.water-btn:active {
  background: var(--color-primary-dark);
  transform: scale(0.97);
}

.water-btn--cup {
  background: linear-gradient(135deg, #0d9488, #14b8a6);
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
  padding: 12px 14px;
  background: #f0fdfa;
  border-radius: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.supplement-item__info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.supplement-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.supplement-item__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 9999px;
  background: #dbeafe;
  color: #1e40af;
}

.supplement-item__freq {
  font-size: 11px;
  color: #78716c;
}

.supplement-item__alarm {
  font-size: 11px;
  font-weight: 600;
  color: #d97706;
}

.supplement-toggle {
  padding: 8px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.supplement-toggle:hover {
  border-color: var(--color-primary);
}

.supplement-toggle--taken {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* 保健品編輯列表 */
.supplement-edit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.supplement-edit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.alarm-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alarm-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.alarm-toggle__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.alarm-toggle__label {
  font-size: 16px;
}

.delete-row-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fecaca;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.delete-row-btn:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.supplement-edit-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.add-row-btn {
  padding: 10px 16px;
  border: 2px dashed #99f6e4;
  border-radius: 12px;
  background: #f0fdfa;
  color: var(--color-primary-dark);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.add-row-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
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

/* ═══ Tab 2: AI 智慧症狀分析 ═══ */
.symptom-input-card {
  background: #ffffff;
  border-radius: 1rem;
  padding: 20px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.symptom-input-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1c1917;
}

.symptom-input-card__subtitle {
  margin: 0;
  font-size: 13px;
  color: #78716c;
  line-height: 1.5;
}

.input-shortcuts {
  display: flex;
  gap: 8px;
}

.shortcut-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  color: #44403c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.shortcut-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.symptom-textarea {
  width: 100%;
  padding: 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.symptom-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.symptom-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.symptom-pill {
  padding: 7px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #44403c;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.symptom-pill:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.analyze-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.analyze-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.35);
}
.analyze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.analyze-btn--loading {
  background: linear-gradient(135deg, #115e59, #0d9488);
}

.analyze-btn__spinner {
  width: 16px;
  height: 16px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* AI 分析結果卡片 */
.ai-result-card {
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border-radius: 1rem;
  padding: 20px 16px;
  border: 1px solid #99f6e4;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.1);
}

.ai-result-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary-dark);
}

/* 機率條 */
.diagnosis-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diagnosis-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diagnosis-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diagnosis-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.diagnosis-item__pct {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
}

.diagnosis-bar {
  height: 10px;
  background: #e0f2fe;
  border-radius: 9999px;
  overflow: hidden;
}

.diagnosis-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
  border-radius: 9999px;
  transition: width 0.6s ease;
}

.diagnosis-bar__fill--secondary {
  background: linear-gradient(90deg, #0ea5e9, #67e8f9);
}

/* 推薦科別 */
.recommended-dept {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.recommended-dept__label {
  font-size: 13px;
  font-weight: 600;
  color: #44403c;
}

.recommended-dept__badge {
  padding: 5px 12px;
  border-radius: 9999px;
  background: #0d9488;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.recommended-dept__badge--alt {
  background: #0ea5e9;
}

/* AI 照護建議 */
.ai-advice {
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
}

.ai-advice__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: #44403c;
}

.ai-advice__text {
  margin: 0;
  font-size: 13px;
  color: #57534e;
  line-height: 1.7;
}

/* 一鍵跳轉門診掛號 */
.goto-clinic-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.goto-clinic-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(30, 64, 175, 0.3);
}

/* 結果展開動畫 */
.result-slide-enter-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.result-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.result-slide-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.result-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 免責聲明 */
.disclaimer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disclaimer-text {
  margin: 0;
  font-size: 11px;
  color: #a8a29e;
  line-height: 1.6;
  text-align: center;
}

.emergency-call-card {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.emergency-call-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
  text-align: center;
}

.emergency-call-card__actions {
  display: flex;
  gap: 10px;
}

.emergency-call-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}

.emergency-call-btn--119 {
  background: #dc2626;
  color: #fff;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}
.emergency-call-btn--119:hover {
  background: #b91c1c;
}

.emergency-call-btn--contact {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border: 1.5px solid rgba(220, 38, 38, 0.3);
}
.emergency-call-btn--contact:hover {
  background: rgba(220, 38, 38, 0.18);
}

/* ═══ Tab 3: 門診掛號 ═══ */
.appointment-list-view,
.appointment-form-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 科別篩選 Pill Bar */
.dept-pill-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.dept-pill-bar::-webkit-scrollbar { display: none; }

.dept-pill {
  padding: 8px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9999px;
  background: #fff;
  color: #78716c;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.dept-pill--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.dept-pill:hover:not(.dept-pill--active) {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

/* 診所卡片 V2 */
.clinic-card-v2 {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clinic-card-v2__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.clinic-card-v2__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.clinic-card-v2__name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.clinic-card-v2__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clinic-card-v2__status {
  font-size: 12px;
  font-weight: 600;
  color: #16a34a;
}

.clinic-card-v2__distance {
  font-size: 12px;
  color: #78716c;
}

.clinic-card-v2__badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.clinic-badge {
  padding: 4px 10px;
  border-radius: 8px;
  background: #f0fdfa;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.clinic-card-v2__actions {
  display: flex;
  gap: 8px;
}

.clinic-action-btn {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.clinic-action-btn--secondary {
  background: #f1f5f9;
  color: #44403c;
}
.clinic-action-btn--secondary:hover {
  background: #e2e8f0;
}

.clinic-action-btn--primary {
  background: var(--color-primary);
  color: #fff;
}
.clinic-action-btn--primary:hover {
  background: var(--color-primary-dark);
}

.no-clinic-text {
  text-align: center;
  font-size: 13px;
  color: #a8a29e;
  padding: 20px;
}

/* 頁面轉場動畫 */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 預約表單視圖 */
.form-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-nav__back {
  padding: 8px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.form-nav__back:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.form-nav__title {
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.ai-prefill-hint {
  padding: 12px 16px;
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border: 1px solid #99f6e4;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

/* 就診人資料卡片 */
.patient-info-card {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.patient-info-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
}

.patient-info-card__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.patient-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.patient-row__label {
  font-size: 12px;
  color: #78716c;
}

.patient-row__value {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

/* 門診選項卡片 */
.appointment-options-card {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.appointment-options-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1c1917;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field__label {
  font-size: 12px;
  font-weight: 600;
  color: #44403c;
}

.form-field__select,
.form-field__input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.form-field__select:focus,
.form-field__input:focus {
  border-color: var(--color-primary);
}

.visit-type-group {
  display: flex;
  gap: 8px;
}

.visit-type-btn {
  flex: 1;
  padding: 10px 14px;
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
.visit-type-btn--active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.slot-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.slot-btn {
  padding: 9px 14px;
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
.slot-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* 確認按鈕 */
.confirm-appointment-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.confirm-appointment-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.35);
}

/* 預約成功 */
.appointment-success {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border: 1px solid #99f6e4;
  border-radius: 1rem;
}

.appointment-success__icon {
  font-size: 28px;
}

.appointment-success__text {
  margin: 0;
  font-size: 14px;
  color: var(--color-primary-dark);
  font-weight: 600;
}

/* ═══ Tab 4: 處方簽與送藥 ═══ */
.rx-card {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rx-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.rx-card__subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #44403c;
}

.rx-detail-section,
.rx-fulfillment-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 上傳區域 */
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

/* AI 辨識動畫 */
.rx-recognizing {
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.rx-recognizing__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(13, 148, 136, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.rx-recognizing__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

/* 慢箋狀態 Badges */
.rx-status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rx-badge {
  padding: 5px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.rx-badge--primary {
  background: var(--color-primary);
  color: #fff;
}

.rx-badge--outline {
  background: #f0fdfa;
  color: var(--color-primary-dark);
  border: 1.5px solid #99f6e4;
}

/* 藥品清單 */
.rx-drug-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rx-drug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 4px;
}

.rx-drug-item__name {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

.rx-drug-item__dosage {
  font-size: 12px;
  color: #78716c;
}

/* 提醒開關列 */
.rx-reminder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border-radius: 10px;
  border: 1px solid #99f6e4;
}

.rx-reminder-row__text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

/* Toggle Switch */
.rx-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.rx-switch__input {
  opacity: 0;
  width: 0;
  height: 0;
}

.rx-switch__slider {
  position: absolute;
  inset: 0;
  background: #e2e8f0;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s;
}

.rx-switch__slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.rx-switch__input:checked + .rx-switch__slider {
  background: var(--color-primary);
}

.rx-switch__input:checked + .rx-switch__slider::before {
  transform: translateX(20px);
}

/* 下一步按鈕 */
.rx-next-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.rx-next-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.35);
}

/* 領藥選項卡片 */
.rx-fulfillment-options {
  display: flex;
  gap: 10px;
}

.rx-option-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.rx-option-card:hover {
  border-color: var(--color-primary);
}
.rx-option-card--active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);
}

.rx-option-card__icon {
  font-size: 28px;
}

.rx-option-card__label {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
  text-align: center;
}

/* 藥局列表 */
.rx-pharmacy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.rx-pharmacy-item:hover {
  background: #f0fdfa;
}

.rx-pharmacy-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rx-pharmacy-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.rx-pharmacy-item__meta {
  font-size: 12px;
  color: #78716c;
}

.rx-pharmacy-item__btn {
  padding: 7px 14px;
  border: 1.5px solid var(--color-primary);
  border-radius: 9999px;
  background: #fff;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.rx-pharmacy-item__btn:hover {
  background: var(--color-primary);
  color: #fff;
}

/* 宅配資訊 */
.rx-delivery-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rx-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.rx-info-row__label {
  font-size: 12px;
  color: #78716c;
}

.rx-info-row__value {
  font-size: 13px;
  font-weight: 600;
  color: #1c1917;
}

/* 配送時間軸 */
.rx-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 4px;
}

.rx-timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 0;
  position: relative;
  opacity: 0.45;
  transition: opacity 0.3s;
}

.rx-timeline-item--done {
  opacity: 1;
}

.rx-timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 11px;
  top: 38px;
  width: 2px;
  height: calc(100% - 24px);
  background: #e2e8f0;
}

.rx-timeline-item--done:not(:last-child)::after {
  background: var(--color-primary);
}

.rx-timeline-item__dot {
  font-size: 18px;
  flex-shrink: 0;
}

.rx-timeline-item__text {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
  padding-top: 2px;
}

/* ═══ Tab 5: 藥物辨識 ═══ */
.drug-search-view,
.drug-pharmacy-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.drug-search-card {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drug-search-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.drug-search-input {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.drug-search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.drug-filter-row {
  display: flex;
  gap: 8px;
}

.drug-filter-select {
  flex: 1;
  min-width: 0;
  max-width: 50%;
  padding: 9px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.drug-filter-select:focus {
  border-color: var(--color-primary);
}

.drug-search-btn {
  width: 100%;
  padding: 12px 20px;
  margin-top: 10px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.drug-search-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.35);
}

/* 藥品結果卡片 - 圖片優先 */
.drug-result-card {
  background: #fff;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.drug-result-card__image {
  width: 100%;
  height: 160px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.drug-result-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s;
}
.drug-result-card:hover .drug-result-card__img {
  transform: scale(1.03);
}

.drug-result-card__body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drug-result-card__name-cn {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.drug-result-card__name-en {
  margin: 0;
  font-size: 12px;
  color: #78716c;
}

.drug-result-card__license {
  margin: 0;
  font-size: 11px;
  color: #a8a29e;
}

.drug-feature-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.drug-badge {
  padding: 4px 10px;
  border-radius: 8px;
  background: #f0fdfa;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.drug-result-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.drug-action-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.drug-action-btn--secondary {
  background: #f1f5f9;
  color: #44403c;
}
.drug-action-btn--secondary:hover {
  background: #e2e8f0;
}

.drug-action-btn--primary {
  background: var(--color-primary);
  color: #fff;
}
.drug-action-btn--primary:hover {
  background: var(--color-primary-dark);
}

.drug-empty-text {
  text-align: center;
  font-size: 13px;
  color: #a8a29e;
  padding: 20px;
}

/* 藥品載入/錯誤狀態 */
.drug-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 16px;
}

.drug-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(13, 148, 136, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.drug-loading-text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.drug-error-state {
  padding: 20px;
  text-align: center;
}

.drug-error-text {
  margin: 0;
  font-size: 14px;
  color: #dc2626;
  font-weight: 600;
}

.drug-imprint-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

/* 藥局庫存視圖 */
.drug-pharmacy-back {
  padding: 8px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.15s;
}
.drug-pharmacy-back:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.drug-pharmacy-header {
  padding: 14px 16px;
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border: 1px solid #99f6e4;
  border-radius: 1rem;
}

.drug-pharmacy-header__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary-dark);
  line-height: 1.5;
}

.pharmacy-stock-card {
  background: #fff;
  border-radius: 1rem;
  padding: 14px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pharmacy-stock-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pharmacy-stock-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pharmacy-stock-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.pharmacy-stock-card__distance {
  font-size: 12px;
  color: #78716c;
}

.pharmacy-stock-badge {
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.pharmacy-stock-badge--high {
  background: #d1fae5;
  color: #065f46;
}

.pharmacy-stock-badge--low {
  background: #fef9c3;
  color: #92400e;
}

.pharmacy-stock-badge--none {
  background: #fee2e2;
  color: #991b1b;
}

.pharmacy-stock-card__actions {
  display: flex;
  gap: 8px;
}

.pharmacy-action-btn {
  flex: 1;
  padding: 9px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #44403c;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.pharmacy-action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
