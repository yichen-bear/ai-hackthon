<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 標題 -->
      <div class="login-header">
        <h1 class="login-title">AI 生活管家</h1>
        <p class="login-subtitle">{{ mode === 'login' ? '登入您的帳號' : '建立新帳號' }}</p>
      </div>

      <!-- 登入 / 註冊 切換 -->
      <div class="mode-tabs">
        <button
          class="mode-btn"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          登入
        </button>
        <button
          class="mode-btn"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          註冊
        </button>
      </div>

      <!-- 角色 Tab 切換 -->
      <div class="role-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeRole === 'member' }"
          @click="switchRole('member')"
        >
          一般{{ mode === 'login' ? '登入' : '註冊' }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeRole === 'vendor' }"
          @click="switchRole('vendor')"
        >
          廠商{{ mode === 'login' ? '登入' : '註冊' }}
        </button>
      </div>

      <!-- 伺服器錯誤訊息 -->
      <div v-if="serverError" class="server-error">
        {{ serverError }}
      </div>

      <!-- 登入表單 -->
      <form v-if="mode === 'login'" class="login-form" @submit.prevent="handleLoginSubmit">
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            :class="{ 'has-error': errors.email }"
            placeholder="請輸入 Email"
            maxlength="254"
            autocomplete="email"
            @input="clearFieldError('email')"
          />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">密碼</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            :class="{ 'has-error': errors.password }"
            placeholder="請輸入密碼"
            maxlength="72"
            autocomplete="current-password"
            @input="clearFieldError('password')"
          />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          {{ isLoading ? '登入中...' : '登入' }}
        </button>
      </form>

      <!-- 註冊表單 -->
      <form v-else class="login-form" @submit.prevent="handleRegisterSubmit">
        <!-- 廠商專屬欄位 -->
        <div v-if="activeRole === 'vendor'" class="form-group">
          <label for="companyName" class="form-label">廠商名稱</label>
          <input
            id="companyName"
            v-model="companyName"
            type="text"
            class="form-input"
            :class="{ 'has-error': errors.companyName }"
            placeholder="請輸入廠商名稱"
            maxlength="100"
            @input="clearFieldError('companyName')"
          />
          <p v-if="errors.companyName" class="field-error">{{ errors.companyName }}</p>
        </div>

        <div class="form-group">
          <label for="reg-name" class="form-label">{{ activeRole === 'member' ? '姓名' : '聯絡人姓名' }}</label>
          <input
            id="reg-name"
            v-model="name"
            type="text"
            class="form-input"
            placeholder="請輸入姓名"
            maxlength="100"
          />
        </div>

        <div v-if="activeRole !== 'vendor'" class="form-group">
          <label for="reg-phone" class="form-label">聯絡電話</label>
          <input
            id="reg-phone"
            v-model="phone"
            type="tel"
            class="form-input"
            placeholder="請輸入聯絡電話"
            maxlength="20"
          />
        </div>

        <div class="form-group">
          <label for="reg-email" class="form-label">Email</label>
          <input
            id="reg-email"
            v-model="email"
            type="email"
            class="form-input"
            :class="{ 'has-error': errors.email }"
            placeholder="請輸入 Email"
            maxlength="254"
            autocomplete="email"
            @input="clearFieldError('email')"
          />
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>

        <div class="form-group">
          <label for="reg-password" class="form-label">密碼</label>
          <input
            id="reg-password"
            v-model="password"
            type="password"
            class="form-input"
            :class="{ 'has-error': errors.password }"
            placeholder="請輸入密碼（8-72 字元）"
            maxlength="72"
            autocomplete="new-password"
            @input="clearFieldError('password')"
          />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>

        <div class="form-group">
          <label for="reg-password-confirm" class="form-label">確認密碼</label>
          <input
            id="reg-password-confirm"
            v-model="passwordConfirm"
            type="password"
            class="form-input"
            :class="{ 'has-error': errors.passwordConfirm }"
            placeholder="請再次輸入密碼"
            maxlength="72"
            autocomplete="new-password"
            @input="clearFieldError('passwordConfirm')"
          />
          <p v-if="errors.passwordConfirm" class="field-error">{{ errors.passwordConfirm }}</p>
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          {{ isLoading ? '註冊中...' : '註冊' }}
        </button>
      </form>

      <!-- 測試帳號資訊（僅登入模式顯示） -->
      <div v-if="mode === 'login'" class="test-accounts">
        <p class="test-accounts-title">測試帳號</p>
        <div class="test-account-item">
          <span class="test-role">一般會員：</span>
          <span class="test-credentials">test@example.com / Test1234</span>
        </div>
        <div class="test-account-item">
          <span class="test-role">廠商用戶：</span>
          <span class="test-credentials">vendor@example.com / Vendor1234</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { validateEmail, validatePassword } from '~/utils/validators'

definePageMeta({ layout: false })

const { login, register, state: authState } = useAuth()
const route = useRoute()

type Role = 'member' | 'vendor'

const mode = ref<'login' | 'register'>('login')
const activeRole = ref<Role>('member')

// 表單欄位
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const name = ref('')
const phone = ref('')
const companyName = ref('')

const serverError = ref('')
const isLoading = ref(false)

const errors = ref<{
  email?: string
  password?: string
  passwordConfirm?: string
  companyName?: string
}>({})

function resetForm() {
  email.value = ''
  password.value = ''
  passwordConfirm.value = ''
  name.value = ''
  phone.value = ''
  companyName.value = ''
  errors.value = {}
  serverError.value = ''
}

function switchMode(next: 'login' | 'register') {
  if (mode.value === next) return
  mode.value = next
  resetForm()
}

function switchRole(next: Role) {
  if (activeRole.value === next) return
  activeRole.value = next
  errors.value = {}
  serverError.value = ''
}

function clearFieldError(field: keyof typeof errors.value) {
  errors.value[field] = undefined
}

function validateLoginForm(): boolean {
  const newErrors: typeof errors.value = {}

  if (!email.value.trim()) {
    newErrors.email = '請輸入 Email'
  } else if (!validateEmail(email.value.trim())) {
    newErrors.email = '請輸入有效的 Email 格式'
  }

  if (!password.value) {
    newErrors.password = '請輸入密碼'
  } else if (!validatePassword(password.value)) {
    newErrors.password = '密碼長度需介於 8 至 72 字元'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function validateRegisterForm(): boolean {
  const newErrors: typeof errors.value = {}

  if (!email.value.trim()) {
    newErrors.email = '請輸入 Email'
  } else if (!validateEmail(email.value.trim())) {
    newErrors.email = '請輸入有效的 Email 格式'
  }

  if (!password.value) {
    newErrors.password = '請輸入密碼'
  } else if (!validatePassword(password.value)) {
    newErrors.password = '密碼長度需介於 8 至 72 字元'
  }

  if (!passwordConfirm.value) {
    newErrors.passwordConfirm = '請再次輸入密碼'
  } else if (passwordConfirm.value !== password.value) {
    newErrors.passwordConfirm = '密碼與確認密碼不一致'
  }

  if (activeRole.value === 'vendor' && !companyName.value.trim()) {
    newErrors.companyName = '請輸入廠商名稱'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function redirectAfterAuth() {
  const redirect = route.query.redirect as string | undefined
  if (redirect) {
    return navigateTo(redirect)
  }
  if (activeRole.value === 'vendor') {
    // 廠商登入/註冊後導向後台管理介面，而非一般頁面
    return navigateTo('/admin')
  }
  return navigateTo('/')
}

async function handleLoginSubmit() {
  serverError.value = ''

  if (!validateLoginForm()) {
    return
  }

  isLoading.value = true

  try {
    await login(email.value.trim(), password.value, activeRole.value)
    await redirectAfterAuth()
  } catch (err: any) {
    const message = authState.value.error || err?.data?.message || err?.message
    serverError.value = message || '網路連線失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}

async function handleRegisterSubmit() {
  serverError.value = ''

  if (!validateRegisterForm()) {
    return
  }

  isLoading.value = true

  try {
    await register({
      role: activeRole.value,
      email: email.value.trim(),
      password: password.value,
      name: name.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      companyName: activeRole.value === 'vendor' ? companyName.value.trim() : undefined,
    })
    await redirectAfterAuth()
  } catch (err: any) {
    const message = authState.value.error || err?.data?.message || err?.message
    serverError.value = message || '網路連線失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-page, #fafaf9);
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

.login-container {
  width: 100%;
  max-width: 430px;
  background-color: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 32px 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 4px 0;
}

.login-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
}

/* 登入/註冊 模式切換 */
.mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.mode-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.mode-btn.active {
  color: var(--color-primary, #f97316);
  border-bottom-color: var(--color-primary, #f97316);
}

/* 角色 Tab 切換 */
.role-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-radius: var(--radius-md, 12px);
  background-color: #f1f5f9;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
  transition: all 0.2s ease;
  font-family: inherit;
}

.tab-btn.active {
  background-color: #ffffff;
  color: var(--color-primary, #f97316);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 伺服器錯誤 */
.server-error {
  background-color: var(--color-accent-red-light, #ffe4e6);
  color: var(--color-accent-red, #e11d48);
  padding: 12px 16px;
  border-radius: var(--radius-sm, 6px);
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.4;
}

/* 表單 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  font-size: 15px;
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background-color: #ffffff;
  transition: border-color 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary, #f97316);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.form-input.has-error {
  border-color: var(--color-accent-red, #e11d48);
}

.form-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.1);
}

.field-error {
  font-size: 12px;
  color: var(--color-accent-red, #e11d48);
  margin: 0;
  line-height: 1.3;
}

/* 提交按鈕 */
.submit-btn {
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  background-color: var(--color-primary, #f97316);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background-color: #ea580c;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 測試帳號區塊 */
.test-accounts {
  margin-top: 24px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: var(--radius-sm, 6px);
  border: 1px dashed var(--color-border, #e2e8f0);
}

.test-accounts-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #78716c);
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.test-account-item {
  font-size: 13px;
  color: var(--color-text-primary, #1c1917);
  margin-bottom: 4px;
  line-height: 1.5;
}

.test-account-item:last-child {
  margin-bottom: 0;
}

.test-role {
  font-weight: 500;
}

.test-credentials {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--color-text-secondary, #78716c);
}
</style>
