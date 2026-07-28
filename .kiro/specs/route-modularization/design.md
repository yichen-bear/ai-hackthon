# Design Document: Route Modularization

## Architecture Overview

此重構將扁平的頁面路由結構轉換為模組化資料夾結構，並加入廠商管理端（admin）頁面與切換機制。整體架構保持 Nuxt 4 的檔案式路由慣例，不引入額外路由外掛。

### 變更範圍

```
app/pages/
├── food/
│   ├── index.vue        ← 原 food.vue 搬移
│   └── admin.vue        ← 新增骨架頁面
├── medical/
│   ├── index.vue        ← 原 medical.vue 搬移
│   └── admin.vue        ← 新增骨架頁面
├── housing/
│   ├── index.vue        ← 原 housing.vue 搬移
│   └── admin.vue        ← 新增骨架頁面

app/layouts/
├── default.vue          ← 修改：更新 PathMap + 加入 RoleSwitchButton
├── admin.vue            ← 新增：廠商端版面配置

app/components/ui/
├── ModuleTab.vue        ← 修改：'home' → 'housing'
├── RoleSwitchButton.vue ← 新增：角色切換按鈕
```

## Components

### 1. 頁面搬移（Pages Migration）

將現有扁平頁面檔案移至資料夾結構。Nuxt 的檔案式路由系統會自動將 `pages/food/index.vue` 映射到 `/food` 路由，無需額外配置。

**搬移規則：**
- `pages/food.vue` → `pages/food/index.vue`（內容完全不變）
- `pages/medical.vue` → `pages/medical/index.vue`（內容完全不變）
- `pages/housing.vue` → `pages/housing/index.vue`（內容完全不變）

### 2. Admin 骨架頁面（Admin Skeleton Pages）

每個模組新增 `admin.vue` 作為廠商管理端入口。這些頁面目前為佔位骨架，未來會填入實際管理功能。

```typescript
// pages/food/admin.vue
<script setup lang="ts">
definePageMeta({ layout: 'admin' })
</script>

<template>
  <div class="admin-page">
    <h1 class="admin-page__title">食 — 廠商管理</h1>
    <div class="admin-page__content">
      <!-- 預留功能區域 -->
      <p class="admin-page__placeholder">管理功能開發中...</p>
    </div>
  </div>
</template>
```

每個 admin 頁面遵循相同結構，只替換模組名稱（食／醫／住）。

### 3. Admin Layout（`layouts/admin.vue`）

廠商管理端使用獨立的版面配置，提供不同於使用者端的 header 結構。

```typescript
// layouts/admin.vue
<script setup lang="ts">
const route = useRoute()

// 從路由路徑提取模組名稱：/food/admin → 'food'
const currentModule = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments[0] ?? ''
})
</script>

<template>
  <div class="admin-container">
    <header class="admin-header" role="banner">
      <div class="admin-header__left">
        <span class="admin-header__icon" aria-hidden="true">⚙️</span>
        <span class="admin-header__title">廠商管理後台</span>
      </div>
      <div class="admin-header__right">
        <UiRoleSwitchButton />
      </div>
    </header>
    <slot />
  </div>
</template>
```

### 4. RoleSwitchButton（`components/ui/RoleSwitchButton.vue`）

一個輕量的文字按鈕，根據當前路由判斷使用者處於哪一端（使用者端或廠商端），並提供切換導航。

```typescript
// components/ui/RoleSwitchButton.vue
<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const isAdminPage = computed(() => route.path.endsWith('/admin'))

const buttonText = computed(() =>
  isAdminPage.value ? '切換至用戶端' : '切換至廠商端'
)

function handleSwitch() {
  if (isAdminPage.value) {
    // /food/admin → /food
    const userPath = route.path.replace(/\/admin$/, '')
    router.push(userPath)
  } else {
    // /food → /food/admin
    router.push(`${route.path}/admin`)
  }
}
</script>

<template>
  <button
    type="button"
    class="role-switch-btn"
    @click="handleSwitch"
  >
    {{ buttonText }}
  </button>
</template>
```

**核心邏輯：**
- `isAdminPage`：檢查路由路徑是否以 `/admin` 結尾
- 切換邏輯：在 `/{module}` 和 `/{module}/admin` 之間互相導航
- 按鈕文字隨當前頁面角色動態切換

### 5. ModuleTab 修正

將 `'home'` 模組鍵改為 `'housing'`，路由從 `/home` 改為 `/housing`。

```typescript
// 修改前
{ key: 'home', label: '住', route: '/home' }

// 修改後
{ key: 'housing', label: '住', route: '/housing' }
```

同時更新 `ModuleKey` 型別定義：
```typescript
type ModuleKey = 'food' | 'medical' | 'housing' | 'transport' | 'booking' | 'entertainment'
```

### 6. Default Layout PathMap 修正

更新路由映射邏輯以支援 `housing` 模組與 admin 子路徑。

```typescript
// layouts/default.vue
<script setup lang="ts">
type ModuleKey = 'food' | 'medical' | 'housing' | 'transport' | 'booking' | 'entertainment'

const route = useRoute()

const activeTab = computed((): ModuleKey => {
  const pathMap: Record<string, ModuleKey> = {
    '/food': 'food',
    '/medical': 'medical',
    '/housing': 'housing',
    '/transport': 'transport',
    '/booking': 'booking',
    '/entertainment': 'entertainment',
  }

  // 取得第一段路徑作為模組識別（支援 /housing 和 /housing/admin）
  const firstSegment = '/' + (route.path.split('/').filter(Boolean)[0] ?? '')
  return pathMap[firstSegment] ?? 'food'
})

function handleOpenAi() {
  console.log('開啟 AI 助手')
}
</script>

<template>
  <div class="app-container">
    <UiAppHeader :active-tab="activeTab" />
    <div class="app-container__header-right">
      <UiRoleSwitchButton />
    </div>
    <slot />
    <UiAiButton @open-ai="handleOpenAi" />
  </div>
</template>
```

**PathMap 解析策略：**
- 改用路徑第一段（first segment）作為映射鍵，取代完整路徑匹配
- `/housing` → first segment = `/housing` → module = `housing`
- `/housing/admin` → first segment = `/housing` → module = `housing`
- 移除舊的 `/home` 映射

## Interfaces

### ModuleKey Type（更新後）

```typescript
type ModuleKey = 'food' | 'medical' | 'housing' | 'transport' | 'booking' | 'entertainment'
```

此型別在以下位置使用：
- `layouts/default.vue`
- `components/ui/AppHeader.vue`
- `components/ui/ModuleTab.vue`

### RoleSwitchButton Props

此元件不需外部 props，完全依賴 `useRoute()` 自行判斷狀態。

### Admin Page Meta

```typescript
definePageMeta({ layout: 'admin' })
```

所有 admin 頁面必須聲明此 meta 以使用 admin layout。

## Data Models

本次重構不涉及資料模型變更。所有變更僅限於前端路由結構與版面配置。

## Error Handling

- **無效路由**：Nuxt 的預設 404 機制處理不存在的路由（如 `/food/nonexist`）
- **PathMap 未匹配**：使用 fallback 值 `'food'` 作為預設模組
- **RoleSwitchButton 邊界情況**：路徑不含模組前綴時（如根路徑 `/`），切換按鈕導航到 `//admin`——但此情況在目前應用中不會發生，因為根路徑會重定向到 `/food`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role Switch Button 文字正確反映當前角色

*For any* valid module path (food, medical, housing) and *for any* page role (user page at `/{module}` or admin page at `/{module}/admin`), the Role_Switch_Button SHALL display "切換至廠商端" when on a user page and "切換至用戶端" when on an admin page.

**Validates: Requirements 4.2, 4.5**

### Property 2: Role Switch 導航互為反操作（Round-Trip）

*For any* valid module, navigating from `/{module}` via the Role_Switch_Button SHALL land on `/{module}/admin`, and navigating from `/{module}/admin` via the Role_Switch_Button SHALL land on `/{module}`. That is, two consecutive switches return the user to the original page.

**Validates: Requirements 4.3, 4.6**

### Property 3: PathMap 正確解析所有模組路徑（含子路徑）

*For any* known module and *for any* sub-path under that module (including `/admin`), the Default_Layout's `activeTab` computed property SHALL resolve to the correct module key matching the first path segment.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**
