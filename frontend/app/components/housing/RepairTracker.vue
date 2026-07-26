<script setup lang="ts">
const props = defineProps<{
  hasActiveRepair: boolean
  technicianName: string
  etaMinutes: number
}>()

const emit = defineEmits<{
  'submit-repair': [payload: { faultType: string; photo: string; description: string }]
}>()

// 故障類型選項
const faultTypes = ['水管漏水', '馬桶堵塞', '電路問題', '冷氣故障', '其他']

// 內部表單狀態
const selectedFaultType = ref<string>('')
const photoFileName = ref<string>('')
const description = ref<string>('')

// 計算標題
const cardTitle = computed(() =>
  props.hasActiveRepair ? '🔧 水電修繕 · 派工追蹤' : '🔧 水電修繕'
)

// 模擬照片上傳
function handlePhotoUpload() {
  photoFileName.value = 'leak.jpg'
}

// 提交報修
function handleSubmit() {
  if (!selectedFaultType.value) return
  emit('submit-repair', {
    faultType: selectedFaultType.value,
    photo: photoFileName.value,
    description: description.value,
  })
}
</script>

<template>
  <section class="rt__card" aria-label="水電修繕">
    <!-- 標題 -->
    <h2 class="rt__title">{{ cardTitle }}</h2>

    <!-- State A: 報修表單 (hasActiveRepair === false) -->
    <div v-if="!hasActiveRepair" class="rt__form">
      <!-- 故障類型 -->
      <div class="rt__field">
        <label class="rt__label" for="fault-type-select">故障類型</label>
        <select
          id="fault-type-select"
          v-model="selectedFaultType"
          class="rt__select"
        >
          <option value="" disabled>請選擇故障類型</option>
          <option v-for="type in faultTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <!-- 照片上傳（模擬） -->
      <div class="rt__field">
        <button
          class="rt__upload-btn"
          aria-label="上傳照片"
          @click="handlePhotoUpload"
        >
          📷 選擇照片
        </button>
        <span v-if="photoFileName" class="rt__filename">已選：{{ photoFileName }}</span>
      </div>

      <!-- 描述（選填） -->
      <div class="rt__field">
        <label class="rt__label" for="repair-description">問題描述（選填）</label>
        <textarea
          id="repair-description"
          v-model="description"
          class="rt__textarea"
          placeholder="請描述問題細節..."
          rows="3"
        />
      </div>

      <!-- 提交按鈕 -->
      <button
        class="rt__submit-btn"
        aria-label="提交報修"
        :disabled="!selectedFaultType"
        @click="handleSubmit"
      >
        提交報修
      </button>
    </div>

    <!-- State B: 派工追蹤卡片 (hasActiveRepair === true) -->
    <div v-else class="rt__dispatch">
      <!-- 師傅名稱 -->
      <p class="rt__technician">👨‍🔧 {{ technicianName }}</p>

      <!-- 即時位置脈衝動畫 -->
      <div class="rt__location">
        <span class="rt__pulse" />
      </div>

      <!-- ETA 倒數 -->
      <p class="rt__eta">⏱️ 預計 {{ etaMinutes }} 分鐘抵達</p>

      <!-- 操作按鈕 -->
      <div class="rt__actions">
        <button
          class="rt__action-btn"
          aria-label="撥打電話聯繫師傅"
        >
          📞 撥打電話
        </button>
        <button
          class="rt__action-btn"
          aria-label="傳送訊息確認抵達"
        >
          💬 傳送訊息確認抵達
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── 卡片容器 ── */
.rt__card {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

/* ── 標題 ── */
.rt__title {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

/* ── 表單（State A） ── */
.rt__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.rt__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
}

.rt__label {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.rt__select {
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

.rt__select:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.rt__upload-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 4px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background: var(--color-bg-card, #ffffff);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.rt__upload-btn:hover {
  opacity: 0.85;
}

.rt__upload-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.rt__filename {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #78716c);
  margin-top: var(--space-1, 4px);
}

.rt__textarea {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-base, 15px);
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background: var(--color-bg-card, #ffffff);
  resize: vertical;
  min-height: 60px;
}

.rt__textarea:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.rt__submit-btn {
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
}

.rt__submit-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.rt__submit-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}

.rt__submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 派工追蹤（State B） ── */
.rt__dispatch {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.rt__technician {
  margin: 0;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.rt__location {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4, 16px);
}

.rt__pulse {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--color-primary, #f97316);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.4;
  }
}

.rt__eta {
  margin: 0;
  font-size: var(--text-base, 15px);
  color: var(--color-text-primary, #1c1917);
}

.rt__actions {
  display: flex;
  gap: var(--space-2, 8px);
}

.rt__action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: transparent;
  border: 1.5px solid var(--color-primary, #f97316);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  font-family: inherit;
  color: var(--color-primary, #f97316);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.rt__action-btn:hover {
  opacity: 0.85;
}

.rt__action-btn:focus {
  outline: 2px solid var(--color-primary, #f97316);
  outline-offset: 2px;
}
</style>
