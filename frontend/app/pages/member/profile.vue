<script setup lang="ts">
/**
 * 個人資料頁面
 * 從右上角「李小明」點進來
 */
const user = ref({
  name: '王小明',
  email: 'xiaoming@example.com',
  phone: '0912-345-678',
  birthday: '1995-03-15',
  gender: '男',
  address: '台北市信義區信義路五段7號',
})
</script>

<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="profile-avatar">👤</div>
      <h1 class="profile-name">{{ user.name }}</h1>
    </div>

    <div class="profile-card">
      <div class="profile-row">
        <span class="profile-label">姓名</span>
        <span class="profile-value">{{ user.name }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Email</span>
        <span class="profile-value">{{ user.email }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">電話</span>
        <span class="profile-value">{{ user.phone }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">生日</span>
        <span class="profile-value">{{ user.birthday }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">性別</span>
        <span class="profile-value">{{ user.gender }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">地址</span>
        <span class="profile-value">{{ user.address }}</span>
      </div>
    </div>

    <button class="logout-btn" @click="navigateTo('/login')">登出</button>
  </div>
</template>

<style scoped>
.profile-page { padding: 16px; max-width: 430px; margin: 0 auto; }
.profile-header { text-align: center; margin-bottom: 20px; }
.profile-avatar { font-size: 48px; margin-bottom: 8px; }
.profile-name { font-size: 20px; font-weight: 700; margin: 0; }

.profile-card {
  background: #fff; border-radius: 14px; padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex; flex-direction: column; gap: 12px;
  margin-bottom: 20px;
}
.profile-row { display: flex; justify-content: space-between; align-items: center; }
.profile-label { font-size: 13px; color: #78716c; }
.profile-value { font-size: 13px; font-weight: 500; color: #1e293b; }

.logout-btn {
  width: 100%; padding: 12px; border: 1px solid #ef4444;
  border-radius: 10px; background: transparent;
  color: #ef4444; font-size: 14px; font-weight: 600;
  cursor: pointer; min-height: 44px;
}
.logout-btn:hover { background: #fef2f2; }
</style>
