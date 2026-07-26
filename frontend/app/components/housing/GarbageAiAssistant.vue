<script setup lang="ts">
type GarbageCategory = '一般垃圾' | '資源回收' | '廚餘'

interface ClassificationResult {
  itemName: string
  category: GarbageCategory
  suggestion: string
}

defineProps<{
  truckMinutes: number
}>()

const emit = defineEmits<{
  'submit-recycling': [payload: { itemType: string; date: string }]
}>()

const isClassifying = ref<boolean>(false)
const classificationResult = ref<ClassificationResult | null>(null)

// Recycling booking form state
const selectedItemType = ref<string>('沙發')
const selectedDate = ref<string>('')

const recyclingItemTypes = ['沙發', '床墊', '桌椅', '家電', '其他']

function handleClassify() {
  isClassifying.value = true
  classificationResult.value = null
  setTimeout(() => {
    classificationResult.value = {
      itemName: '寶特瓶',
      category: '資源回收',
      suggestion: '請清洗壓扁後投入資源回收桶，瓶蓋另外回收',
    }
    isClassifying.value = false
  }, 500)
}

function handleSubmitRecycling() {
  emit('submit-recycling', {
    itemType: selectedItemType.value,
    date: selectedDate.value,
  })
}
</script>

<template>
  <section class="ga__card" aria-label="AI 垃圾分類">
    <!-- 標題 -->
    <h2 class="ga__title">🗑️ AI 垃圾分類</h2>

    <!-- 拍照辨識按鈕 -->
    <button
      class="ga__classify-btn"
      aria-label="拍照辨識垃圾分類"
      :disabled="isClassifying"
      @click="handleClassify"
    >
      <span v-if="isClassifying" class="ga__spinner" aria-hidden="true"></span>
      {{ isClassifying ? '辨識中...' : '📷 拍照辨識垃圾分類' }}
    </button>

    <!-- 辨識結果 -->
    <div v-if="classificationResult" class="ga__result" role="region" aria-label="辨識結果">
      <p class="ga__result-item">🏷️ {{ classificationResult.itemName }}</p>
      <p class="ga__result-category">分類：{{ classificationResult.category }}</p>
      <p class="ga__result-suggestion">建議：{{ classificationResult.suggestion }}</p>
    </div>

    <!-- 垃圾車倒數 -->
    <p v-if="truckMinutes > 0" class="ga__truck">
      🚛 垃圾車還有 <span class="ga__truck-minutes">{{ truckMinutes }}</span> 分鐘到社區
    </p>
    <p v-else class="ga__truck">
      🚛 垃圾車已抵達社區
    </p>

    <!-- 大型家具回收預約 -->
    <div class="ga__divider">── 大型家具回收預約 ──</div>

    <div class="ga__form">
      <label class="ga__label" for="ga-item-type">物品類型</label>
      <select
        id="ga-item-type"
        v-model="selectedItemType"
        class="ga__select"
        aria-label="選擇物品類型"
      >
        <option v-for="item in recyclingItemTypes" :key="item" :value="item">
          {{ item }}
        </option>
      </select>

      <label class="ga__label" for="ga-date">預約日期</label>
      <input
        id="ga-date"
        v-model="selectedDate"
        type="date"
        class="ga__date-input"
        aria-label="選擇預約日期"
      />

      <button
        class="ga__submit-btn"
        aria-label="送出預約"
        @click="handleSubmitRecycling"
      >
        送出預約
      </button>
    </div>
  </section>
</template>

<style scoped>
/* ── 卡片容器 ── */
.ga__card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

/* ── 標題 ── */
.ga__title {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

/* ── 拍照辨識按鈕 ── */
.ga__classify-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2, 8px);
  width: 100%;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  background-color: var(--color-primary, #f97316);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.ga__classify-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.ga__classify-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.ga__classify-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ── Spinner ── */
.ga__spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: ga-spin 0.6s linear infinite;
}

@keyframes ga-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 辨識結果 ── */
.ga__result {
  background: var(--color-primary-light, #fff7ed);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
}

.ga__result-item {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ga__result-category {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
}

.ga__result-suggestion {
  margin: 0;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  line-height: 1.5;
}

/* ── 垃圾車倒數 ── */
.ga__truck {
  margin: 0;
  font-size: var(--text-base, 15px);
  color: var(--color-text-primary, #1c1917);
}

.ga__truck-minutes {
  color: var(--color-accent-red, #e11d48);
  font-weight: 700;
}

/* ── 分隔標題 ── */
.ga__divider {
  text-align: center;
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #78716c);
  padding: var(--space-2, 8px) 0;
}

/* ── 表單 ── */
.ga__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.ga__label {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.ga__select,
.ga__date-input {
  width: 100%;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.ga__select:focus,
.ga__date-input:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
  border-color: var(--color-primary, #f97316);
}

/* ── 送出預約按鈕 ── */
.ga__submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  background-color: var(--color-primary, #f97316);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease;
  margin-top: var(--space-2, 8px);
}

.ga__submit-btn:hover {
  opacity: 0.85;
}

.ga__submit-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}
</style>
