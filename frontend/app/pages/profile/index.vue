<template>
  <div class="profile-page">
    <!-- ===== 半圓頭部 ===== -->
    <header class="profile-header">
      <div class="semi-circle-wrapper">
        <div class="semi-circle">
          <!-- 返回按鈕（左上角） -->
          <button class="back-btn" @click="goHome">← 返回</button>
          <!-- 主標題 -->
          <h1 class="profile-title">個人設定</h1>
          <!-- 副標題 -->
          <p class="profile-subtitle">管理您的帳戶資訊與安全設定</p>
        </div>
      </div>
    </header>

    <!-- ===== 卡片區域 ===== -->
    <div class="profile-grid">
      <!-- 基本資訊卡片 -->
      <section class="info-card">
        <div class="card-label" :style="{ backgroundColor: '#f97316' }">👤</div>
        <h2 class="card-title">基本資訊</h2>
        <form class="info-form" @submit.prevent="saveProfile">
          <div class="form-group">
            <label>姓名</label>
            <input v-model="profile.name" type="text" placeholder="請輸入姓名" />
          </div>
          <div class="form-group">
            <label>電子信箱</label>
            <input v-model="profile.email" type="email" placeholder="請輸入信箱" />
          </div>
          <div class="form-group">
            <label>聯絡電話</label>
            <input v-model="profile.phone" type="tel" placeholder="請輸入手機號碼" />
          </div>
          <button type="submit" class="save-btn">儲存變更</button>
        </form>
      </section>

      <!-- 變更密碼卡片 -->
      <section class="info-card">
        <div class="card-label" :style="{ backgroundColor: '#3b82f6' }">🔒</div>
        <h2 class="card-title">變更密碼</h2>
        <form class="info-form" @submit.prevent="changePassword">
          <div class="form-group">
            <label>目前密碼</label>
            <input v-model="password.old" type="password" placeholder="請輸入目前密碼" />
          </div>
          <div class="form-group">
            <label>新密碼</label>
            <input v-model="password.new" type="password" placeholder="請輸入新密碼" />
          </div>
          <div class="form-group">
            <label>確認新密碼</label>
            <input v-model="password.confirm" type="password" placeholder="再次輸入新密碼" />
          </div>
          <button type="submit" class="save-btn" style="background-color:#3b82f6;border-color:#3b82f6;">變更密碼</button>
        </form>
      </section>

      <!-- 帳戶操作卡片 -->
      <section class="info-card action-card">
        <div class="card-label" :style="{ backgroundColor: '#ef4444' }">🚪</div>
        <h2 class="card-title">帳戶操作</h2>
        <p class="action-desc">登出後將回到首頁，請確認已儲存所有變更。</p>
        <button class="logout-btn" @click="handleLogout">登出帳戶</button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

definePageMeta({
  layout: 'blank'
})

const { logout } = useAuth()

// 模擬個人資訊（實際可從 store 或 API 取得）
const profile = reactive({
  name: '王小明',
  email: 'ming@example.com',
  phone: '0912-345-678',
})

const password = reactive({
  old: '',
  new: '',
  confirm: '',
})

// 方法
const goHome = () => {
  navigateTo('/')
}

const saveProfile = () => {
  alert('個人資訊已儲存（模擬）')
}

const changePassword = () => {
  if (password.new !== password.confirm) {
    alert('新密碼與確認密碼不符')
    return
  }
  alert('密碼已變更（模擬）')
  password.old = ''
  password.new = ''
  password.confirm = ''
}

const handleLogout = async () => {
  if (confirm('確定要登出嗎？')) {
    await logout()
  }
}
</script>

<style scoped>
/* ========== 設計令牌（與首頁一致） ========== */
:root {
  --color-bg-page: #fafaf9;
  --color-bg-card: #ffffff;
  --color-primary: #f97316;
  --color-text-primary: #1c1917;
  --color-text-secondary: #78716c;
  --color-border: #e2e8f0;
  --radius-lg: 16px;
  --radius-md: 12px;
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.06);
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --text-base: 15px;
  --text-sm: 13px;
}

/* ========== 頁面佈局 ========== */
.profile-page {
  max-width: 720px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg-page);
  padding: 0 var(--space-4) 80px;
  font-family: system-ui, -apple-system, sans-serif;
  box-sizing: border-box;
}

/* ========== 半圓頭部 ========== */
.profile-header {
  margin: 0 calc(-1 * var(--space-4)) 12px;  /* 減少與卡片的間距，讓整體更往上 */
}

.semi-circle-wrapper {
  width: 100%;
  aspect-ratio: 2 / 0.7;
  overflow: hidden;
}

.semi-circle {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  color: #ffffff;
  padding: 10px 20px 8px;  /* 減少上下內距，讓文字更緊湊 */
  box-sizing: border-box;
  text-align: center;
}

/* 返回按鈕（半圓左上角） */
.back-btn {
  position: absolute;
  left: 16px;
  top: 16px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #ffffff;
  font-size: var(--text-base);
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 50em;
  font-weight: 500;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
  font-family: inherit;
  line-height: 1.4;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}
.back-btn:active {
  background: rgba(255, 255, 255, 0.35);
}

/* 標題 */
.profile-title {
  font-size: clamp(24px, 5vw, 36px);
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 4px 0;  /* 減少與副標題間距 */
  letter-spacing: -0.5px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* 副標題 */
.profile-subtitle {
  font-size: clamp(13px, 1.6vw, 16px);
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  letter-spacing: 0.3px;
}

/* ========== 卡片網格（單欄） ========== */
.profile-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* ========== 卡片樣式（與首頁卡片一致） ========== */
.info-card {
  background-color: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-5) var(--space-4);
  border: 1px solid transparent;
  transition: border-color 0.15s;
}
.info-card:hover {
  border-color: var(--color-primary);
}

.card-label {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4) 0;
  letter-spacing: 0.3px;
}

/* ========== 表單樣式 ========== */
.info-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background: #f8fafc;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
}

/* ========== 按鈕樣式（與首頁 close-btn 呼應） ========== */
.save-btn {
  align-self: flex-end;
  margin-top: 4px;
  padding: 0.5em 1.8em;
  border-width: 4px;
  color: #ffffff;
  background-color: var(--color-primary);
  border-style: solid;
  border-color: var(--color-primary);
  box-shadow: 0px 5px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  font-family: inherit;
  font-weight: bold;
  border-radius: 50em;
  appearance: none;
  line-height: 1.4;
  transition: none;
  font-size: 14px;
}
.save-btn:active {
  transform: translateY(5px);
  border-color: #c75f0a;
  box-shadow: 0px 0px;
}
.save-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ========== 帳戶操作卡片特殊樣式 ========== */
.action-card .action-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-4) 0;
  line-height: 1.5;
}

.logout-btn {
  padding: 0.5em 2em;
  border: none;
  border-radius: 50em;
  background-color: #ef4444;
  color: white;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0px 5px rgba(0, 0, 0, 0.15);
  transition: none;
  font-family: inherit;
  border: 4px solid #ef4444;
}
.logout-btn:active {
  transform: translateY(5px);
  border-color: #b91c1c;
  box-shadow: 0px 0px;
}
.logout-btn:focus-visible {
  outline: 2px solid #ef4444;
  outline-offset: 2px;
}

/* ========== 響應式微調 ========== */
@media (max-width: 480px) {
  .profile-page {
    padding: 0 var(--space-4) 60px;
  }
  .profile-header {
    margin: 0 calc(-1 * var(--space-4)) 8px;  /* 手機版間距再縮小 */
  }
  .back-btn {
    left: 12px;
    top: 12px;
    font-size: 13px;
    padding: 4px 12px;
  }
  .semi-circle {
    padding: 12px 16px 6px;
  }
  .profile-title {
    margin-bottom: 2px;
  }
}
</style>