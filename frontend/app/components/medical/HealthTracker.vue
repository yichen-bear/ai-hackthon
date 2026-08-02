<script setup lang="ts">
import { useHealthTracker } from '~/composables/useHealthTracker'

const {
  data,
  loading,
  error,
  waterLog,
  waterLogLoading,
  fetchLatest,
  saveData,
  fetchTodayWaterLog,
  addWaterIntake,
  resetWaterLog,
} = useHealthTracker()

// 手動設定表單
const isEditing = ref(false)
const editWeight = ref<number | null>(null)
const editDailyTarget = ref<number | null>(null)
const editBottleCapacity = ref<number | null>(null)
const savingSettings = ref(false)

// 飲水操作狀態
const addingWater = ref(false)
const resetting = ref(false)

// Toast 通知
const showToast = ref(false)
const toastMessage = ref('')

function toast(msg: string) {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 2500)
}

// 計算飲水百分比
const waterPercent = computed(() => {
  const target = data.value?.water?.dailyTarget
  if (!target) return 0
  return Math.min(100, (waterLog.value.intake / target) * 100)
})

// 開啟設定編輯模式
function openEdit() {
  editWeight.value = data.value?.water?.weight ?? null
  editDailyTarget.value = data.value?.water?.dailyTarget ?? null
  editBottleCapacity.value = data.value?.water?.bottleCapacity ?? null
  isEditing.value = true
}

// 儲存設定 (寫入資料庫)
async function saveSettings() {
  savingSettings.value = true
  const waterPayload: Record<string, any> = {}
  if (editWeight.value && editWeight.value > 0) waterPayload.weight = editWeight.value
  if (editDailyTarget.value && editDailyTarget.value > 0) waterPayload.dailyTarget = editDailyTarget.value
  if (editBottleCapacity.value && editBottleCapacity.value > 0) waterPayload.bottleCapacity = editBottleCapacity.value

  // 如果沒手動填目標，但填了體重，自動算
  if (!waterPayload.dailyTarget && waterPayload.weight) {
    waterPayload.dailyTarget = waterPayload.weight * 35
  }

  const result = await saveData({ water: waterPayload })
  savingSettings.value = false

  if (result.success) {
    isEditing.value = false
    toast('飲水設定已儲存！')
  } else {
    toast('儲存失敗：' + (result.message || '未知錯誤'))
  }
}

// 喝水 (累加到資料庫，並立即更新 UI)
async function drinkWater() {
  const capacity = data.value?.water?.bottleCapacity
  if (!capacity) {
    toast('請先設定水壺容量')
    return
  }
  addingWater.value = true

  // 樂觀更新：先在 UI 上加水，讓使用者立即看到進度條變化
  waterLog.value = { ...waterLog.value, intake: waterLog.value.intake + capacity }

  const result = await addWaterIntake(capacity)
  addingWater.value = false

  if (result.success) {
    // API 成功，用伺服器回傳的精確值同步
    waterLog.value = result.data
    toast(`+${capacity}ml 已記錄！`)
  } else {
    // API 失敗但本地已經加了，保留本地值讓 UI 仍可操作
    toast(`+${capacity}ml（離線記錄，待同步）`)
  }
}

// 歸零
async function handleReset() {
  if (!confirm('確定要將今日飲水進度歸零嗎？')) return
  resetting.value = true

  // 樂觀更新：先在本地歸零
  waterLog.value = { ...waterLog.value, intake: 0 }

  const result = await resetWaterLog()
  resetting.value = false

  if (result.success) {
    waterLog.value = result.data
    toast('今日飲水已歸零')
  } else {
    toast('已歸零（離線記錄，待同步）')
  }
}

// emit
const emit = defineEmits<{
  'data-updated': []
}>()

async function refresh() {
  await fetchLatest()
  await fetchTodayWaterLog()
  emit('data-updated')
}

onMounted(() => {
  fetchLatest()
  fetchTodayWaterLog()
})
</script>

<template>
  <div class="health-tracker">
    <!-- Toast 通知 -->
    <Transition name="ht-toast-fade">
      <div v-if="showToast" class="ht-toast">
        ✅ {{ toastMessage }}
      </div>
    </Transition>

    <!-- Loading 狀態 -->
    <div v-if="loading" class="ht-loading">
      <div class="ht-loading__spinner" />
      <span class="ht-loading__text">載入健康追蹤資料中...</span>
    </div>

    <!-- 主卡片 -->
    <template v-else>
      <div class="ht-card ht-card--water">
        <div class="ht-card__header">
          <h3 class="ht-card__title">💧 AI 飲水追蹤</h3>
          <div class="ht-card__header-actions">
            <button
              class="ht-edit-btn"
              aria-label="編輯飲水設定"
              @click="openEdit"
            >✏️</button>
          </div>
        </div>

        <!-- ═══ 編輯模式 ═══ -->
        <Transition name="ht-slide">
          <div v-if="isEditing" class="ht-edit-form">
            <p class="ht-edit-form__hint">手動輸入您的飲水設定，儲存後將同步至資料庫</p>

            <label class="ht-field">
              <span class="ht-field__label">體重 (kg)</span>
              <input
                v-model.number="editWeight"
                type="number"
                min="20"
                max="300"
                placeholder="例：60"
                class="ht-field__input"
              />
            </label>

            <label class="ht-field">
              <span class="ht-field__label">每日目標水量 (ml)</span>
              <input
                v-model.number="editDailyTarget"
                type="number"
                min="500"
                max="10000"
                placeholder="留空則自動以體重×35計算"
                class="ht-field__input"
              />
            </label>

            <label class="ht-field">
              <span class="ht-field__label">水壺 / 水杯容量 (ml)</span>
              <input
                v-model.number="editBottleCapacity"
                type="number"
                min="50"
                max="5000"
                placeholder="例：600"
                class="ht-field__input"
              />
            </label>

            <div class="ht-edit-form__actions">
              <button class="ht-btn ht-btn--outline" @click="isEditing = false">取消</button>
              <button
                class="ht-btn ht-btn--primary"
                :disabled="savingSettings"
                @click="saveSettings"
              >
                {{ savingSettings ? '儲存中...' : '💾 儲存設定' }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- ═══ 檢視模式 ═══ -->
        <Transition name="ht-slide">
          <div v-if="!isEditing" class="ht-view">
            <!-- 設定資訊 -->
            <div v-if="data?.water?.dailyTarget" class="ht-water-stats">
              <div class="ht-stat">
                <span class="ht-stat__label">每日目標</span>
                <span class="ht-stat__value">{{ data.water.dailyTarget.toLocaleString() }} ml</span>
              </div>
              <div class="ht-stat">
                <span class="ht-stat__label">水壺容量</span>
                <span class="ht-stat__value">{{ data.water.bottleCapacity?.toLocaleString() || '--' }} ml</span>
              </div>
              <div class="ht-stat">
                <span class="ht-stat__label">每日杯數</span>
                <span class="ht-stat__value">{{ data.water.cupsPerDay || '--' }} 杯</span>
              </div>
              <div v-if="data.water.weight" class="ht-stat">
                <span class="ht-stat__label">體重</span>
                <span class="ht-stat__value">{{ data.water.weight }} kg</span>
              </div>
            </div>

            <!-- 無設定提示 -->
            <div v-else class="ht-empty-hint">
              <p>尚未設定飲水目標，請點擊右上角 ✏️ 手動輸入，或透過 AI 助手設定。</p>
            </div>

            <!-- 今日飲水進度 -->
            <div class="ht-water-progress">
              <p class="ht-water-progress__text">
                今日進度：<strong>{{ waterLog.intake.toLocaleString() }}</strong> / {{ (data?.water?.dailyTarget || 0).toLocaleString() }} ml
              </p>
              <div class="ht-progress-bar">
                <div class="ht-progress-bar__fill" :style="{ width: waterPercent + '%' }" />
              </div>

              <div class="ht-water-actions">
                <button
                  class="ht-btn ht-btn--primary ht-btn--drink"
                  :disabled="addingWater || !data?.water?.bottleCapacity"
                  @click="drinkWater"
                >
                  🥤 喝完一杯 (+{{ data?.water?.bottleCapacity || 0 }}ml)
                </button>
                <button
                  class="ht-btn ht-btn--danger"
                  :disabled="resetting || waterLog.intake === 0"
                  @click="handleReset"
                >
                  🔄 歸零
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 保健品提醒卡片 -->
      <div v-if="data?.supplement?.name" class="ht-card ht-card--supplement">
        <div class="ht-card__header">
          <h3 class="ht-card__title">💊 保健品提醒</h3>
        </div>

        <div class="ht-supplement-info">
          <div class="ht-supplement-row">
            <span class="ht-supplement-row__label">品名</span>
            <span class="ht-supplement-row__value">{{ data.supplement.name }}</span>
          </div>
          <div v-if="data.supplement.frequency" class="ht-supplement-row">
            <span class="ht-supplement-row__label">頻率</span>
            <span class="ht-supplement-row__value">{{ data.supplement.frequency }}</span>
          </div>
          <div v-if="data.supplement.timing" class="ht-supplement-row">
            <span class="ht-supplement-row__label">時機</span>
            <span class="ht-supplement-row__value ht-supplement-row__value--badge">{{ data.supplement.timing }}</span>
          </div>
          <div v-if="data.supplement.alarm" class="ht-supplement-row">
            <span class="ht-supplement-row__label">鬧鐘</span>
            <span class="ht-supplement-row__value ht-supplement-row__value--alarm">
              ⏰ {{ data.supplement.alarm }}
            </span>
          </div>
        </div>
      </div>

      <!-- 更新時間 -->
      <p v-if="data" class="ht-updated-at">
        🕐 設定同步時間：{{ new Date(data.updatedAt).toLocaleString('zh-TW') }}
        <button class="ht-refresh-btn" @click="refresh">🔄</button>
      </p>
    </template>

    <!-- 錯誤提示 -->
    <div v-if="error" class="ht-error">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<style scoped>
.health-tracker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

/* ═══ Toast ═══ */
.ht-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #0d9488;
  color: #fff;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  z-index: 1000;
}

.ht-toast-fade-enter-active,
.ht-toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.ht-toast-fade-enter-from,
.ht-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* ═══ Loading ═══ */
.ht-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.ht-loading__spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(13, 148, 136, 0.2);
  border-top-color: #0d9488;
  border-radius: 50%;
  animation: ht-spin 0.7s linear infinite;
}

@keyframes ht-spin {
  to { transform: rotate(360deg); }
}

.ht-loading__text {
  font-size: 13px;
  color: #78716c;
  font-weight: 500;
}

/* ═══ 卡片 ═══ */
.ht-card {
  background: #fff;
  border-radius: 1rem;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ht-card--water {
  border-left: 4px solid #0d9488;
}

.ht-card--supplement {
  border-left: 4px solid #8b5cf6;
}

.ht-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ht-card__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ht-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1917;
}

.ht-card__badge {
  padding: 3px 10px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #ccfbf1, #a7f3d0);
  color: #065f46;
  font-size: 11px;
  font-weight: 700;
}

.ht-edit-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.ht-edit-btn:hover {
  background: #f0fdfa;
  border-color: #0d9488;
}

/* ═══ 編輯表單 ═══ */
.ht-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ht-edit-form__hint {
  margin: 0;
  font-size: 12px;
  color: #78716c;
  line-height: 1.5;
}

.ht-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ht-field__label {
  font-size: 12px;
  font-weight: 600;
  color: #44403c;
}

.ht-field__input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.ht-field__input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.ht-edit-form__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* ═══ 檢視模式 ═══ */
.ht-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ht-empty-hint {
  padding: 12px 14px;
  background: #fef9c3;
  border: 1px solid #fde68a;
  border-radius: 10px;
}
.ht-empty-hint p {
  margin: 0;
  font-size: 13px;
  color: #92400e;
  line-height: 1.6;
}

/* 飲水統計 */
.ht-water-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ht-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background: #f0fdfa;
  border-radius: 10px;
}

.ht-stat__label {
  font-size: 11px;
  color: #78716c;
  font-weight: 500;
}

.ht-stat__value {
  font-size: 14px;
  font-weight: 700;
  color: #115e59;
}

/* 飲水進度 */
.ht-water-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ht-water-progress__text {
  margin: 0;
  font-size: 14px;
  color: #1c1917;
}

.ht-progress-bar {
  height: 14px;
  background: #e0f2fe;
  border-radius: 9999px;
  overflow: hidden;
}

.ht-progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.ht-water-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* ═══ 按鈕共用 ═══ */
.ht-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.ht-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ht-btn--primary {
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
}
.ht-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #115e59, #0d9488);
  transform: translateY(-1px);
}

.ht-btn--drink {
  flex: 1;
}

.ht-btn--outline {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  color: #44403c;
}
.ht-btn--outline:hover:not(:disabled) {
  border-color: #0d9488;
  color: #0d9488;
}

.ht-btn--danger {
  background: #fff;
  border: 1.5px solid #fecaca;
  color: #dc2626;
}
.ht-btn--danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #f87171;
}

/* ═══ Slide 動畫 ═══ */
.ht-slide-enter-active,
.ht-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.ht-slide-enter-from {
  opacity: 0;
  max-height: 0;
}
.ht-slide-enter-to {
  opacity: 1;
  max-height: 500px;
}
.ht-slide-leave-from {
  opacity: 1;
  max-height: 500px;
}
.ht-slide-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ═══ 保健品 ═══ */
.ht-supplement-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ht-supplement-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #faf5ff;
  border-radius: 10px;
}

.ht-supplement-row__label {
  font-size: 12px;
  color: #78716c;
  font-weight: 500;
}

.ht-supplement-row__value {
  font-size: 14px;
  font-weight: 600;
  color: #1c1917;
}

.ht-supplement-row__value--badge {
  padding: 2px 10px;
  background: #dbeafe;
  border-radius: 9999px;
  color: #1e40af;
  font-size: 12px;
}

.ht-supplement-row__value--alarm {
  color: #d97706;
  font-weight: 700;
}

/* ═══ 更新時間 ═══ */
.ht-updated-at {
  margin: 0;
  font-size: 11px;
  color: #a8a29e;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.ht-refresh-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.ht-refresh-btn:hover {
  background: #f0fdfa;
  border-color: #0d9488;
}

/* ═══ 錯誤 ═══ */
.ht-error {
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 12px;
  color: #b91c1c;
  text-align: center;
}
</style>
