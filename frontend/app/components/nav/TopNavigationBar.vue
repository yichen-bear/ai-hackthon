<script setup lang="ts">
import modules from '~/assets/front/file/info.json'
import { navigateTo } from '#app'

const route = useRoute()

// ---------- 導覽邏輯（只包含首頁與主分類） ----------
interface PageItem {
  path: string
  title: string
}

const pages = computed<PageItem[]>(() => {
  const list: PageItem[] = []
  // 加入首頁
  list.push({ path: '/', title: '首頁' })
  // 加入主要分類（食衣住行預樂）
  for (const mod of modules) {
    list.push({ path: mod.route, title: mod.name })
  }
  return list
})

const currentIndex = computed(() => {
  const path = route.path
  return pages.value.findIndex(p => p.path === path)
})

const currentTitle = computed(() => {
  const path = route.path
  // 會員中心與個人資料特殊處理
  if (path === '/member' || path === '/member/') return '會員中心'
  if (path === '/member/profile') return '個人資料'
  if (path === '/calendar') return '行事曆'

  if (currentIndex.value !== -1) {
    return pages.value[currentIndex.value].title
  }
  return (route.meta?.title as string) || route.path
})

const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < pages.value.length - 1)

function goPrev() {
  if (hasPrev.value) navigateTo(pages.value[currentIndex.value - 1].path)
}
function goNext() {
  if (hasNext.value) navigateTo(pages.value[currentIndex.value + 1].path)
}

// ---------- 定位功能（保留不變） ----------
const locationText = ref('定位中...')
const isLocating = ref(false)

function getLocation() {
  if (isLocating.value) return
  if (!navigator.geolocation) {
    locationText.value = '不支援'
    return
  }
  isLocating.value = true
  locationText.value = '取得中...'
  navigator.geolocation.getCurrentPosition(
    () => {
      locationText.value = '已定位 ✓'
      isLocating.value = false
    },
    () => {
      locationText.value = '定位失敗'
      isLocating.value = false
    },
    { timeout: 5000 }
  )
}

onMounted(() => {
  getLocation() // 自動定位
})

// ---------- 登入者（從 composable 取得） ----------
const { currentUser, isAuthenticated, init: initUser } = useCurrentUser()

const user = computed(() => ({
  name: currentUser.value.name,
  avatar: '',
  isLogin: isAuthenticated.value,
}))

onMounted(() => {
  initUser()
})

// ---------- 下拉選單狀態 ----------
const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function selectPage(path: string) {
  showDropdown.value = false
  navigateTo(path)
}

// 點擊外部關閉下拉
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <header class="top-nav" role="banner">
    <div class="top-nav__container">
      <!-- 第一行：定位 + 登入者 -->
      <div class="top-nav__row top-nav__row--top">
        <div class="top-nav__left">
          <button
            class="top-nav__location"
            @click="getLocation"
            :disabled="isLocating"
            aria-label="取得目前位置"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span class="location-label">{{ locationText }}</span>
          </button>
        </div>

        <div class="top-nav__right">
          <button class="top-nav__user-btn" v-if="user.isLogin" @click="navigateTo('/member/profile')" aria-label="個人資料">
            <div class="user-avatar placeholder">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span class="user-name">{{ user.name }}</span>
          </button>
          <button v-else class="top-nav__login" @click="() => {}">登入</button>
        </div>
      </div>

      <!-- 第二行：左箭頭 + 可點擊標題(下拉選單) + 右箭頭 -->
      <div class="top-nav__row top-nav__row--bottom">
        <button
          class="top-nav__arrow top-nav__arrow--left"
          :disabled="!hasPrev"
          @click="goPrev"
          aria-label="上一頁"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 6 L7 12 L17 18 Z" />
          </svg>
        </button>

        <div class="top-nav__title-wrapper" ref="dropdownRef">
          <button class="top-nav__title-btn" @click="toggleDropdown">
            <span class="top-nav__title">{{ currentTitle }}</span>
          </button>

          <transition name="dropdown-fade">
            <ul v-if="showDropdown" class="dropdown-menu">
              <li
                v-for="item in pages"
                :key="item.path"
                @click="selectPage(item.path)"
                :class="{ 'is-active': item.path === route.path }"
              >
                {{ item.title }}
              </li>
            </ul>
          </transition>
        </div>

        <button
          class="top-nav__arrow top-nav__arrow--right"
          :disabled="!hasNext"
          @click="goNext"
          aria-label="下一頁"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M7 6 L17 12 L7 18 Z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* ---------- 整體導航列（大幅縮小高度） ---------- */
.top-nav {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  z-index: 100;
  
  /* 高度調整：從 min-height: 90px 降為 60px */
  min-height: 60px;
  padding: 2px 0;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.top-nav__container {
  width: 100%;
  padding: 0 12px;
  /* 縮小兩行之間的間距 */
  display: flex;
  flex-direction: column;
  gap: 0px;
}

.top-nav__row {
  display: flex;
  align-items: center;
  width: 100%;
}
.top-nav__row--top { justify-content: space-between; }
.top-nav__row--bottom { justify-content: space-between; padding: 2px 0; }

/* ---------- 定位按鈕（縮小） ---------- */
.top-nav__left { display: flex; align-items: center; }
.top-nav__location {
  display: flex; align-items: center; gap: 4px;
  background: rgba(0, 0, 0, 0.04); border: none;
  padding: 2px 8px 2px 6px; border-radius: 12px;
  font-size: 12px; font-weight: 500;
  color: var(--color-text-secondary, #444);
  cursor: pointer; transition: all 0.2s;
  white-space: nowrap; line-height: 1.4;
}
.top-nav__location:hover:not(:disabled) { background: rgba(0, 0, 0, 0.08); }
.top-nav__location:disabled { opacity: 0.6; cursor: not-allowed; }
.location-label { max-width: 50px; overflow: hidden; text-overflow: ellipsis; }

/* ---------- 右側登入（縮小） ---------- */
.top-nav__right { display: flex; align-items: center; }
.top-nav__user-btn {
  display: flex; align-items: center; gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px 2px 4px; border-radius: 20px;
  transition: background 0.2s;
  border: none; cursor: pointer; font: inherit;
}
.top-nav__user-btn:hover { background: rgba(0, 0, 0, 0.08); }
.user-avatar {
  width: 24px; height: 24px; border-radius: 50%; overflow: hidden;
  flex-shrink: 0; background: #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  color: #6b7280;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-avatar.placeholder svg { width: 14px; height: 14px; }
.user-name {
  font-size: 12px; font-weight: 500;
  color: var(--color-text-primary, #1c1917);
  white-space: nowrap; max-width: 50px;
  overflow: hidden; text-overflow: ellipsis;
}
.top-nav__login {
  border: 1px solid #ccc; background: transparent;
  padding: 2px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 500; cursor: pointer;
  color: var(--color-text-primary, #333);
}

/* ---------- 第二行：箭頭 + 標題（縮小） ---------- */
.top-nav__arrow {
  background: none; border: none; padding: 2px; border-radius: 50%;
  cursor: pointer; color: var(--color-text-primary, #1c1917);
  transition: all 0.2s ease; display: flex; align-items: center;
  justify-content: center; width: 32px; height: 32px; flex-shrink: 0;
}
.top-nav__arrow:hover:not(:disabled) { background: rgba(0, 0, 0, 0.06); transform: scale(1.05); }
.top-nav__arrow:active:not(:disabled) { transform: scale(0.92); }
.top-nav__arrow:disabled { opacity: 0.2; cursor: not-allowed; }

.top-nav__title-wrapper {
  position: relative; display: flex; align-items: center; justify-content: center;
  flex: 1; min-width: 0; margin: 0 6px;
}
.top-nav__title-btn {
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; padding: 2px 8px;
  border-radius: 8px; cursor: pointer; transition: background 0.2s;
  font: inherit; color: inherit; white-space: nowrap; width: 100%;
}
.top-nav__title-btn:hover { background: rgba(0, 0, 0, 0.05); }
.top-nav__title {
  font-size: 16px; font-weight: 600; letter-spacing: 0.5px;
  color: var(--color-text-primary, #1c1917); text-align: center;
  overflow: hidden; text-overflow: ellipsis; max-width: 150px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ---------- 下拉選單 ---------- */
.dropdown-menu {
  position: absolute; top: calc(100% + 6px); left: 0; transform: none;
  width: 100%; min-width: 0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 6px 0; max-height: 240px; overflow-y: auto;
  list-style: none; z-index: 200; margin: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
}
.dropdown-menu::-webkit-scrollbar { width: 5px; }
.dropdown-menu::-webkit-scrollbar-track { background: transparent; }
.dropdown-menu::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 4px; }
.dropdown-menu::-webkit-scrollbar-button { display: none; }

.dropdown-menu li {
  padding: 8px 16px; font-size: 15px; font-weight: 500;
  color: var(--color-text-primary, #1c1917);
  cursor: pointer; transition: background 0.15s;
  white-space: nowrap; text-align: center;
}
.dropdown-menu li:hover { background: rgba(0, 0, 0, 0.06); }
.dropdown-menu li.is-active {
  background: rgba(0, 0, 0, 0.08);
  font-weight: 600; color: #007aff;
  pointer-events: none;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.15s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0; transform: scale(0.96);
}

/* ---------- 暗色模式 ---------- */
@media (prefers-color-scheme: dark) {
  .top-nav {
    background: #1c1c1e;
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }
  .top-nav__location {
    background: rgba(255, 255, 255, 0.08); color: #ddd;
  }
  .top-nav__location:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }
  .top-nav__arrow { color: #f5f5f7; }
  .top-nav__arrow:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
  .top-nav__title { color: #f5f5f7; }
  .top-nav__title-btn:hover { background: rgba(255, 255, 255, 0.08); }
  .top-nav__user-btn {
    background: rgba(255, 255, 255, 0.08); color: #f5f5f7;
  }
  .top-nav__user-btn:hover { background: rgba(255, 255, 255, 0.14); }
  .user-name { color: #f5f5f7; }
  .user-avatar { background: #3a3a3c; }
  .top-nav__login { color: #f5f5f7; border-color: #555; }
  
  .dropdown-menu {
    background: rgba(44, 44, 46, 0.96);
    border-color: rgba(255, 255, 255, 0.08);
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  .dropdown-menu::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); }
  .dropdown-menu li { color: #f5f5f7; }
  .dropdown-menu li:hover { background: rgba(255, 255, 255, 0.08); }
  .dropdown-menu li.is-active {
    background: rgba(255, 255, 255, 0.12);
    color: #4c9aff;
  }
}
</style>