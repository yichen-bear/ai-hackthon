<script setup lang="ts">
import modules from '~/assets/front/file/info.json'
import { truncateName } from '~/utils/truncateName'

const { location } = useGeolocation()
const { state: authState } = useAuth()
const route = useRoute()

// 當前展開的下拉選單 key（null = 收合）
const openModule = ref<string | null>(null)

// 計算當前所在模組（用 route path prefix 匹配）
const activeModuleKey = computed(() => {
  const path = route.path
  for (const mod of modules) {
    if (path.startsWith(mod.route)) {
      return mod.key
    }
  }
  return null // 首頁或無匹配
})

// 計算用戶顯示名稱
const displayName = computed(() => {
  return truncateName(authState.value.user?.name)
})

// 首頁標籤
const homeTab = { key: 'home-page', label: '首頁', route: '/' }

// 點擊模組標籤
function handleTabClick(moduleKey: string) {
  if (moduleKey === 'home-page') {
    // 首頁標籤：直接導航，不顯示下拉
    openModule.value = null
    navigateTo('/')
    return
  }
  if (openModule.value === moduleKey) {
    // 點擊同一模組：收合
    openModule.value = null
  } else {
    // 開啟新模組下拉
    openModule.value = moduleKey
  }
}

// 點擊下拉選單項目
function handleFeatureClick(link: string) {
  if (!link) return
  openModule.value = null
  navigateTo(link)
}

// 點擊模組首頁
function handleModuleHome(moduleRoute: string) {
  openModule.value = null
  navigateTo(moduleRoute)
}

// 點擊外部區域收合
function handleClickOutside() {
  openModule.value = null
}

// 取得展開中的模組資料
const openModuleData = computed(() => {
  if (!openModule.value) return null
  return modules.find((m) => m.key === openModule.value) || null
})
</script>

<template>
  <header class="top-nav" role="banner">
    <!-- 第一列：地理位置 + 用戶名稱 -->
    <div class="top-nav__info-row">
      <div class="top-nav__location" aria-label="目前地點">
        <span class="top-nav__location-icon" aria-hidden="true">📍</span>
        <span class="top-nav__location-text">{{ location }}</span>
      </div>
      <div class="top-nav__user" aria-label="用戶資訊">
        <span class="top-nav__user-icon" aria-hidden="true">👤</span>
        <span class="top-nav__user-name">{{ displayName }}</span>
      </div>
    </div>

    <!-- 第二列：模組標籤（可水平捲動） -->
    <nav class="top-nav__tabs" aria-label="模組導覽">
      <!-- 首頁標籤 -->
      <button
        class="top-nav__tab"
        :class="{ 'top-nav__tab--active': !activeModuleKey && route.path === '/' }"
        type="button"
        @click="handleTabClick(homeTab.key)"
      >
        {{ homeTab.label }}
      </button>
      <!-- 六大模組標籤 -->
      <button
        v-for="mod in modules"
        :key="mod.key"
        class="top-nav__tab"
        :class="{
          'top-nav__tab--active': activeModuleKey === mod.key,
          'top-nav__tab--open': openModule === mod.key,
        }"
        type="button"
        @click="handleTabClick(mod.key)"
      >
        {{ mod.label }}
      </button>
    </nav>

    <!-- 下拉選單 -->
    <div v-if="openModuleData" class="top-nav__dropdown">
      <!-- 模組首頁選項 -->
      <button
        class="top-nav__dropdown-item"
        type="button"
        @click="handleModuleHome(openModuleData.route)"
      >
        <span class="top-nav__dropdown-item-name">{{ openModuleData.name }}首頁</span>
      </button>
      <!-- Features 項目 -->
      <button
        v-for="(feature, idx) in openModuleData.features"
        :key="idx"
        class="top-nav__dropdown-item"
        :class="{ 'top-nav__dropdown-item--disabled': !feature.link }"
        type="button"
        :disabled="!feature.link"
        @click="handleFeatureClick(feature.link)"
      >
        <span class="top-nav__dropdown-item-name">{{ feature.name }}</span>
        <span class="top-nav__dropdown-item-desc">{{ feature.description }}</span>
      </button>
    </div>

    <!-- 遮罩層（點擊外部收合） -->
    <div
      v-if="openModule"
      class="top-nav__backdrop"
      @click="handleClickOutside"
    />
  </header>
</template>

<style scoped>
.top-nav {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  z-index: 100;
  background-color: var(--color-bg-card, #ffffff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ── 第一列：資訊列 ── */
.top-nav__info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 4px 16px 0;
}

.top-nav__location {
  display: flex;
  align-items: center;
  gap: 4px;
}

.top-nav__location-icon {
  font-size: 13px;
  line-height: 1;
}

.top-nav__location-text {
  font-size: 12px;
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
  white-space: nowrap;
}

.top-nav__user {
  display: flex;
  align-items: center;
  gap: 4px;
}

.top-nav__user-icon {
  font-size: 13px;
  line-height: 1;
}

.top-nav__user-name {
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  white-space: nowrap;
}

/* ── 第二列：模組標籤 ── */
.top-nav__tabs {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  height: 28px;
  padding: 0 8px;
  scrollbar-width: none;
}

.top-nav__tabs::-webkit-scrollbar {
  display: none;
}

.top-nav__tab {
  flex-shrink: 0;
  padding: 0 12px;
  height: 100%;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.top-nav__tab:hover {
  color: var(--color-text-primary, #1c1917);
}

.top-nav__tab--active {
  color: var(--color-text-primary, #1c1917);
  font-weight: 600;
}

.top-nav__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  background-color: var(--color-primary, #3b82f6);
  border-radius: 1px;
}

.top-nav__tab--open {
  color: var(--color-primary, #3b82f6);
}

/* ── 下拉選單 ── */
.top-nav__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-card, #ffffff);
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
  max-height: 320px;
  overflow-y: auto;
  z-index: 101;
}

.top-nav__dropdown-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s;
}

.top-nav__dropdown-item:hover:not(:disabled) {
  background-color: var(--color-bg-hover, #f5f5f4);
}

.top-nav__dropdown-item--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.top-nav__dropdown-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.top-nav__dropdown-item--disabled .top-nav__dropdown-item-name {
  color: var(--color-text-secondary, #78716c);
}

.top-nav__dropdown-item-desc {
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  margin-top: 2px;
}

/* ── 遮罩層 ── */
.top-nav__backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
}
</style>
