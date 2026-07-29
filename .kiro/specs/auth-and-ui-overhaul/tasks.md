# Implementation Plan: Auth and UI Overhaul

## Overview

本實作計畫將認證系統與 UI 架構重構拆分為循序漸進的步驟。先建立後端認證基礎建設（crypto utils → auth service → routes → middleware），再建立前端認證模組（composable → middleware → login page），接著重構 UI 元件與 layouts，最後進行頁面重組與清理。每個步驟都建立在前一步之上，確保沒有孤立的程式碼。

## Tasks

- [x] 1. 後端認證基礎建設
  - [x] 1.1 建立 `backend/utils/crypto.js` 加密工具模組
    - 實作 `hashEmail(email)` 函式：使用 Node.js 內建 `crypto` 模組計算 SHA-256 hex string
    - 實作 `decryptField(encryptedBuffer)` 函式：使用 AES-256-GCM 解密 Bytes 欄位（key 從環境變數 `ENCRYPTION_KEY` 讀取）
    - 使用 CommonJS `module.exports` 匯出
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 建立 `backend/services/authService.js` 認證服務
    - 實作 `loginMember(email, password)` 函式：hashEmail → 查詢 MemberAccount（via emailHash）→ 驗證 status/isDeleted → bcrypt.compare → 簽發 JWT
    - 實作 `loginVendor(email, password)` 函式：hashEmail → 查詢 VendorUser（via emailHash）→ 驗證 isActive/isDeleted → bcrypt.compare → 簽發 JWT（含 vendorId）
    - 實作 `signToken(payload, expiresIn)` 函式：使用 jsonwebtoken 簽發 HS256 token
    - 實作 `verifyToken(token)` 函式：驗證 JWT 簽章與到期時間
    - Member token 有效期 24h，Vendor token 有效期 8h
    - 錯誤回應不揭露具體失敗原因（帳號不存在與密碼錯誤使用相同訊息）
    - 使用 Prisma client 查詢資料庫，import from `../generated/prisma`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 2.5_

  - [x] 1.3 建立 `backend/middleware/verifyToken.js` Token 驗證 middleware
    - 從 `req.cookies.token` 解析 JWT token
    - 驗證簽章與到期時間，成功時將 decoded payload 掛載至 `req.user`
    - 驗證失敗回傳 401 JSON（區分過期 vs 無效簽章的訊息）
    - _Requirements: 4.1, 4.2, 4.7_

  - [x] 1.4 建立 `backend/routes/auth.js` 認證路由
    - `POST /api/auth/login`：接收 `{ email, password, role }` → 呼叫 authService → 設定 HttpOnly Secure SameSite=Strict cookie → 回傳用戶資訊
    - `POST /api/auth/logout`：清除 cookie → 回傳 200
    - `GET /api/auth/me`：使用 verifyToken middleware → 回傳 `{ userId, role, vendorId?, name? }`（name 需解密）
    - Cookie 配置：httpOnly=true, secure=true, sameSite='strict', path='/', maxAge 依角色設定
    - _Requirements: 1.1, 1.4, 2.1, 2.3_

  - [x] 1.5 更新 `backend/index.js` 掛載認證路由與 cookie-parser
    - 安裝並引入 `cookie-parser` middleware
    - 引入 `backend/routes/auth.js` 並掛載至 `/api/auth`
    - 確保 `express.json()` 在 cookie-parser 之前
    - _Requirements: 1.1, 2.1_

- [x] 2. 後端認證測試
  - [x] 2.1 撰寫 authService 單元測試
    - 測試 loginMember 成功/失敗情境
    - 測試 loginVendor 成功/失敗情境
    - 測試帳號停用、已刪除等邊界情況
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 2.5_

  - [x] 2.2 撰寫 Property Test：認證 API 錯誤回應不洩露具體原因
    - **Property 8: 認證 API 錯誤回應不洩露具體原因**
    - 對任意登入失敗場景（帳號不存在 OR 密碼錯誤 OR vendor 已刪除），驗證回傳的錯誤訊息完全相同
    - **Validates: Requirements 1.2, 2.2, 2.5**

- [x] 3. Checkpoint - 確保後端認證服務所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 前端認證模組
  - [x] 4.1 建立 `frontend/app/composables/useAuth.ts` 認證狀態管理
    - 定義 `AuthState` interface：isAuthenticated, user, isLoading, error
    - 實作 `login(email, password, role)` 函式：POST /api/auth/login → 更新狀態
    - 實作 `logout()` 函式：POST /api/auth/logout → 清除狀態 → navigateTo('/login')
    - 實作 `fetchUser()` 函式：GET /api/auth/me → 更新狀態（用於頁面初始化）
    - 使用 Nuxt 的 `useState` 確保 SSR/CSR 狀態一致
    - 使用 `$fetch` 或 `useFetch` 搭配 `credentials: 'include'` 確保 cookie 傳送
    - _Requirements: 1.4, 2.3, 5.1, 5.2, 5.3_

  - [x] 4.2 建立 `frontend/app/middleware/auth.global.ts` 路由守衛
    - 全域 middleware，每次路由變更前檢查認證狀態
    - 未認證用戶嘗試存取受保護頁面 → redirect 至 `/login?redirect={path}`
    - 已認證 member 存取 `/admin/*` → redirect 至 `/`
    - 已認證 vendor 存取非 `/admin` 頁面 → redirect 至 `/admin`
    - 已認證用戶存取 `/login` → redirect 至對應首頁
    - `/login` 頁面允許未認證用戶存取
    - Token 解析異常視為未認證狀態
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.4_

  - [x] 4.3 撰寫 Property Test：Route Guard 未認證用戶導向登入頁
    - **Property 3: Route Guard 未認證用戶一律導向登入頁**
    - 對任意路由路徑（排除 `/login`），若 isAuthenticated = false，驗證決策函式回傳 redirect 至 `/login?redirect={path}`
    - **Validates: Requirements 4.1, 4.7**

  - [x] 4.4 撰寫 Property Test：Route Guard 角色隔離
    - **Property 4: Route Guard 角色隔離**
    - 對任意已認證使用者，驗證 member 不可存取 `/admin/*`、vendor 不可存取非 `/admin` 頁面
    - **Validates: Requirements 4.3, 4.4, 5.4**

  - [x] 4.5 撰寫 Property Test：已認證用戶存取登入頁一律被導走
    - **Property 5: 已認證用戶存取登入頁一律被導走**
    - 對任意已認證使用者（role 為 member 或 vendor），驗證存取 `/login` 時被導向對應首頁
    - **Validates: Requirements 4.6**

- [x] 5. 前端登入頁面
  - [x] 5.1 建立 `frontend/app/pages/login.vue` 登入頁面
    - 雙角色 Tab 切換（一般登入 / 廠商登入），預設選取「一般登入」
    - Email 欄位：最大 254 字元、email 格式驗證
    - 密碼欄位：8~72 字元長度驗證
    - 表單前端驗證失敗時於欄位下方顯示錯誤提示，不送出請求
    - 登入成功：member 導向 `/`，vendor 導向 `/admin`
    - 登入失敗：顯示伺服器錯誤訊息，保留已填 email
    - 網路錯誤：顯示「網路連線失敗，請稍後再試」
    - 表單下方顯示測試帳號資訊
    - 使用 `definePageMeta({ layout: false })` 或自訂 layout 避免 TopNav/BottomBar
    - _Requirements: 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.2 撰寫 Property Test：無效 email 格式一律被拒絕
    - **Property 1: 無效 email 格式一律被拒絕**
    - 對任意字串若不符合基本 email 格式規則，驗證函式回傳 false
    - **Validates: Requirements 1.5, 3.6**

  - [x] 5.3 撰寫 Property Test：無效密碼長度一律被拒絕
    - **Property 2: 無效密碼長度一律被拒絕**
    - 對任意字串若長度 < 8 或 > 72，驗證函式回傳 false
    - **Validates: Requirements 1.5, 3.6**

- [x] 6. Checkpoint - 確保認證模組端對端測試通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. 前端 UI 元件建置
  - [x] 7.1 建立 `frontend/app/composables/useGeolocation.ts` 地理定位 composable
    - 使用 Browser Geolocation API（timeout: 10000ms）取得座標
    - 成功取得座標後呼叫反向地理編碼 API 轉換為「縣市+鄉鎮市區」格式
    - 等待中顯示「定位中...」
    - 錯誤情境（拒絕權限 / 逾時 / 不支援 / API 失敗）一律顯示「未設定位置」
    - 匯出 `location: Ref<string>` 與 `refresh(): void`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 7.2 建立 `frontend/app/components/TopNavigationBar.vue` 上方導覽列
    - 固定定位於頁面頂部，max-width: 430px，z-index 高於頁面內容
    - 水平排列六大模組標籤（首頁、食、醫、住、行、預、樂），支援 overflow-x: auto 捲動
    - 預設進入為首頁
    - 點擊模組標籤展開下拉選單，顯示 info.json 中該模組的 features 項目
    - 下拉選單包含「模組首頁」選項（導航至 module.route）
    - 點擊同標籤或外部區域收合選單；點擊其他標籤切換選單
    - 有 link 的項目可點擊導航；link 為空的項目顯示 disabled 狀態
    - 視覺標示當前所在模組
    - 顯示地理位置（useGeolocation）與用戶名稱（useAuth，超過 20 字截斷加「…」）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 12.1, 12.5, 12.6_

  - [x] 7.3 撰寫 Property Test：下拉選單空 link 項目不可導航
    - **Property 6: 下拉選單空 link 項目不可導航**
    - 對任意 info.json features 項目，若 link 為空字串，驗證該項目被標記為 disabled 且不觸發路由導航
    - **Validates: Requirements 6.7**

  - [x] 7.4 撰寫 Property Test：用戶名稱顯示截斷規則
    - **Property 7: 用戶名稱顯示截斷規則**
    - 對任意長度字串，若超過 20 字元則截斷為前 20 字元 + "…"，否則完整顯示
    - **Validates: Requirements 12.5**

  - [x] 7.5 建立 `frontend/app/components/BottomActionBar.vue` 下方功能列
    - 固定定位於頁面底部，max-width: 430px
    - 三個按鈕由左至右：個人資料、AI 聊天（圓形突出設計，垂直突出 ≥12px）、行事曆
    - AI 聊天按鈕觸發 overlay 開啟 AI 聊天介面
    - 個人資料按鈕導航至個人資料頁面
    - 行事曆按鈕導航至行事曆頁面
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.6 建立 `frontend/app/components/AiChatOverlay.vue` AI 聊天覆蓋層
    - Overlay 方式顯示，BottomActionBar 保持可見
    - 提供關閉按鈕收合 overlay
    - 基本聊天 UI 骨架（後續功能可擴充）
    - _Requirements: 7.3_

- [x] 8. 前端 Layout 重構與頁面重組
  - [x] 8.1 重構 `frontend/app/layouts/default.vue`
    - 移除所有 computed 屬性（isAdmin, switchText, switchTo）與切換按鈕
    - `<script setup>` 僅保留元件 import（若需要）
    - Template 僅由三區塊組成：TopNavigationBar + `<slot />` + BottomActionBar
    - `<style scoped>` 僅保留容器 padding（padding-top: 56px, padding-bottom: 80px），不超過 15 行
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 5.5, 13.2_

  - [x] 8.2 更新 `frontend/app/layouts/admin.vue`
    - 移除 `<UiRoleSwitchButton />` 元件引用及容器元素
    - Header 右側改為「登出」按鈕，點擊後呼叫 `useAuth().logout()`
    - 更新模組名稱解析邏輯：從 `/admin/{module}` 路徑提取第二段作為模組名稱
    - 提供模組切換導覽列：食、醫、住三個連結，指向 `/admin/food`、`/admin/medical`、`/admin/housing`
    - 視覺樣式標示當前所在模組
    - _Requirements: 10.4, 10.5, 13.1, 13.4, 13.5_

  - [x] 8.3 建立 `frontend/app/pages/admin/index.vue` 後台管理首頁
    - 使用 admin layout（`definePageMeta({ layout: 'admin' })`）
    - 顯示模組導覽介面：食、醫、住三個模組標籤
    - 點擊各標籤導航至對應 `/admin/{module}` 頁面
    - 視覺區分首頁狀態與其他模組標籤
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 8.4 搬移後台管理頁面至 `pages/admin/` 資料夾
    - 將 `pages/food/admin.vue` 搬移為 `pages/admin/food.vue`
    - 將 `pages/medical/admin.vue` 搬移為 `pages/admin/medical.vue`
    - 將 `pages/housing/admin.vue` 搬移為 `pages/admin/housing.vue`
    - 保持各頁面 `<template>`、`<script setup>`（除 definePageMeta 外）、`<style>` 內容不變
    - 更新 `definePageMeta` 以適應新路由結構（layout: 'admin'）
    - **注意**：不得修改 `pages/food/index.vue`、`pages/medical/index.vue`、`pages/housing/index.vue`、`pages/transport/index.vue` 的內容
    - _Requirements: 10.1, 10.2, 10.3, 14.1, 14.2_

- [x] 9. 元件清理
  - [x] 9.1 刪除廢棄元件並清理殘留引用
    - 刪除 `components/ui/AppHeader.vue`
    - 刪除 `components/ui/ModuleTab.vue`
    - 刪除 `components/ui/AiButton.vue`
    - 刪除 `components/ui/RoleSwitchButton.vue`
    - 檢查 `components/ui/StatusBadge.vue` 是否被任何元件以 `<StatusBadge>` 或 `<status-badge>` 標籤渲染，若無則刪除
    - 檢查 `components/ui/TimelineSelector.vue` 是否被任何頁面或佈局引用，若無則刪除
    - 搜尋並移除所有殘留的 import 語句或元件引用
    - 執行 `npm run build` 確認無編譯錯誤
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 13.3_

- [x] 10. Checkpoint - 確保前端建置通過且所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. 整合測試與驗收
  - [x] 11.1 撰寫後端 API 整合測試
    - 使用 supertest 測試 `/api/auth/login` 成功/失敗完整流程
    - 測試 cookie 設定與清除
    - 測試 `/api/auth/me` 回傳正確用戶資訊
    - 測試 token 過期與無效簽章情境
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 2.5_

  - [x] 11.2 撰寫前端 useAuth composable 單元測試
    - 測試 login/logout/fetchUser 狀態變更
    - 測試錯誤處理與狀態清除
    - _Requirements: 1.4, 2.3, 5.1, 5.2, 5.3_

- [x] 12. Final Checkpoint - 確保所有測試通過
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 標記 `*` 的 sub-task 為可選項，可跳過以加速 MVP
- 後端使用 CommonJS（`require` / `module.exports`），前端使用 TypeScript ES Modules
- **不可修改** `pages/food/index.vue`、`pages/medical/index.vue`、`pages/housing/index.vue`、`pages/transport/index.vue` 的內容
- 只有 admin.vue 檔案從模組資料夾搬移至 `pages/admin/`
- Property tests 使用 `fast-check` + Vitest，每個屬性至少 100 次迭代
- Checkpoints 確保增量驗證，及早發現整合問題
- 後端需安裝依賴：`bcrypt`、`jsonwebtoken`、`cookie-parser`
- 前端 API 請求需搭配 `credentials: 'include'` 確保 cookie 傳送

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "7.1"] },
    { "id": 2, "tasks": ["1.3", "1.4", "4.1"] },
    { "id": 3, "tasks": ["1.5", "2.1", "2.2", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "7.2"] },
    { "id": 6, "tasks": ["7.3", "7.4", "7.5", "7.6"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3", "8.4"] },
    { "id": 9, "tasks": ["9.1"] },
    { "id": 10, "tasks": ["11.1", "11.2"] }
  ]
}
```
