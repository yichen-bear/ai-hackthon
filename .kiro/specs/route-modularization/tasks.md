# Implementation Plan: Route Modularization

## Overview

將扁平的頁面路由結構重構為模組化資料夾結構，新增 admin 骨架頁面、admin layout、角色切換按鈕，並修正 ModuleTab 與 PathMap 中 `'home'` → `'housing'` 的映射。所有變更限於前端 `app/` 目錄，使用 TypeScript + Vue 3 SFC。

## Tasks

- [x] 1. 頁面檔案模組化搬移
  - [x] 1.1 建立 `pages/food/index.vue`，內容從 `pages/food.vue` 完整搬移，並刪除原始檔案
    - 建立 `app/pages/food/` 資料夾
    - 將 `pages/food.vue` 的完整內容複製到 `pages/food/index.vue`
    - 刪除 `pages/food.vue`
    - _Requirements: 1.1, 1.4_

  - [x] 1.2 建立 `pages/medical/index.vue`，內容從 `pages/medical.vue` 完整搬移，並刪除原始檔案
    - 建立 `app/pages/medical/` 資料夾
    - 將 `pages/medical.vue` 的完整內容複製到 `pages/medical/index.vue`
    - 刪除 `pages/medical.vue`
    - _Requirements: 1.2, 1.5_

  - [x] 1.3 建立 `pages/housing/index.vue`，內容從 `pages/housing.vue` 完整搬移，並刪除原始檔案
    - 建立 `app/pages/housing/` 資料夾
    - 將 `pages/housing.vue` 的完整內容複製到 `pages/housing/index.vue`
    - 刪除 `pages/housing.vue`
    - _Requirements: 1.3, 1.6_

- [x] 2. ModuleTab 與 PathMap 修正
  - [x] 2.1 更新 `components/ui/ModuleTab.vue` 中 `'home'` → `'housing'`
    - 將 `ModuleKey` 型別定義中的 `'home'` 改為 `'housing'`
    - 將 modules 陣列中 `{ key: 'home', label: '住', route: '/home' }` 改為 `{ key: 'housing', label: '住', route: '/housing' }`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.2 更新 `layouts/default.vue` 中的 `ModuleKey` 型別與 PathMap 邏輯
    - 將 `ModuleKey` 型別定義中的 `'home'` 改為 `'housing'`
    - 將 pathMap 中的 `'/home': 'home'` 改為 `'/housing': 'housing'`
    - 修改 `activeTab` computed 改用第一段路徑匹配（支援 `/housing/admin` 等子路徑）
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 2.3 更新 `components/ui/AppHeader.vue` 中 `ModuleKey` 型別的 `'home'` → `'housing'`
    - 保持 props 介面一致
    - _Requirements: 5.3, 6.1_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 新增 RoleSwitchButton 與 Admin Layout
  - [x] 4.1 建立 `components/ui/RoleSwitchButton.vue`
    - 使用 `useRoute()` 判斷是否為 admin 頁面（路徑以 `/admin` 結尾）
    - 顯示文字："切換至廠商端"（使用者端）或 "切換至用戶端"（廠商端）
    - 點擊時在 `/{module}` 與 `/{module}/admin` 之間導航
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

  - [x] 4.2 建立 `layouts/admin.vue`
    - 提供獨立的 admin header（含標題 "廠商管理後台" 與管理圖示）
    - 在 header 右側放置 `<UiRoleSwitchButton />`
    - 使用 `<slot />` 渲染頁面內容
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.3 在 `layouts/default.vue` 的 header 區域加入 `<UiRoleSwitchButton />`
    - 放置在 AppHeader 的右上角區域
    - _Requirements: 4.1_

- [x] 5. 新增 Admin 骨架頁面
  - [x] 5.1 建立 `pages/food/admin.vue`
    - 使用 `definePageMeta({ layout: 'admin' })`
    - 顯示標題 "食 — 廠商管理"
    - 顯示預留內容 placeholder
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [x] 5.2 建立 `pages/medical/admin.vue`
    - 使用 `definePageMeta({ layout: 'admin' })`
    - 顯示標題 "醫 — 廠商管理"
    - 顯示預留內容 placeholder
    - _Requirements: 2.2, 2.4, 2.5, 2.6_

  - [x] 5.3 建立 `pages/housing/admin.vue`
    - 使用 `definePageMeta({ layout: 'admin' })`
    - 顯示標題 "住 — 廠商管理"
    - 顯示預留內容 placeholder
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 6. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 6.1 Write property tests for RoleSwitchButton and PathMap
  - **Property 1: Role Switch Button 文字正確反映當前角色**
  - **Property 2: Role Switch 導航互為反操作（Round-Trip）**
  - **Property 3: PathMap 正確解析所有模組路徑（含子路徑）**
  - **Validates: Requirements 4.2, 4.3, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All page migrations preserve content identically — no logic changes
- The `ModuleKey` type update (`'home'` → `'housing'`) must be consistent across all three files that define it

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "2.1", "2.3"] },
    { "id": 1, "tasks": ["2.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["6.1"] }
  ]
}
```
