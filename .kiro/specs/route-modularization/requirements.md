# Requirements Document

## Introduction

將現有的扁平頁面路由架構（`pages/food.vue`、`pages/medical.vue`、`pages/housing.vue`）重構為資料夾模組化結構，每個模組擁有獨立的使用者頁面（`index.vue`）與廠商管理頁面（`admin.vue`）。同時新增 admin layout、修正 ModuleTab 路由映射、以及在導覽列新增使用者端／廠商端切換機制。

## Glossary

- **Router**: Nuxt 4 的檔案式路由系統，根據 `app/pages/` 目錄結構自動產生路由
- **Module_Page**: 各生活模組的使用者端頁面，對應路由 `/{module}`（如 `/food`、`/medical`、`/housing`）
- **Admin_Page**: 各生活模組的廠商管理頁面，對應路由 `/{module}/admin`
- **Default_Layout**: 使用者端共用版面配置（`layouts/default.vue`），包含 AppHeader、ModuleTab 與 AI 按鈕
- **Admin_Layout**: 廠商管理端共用版面配置（`layouts/admin.vue`），具備獨立 header 與導覽結構
- **ModuleTab**: 頂部模組頁籤導覽元件（`components/ui/ModuleTab.vue`），顯示食／醫／住／行／預／樂六個模組
- **Role_Switch_Button**: 位於導覽列右上角的輕量文字按鈕，負責在使用者端與廠商端之間切換
- **PathMap**: `default.vue` 中依據路由路徑判定當前模組的映射邏輯

## Requirements

### Requirement 1: 頁面檔案模組化搬移

**User Story:** As a 開發者, I want 每個模組的頁面檔案以資料夾方式組織, so that 路由結構清晰且可延伸新子頁面

#### Acceptance Criteria

1. WHEN the Router resolves the path `/food`, THE Router SHALL render the page component located at `pages/food/index.vue`
2. WHEN the Router resolves the path `/medical`, THE Router SHALL render the page component located at `pages/medical/index.vue`
3. WHEN the Router resolves the path `/housing`, THE Router SHALL render the page component located at `pages/housing/index.vue`
4. THE Module_Page at `pages/food/index.vue` SHALL contain the identical template, script, and style content previously in `pages/food.vue`
5. THE Module_Page at `pages/medical/index.vue` SHALL contain the identical template, script, and style content previously in `pages/medical.vue`
6. THE Module_Page at `pages/housing/index.vue` SHALL contain the identical template, script, and style content previously in `pages/housing.vue`

### Requirement 2: Admin 頁面建立

**User Story:** As a 廠商, I want 每個模組擁有獨立的管理頁面, so that 廠商端功能與使用者端功能分離

#### Acceptance Criteria

1. WHEN the Router resolves the path `/food/admin`, THE Router SHALL render the page component located at `pages/food/admin.vue`
2. WHEN the Router resolves the path `/medical/admin`, THE Router SHALL render the page component located at `pages/medical/admin.vue`
3. WHEN the Router resolves the path `/housing/admin`, THE Router SHALL render the page component located at `pages/housing/admin.vue`
4. THE Admin_Page SHALL display a page title indicating the module name and admin context
5. THE Admin_Page SHALL display an empty content area as a placeholder for future functionality
6. THE Admin_Page SHALL use the Admin_Layout as its layout

### Requirement 3: Admin Layout 建立

**User Story:** As a 廠商, I want 管理頁面使用獨立的版面配置, so that 廠商端的導覽結構與使用者端不同

#### Acceptance Criteria

1. THE Admin_Layout SHALL provide a header area distinct from the Default_Layout header
2. THE Admin_Layout SHALL provide a navigation structure suitable for admin operations
3. THE Admin_Layout SHALL render the page content via a slot element

### Requirement 4: 使用者端／廠商端切換按鈕

**User Story:** As a 使用者, I want 在導覽列快速切換至廠商端, so that 具有雙重身份的使用者可便利地在兩端切換

#### Acceptance Criteria

1. THE Default_Layout SHALL display the Role_Switch_Button in the top-right area of the header
2. WHEN the user is on a Module_Page at path `/{module}`, THE Role_Switch_Button SHALL display the text "切換至廠商端"
3. WHEN the user clicks the Role_Switch_Button while on path `/{module}`, THE Router SHALL navigate to `/{module}/admin`
4. THE Admin_Layout SHALL display the Role_Switch_Button in the top-right area of the header
5. WHEN the user is on an Admin_Page at path `/{module}/admin`, THE Role_Switch_Button SHALL display the text "切換至用戶端"
6. WHEN the user clicks the Role_Switch_Button while on path `/{module}/admin`, THE Router SHALL navigate to `/{module}`

### Requirement 5: ModuleTab 路由修正

**User Story:** As a 使用者, I want 「住」模組頁籤指向正確路由, so that 點擊「住」頁籤能正確導航至住模組頁面

#### Acceptance Criteria

1. THE ModuleTab SHALL map the "住" tab to the route path `/housing`
2. WHEN the user clicks the "住" tab in the ModuleTab, THE Router SHALL navigate to `/housing`
3. THE ModuleTab SHALL use `housing` as the module key for the "住" tab instead of `home`

### Requirement 6: PathMap 修正

**User Story:** As a 開發者, I want Default_Layout 正確識別住模組路由, so that 當前頁籤高亮邏輯在住模組頁面正常運作

#### Acceptance Criteria

1. THE Default_Layout SHALL map the path `/housing` to the module key `housing` in the PathMap
2. THE Default_Layout SHALL remove the path `/home` mapping from the PathMap
3. WHILE the user is on path `/housing`, THE Default_Layout SHALL set the active tab to `housing`
4. WHILE the user is on path `/housing/admin`, THE Default_Layout SHALL set the active tab to `housing`
