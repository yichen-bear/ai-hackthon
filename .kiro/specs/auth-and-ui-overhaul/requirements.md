# Requirements Document

## Introduction

本功能涵蓋「AI 生活管家」應用程式的認證系統建置與前端 UI 架構重構。主要目標包含：

1. 建立一般會員與廠商用戶的雙角色登入系統，搭配路由守衛確保未認證用戶無法存取受保護頁面。
2. 重新設計前端導覽架構：上方固定欄支援六大模組（食、醫、住、行、預、樂）的左右切換與下拉選單，下方固定欄提供 AI 聊天、個人資料、行事曆三大功能入口。
3. 重構 `layouts/default.vue`，將 inline 邏輯與 CSS 抽離為獨立元件。
4. 清理不再使用的元件（AppHeader.vue、ModuleTab.vue、AiButton.vue），並將後台管理頁面集中至 `admin/` 資料夾結構。
5. 根據登入角色自動導向對應平台（一般用戶 → 用戶端、廠商用戶 → 後台管理端），移除手動切換按鈕。

## Glossary

- **Auth_Service**：後端認證服務，負責處理登入驗證、Token 簽發與驗證邏輯
- **Frontend_Auth_Module**：前端認證模組，包含登入頁面、認證狀態管理（composable）與路由守衛
- **Route_Guard**：Nuxt middleware，於每次路由變更時檢查認證狀態，未通過則導向登入頁
- **Top_Navigation_Bar**：上方固定導覽列，提供六大模組的左右滑動切換與下拉選單跳轉功能
- **Bottom_Action_Bar**：下方固定功能列，包含 AI 聊天按鈕（圓形突出設計）、個人資料按鈕、行事曆按鈕
- **Default_Layout**：`layouts/default.vue`，一般用戶端的主佈局元件
- **Admin_Layout**：`layouts/admin.vue`，廠商後台管理端的主佈局元件
- **MemberAccount**：一般會員帳號資料表（PostgreSQL on Neon）
- **VendorUser**：廠商用戶帳號資料表（PostgreSQL on Neon）
- **Module**：應用程式六大服務分類之一（食、醫、住、行、預、樂）
- **JWT**：JSON Web Token，用於 stateless 認證的 token 格式

---

## Requirements

### Requirement 1: 一般會員登入

**User Story:** 身為一般使用者，我希望透過 email 和密碼登入系統，以便存取用戶端的各項功能。

#### Acceptance Criteria

1. WHEN 一般使用者提交 email 與密碼且 emailHash 對應之帳號存在、帳號狀態為啟用（status = "01"）、isDeleted 為 false、且密碼與該帳號之 passwordHash 比對成功，THE Auth_Service SHALL 驗證憑證並回傳包含用戶 ID 與角色之 JWT token，該 token 有效期為 24 小時
2. IF 一般使用者提交之 email 格式不符合 RFC 5322 標準、或 emailHash 查無對應帳號、或密碼與 passwordHash 比對失敗，THEN THE Auth_Service SHALL 回傳 401 狀態碼與錯誤訊息指出帳號或密碼錯誤，且不揭露具體失敗原因
3. IF emailHash 對應之帳號存在但帳號狀態非啟用（status ≠ "01"）或 isDeleted 為 true，THEN THE Auth_Service SHALL 回傳 403 狀態碼與錯誤訊息指出帳號已停用，拒絕登入
4. WHEN 一般使用者成功登入，THE Frontend_Auth_Module SHALL 將 JWT token 儲存至 HttpOnly、Secure 屬性之 cookie（有效期與 token 一致為 24 小時）並導向路徑 "/" 首頁
5. THE 登入頁面 SHALL 於登入表單送出前驗證 email 欄位（最大長度 254 字元、符合 email 格式）與密碼欄位（長度介於 8 至 72 字元）皆已填寫且格式正確，若驗證失敗則於對應欄位下方顯示錯誤提示且不送出請求
6. THE 登入頁面 SHALL 於表單下方顯示測試用帳號密碼資訊供隊友測試使用

---

### Requirement 2: 廠商用戶登入

**User Story:** 身為廠商用戶，我希望透過 email 和密碼登入後台管理系統，以便管理廠商的各項業務。

#### Acceptance Criteria

1. WHEN 廠商用戶提交 email 與密碼且憑證驗證通過，THE Auth_Service SHALL 回傳包含 vendorId、userId、與 role 的 JWT token，該 token 有效期為 8 小時
2. IF 廠商用戶提交的 email 對應的 emailHash 不存在或密碼與 passwordHash 不匹配，THEN THE Auth_Service SHALL 回傳 401 狀態碼與錯誤訊息指出帳號或密碼錯誤，且不揭露是 email 或密碼錯誤
3. WHEN 廠商用戶成功登入，THE Frontend_Auth_Module SHALL 將 JWT token 儲存至 httpOnly、Secure、SameSite=Strict 的 cookie，並導向後台管理首頁路由 /admin
4. IF 廠商用戶的 isActive 欄位為 "0"，THEN THE Auth_Service SHALL 回傳 403 狀態碼與錯誤訊息指出此帳號已被停用
5. IF 廠商用戶的 isDeleted 欄位為 true，THEN THE Auth_Service SHALL 回傳與 emailHash 不存在時相同的 401 回應，不揭露帳號已被刪除的事實

---

### Requirement 3: 登入頁面與雙角色切換

**User Story:** 身為使用者，我希望在同一個登入頁面中選擇登入身份（一般會員或廠商），以便快速進入對應的平台。

#### Acceptance Criteria

1. THE 登入頁面 SHALL 提供「一般登入」與「廠商登入」兩個切換按鈕，且頁面載入時預設選取「一般登入」
2. WHEN 使用者選擇「一般登入」，THE 登入頁面 SHALL 顯示 email 欄位（最大長度 254 字元）和密碼欄位（最大長度 72 字元）
3. WHEN 使用者選擇「廠商登入」，THE 登入頁面 SHALL 顯示 email 欄位（最大長度 254 字元）和密碼欄位（最大長度 72 字元）
4. THE 登入頁面 SHALL 於表單下方固定顯示一組一般會員測試帳密與一組廠商測試帳密
5. WHEN 使用者填入有效 email 與密碼後點擊登入按鈕，THE 系統 SHALL 驗證憑證並於成功後將一般會員導向會員首頁、將廠商導向廠商管理頁面
6. IF 使用者提交的 email 格式無效或任一欄位為空白，THEN THE 登入頁面 SHALL 於對應欄位旁顯示驗證錯誤訊息，且不送出請求
7. IF 登入驗證失敗（帳號不存在或密碼錯誤），THEN THE 登入頁面 SHALL 顯示錯誤訊息表明憑證無效，且保留已填入的 email 欄位內容

---

### Requirement 4: 路由守衛（認證保護）

**User Story:** 身為系統管理者，我希望未登入的使用者無法透過直接輸入網址存取受保護頁面，以確保系統安全性。

#### Acceptance Criteria

1. WHEN 未認證用戶（cookie 中無 JWT token 或 token 解碼失敗）嘗試存取受保護頁面（`/`、`/food`、`/housing`、`/medical`、`/transport`、`/admin/*`），THE Route_Guard SHALL 在頁面渲染前攔截導航請求，將用戶重新導向至 `/login`，並以 query parameter 保留原始目標路徑（例如 `?redirect=/food`）
2. WHEN 已認證用戶的 JWT token 過期（exp claim 小於當前時間）或簽章驗證失敗，THE Route_Guard SHALL 移除 cookie 中的 JWT token、清除客戶端認證狀態，並重新導向至 `/login`
3. WHEN 已認證的一般會員（token 中 role 欄位為 "member"）嘗試存取後台管理頁面（路徑以 `/admin` 開頭），THE Route_Guard SHALL 重新導向至用戶端首頁 `/`
4. WHEN 已認證的廠商用戶（token 中 role 欄位為 "vendor"）嘗試存取一般用戶頁面（`/`、`/food`、`/housing`、`/medical`、`/transport`），THE Route_Guard SHALL 重新導向至後台管理首頁 `/admin`
5. THE Route_Guard SHALL 允許未認證用戶存取 `/login` 頁面而不觸發重新導向
6. IF 已認證用戶導航至 `/login` 頁面，THEN THE Route_Guard SHALL 依據用戶角色重新導向至對應首頁（member 導向 `/`，vendor 導向 `/admin`）
7. IF JWT token 解析過程中發生非預期錯誤（格式損毀、欄位缺失），THEN THE Route_Guard SHALL 視同未認證狀態，移除 cookie 中的 token 並重新導向至 `/login`

---

### Requirement 5: 角色導向自動路由

**User Story:** 身為使用者，我希望登入後系統自動導向對應角色的平台，不需要手動切換。

#### Acceptance Criteria

1. WHEN 一般會員（role = "member"）完成登入且前端收到包含有效角色欄位的 JWT token，THE Frontend_Auth_Module SHALL 自動導向至用戶端首頁 (`/`)
2. WHEN 廠商用戶（role = "vendor"）完成登入且前端收到包含有效角色欄位的 JWT token，THE Frontend_Auth_Module SHALL 自動導向至後台管理首頁 (`/admin`)
3. IF JWT token 中角色欄位缺失或不屬於已定義角色（"member" 或 "vendor"），THEN THE Frontend_Auth_Module SHALL 阻止路由導向並將使用者導回登入頁面，同時顯示角色無法識別的錯誤提示訊息
4. IF 已登入的一般會員嘗試存取 `/admin` 路徑，THEN THE Frontend_Auth_Module SHALL 阻止存取並自動導向至用戶端首頁 (`/`)；IF 已登入的廠商用戶嘗試存取非 `/admin` 開頭的頁面，THEN THE Frontend_Auth_Module SHALL 阻止存取並自動導向至後台管理首頁 (`/admin`)
5. THE Default_Layout SHALL 移除「切換至廠商端」按鈕（目前位於 header 中間位置的 `app-header__switch-btn`），由認證系統根據 JWT token 中的 role 欄位自動決定可存取的路由範圍

---

### Requirement 6: 上方固定導覽列（Top Navigation Bar）

**User Story:** 身為一般使用者，我希望在上方固定欄看到所有六大模組並能快速切換，以便瀏覽不同服務分類。

#### Acceptance Criteria

1. THE Top_Navigation_Bar SHALL 以固定定位（position: fixed）顯示於頁面頂部，寬度不超過 430px，且 z-index 高於頁面內容，確保捲動時始終可見
2. THE Top_Navigation_Bar SHALL 水平排列六大模組標籤（食、醫、住、行、預、樂），當標籤總寬度超出容器時，支援水平捲動（overflow-x: auto）瀏覽所有標籤
3. WHEN 使用者點擊任一模組標籤，THE Top_Navigation_Bar SHALL 展開該模組的下拉選單，顯示該模組於 info.json 中定義的所有 features 項目清單，以及一個導向該模組首頁路由（module.route）的首頁選項
4. IF 下拉選單已展開且使用者點擊同一模組標籤或選單外部區域，THEN THE Top_Navigation_Bar SHALL 收合該下拉選單
5. IF 下拉選單已展開且使用者點擊另一模組標籤，THEN THE Top_Navigation_Bar SHALL 收合目前選單並展開新模組的下拉選單
6. WHEN 使用者從下拉選單選擇一個具有非空 link 值的項目，THE Top_Navigation_Bar SHALL 導覽至該項目對應的頁面路由並收合下拉選單
7. IF 下拉選單中的項目其 link 值為空字串，THEN THE Top_Navigation_Bar SHALL 將該項目顯示為不可互動的停用狀態（視覺上可區分且不可點擊）
8. THE Top_Navigation_Bar SHALL 視覺標示目前所在頁面對應的模組標籤為作用中狀態（例如底線、色彩變化或加粗），使用者可藉此辨識當前所處模組

---

### Requirement 7: 下方固定功能列（Bottom Action Bar）

**User Story:** 身為一般使用者，我希望在下方固定欄快速存取 AI 聊天、個人資料與行事曆功能，以提升操作便利性。

#### Acceptance Criteria

1. THE Bottom_Action_Bar SHALL 於頁面底部以固定定位顯示三個按鈕，由左至右依序為：個人資料按鈕、AI 聊天按鈕、行事曆按鈕，且整體寬度不超過 430px
2. THE Bottom_Action_Bar 的 AI 聊天按鈕 SHALL 使用圓形背景設計，位於中間位置，並以垂直方向突出於固定列上方至少 12px
3. WHEN 使用者點擊 AI 聊天按鈕，THE Bottom_Action_Bar SHALL 以覆蓋層（overlay）方式開啟 AI 聊天介面，且聊天介面開啟後 Bottom_Action_Bar 仍保持可見
4. WHEN 使用者點擊個人資料按鈕，THE Bottom_Action_Bar SHALL 導覽至個人資料頁面
5. WHEN 使用者點擊行事曆按鈕，THE Bottom_Action_Bar SHALL 導覽至行事曆頁面，該頁面匯集整個應用程式的預定資訊
6. WHILE 頁面內容捲動時，THE Bottom_Action_Bar SHALL 維持固定於視窗底部可見，且頁面主要內容區域須保留足夠下方間距以避免被固定列遮擋

---

### Requirement 8: 重構 Default Layout

**User Story:** 身為開發者，我希望 `layouts/default.vue` 主要由引入的獨立元件組成，不包含大量 inline CSS 與邏輯，以提升程式碼可維護性。

#### Acceptance Criteria

1. THE Default_Layout SHALL 僅由三個區塊組成：引入的 Top_Navigation_Bar 元件、一個 `<slot />` 內容區、以及引入的 Bottom_Action_Bar 元件，且 `<script setup>` 區塊不包含任何 computed 屬性或業務邏輯（僅允許元件 import）
2. THE Default_Layout SHALL 移除目前的後台管理切換按鈕（switchText、switchTo computed 屬性及對應的 NuxtLink）及所有相關路由判斷邏輯（isAdmin computed）
3. THE Default_Layout SHALL 在 `<style scoped>` 中僅保留容器層級的間距樣式，其中 padding-top 等於 Top_Navigation_Bar 的固定高度（56px），padding-bottom 等於 Bottom_Action_Bar 的固定高度（80px），且 scoped CSS 總行數不超過 15 行
4. WHEN Top_Navigation_Bar 或 Bottom_Action_Bar 元件不存在時，THE Default_Layout SHALL 仍能正常渲染而不產生執行時錯誤（元件應事先建立為獨立 .vue 檔案）

---

### Requirement 9: 清理不再使用的元件

**User Story:** 身為開發者，我希望移除已確認不再使用的元件，以減少專案中的死碼。

#### Acceptance Criteria

1. THE 系統 SHALL 刪除 `components/ui/AppHeader.vue`（未被任何頁面或佈局引用）
2. THE 系統 SHALL 刪除 `components/ui/ModuleTab.vue`（僅被已刪除的 AppHeader.vue 引用）
3. THE 系統 SHALL 刪除 `components/ui/AiButton.vue`（AI 聊天功能已移至 Bottom_Action_Bar）
4. IF `components/ui/StatusBadge.vue` 未被任何元件以 `<StatusBadge>` 或 `<status-badge>` 標籤實際渲染（僅存在型別映射或資料引用不算使用），THEN THE 系統 SHALL 刪除該檔案
5. IF `components/ui/TimelineSelector.vue` 未被任何頁面或佈局以 `<TimelineSelector>` 或 `<timeline-selector>` 標籤引用，THEN THE 系統 SHALL 刪除該檔案
6. WHEN 上述元件刪除完成後，THE 系統 SHALL 通過前端建置（`npm run build`）且無編譯錯誤，確認無殘留的 import 語句或元件引用導致建置失敗
7. IF 刪除目標元件後導致其他元件出現未解析的 import 或未定義的元件引用，THEN THE 系統 SHALL 一併移除該殘留引用，使建置恢復正常

---

### Requirement 10: 後台管理頁面結構重組

**User Story:** 身為開發者，我希望將各模組的後台管理頁面集中至 `pages/admin/` 資料夾下管理，以建立清晰的路由層級結構。

#### Acceptance Criteria

1. THE 系統 SHALL 在 `pages/` 下建立 `admin/` 資料夾，將 `food/admin.vue`、`medical/admin.vue`、`housing/admin.vue` 移動至該資料夾並分別命名為 `food.vue`、`medical.vue`、`housing.vue`
2. WHEN 各模組的 admin.vue 移動至 `pages/admin/` 資料夾後，THE 系統 SHALL 保持每個頁面的 `<template>`、`<script setup>` 中除 `definePageMeta` 以外的邏輯、以及 `<style>` 區塊內容不變；`definePageMeta` 得視新路由結構調整
3. THE 系統 SHALL 將後台管理頁面的路由解析為 `/admin/food`、`/admin/medical`、`/admin/housing`，且原路由 `/food/admin`、`/medical/admin`、`/housing/admin` 不再對應任何頁面（回傳 404 或導向新路由）
4. THE Admin_Layout SHALL 更新模組名稱解析邏輯，從新路由路徑 `/admin/{module}` 中正確擷取模組名稱（即路徑的第二段），確保 header 顯示對應的模組標題
5. THE Admin_Layout SHALL 提供模組切換導覽列，包含食、醫、住三個可點擊的導覽連結，各連結指向對應的 `/admin/{module}` 路由，並以視覺樣式標示當前所在的模組

---

### Requirement 11: 後台管理首頁

**User Story:** 身為廠商用戶，我希望後台管理有獨立首頁，提供模組切換導覽，以便快速進入各模組的管理介面。

#### Acceptance Criteria

1. WHEN 廠商用戶導覽至 `/admin` 路徑，THE 系統 SHALL 顯示後台管理首頁，使用 admin layout 並呈現模組導覽介面
2. THE 後台管理首頁 SHALL 在頁面上方顯示固定定位（position: fixed）的導覽列，包含「食」、「醫」、「住」三個模組標籤，標籤以水平排列方式呈現且各標籤可點擊
3. WHEN 廠商用戶點擊「食」模組標籤，THE 系統 SHALL 導覽至 `/admin/food` 頁面
4. WHEN 廠商用戶點擊「醫」模組標籤，THE 系統 SHALL 導覽至 `/admin/medical` 頁面
5. WHEN 廠商用戶點擊「住」模組標籤，THE 系統 SHALL 導覽至 `/admin/housing` 頁面
6. WHILE 廠商用戶位於後台管理首頁，THE 導覽列 SHALL 以視覺區分方式（色彩或底線）標示當前所在頁面為首頁狀態，與其他三個模組標籤區別開來

---

### Requirement 12: AppHeader 地理定位與用戶資訊動態顯示

**User Story:** 身為一般使用者，我希望上方導覽列能顯示我的真實位置與用戶名稱，而非寫死的假資料。

#### Acceptance Criteria

1. WHEN 瀏覽器 Geolocation API 成功回傳座標（timeout 設為 10 秒），THE Top_Navigation_Bar SHALL 透過反向地理編碼將座標轉換為台灣行政區名稱（格式：「縣市＋鄉鎮市區」，例如「台北市信義區」），並顯示於位置欄位
2. WHILE 系統正在取得地理位置或等待反向地理編碼回應，THE Top_Navigation_Bar SHALL 於位置欄位顯示「定位中...」
3. IF 使用者拒絕位置存取權限、Geolocation API 逾時（超過 10 秒）、或瀏覽器不支援 Geolocation API，THEN THE Top_Navigation_Bar SHALL 於位置欄位顯示「未設定位置」
4. IF 反向地理編碼服務回應失敗或回傳無法解析的結果，THEN THE Top_Navigation_Bar SHALL 於位置欄位顯示「未設定位置」
5. WHILE 使用者處於已登入狀態，THE Top_Navigation_Bar SHALL 從認證狀態取得並顯示用戶名稱（最多顯示 20 個字元，超出部分以「…」截斷）
6. IF 用戶名稱取得失敗，THEN THE Top_Navigation_Bar SHALL 於用戶名稱欄位顯示「訪客」

---

### Requirement 13: RoleSwitchButton 元件處理

**User Story:** 身為開發者，我希望確認 RoleSwitchButton 在新架構下的定位，因為角色切換已由認證系統取代。

#### Acceptance Criteria

1. WHEN 認證系統的角色自動導向功能已整合至路由守衛，THE 系統 SHALL 從 `layouts/admin.vue` 中移除 `<UiRoleSwitchButton />` 元件引用及其容器元素
2. WHEN 認證系統的角色自動導向功能已整合至路由守衛，THE 系統 SHALL 從 `layouts/default.vue` 中移除角色切換相關的導航連結及其對應的 computed 邏輯（switchText、switchTo）
3. THE 系統 SHALL 刪除 `components/ui/RoleSwitchButton.vue` 檔案（角色切換功能由認證系統取代）
4. THE Admin_Layout SHALL 在原有角色切換按鈕的位置（header 右側區域）改為顯示一個「登出」按鈕，該按鈕點擊後清除當前使用者的認證狀態並將頁面導向至登入頁面
5. IF 使用者點擊「登出」按鈕且認證狀態清除失敗，THEN THE 系統 SHALL 仍然將頁面導向至登入頁面（強制登出）

---

### Requirement 14: 受保護頁面內容不可變動

**User Story:** 身為開發者，我希望在搬移或重構過程中，食、醫、住、行各模組資料夾下由其他隊友負責的檔案內容保持不變。

#### Acceptance Criteria

1. WHILE 進行頁面搬移或路由重構時，THE 系統 SHALL 保持 `pages/food/`、`pages/medical/`、`pages/housing/`、`pages/transport/` 資料夾下除 `admin.vue` 以外的所有檔案內容與檔案結構不變（檔案內容逐位元組比對相同、不新增檔案、不刪除檔案、不重新命名檔案）
2. WHILE 進行佈局重構時，THE 系統 SHALL 確保各模組頁面（food、medical、housing、transport 下的非 admin 頁面）在瀏覽器中載入時不產生 Vue 運行時錯誤，且頁面仍渲染於重構前所對應的同名 layout 元件內
3. IF 搬移或重構操作意外修改了受保護資料夾內的非 admin 檔案，THEN THE 系統 SHALL 透過版本控制差異檢查（git diff）可偵測到該變更，且該變更不得被提交至版本庫
