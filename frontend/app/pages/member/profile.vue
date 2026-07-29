<script setup lang="ts">
/**
 * 個人資料頁面
 * 可編輯欄位、修改密碼、大頭貼上傳
 */
const isEditing = ref(false)

const user = ref({
  name: '王小明',
  email: 'xiaoming@example.com',
  phone: '0912-345-678',
  birthday: '1995-03-15',
  gender: '男',
  address: '台北市信義區信義路五段7號',
  avatar: '',
})

// 編輯用副本
const editForm = ref({ ...user.value })

function startEdit() {
  editForm.value = { ...user.value }
  isEditing.value = true
}

function saveEdit() {
  user.value = { ...editForm.value }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

// 大頭貼上傳
function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      editForm.value.avatar = e.target?.result as string
    }
    reader.readAsDataURL(input.files[0])
  }
}

// 修改密碼
const showPasswordForm = ref(false)
const passwordForm = ref({
  current: '',
  newPass: '',
  confirm: '',
})
const passwordError = ref('')
const passwordSuccess = ref(false)

function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = false

  if (!passwordForm.value.current) {
    passwordError.value = '請輸入目前密碼'
    return
  }
  if (passwordForm.value.newPass.length < 6) {
    passwordError.value = '新密碼至少 6 個字元'
    return
  }
  if (passwordForm.value.newPass !== passwordForm.value.confirm) {
    passwordError.value = '兩次密碼不一致'
    return
  }

  // 模擬成功
  passwordSuccess.value = true
  passwordForm.value = { current: '', newPass: '', confirm: '' }
  setTimeout(() => { showPasswordForm.value = false; passwordSuccess.value = false }, 2000)
}
</script>

<template>
  <div class="profile-page">
    <!-- 大頭貼區 -->
    <div class="profile-header">
      <div class="avatar-wrapper">
        <div class="profile-avatar">
          <img v-if="user.avatar" :src="user.avatar" alt="大頭貼" />
          <span v-else class="avatar-placeholder">👤</span>
        </div>
        <label v-if="isEditing" class="avatar-upload-btn">
          📷
          <input type="file" accept="image/*" class="hidden-input" @change="handleAvatarUpload" />
        </label>
      </div>
      <h1 class="profile-name">{{ user.name }}</h1>
    </div>

    <!-- 個人資料卡片 -->
    <div class="profile-card">
      <div class="card-header-row">
        <h2 class="card-section-title">個人資料</h2>
        <button v-if="!isEditing" class="edit-btn" @click="startEdit">✏️ 編輯</button>
      </div>

      <!-- 顯示模式 -->
      <template v-if="!isEditing">
        <div class="profile-row"><span class="label">姓名</span><span class="value">{{ user.name }}</span></div>
        <div class="profile-row"><span class="label">Email</span><span class="value">{{ user.email }}</span></div>
        <div class="profile-row"><span class="label">電話</span><span class="value">{{ user.phone }}</span></div>
        <div class="profile-row"><span class="label">生日</span><span class="value">{{ user.birthday }}</span></div>
        <div class="profile-row"><span class="label">性別</span><span class="value">{{ user.gender }}</span></div>
        <div class="profile-row"><span class="label">地址</span><span class="value">{{ user.address }}</span></div>
      </template>

      <!-- 編輯模式 -->
      <template v-else>
        <div class="form-field"><label>姓名</label><input v-model="editForm.name" type="text" /></div>
        <div class="form-field"><label>Email</label><input v-model="editForm.email" type="email" /></div>
        <div class="form-field"><label>電話</label><input v-model="editForm.phone" type="tel" /></div>
        <div class="form-field"><label>生日</label><input v-model="editForm.birthday" type="date" /></div>
        <div class="form-field">
          <label>性別</label>
          <select v-model="editForm.gender">
            <option>男</option><option>女</option><option>其他</option>
          </select>
        </div>
        <div class="form-field"><label>地址</label><input v-model="editForm.address" type="text" /></div>
        <div class="edit-actions">
          <button class="save-btn" @click="saveEdit">儲存</button>
          <button class="cancel-btn" @click="cancelEdit">取消</button>
        </div>
      </template>
    </div>

    <!-- 修改密碼 -->
    <div class="profile-card">
      <div class="card-header-row">
        <h2 class="card-section-title">🔒 登入密碼</h2>
        <button v-if="!showPasswordForm" class="edit-btn" @click="showPasswordForm = true">修改</button>
      </div>

      <template v-if="!showPasswordForm">
        <p class="password-hint">密碼已設定，點擊「修改」可更換密碼</p>
      </template>

      <template v-else>
        <div class="form-field"><label>目前密碼</label><input v-model="passwordForm.current" type="password" placeholder="請輸入目前密碼" /></div>
        <div class="form-field"><label>新密碼</label><input v-model="passwordForm.newPass" type="password" placeholder="至少 6 個字元" /></div>
        <div class="form-field"><label>確認新密碼</label><input v-model="passwordForm.confirm" type="password" placeholder="再次輸入新密碼" /></div>
        <p v-if="passwordError" class="error-msg">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="success-msg">✓ 密碼修改成功</p>
        <div class="edit-actions">
          <button class="save-btn" @click="handleChangePassword">確認修改</button>
          <button class="cancel-btn" @click="showPasswordForm = false">取消</button>
        </div>
      </template>
    </div>

    <button class="logout-btn" @click="navigateTo('/login')">登出</button>
  </div>
</template>

<style scoped>
.profile-page { padding: 16px; max-width: 430px; margin: 0 auto; }

.profile-header { text-align: center; margin-bottom: 20px; }
.avatar-wrapper { position: relative; display: inline-block; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 36px; }
.avatar-upload-btn { position: absolute; bottom: 0; right: -4px; width: 28px; height: 28px; border-radius: 50%; background: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.hidden-input { display: none; }
.profile-name { font-size: 20px; font-weight: 700; margin: 8px 0 0; }

.profile-card { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.card-section-title { font-size: 15px; font-weight: 600; margin: 0; }
.edit-btn { background: none; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; font-size: 12px; color: #64748b; cursor: pointer; }
.edit-btn:hover { border-color: #f59e0b; color: #f59e0b; }

.profile-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
.profile-row:last-child { border-bottom: none; }
.label { font-size: 13px; color: #78716c; }
.value { font-size: 13px; font-weight: 500; color: #1e293b; max-width: 55%; text-align: right; }

.form-field { margin-bottom: 12px; }
.form-field label { display: block; font-size: 12px; color: #78716c; margin-bottom: 4px; }
.form-field input, .form-field select { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #1e293b; background: #fff; box-sizing: border-box; min-height: 40px; }
.form-field input:focus, .form-field select:focus { border-color: #f59e0b; outline: none; }

.edit-actions { display: flex; gap: 8px; margin-top: 8px; }
.save-btn { flex: 1; padding: 10px; border: none; border-radius: 10px; background: #f59e0b; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; min-height: 40px; }
.save-btn:hover { opacity: 0.9; }
.cancel-btn { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: transparent; color: #64748b; font-size: 14px; cursor: pointer; min-height: 40px; }

.password-hint { font-size: 13px; color: #94a3b8; margin: 0; }
.error-msg { font-size: 12px; color: #ef4444; margin: 4px 0; }
.success-msg { font-size: 12px; color: #10b981; font-weight: 600; margin: 4px 0; }

.logout-btn { width: 100%; padding: 12px; border: 1px solid #ef4444; border-radius: 10px; background: transparent; color: #ef4444; font-size: 14px; font-weight: 600; cursor: pointer; min-height: 44px; }
.logout-btn:hover { background: #fef2f2; }
</style>
