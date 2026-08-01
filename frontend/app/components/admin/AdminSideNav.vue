<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const isOpen = ref(false)
const expandedItem = ref<string | null>(null)

interface SubItem {
  label: string
  role: string
  path?: string
}

interface NavItem {
  label: string
  path: string
  icon: string
  subItems?: SubItem[]
}

const navItems: NavItem[] = [
  { label: '食', path: '/admin/food', icon: '🍽️' },
  {
    label: '醫', path: '/admin/medical', icon: '🏥',
    subItems: [
      { label: '診所身分', role: 'clinic' },
      { label: '藥局身分', role: 'pharmacy' },
      { label: '送藥身分', role: 'delivery' },
    ],
  },
  {
    label: '住', path: '/admin/housing', icon: '🏠',
    subItems: [
      { label: '社區物業', role: 'property' },
      { label: '水電工程', role: 'plumber' },
      { label: '家事清潔', role: 'cleaning' },
    ],
  },
  { label: '行', path: '/admin/transport', icon: '🚗' },
  { label: '預', path: '/admin/booking', icon: '🛒' },
  {
    label: '樂', path: '/admin/entertainment', icon: '🎉',
    subItems: [
      { label: '居民活動', role: 'entertainment', path: '/admin/entertainment' },
      { label: '社區大學', role: 'community-college', path: '/admin/community-college' },
    ],
  },
]

function isActive(path: string): boolean {
  if (path === '/admin/entertainment') {
    return route.path === '/admin/entertainment' || route.path === '/admin/community-college'
  }
  return route.path === path
}

function isSubActive(item: NavItem, subItem: SubItem): boolean {
  if (subItem.path) {
    return route.path === subItem.path
  }
  return route.path === item.path && route.query.role === subItem.role
}

function toggle() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) {
    expandedItem.value = null
  }
}

function handleItemClick(item: NavItem) {
  if (item.subItems && item.subItems.length > 0) {
    // Toggle sub-menu expansion
    expandedItem.value = expandedItem.value === item.path ? null : item.path
  } else {
    // Navigate directly
    router.push(item.path)
    isOpen.value = false
    expandedItem.value = null
  }
}

function handleSubItemClick(item: NavItem, subItem: SubItem) {
  if (subItem.path) {
    router.push(subItem.path)
  } else {
    router.push({ path: item.path, query: { role: subItem.role } })
  }
  isOpen.value = false
  expandedItem.value = null
}
</script>

<template>
  <div class="admin-side-nav" :class="{ 'admin-side-nav--open': isOpen }">
    <!-- Toggle Button (always visible) -->
    <button
      class="admin-side-nav__toggle"
      :aria-expanded="isOpen"
      aria-label="切換模組導覽"
      @click="toggle"
    >
      <span v-if="!isOpen">☰</span>
      <span v-else>✕</span>
    </button>

    <!-- Navigation Menu (expandable) -->
    <Transition name="sidenav-slide">
      <nav v-show="isOpen" class="admin-side-nav__menu" aria-label="模組切換導覽">
        <template v-for="item in navItems" :key="item.path">
          <!-- Main nav item -->
          <button
            class="admin-side-nav__item"
            :class="{
              'admin-side-nav__item--active': isActive(item.path),
              'admin-side-nav__item--has-sub': item.subItems,
              'admin-side-nav__item--expanded': expandedItem === item.path,
            }"
            @click="handleItemClick(item)"
          >
            <span class="admin-side-nav__icon">{{ item.icon }}</span>
            <span class="admin-side-nav__label">{{ item.label }}</span>
            <span v-if="item.subItems" class="admin-side-nav__arrow">
              {{ expandedItem === item.path ? '▾' : '▸' }}
            </span>
          </button>

          <!-- Sub-menu items -->
          <div
            v-if="item.subItems && expandedItem === item.path"
            class="admin-side-nav__sub-menu"
          >
            <button
              v-for="sub in item.subItems"
              :key="sub.role"
              class="admin-side-nav__sub-item"
              :class="{ 'admin-side-nav__sub-item--active': isSubActive(item, sub) }"
              @click="handleSubItemClick(item, sub)"
            >
              {{ sub.label }}
            </button>
          </div>
        </template>
      </nav>
    </Transition>
  </div>
</template>

<style scoped>
.admin-side-nav {
  position: fixed;
  top: 50%;
  right: calc(50% - 215px - 48px);
  transform: translateY(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
}

@media (max-width: 530px) {
  .admin-side-nav {
    right: 4px;
  }
}

.admin-side-nav__toggle {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full, 9999px);
  border: 2px solid var(--color-primary, #f97316);
  background: var(--color-bg-card, #ffffff);
  color: var(--color-primary, #f97316);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-float);
  transition: all 0.2s ease;
}

.admin-side-nav__toggle:hover {
  background: var(--color-primary, #f97316);
  color: #ffffff;
}

.admin-side-nav__menu {
  margin-top: var(--space-2, 8px);
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  background: var(--color-bg-card, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-2, 8px);
  box-shadow: var(--shadow-float);
  min-width: 100px;
}

.admin-side-nav__item {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-sm, 6px);
  text-decoration: none;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  transition: all 0.15s ease;
  white-space: nowrap;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  text-align: left;
}

.admin-side-nav__item:hover {
  background: var(--color-primary-light, #fff7ed);
  color: var(--color-primary, #f97316);
}

.admin-side-nav__item--active {
  background: var(--color-primary, #f97316);
  color: #ffffff;
  font-weight: 700;
}

.admin-side-nav__item--active:hover {
  background: var(--color-primary, #f97316);
  color: #ffffff;
}

.admin-side-nav__icon {
  font-size: 16px;
  line-height: 1;
}

.admin-side-nav__label {
  line-height: 1;
  flex: 1;
}

.admin-side-nav__arrow {
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
  transition: transform 0.15s ease;
}

.admin-side-nav__item--active .admin-side-nav__arrow {
  color: #ffffff;
}

/* Sub-menu */
.admin-side-nav__sub-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: var(--space-4, 16px);
  margin-bottom: var(--space-1, 4px);
}

.admin-side-nav__sub-item {
  display: block;
  padding: 6px var(--space-3, 12px);
  border-radius: var(--radius-sm, 6px);
  font-size: var(--text-xs, 11px);
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.admin-side-nav__sub-item:hover {
  background: var(--color-primary-light, #fff7ed);
  color: var(--color-primary, #f97316);
}

.admin-side-nav__sub-item--active {
  background: var(--color-primary, #f97316);
  color: #ffffff;
  font-weight: 700;
}

/* Slide transition */
.sidenav-slide-enter-active,
.sidenav-slide-leave-active {
  transition: all 0.2s ease;
}

.sidenav-slide-enter-from,
.sidenav-slide-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.sidenav-slide-enter-to,
.sidenav-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
