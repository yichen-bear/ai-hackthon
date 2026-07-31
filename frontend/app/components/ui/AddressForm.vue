<script setup lang="ts">
/**
 * AddressForm - 地址選擇表單元件
 * 提供縣市下拉 + 鄉鎮區下拉 + 詳細地址輸入
 * 支援 v-model 雙向綁定
 */

export interface AddressValue {
  countyCode: string
  districtCode: string
  addressDetail: string
}

interface County {
  code: string
  name: string
  sort: number
}

interface District {
  code: string
  name: string
  zip: string
  sort: number
}

const props = withDefaults(defineProps<{
  modelValue: AddressValue
  label?: string
  required?: boolean
  disabled?: boolean
  errors?: { county?: string; district?: string; detail?: string }
}>(), {
  label: '',
  required: false,
  disabled: false,
  errors: () => ({}),
})

const emit = defineEmits<{
  'update:modelValue': [value: AddressValue]
}>()

const counties = ref<County[]>([])
const districts = ref<District[]>([])
const isLoadingCounties = ref(false)
const isLoadingDistricts = ref(false)

// 載入縣市清單
async function fetchCounties() {
  isLoadingCounties.value = true
  try {
    const res = await $fetch<{ success: boolean; data: County[] }>('/api/address/counties')
    if (res.success) {
      counties.value = res.data
    }
  } catch {
    // 靜默失敗
  } finally {
    isLoadingCounties.value = false
  }
}

// 載入鄉鎮區清單
async function fetchDistricts(countyCode: string) {
  if (!countyCode) {
    districts.value = []
    return
  }
  isLoadingDistricts.value = true
  try {
    const res = await $fetch<{ success: boolean; data: District[] }>(`/api/address/districts/${countyCode}`)
    if (res.success) {
      districts.value = res.data
    }
  } catch {
    districts.value = []
  } finally {
    isLoadingDistricts.value = false
  }
}

function handleCountyChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newCountyCode = target.value
  emit('update:modelValue', {
    countyCode: newCountyCode,
    districtCode: '',
    addressDetail: props.modelValue.addressDetail,
  })
  fetchDistricts(newCountyCode)
}

function handleDistrictChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', {
    ...props.modelValue,
    districtCode: target.value,
  })
}

function handleDetailInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', {
    ...props.modelValue,
    addressDetail: target.value,
  })
}

// 初始化
onMounted(async () => {
  await fetchCounties()
  if (props.modelValue.countyCode) {
    await fetchDistricts(props.modelValue.countyCode)
  }
})

// 若外部改變 countyCode，重新載入 districts
watch(() => props.modelValue.countyCode, (newCode, oldCode) => {
  if (newCode !== oldCode && newCode) {
    fetchDistricts(newCode)
  }
})
</script>

<template>
  <div class="address-form">
    <p v-if="label" class="address-form__label">
      {{ label }}
      <span v-if="required" class="address-form__required">*</span>
    </p>

    <div class="address-form__row">
      <!-- 縣市 -->
      <div class="address-form__field">
        <select
          class="address-form__select"
          :class="{ 'address-form__select--error': errors?.county }"
          :value="modelValue.countyCode"
          :disabled="disabled || isLoadingCounties"
          @change="handleCountyChange"
        >
          <option value="" disabled>{{ isLoadingCounties ? '載入中...' : '選擇縣市' }}</option>
          <option v-for="county in counties" :key="county.code" :value="county.code">
            {{ county.name }}
          </option>
        </select>
        <p v-if="errors?.county" class="address-form__error">{{ errors.county }}</p>
      </div>

      <!-- 鄉鎮區 -->
      <div class="address-form__field">
        <select
          class="address-form__select"
          :class="{ 'address-form__select--error': errors?.district }"
          :value="modelValue.districtCode"
          :disabled="disabled || !modelValue.countyCode || isLoadingDistricts"
          @change="handleDistrictChange"
        >
          <option value="" disabled>{{ isLoadingDistricts ? '載入中...' : '選擇鄉鎮區' }}</option>
          <option v-for="district in districts" :key="district.code" :value="district.code">
            {{ district.name }}
          </option>
        </select>
        <p v-if="errors?.district" class="address-form__error">{{ errors.district }}</p>
      </div>
    </div>

    <!-- 詳細地址 -->
    <div class="address-form__field">
      <input
        type="text"
        class="address-form__input"
        :class="{ 'address-form__input--error': errors?.detail }"
        :value="modelValue.addressDetail"
        :disabled="disabled"
        placeholder="請輸入詳細地址（路/街、巷弄、樓層）"
        maxlength="200"
        @input="handleDetailInput"
      />
      <p v-if="errors?.detail" class="address-form__error">{{ errors.detail }}</p>
    </div>
  </div>
</template>

<style scoped>
.address-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-form__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #1c1917);
  margin: 0;
}

.address-form__required {
  color: var(--color-accent-red, #e11d48);
  margin-left: 2px;
}

.address-form__row {
  display: flex;
  gap: 8px;
}

.address-form__row > .address-form__field {
  flex: 1;
}

.address-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.address-form__select,
.address-form__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary, #1c1917);
  background-color: #ffffff;
  outline: none;
  transition: border-color 0.2s;
}

.address-form__select:focus,
.address-form__input:focus {
  border-color: var(--color-primary, #f97316);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
}

.address-form__select:disabled,
.address-form__input:disabled {
  background-color: #f8fafc;
  color: var(--color-text-disabled, #a8a29e);
  cursor: not-allowed;
}

.address-form__select--error,
.address-form__input--error {
  border-color: var(--color-accent-red, #e11d48);
}

.address-form__error {
  font-size: 12px;
  color: var(--color-accent-red, #e11d48);
  margin: 0;
}
</style>
