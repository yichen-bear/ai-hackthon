<script setup lang="ts">
import { useHealthTracker } from '~/composables/useHealthTracker'

const { data, loading, error, fetchLatest, saveData } = useHealthTracker()

// 飲水追蹤即時記錄
const waterIntake = ref(0)
const waterPercent = computed(() => {
  if (!data.value?.water?.dailyTarget) return 0
  return Math.min(100, (waterIntake.value / data.value.water.dailyTarget) * 100)
})

function addWater() {
  if (!data.value?.water?.bottleCapacity) return
  waterIntake.value += data.value.water.bottleCapacity
}

// AI 引導後重新載入
const emit = defineEmits<{
  'data-updated': []
}>()

async function refresh() {
  await fetchLatest()
  emit('data-updated')
}

onMounted(() => {
  fetchLatest()
})
</script>

<template>
  <div class="health-tracker">
    <!-- Loading 狀態 -->
    <div v-if="loading" class="ht-loading">
      <div class="ht-loading__spinner" />
      <span class="ht-loading__text">載入健康追蹤資料中...</span>
    </div>

    <!-- 無資料空狀態 -->
    <div v-else-if="!data" class="ht-empty">
      <div class="ht-empty__icon">🤖</div>
      <p class="ht-empty__title">尚未設定 AI 健康追蹤</p>
      <p class="ht-empty__desc">
        透過 AI 助手對話，設定您的飲水目標與保健品提醒，資料將自動同步至此。
      </p>
      <button class="ht-empty__btn" @click="refresh">
        🔄 重新整理
      </button>
    </div>

    <!-- 有資料：顯示卡片 -->
    <template v-else>
      <!-- 💧 飲水追蹤卡片 -->
      <div class="ht-card ht-card--water">
        <div class="ht-card__header">
          <h3 class="ht-card__title">💧 AI 飲水追蹤</h3>
          <span class="ht-card__badge">AI 同步</span>
        </div>

        <div class="ht-water-stats">
          <div class="ht-stat">
            <span class="ht-stat__label">每日目標</span>
            <span class="ht-stat__value">{{ data.water.dailyTarget?.toLocaleString() || '--' }} ml</span>
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

        <!-- 今日飲水進度 -->
        <div class="ht-water-progress">
          <p class="ht-water-progress__text">
            今日進度：<strong>{{ waterIntake.toLocaleString() }}</strong> / {{ data.water.dailyTarget?.toLocaleString() || 0 }} ml
          </p>
          <div class="ht-progress-bar">
            <div class="ht-progress-bar__fill" :style="{ width: waterPercent + '%' }" />
          </div>
          <button class="ht-water-btn" @click="addWater">
            🥤 喝完一杯 (+{{ data.water.bottleCapacity || 0 }}ml)
          </button>
        </div>
      </div>

      <!-- 💊 保健品提醒卡片 -->
      <div v-if="data.supplement.name" class="ht-card ht-card--supplement">
        <div class="ht-card__header">
          <h3 class="ht-card__title">💊 保健品提醒</h3>
          <span class="ht-card__badge">AI 同步</span>
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
      <p class="ht-updated-at">
        🕐 資料同步時間：{{ new Date(data.updatedAt).toLocaleString('zh-TW') }}
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
}

/* Loading */
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
  border-top-color: var(--color-primary, #0d9488);
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

/* Empty 空狀態 */
.ht-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 20px;
  background: linear-gradient(135deg, #f0fdfa, #ecfdf5);
  border: 1.5px dashed #99f6e4;
  border-radius: 1rem;
  text-align: center;
}

.ht-empty__icon {
  font-size: 32px;
}

.ht-empty__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #115e59;
}

.ht-empty__desc {
  margin: 0;
  font-size: 13px;
  color: #57534e;
  line-height: 1.6;
}

.ht-empty__btn {
  margin-top: 4px;
  padding: 8px 16px;
  border: 1.5px solid #99f6e4;
  border-radius: 10px;
  background: #fff;
  color: #0d9488;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.ht-empty__btn:hover {
  background: #ccfbf1;
  border-color: #0d9488;
}

/* 卡片 */
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
  height: 12px;
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

.ht-water-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.ht-water-btn:hover {
  background: linear-gradient(135deg, #115e59, #0d9488);
  transform: translateY(-1px);
}

/* 保健品資訊 */
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

/* 更新時間 */
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

/* 錯誤 */
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
