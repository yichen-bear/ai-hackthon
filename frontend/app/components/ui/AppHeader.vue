<script setup lang="ts">
type ModuleKey = 'food' | 'medical' | 'home' | 'transport' | 'booking' | 'entertainment'

defineProps<{
  activeTab: ModuleKey
}>()
</script>

<template>
  <header class="app-header" role="banner">
    <!-- 第一列：地點 + 用戶資訊 -->
    <div class="app-header__top-row">
      <div class="app-header__location" aria-label="目前地點">
        <span class="app-header__location-icon" aria-hidden="true">📍</span>
        <span class="app-header__location-text">台北市信義區</span>
      </div>
      <div class="app-header__user" aria-label="用戶資訊">
        <span class="app-header__user-icon" aria-hidden="true">👤</span>
        <span class="app-header__user-name">陳小明</span>
      </div>
    </div>

    <!-- 第二列：模組頁籤 -->
    <div class="app-header__tab-row">
      <UiModuleTab :active-tab="activeTab" />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  z-index: 100;
  /* 備用靜態值 */
  background-color: #ffffff;
  background-color: var(--color-bg-card, #ffffff);
  border-bottom: 1px solid #e2e8f0;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  /* 兩列總高度：地點列 30px + Tab 列 40px = 70px */
}

/* ── 第一列：地點 + 用戶 ── */
.app-header__top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 var(--space-4, 16px);
}

.app-header__location {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
  cursor: pointer;
}

.app-header__location-icon {
  font-size: 14px;
  line-height: 1;
}

.app-header__location-text {
  font-size: var(--text-sm, 13px);
  /* 備用靜態值 */
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
  white-space: nowrap;
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
  cursor: pointer;
}

.app-header__user-icon {
  font-size: 14px;
  line-height: 1;
}

.app-header__user-name {
  font-size: var(--text-sm, 13px);
  /* 備用靜態值 */
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  white-space: nowrap;
}

/* ── 第二列：模組 Tab ── */
.app-header__tab-row {
  /* ModuleTab 內部已有 border-bottom，header 的 border-bottom 作全寬底線 */
  /* 讓 ModuleTab 的 border-bottom 取代 header border-bottom 在視覺上的分隔 */
}

/* 消除 ModuleTab 在 header 內的重複底線（header 已有自己的底線） */
.app-header__tab-row :deep(.module-tab-nav) {
  border-bottom: none;
}
</style>
