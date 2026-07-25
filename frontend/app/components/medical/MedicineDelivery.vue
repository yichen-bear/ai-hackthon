<script setup lang="ts">
import { ref } from 'vue'
import { getDeliveryStageStatus } from '~/utils/medical-validators'

/* ─── 型別定義 ─── */
type DeliveryStage = 1 | 2 | 3 | 4

/* ─── Props ─── */
const props = withDefaults(defineProps<{
  hasDeliveryOrder: boolean
  currentStage?: DeliveryStage
  estimatedMinutes?: number
}>(), {
  currentStage: 1,
  estimatedMinutes: 25,
})

/* ─── Emits ─── */
const emit = defineEmits<{
  'order-confirmed': []
  'open-platform': []
}>()

/* ─── 內部狀態 ─── */
const showModal = ref(false)

/* ─── 送藥階段定義 ─── */
const stages = [
  { index: 1, label: '藥師調劑中' },
  { index: 2, label: '平台外送員接單' },
  { index: 3, label: '配送中' },
  { index: 4, label: '已送達' },
]

/* ─── 行為 ─── */
function handleOpenPlatform() {
  showModal.value = true
  emit('open-platform')
}

function handleConfirmOrder() {
  emit('order-confirmed')
  setTimeout(() => {
    showModal.value = false
  }, 500)
}

function handleCloseModal() {
  showModal.value = false
}
</script>

<template>
  <div class="mc__delivery">
    <!-- ════════════════════════════════
         狀態 A：無訂單（合作平台卡片）
         ════════════════════════════════ -->
    <template v-if="!hasDeliveryOrder">
      <div class="mc__delivery-card">
        <h3 class="mc__delivery-title">🚚 合作外送藥局平台</h3>
        <p class="mc__delivery-desc">與合作藥局連線，處方藥品直送到家</p>
        <button
          class="mc__delivery-cta"
          @click="handleOpenPlatform"
        >
          前往外送平台
        </button>
      </div>
    </template>

    <!-- ════════════════════════════════
         狀態 B：有訂單（追蹤進度）
         ════════════════════════════════ -->
    <template v-else>
      <div class="mc__delivery-card">
        <h3 class="mc__delivery-title">🚚 送藥進度</h3>

        <!-- 4-step 進度追蹤器 -->
        <div class="mc__delivery-tracker" role="progressbar" :aria-valuenow="props.currentStage" aria-valuemin="1" aria-valuemax="4">
          <div class="mc__delivery-stages">
            <template v-for="(stage, idx) in stages" :key="stage.index">
              <!-- 圓點 -->
              <div
                class="mc__delivery-dot"
                :class="`mc__delivery-dot--${getDeliveryStageStatus(props.currentStage, stage.index)}`"
                :aria-current="getDeliveryStageStatus(props.currentStage, stage.index) === 'current' ? 'step' : undefined"
              />
              <!-- 連接線（最後一個不畫） -->
              <div
                v-if="idx < stages.length - 1"
                class="mc__delivery-line"
                :class="`mc__delivery-line--${getDeliveryStageStatus(props.currentStage, stage.index)}`"
              />
            </template>
          </div>

          <!-- 標籤文字 -->
          <div class="mc__delivery-labels">
            <span
              v-for="stage in stages"
              :key="stage.index"
              class="mc__delivery-label"
              :class="`mc__delivery-label--${getDeliveryStageStatus(props.currentStage, stage.index)}`"
            >
              {{ stage.label }}
            </span>
          </div>
        </div>

        <!-- 預計送達時間 -->
        <p class="mc__delivery-eta">預計 {{ props.estimatedMinutes }} 分鐘送達</p>
      </div>
    </template>

    <!-- ════════════════════════════════
         Modal 彈窗：模擬外送平台
         ════════════════════════════════ -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="mc__delivery-modal-backdrop"
        @click.self="handleCloseModal"
      >
        <div class="mc__delivery-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-modal-title">
          <h4 id="delivery-modal-title" class="mc__delivery-modal-title">外送藥局平台</h4>
          <p class="mc__delivery-modal-desc">您的處方藥品已準備就緒，確認下單後將由合作藥局為您配送。</p>
          <div class="mc__delivery-modal-actions">
            <button
              class="mc__delivery-modal-cancel"
              @click="handleCloseModal"
            >
              取消
            </button>
            <button
              class="mc__delivery-modal-confirm"
              @click="handleConfirmOrder"
            >
              確認下單
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── 主容器 ── */
.mc__delivery {
  width: 100%;
}

/* ── 卡片 ── */
.mc__delivery-card {
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
  gap: 12px;
}

/* ── 標題 ── */
.mc__delivery-title {
  margin: 0;
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

/* ── 描述文字 ── */
.mc__delivery-desc {
  margin: 0;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  line-height: 1.5;
}

/* ── CTA 按鈕 ── */
.mc__delivery-cta {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background-color: #2563eb;
  background-color: var(--color-primary, #2563eb);
  color: #ffffff;
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  letter-spacing: 0.04em;
}

.mc__delivery-cta:hover {
  opacity: 0.88;
}

/* ══════════════════════
   進度追蹤器
══════════════════════ */

.mc__delivery-tracker {
  padding: 8px 0;
}

/* 圓點 + 連接線容器 */
.mc__delivery-stages {
  display: flex;
  align-items: center;
}

/* 圓點 */
.mc__delivery-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.mc__delivery-dot--done {
  background-color: #16a34a;
  background-color: var(--color-secondary, #16a34a);
}

.mc__delivery-dot--current {
  background-color: #2563eb;
  background-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.mc__delivery-dot--pending {
  background-color: #cbd5e1;
  background-color: var(--color-text-disabled, #cbd5e1);
}

/* 連接線 */
.mc__delivery-line {
  flex: 1;
  height: 3px;
  transition: background-color 0.2s;
}

.mc__delivery-line--done {
  background-color: #16a34a;
  background-color: var(--color-secondary, #16a34a);
}

.mc__delivery-line--current {
  background: linear-gradient(to right, var(--color-primary, #2563eb), var(--color-text-disabled, #cbd5e1));
}

.mc__delivery-line--pending {
  background-color: #cbd5e1;
  background-color: var(--color-text-disabled, #cbd5e1);
}

/* 標籤文字 */
.mc__delivery-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.mc__delivery-label {
  font-size: 11px;
  font-size: var(--text-xs, 11px);
  text-align: center;
  transition: color 0.2s;
}

.mc__delivery-label--done {
  color: #16a34a;
  color: var(--color-secondary, #16a34a);
  font-weight: 600;
}

.mc__delivery-label--current {
  color: #2563eb;
  color: var(--color-primary, #2563eb);
  font-weight: 700;
}

.mc__delivery-label--pending {
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
}

/* ── 預計送達時間 ── */
.mc__delivery-eta {
  margin: 0;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  font-weight: 500;
}

/* ══════════════════════
   Modal 彈窗
══════════════════════ */

.mc__delivery-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.mc__delivery-modal {
  background: #ffffff;
  background: var(--color-bg-card, #ffffff);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  box-shadow: var(--shadow-float, 0 4px 16px rgba(0, 0, 0, 0.14));
  padding: 24px;
  padding: var(--space-6, 24px);
  max-width: 360px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mc__delivery-modal-title {
  margin: 0;
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.mc__delivery-modal-desc {
  margin: 0;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  line-height: 1.6;
}

.mc__delivery-modal-actions {
  display: flex;
  gap: 12px;
}

.mc__delivery-modal-cancel {
  flex: 1;
  height: 42px;
  border: 1.5px solid #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s;
}

.mc__delivery-modal-cancel:hover {
  border-color: #78716c;
}

.mc__delivery-modal-confirm {
  flex: 1;
  height: 42px;
  border: none;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background-color: #2563eb;
  background-color: var(--color-primary, #2563eb);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.mc__delivery-modal-confirm:hover {
  opacity: 0.88;
}
</style>
