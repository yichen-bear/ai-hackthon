<template>
  <div class="home-page">
    <!-- 頁面頭部 -->
    <header class="home-header">
      <h1 class="home-title">AI 生活管家</h1>
      <p class="home-subtitle">探索六大智慧服務，讓生活更簡單</p>
    </header>

    <!-- 卡片網格 -->
    <div class="card-grid">
      <div
        v-for="module in modules"
        :key="module.key"
        class="module-card"
        @click="openModal(module)"
      >
        <div class="card-label" :style="{ backgroundColor: module.color }">
          {{ module.label }}
        </div>
        <h2 class="card-title">{{ module.label }}・{{ module.name }}</h2>

        <ul class="feature-list">
          <li v-for="feature in module.features" :key="feature.name">
            {{ feature.name }}
          </li>
        </ul>

        <p class="card-description">{{ module.description }}</p>
        <div class="card-footer">
          <span class="action-hint">探索 →</span>
        </div>
      </div>
    </div>

    <!-- 模態視窗（翻轉放大） -->
    <Teleport to="body">
      <Transition name="modal" @after-leave="onAfterLeave">
        <div
          v-if="selectedModule"
          class="modal-overlay"
          @click="closeModal"
          @keydown.esc="closeModal"
        >
          <div class="modal-content" @click.stop>
            <!-- 返回按鈕（動態配色） -->
            <button
              class="close-btn"
              @click="closeModal"
              :style="{ '--btn-color': selectedModule.color }"
            >
              返回
            </button>

            <div class="modal-header">
              <!-- 圓形標籤點擊後跳轉到該分類主頁 -->
              <div
                class="modal-label"
                :style="{ backgroundColor: selectedModule.color }"
                @click="navigateTo(selectedModule.route)"
                role="button"
                tabindex="0"
                @keydown.enter="navigateTo(selectedModule.route)"
              >
                {{ selectedModule.label }}
              </div>
              <h2 class="modal-title">
                {{ selectedModule.label }}・{{ selectedModule.name }}
              </h2>
              <p class="modal-subtitle">{{ selectedModule.description }}</p>
            </div>

            <!-- 功能細項列表（每個細項為按鈕） -->
            <div class="modal-features">
              <div
                v-for="feature in selectedModule.features"
                :key="feature.name"
                class="modal-feature-item"
                :style="{ borderLeftColor: selectedModule.color }"
              >
                <button
                  class="feature-btn"
                  :class="{ 'has-link': feature.link }"
                  :disabled="!feature.link"
                  @click="feature.link && navigateTo(feature.link)"
                >
                  <span class="modal-feature-name">{{ feature.name }}</span>
                  <p class="modal-feature-desc">{{ feature.description }}</p>
                  <!-- 替換為圖片，只顯示在有連結時 -->
                  <img
                    v-if="feature.link"
                    class="link-indicator"
                    src="@/assets/front/img/click.png"
                    alt="點擊跳轉"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import infoData from '~/assets/front/file/info.json'

interface FeatureItem {
  name: string
  description: string
  link?: string
}

interface ModuleItem {
  key: string
  label: string
  name: string
  color: string
  features: FeatureItem[]
  description: string
  route: string
}

const modules = infoData as ModuleItem[]
const router = useRouter()

const selectedModule = ref<ModuleItem | null>(null)

const openModal = (module: ModuleItem) => {
  selectedModule.value = module
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  selectedModule.value = null
}

const onAfterLeave = () => {
  document.body.style.overflow = ''
}

const navigateTo = (route: string) => {
  if (route) {
    router.push(route)
    closeModal()
  }
}
</script>

<style scoped>
/* ========== 設計令牌 ========== */
:root {
  --color-bg-page: #fafaf9;
  --color-bg-card: #ffffff;
  --color-primary: #f97316;
  --color-text-primary: #1c1917;
  --color-text-secondary: #78716c;
  --color-text-disabled: #cbd5e1;
  --color-border: #e2e8f0;
  --radius-lg: 16px;
  --radius-md: 12px;
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.06);
  --shadow-modal: 0 8px 30px rgba(0, 0, 0, 0.2);
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --text-base: 15px;
  --text-sm: 13px;
  --text-xs: 11px;
}

/* ========== 頁面佈局 ========== */
.home-page {
  max-width: 1200px;              /* 放寬最大寬度，讓平板與桌面有更好呈現 */
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding: var(--space-5) var(--space-4) 80px;
  font-family: system-ui, -apple-system, sans-serif;
  box-sizing: border-box;
}

/* ========== 頭部 ========== */
.home-header {
  text-align: center;
  padding: var(--space-6) 0 var(--space-5);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-6);
}

.home-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.home-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin: 0;
}

/* ========== 卡片網格 ========== */
.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;   /* 手機預設兩欄 */
  gap: var(--space-4);
}

.module-card {
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-5) var(--space-4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid transparent;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--color-primary);
}

.card-label {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-4);
  flex-shrink: 0;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
  letter-spacing: 0.3px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 10px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.feature-list li {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background-color: #f1f5f9;
  padding: 2px 10px;
  border-radius: 9999px;
  white-space: nowrap;
  cursor: default;
}

.card-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 4px 0 12px 0;
  flex: 1;
}

.card-footer {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.action-hint {
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: 500;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.module-card:hover .action-hint {
  opacity: 1;
}

/* 小手機（<400px）改為單欄 */
@media (max-width: 400px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: var(--space-5);
  }
}

.module-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ============================================
   響應式設計 — 平板與桌面
   ============================================ */

/* 平板（≥640px） */
@media (min-width: 640px) {
  .home-page {
    padding: 32px 40px 80px;
  }

  .card-grid {
    grid-template-columns: repeat(3, 1fr);  /* 三欄 */
    gap: 24px;
  }

  .module-card {
    padding: 24px;
  }

  .card-title {
    font-size: 20px;
  }

  .feature-list li {
    font-size: 12px;
  }

  .card-description {
    font-size: 14px;
  }

  /* 模態框在平板上放大 */
  .modal-content {
    max-width: 600px;
    padding: 32px;
  }

  .modal-title {
    font-size: 26px;
  }

  .modal-subtitle {
    font-size: 16px;
  }

  .modal-feature-name {
    font-size: 16px;
  }

  .modal-feature-desc {
    font-size: 14px;
  }

  .close-btn {
    font-size: 16px;
    padding: 0.4em 1.4em;
  }
}

/* 桌面（≥1024px） */
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr);  /* 四欄 */
    gap: 28px;
  }

  .home-page {
    padding: 40px 60px 80px;
  }

  .module-card {
    padding: 28px;
  }

  .card-title {
    font-size: 22px;
  }

  .modal-content {
    max-width: 700px;
    padding: 40px;
  }
}

/* ============================================
   模態視窗 — 過渡動畫
   ============================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(2px);
}

.modal-enter-active {
  animation: fadeIn 0.3s ease forwards;
}
.modal-enter-active .modal-content {
  animation: flipIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.modal-leave-active {
  animation: fadeOut 0.3s ease forwards;
}
.modal-leave-active .modal-content {
  animation: flipOut 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes flipIn {
  0% {
    opacity: 0;
    transform: perspective(800px) rotateY(90deg) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: perspective(800px) rotateY(0deg) scale(1);
  }
}

@keyframes flipOut {
  0% {
    opacity: 1;
    transform: perspective(800px) rotateY(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: perspective(800px) rotateY(90deg) scale(0.8);
  }
}

/* ============================================
   模態內容樣式
   ============================================ */
.modal-content {
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
  max-width: 430px;          /* 手機預設寬度，平板會由媒體查詢覆蓋 */
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-5) var(--space-4);
  box-shadow: var(--shadow-modal);
  position: relative;
}

/* ============================================
   返回按鈕
   ============================================ */
.close-btn {
  position: absolute;
  top: 24px;
  right: 18px;
  z-index: 10;
  font-size: 14px;
  padding: 0.35em 1.2em;
  border-width: 4px;
  color: var(--btn-color, #f97319);
  background-color: #ffffff;
  border-style: solid;
  border-color: var(--btn-color, #f97319);
  box-shadow: 0px 5px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
  border-radius: 50em;
  appearance: none;
  line-height: 1.4;
  transition: none;
}

.close-btn:active {
  transform: translateY(5px);
  border-color: var(--btn-color, #c75f0a);
  box-shadow: 0px 0px;
}

.close-btn:focus-visible {
  outline: 2px solid var(--btn-color, #f97319);
  outline-offset: 2px;
}

/* ========== 模態標頭 ========== */
.modal-header {
  margin-bottom: var(--space-5);
}

.modal-label {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-4);
  cursor: pointer;
  transition: transform 0.15s ease;
}
.modal-label:hover {
  transform: scale(1.05);
}
.modal-label:active {
  transform: scale(0.95);
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.modal-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin: 0;
}

/* ========== 功能細項（按鈕形式） ========== */
.modal-features {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: var(--space-5) 0;
}

.modal-feature-item {
  padding: 0;
  background-color: #f8fafc;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-primary);
  overflow: hidden;
  transition: background-color 0.15s;
  position: relative;
}

.feature-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-4);
  padding-right: 40px; /* 預留圖片空間，避免文字被遮擋 */
  background: none;
  border: none;
  font-family: inherit;
  cursor: default;
  transition: background-color 0.15s;
  position: relative;
}

.feature-btn.has-link {
  cursor: pointer;
}
.feature-btn.has-link:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
.feature-btn.has-link:active {
  background-color: rgba(0, 0, 0, 0.06);
}

.feature-btn:disabled {
  opacity: 1;
  cursor: default;
}

.modal-feature-name {
  font-weight: 600;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4px;
}

.modal-feature-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* ========== 圖片指示器（右上角） ========== */
.link-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 15px;
  height: 15px;
  object-fit: contain;
  opacity: 0.6;
  transition: opacity 0.2s, transform 0.2s;
}

.feature-btn.has-link:hover .link-indicator {
  opacity: 1;
  transform: scale(1.1);
}
</style>