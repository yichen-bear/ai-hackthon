<script setup lang="ts">
import { ref, computed } from 'vue'
import { validatePrescriptionFile, searchDrugs } from '~/utils/medical-validators'

/* ─── 型別定義 ─── */

interface Medication {
  id: string
  name: string
  dosage: string
  schedule: string
}

interface DrugSearchResult {
  name: string
  dosageForm: string
  image: string // emoji
}

/* ─── Props & Emits ─── */

const props = defineProps<{
  medications: Medication[] // up to 20
}>()

const emit = defineEmits<{
  'upload-prescription': [file: File]
  'search-drug': [keyword: string]
}>()

/* ─── Mock 藥物資料庫 ─── */

const drugDatabase: DrugSearchResult[] = [
  { name: '普拿疼', dosageForm: '錠劑', image: '💊' },
  { name: '百服寧', dosageForm: '膠囊', image: '💊' },
  { name: '阿斯匹靈', dosageForm: '錠劑', image: '💊' },
  { name: '安可待', dosageForm: '糖漿', image: '🧴' },
  { name: '伏冒', dosageForm: '膠囊', image: '💊' },
]

/* ─── 內部狀態 ─── */

const uploadError = ref<string>('')
const searchKeyword = ref<string>('')

/* ─── 計算屬性 ─── */

/** 顯示的慢性病用藥（上限 20 筆） */
const displayedMedications = computed(() => props.medications.slice(0, 20))

/** 藥物搜尋結果 */
const searchResults = computed<DrugSearchResult[]>(() => {
  return searchDrugs(searchKeyword.value, drugDatabase, 10)
})

/* ─── 檔案上傳處理 ─── */

const cameraInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)

function triggerCamera() {
  cameraInputRef.value?.click()
}

function triggerGallery() {
  galleryInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const result = validatePrescriptionFile({ type: file.type, size: file.size })

  if (!result.valid) {
    uploadError.value = result.error || '上傳失敗'
    return
  }

  uploadError.value = ''
  emit('upload-prescription', file)

  // 重設 input，允許重複選擇同一檔案
  input.value = ''
}

/* ─── 搜尋處理 ─── */

function handleSearchInput() {
  if (searchKeyword.value.length >= 1) {
    emit('search-drug', searchKeyword.value)
  }
}
</script>

<template>
  <div class="mc__prescription">
    <!-- 標題 -->
    <h2 class="mc__prescription-title">📋 處方管理</h2>

    <!-- 📷 上傳處方箋 -->
    <section class="mc__prescription-upload" aria-labelledby="upload-heading">
      <h3 id="upload-heading" class="mc__prescription-section-title">📷 上傳處方箋</h3>

      <div class="mc__prescription-upload-actions">
        <button
          class="mc__prescription-upload-btn"
          type="button"
          @click="triggerCamera"
        >
          拍照
        </button>
        <span class="mc__prescription-upload-divider">/</span>
        <button
          class="mc__prescription-upload-btn"
          type="button"
          @click="triggerGallery"
        >
          從相簿選取
        </button>
      </div>

      <!-- 隱藏的 file input -->
      <input
        ref="cameraInputRef"
        type="file"
        accept="image/jpeg,image/png,image/heic"
        capture="environment"
        class="mc__prescription-file-input"
        aria-label="使用相機拍攝處方箋"
        @change="handleFileChange"
      />
      <input
        ref="galleryInputRef"
        type="file"
        accept="image/jpeg,image/png,image/heic"
        class="mc__prescription-file-input"
        aria-label="從相簿選取處方箋"
        @change="handleFileChange"
      />

      <!-- 錯誤訊息 -->
      <p
        v-if="uploadError"
        class="mc__prescription-error"
        role="alert"
      >
        {{ uploadError }}
      </p>
    </section>

    <!-- 💊 慢性病用藥提醒 -->
    <section class="mc__prescription-medications" aria-labelledby="medications-heading">
      <h3 id="medications-heading" class="mc__prescription-section-title">💊 慢性病用藥提醒</h3>

      <ul class="mc__prescription-med-list">
        <li
          v-for="med in displayedMedications"
          :key="med.id"
          class="mc__prescription-med-item"
        >
          <span class="mc__prescription-med-name">{{ med.name }}</span>
          <span class="mc__prescription-med-separator">·</span>
          <span class="mc__prescription-med-dosage">{{ med.dosage }}</span>
          <span class="mc__prescription-med-separator">·</span>
          <span class="mc__prescription-med-schedule">{{ med.schedule }}</span>
        </li>
      </ul>
    </section>

    <!-- 🔍 藥物查詢 -->
    <section class="mc__prescription-search" aria-labelledby="search-heading">
      <h3 id="search-heading" class="mc__prescription-section-title">🔍 藥物查詢</h3>

      <div class="mc__prescription-search-box">
        <input
          v-model="searchKeyword"
          type="text"
          class="mc__prescription-search-input"
          placeholder="輸入藥物名稱..."
          aria-label="藥物名稱搜尋"
          @input="handleSearchInput"
        />

        <!-- 搜尋結果列表 -->
        <ul
          v-if="searchKeyword.length >= 1 && searchResults.length > 0"
          class="mc__prescription-search-results"
        >
          <li
            v-for="drug in searchResults"
            :key="drug.name"
            class="mc__prescription-search-item"
          >
            <span class="mc__prescription-drug-name">{{ drug.name }}</span>
            <span class="mc__prescription-drug-separator">·</span>
            <span class="mc__prescription-drug-form">{{ drug.dosageForm }}</span>
            <span class="mc__prescription-drug-separator">·</span>
            <span class="mc__prescription-drug-image">{{ drug.image }}</span>
          </li>
        </ul>

        <!-- 空狀態 -->
        <p
          v-else-if="searchKeyword.length >= 1 && searchResults.length === 0"
          class="mc__prescription-empty"
        >
          找不到符合的藥物，請確認關鍵字
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── 卡片容器 ── */
.mc__prescription {
  background-color: #ffffff;
  background-color: var(--color-bg-card, #ffffff);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: 16px;
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── 標題 ── */
.mc__prescription-title {
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.mc__prescription-section-title {
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 8px;
}

/* ── 上傳區塊 ── */
.mc__prescription-upload-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  border: 1px dashed #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  justify-content: center;
}

.mc__prescription-upload-btn {
  padding: 8px 20px;
  border-radius: 9999px;
  border-radius: var(--radius-full, 9999px);
  border: 1.5px solid #2563eb;
  border-color: var(--color-primary, #2563eb);
  color: #2563eb;
  color: var(--color-primary, #2563eb);
  background: transparent;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  min-height: 48px;
  min-width: 48px;
  transition: background 0.15s, color 0.15s;
}

.mc__prescription-upload-btn:hover {
  background: #2563eb;
  background: var(--color-primary, #2563eb);
  color: #ffffff;
}

.mc__prescription-upload-divider {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.mc__prescription-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mc__prescription-error {
  margin: 8px 0 0;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #e11d48;
  color: var(--color-accent-red, #e11d48);
  font-weight: 500;
}

/* ── 慢性病用藥列表 ── */
.mc__prescription-med-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mc__prescription-med-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background: #fafaf9;
  background: var(--color-bg-page, #fafaf9);
  flex-wrap: wrap;
}

.mc__prescription-med-name {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.mc__prescription-med-dosage {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.mc__prescription-med-schedule {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.mc__prescription-med-separator {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

/* ── 藥物搜尋 ── */
.mc__prescription-search-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mc__prescription-search-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-family: inherit;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  background: #ffffff;
  background: var(--color-bg-card, #ffffff);
  outline: none;
  transition: border-color 0.15s;
}

.mc__prescription-search-input:focus {
  border-color: #2563eb;
  border-color: var(--color-primary, #2563eb);
}

.mc__prescription-search-input::placeholder {
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
}

.mc__prescription-search-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
}

.mc__prescription-search-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #ffffff;
  background: var(--color-bg-card, #ffffff);
  transition: background 0.1s;
}

.mc__prescription-search-item:hover {
  background: #eff6ff;
  background: var(--color-primary-light, #eff6ff);
}

.mc__prescription-drug-name {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.mc__prescription-drug-form {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.mc__prescription-drug-separator {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

.mc__prescription-drug-image {
  font-size: 18px;
  line-height: 1;
}

.mc__prescription-empty {
  margin: 0;
  padding: 12px 14px;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  border: 1px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
}
</style>
