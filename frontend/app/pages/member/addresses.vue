<template>
  <div class="profile-page">
    <!-- 頭部 -->
    <header class="address-header">
      <button class="back-btn" @click="navigateTo('/member/profile')">← 返回</button>
      <h1 class="page-title">常用地址管理</h1>
    </header>

    <!-- 新增地址 -->
    <section class="info-card">
      <div class="card-label" style="background-color: #22c55e;">+</div>
      <h2 class="card-title">新增地址</h2>
      <form class="info-form" @submit.prevent="handleAdd">
        <div class="form-group">
          <label class="form-label">地址類型</label>
          <select v-model="newAddress.type" class="form-select">
            <option value="mailing">通訊地址</option>
            <option value="recent">近期地址</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">自訂標籤</label>
          <input v-model="newAddress.label" type="text" class="form-input" placeholder="例如：家、公司、爸媽家" maxlength="50" />
        </div>
        <UiAddressForm v-model="newAddress.address" label="地址" :required="true" />
        <div class="form-group">
          <label class="form-checkbox">
            <input v-model="newAddress.isDefault" type="checkbox" />
            設為此類型的預設地址
          </label>
        </div>
        <button type="submit" class="save-btn" :disabled="isSaving">
          {{ isSaving ? '新增中...' : '新增地址' }}
        </button>
      </form>
      <p v-if="addError" class="error-text">{{ addError }}</p>
    </section>

    <!-- 已存地址列表 -->
    <section class="info-card">
      <div class="card-label" style="background-color: #3b82f6;">📍</div>
      <h2 class="card-title">已儲存地址</h2>

      <p v-if="isLoading" class="loading-text">載入中...</p>
      <p v-else-if="addresses.length === 0" class="empty-text">尚未儲存任何地址</p>

      <div v-else class="address-list">
        <div v-for="addr in addresses" :key="addr.id" class="address-item">
          <div class="address-item__info">
            <div class="address-item__header">
              <span class="address-item__label">{{ addr.label || (addr.type === 'mailing' ? '通訊地址' : '近期地址') }}</span>
              <span v-if="addr.isDefault" class="address-item__badge">預設</span>
              <span class="address-item__type">{{ addr.type === 'mailing' ? '通訊' : '近期' }}</span>
            </div>
            <p class="address-item__detail">{{ addr.countyName }}{{ addr.districtName }}{{ addr.addressDetail }}</p>
          </div>
          <div class="address-item__actions">
            <button class="action-btn action-btn--edit" @click="startEdit(addr)">編輯</button>
            <button class="action-btn action-btn--delete" @click="handleDelete(addr.id)">刪除</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 編輯彈窗 -->
    <div v-if="editingAddress" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-content">
        <h3 class="modal-title">編輯地址</h3>
        <form class="info-form" @submit.prevent="handleUpdate">
          <div class="form-group">
            <label class="form-label">地址類型</label>
            <select v-model="editingAddress.type" class="form-select">
              <option value="mailing">通訊地址</option>
              <option value="recent">近期地址</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">自訂標籤</label>
            <input v-model="editingAddress.label" type="text" class="form-input" placeholder="例如：家、公司" maxlength="50" />
          </div>
          <UiAddressForm v-model="editingAddress.address" label="地址" :required="true" />
          <div class="form-group">
            <label class="form-checkbox">
              <input v-model="editingAddress.isDefault" type="checkbox" />
              設為此類型的預設地址
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="cancel-btn" @click="cancelEdit">取消</button>
            <button type="submit" class="save-btn" :disabled="isSaving">
              {{ isSaving ? '儲存中...' : '儲存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })

interface AddressItem {
  id: number
  type: string
  label: string | null
  countyCode: string
  countyName: string
  districtCode: string
  districtName: string
  addressDetail: string
  isDefault: boolean
}

const addresses = ref<AddressItem[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const addError = ref('')

const newAddress = reactive({
  type: 'mailing' as 'mailing' | 'recent',
  label: '',
  address: { countyCode: '', districtCode: '', addressDetail: '' },
  isDefault: false,
})

const editingAddress = ref<{
  id: number
  type: string
  label: string
  address: { countyCode: string; districtCode: string; addressDetail: string }
  isDefault: boolean
} | null>(null)

async function fetchAddresses() {
  isLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: AddressItem[] }>('/api/member/addresses', {
      credentials: 'include',
    })
    if (res.success) {
      addresses.value = res.data
    }
  } catch {
    // 靜默
  } finally {
    isLoading.value = false
  }
}

async function handleAdd() {
  addError.value = ''
  const { type, label, address, isDefault } = newAddress

  if (!address.countyCode || !address.districtCode || !address.addressDetail.trim()) {
    addError.value = '請完整填寫地址（縣市、鄉鎮區、詳細地址）'
    return
  }

  isSaving.value = true
  try {
    await $fetch('/api/member/addresses', {
      method: 'POST',
      body: {
        type,
        label: label.trim() || undefined,
        countyCode: address.countyCode,
        districtCode: address.districtCode,
        addressDetail: address.addressDetail.trim(),
        isDefault,
      },
      credentials: 'include',
    })
    // 重設表單
    newAddress.type = 'mailing'
    newAddress.label = ''
    newAddress.address = { countyCode: '', districtCode: '', addressDetail: '' }
    newAddress.isDefault = false
    await fetchAddresses()
  } catch (err: any) {
    addError.value = err?.data?.message || '新增失敗，請稍後再試'
  } finally {
    isSaving.value = false
  }
}

function startEdit(addr: AddressItem) {
  editingAddress.value = {
    id: addr.id,
    type: addr.type,
    label: addr.label || '',
    address: {
      countyCode: addr.countyCode,
      districtCode: addr.districtCode,
      addressDetail: addr.addressDetail,
    },
    isDefault: addr.isDefault,
  }
}

function cancelEdit() {
  editingAddress.value = null
}

async function handleUpdate() {
  if (!editingAddress.value) return

  const { id, type, label, address, isDefault } = editingAddress.value
  if (!address.countyCode || !address.districtCode || !address.addressDetail.trim()) {
    return
  }

  isSaving.value = true
  try {
    await $fetch(`/api/member/addresses/${id}`, {
      method: 'PUT',
      body: {
        type,
        label: label.trim() || undefined,
        countyCode: address.countyCode,
        districtCode: address.districtCode,
        addressDetail: address.addressDetail.trim(),
        isDefault,
      },
      credentials: 'include',
    })
    editingAddress.value = null
    await fetchAddresses()
  } catch {
    // 靜默
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(id: number) {
  if (!confirm('確定要刪除此地址嗎？')) return

  try {
    await $fetch(`/api/member/addresses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    await fetchAddresses()
  } catch {
    // 靜默
  }
}

onMounted(() => {
  fetchAddresses()
})
</script>

<style scoped>
.profile-page {
  max-width: 720px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--color-bg-page, #fafaf9);
  padding: 0 16px 80px;
  font-family: system-ui, -apple-system, sans-serif;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
}

.back-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: var(--color-text-secondary, #78716c);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
}

.back-btn:hover {
  background-color: #f5f5f4;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.info-card {
  background-color: var(--color-bg-card, #ffffff);
  border-radius: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 20px 16px;
  margin-bottom: 20px;
}

.card-label {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #ffffff;
  margin-bottom: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
  margin: 0 0 16px 0;
}

.info-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background-color: #ffffff;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--color-primary, #f97316);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-primary, #1c1917);
  cursor: pointer;
}

.save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background-color: var(--color-primary, #f97316);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-btn:hover:not(:disabled) {
  background-color: #ea580c;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-text {
  color: var(--color-accent-red, #e11d48);
  font-size: 13px;
  margin: 8px 0 0;
}

.loading-text,
.empty-text {
  font-size: 14px;
  color: var(--color-text-secondary, #78716c);
  text-align: center;
  padding: 20px 0;
  margin: 0;
}

/* 地址列表 */
.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
}

.address-item__info {
  flex: 1;
  min-width: 0;
}

.address-item__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.address-item__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1c1917);
}

.address-item__badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #dcfce7;
  color: #166534;
  font-weight: 500;
}

.address-item__type {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: var(--color-text-secondary, #78716c);
}

.address-item__detail {
  font-size: 13px;
  color: var(--color-text-secondary, #78716c);
  margin: 0;
  word-break: break-all;
}

.address-item__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  padding: 5px 10px;
  border: 1px solid;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  background: none;
  transition: background-color 0.15s;
}

.action-btn--edit {
  border-color: var(--color-primary, #f97316);
  color: var(--color-primary, #f97316);
}

.action-btn--edit:hover {
  background-color: #fff7ed;
}

.action-btn--delete {
  border-color: var(--color-accent-red, #e11d48);
  color: var(--color-accent-red, #e11d48);
}

.action-btn--delete:hover {
  background-color: #fff1f2;
}

/* 彈窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-content {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--color-text-primary, #1c1917);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.cancel-btn {
  padding: 10px 20px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: none;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-text-secondary, #78716c);
}

.cancel-btn:hover {
  background-color: #f8fafc;
}
</style>
