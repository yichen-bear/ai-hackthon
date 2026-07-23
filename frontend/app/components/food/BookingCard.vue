<script setup lang="ts">
import { ref, computed } from 'vue'

interface BookingCardProps {
  restaurantName?: string
  time?: string
  partySize?: number
}

interface BookingData {
  userName: string
  phone: string
  restaurantName: string
  time: string
  partySize: number
}

const props = withDefaults(defineProps<BookingCardProps>(), {
  restaurantName: '',
  time: '',
  partySize: 0,
})

const emit = defineEmits<{
  confirm: [data: BookingData]
}>()

const userName = ref('陳小明')
const phone = ref('0912-345-678')
const selectedTime = ref('')

const timeSlots = [
  { time: '18:30', available: true },
  { time: '19:00', available: true },
  { time: '19:30', available: false },
]

const isDisabled = computed(
  () => !props.restaurantName && props.partySize === 0
)

const displayRestaurantName = computed(
  () => props.restaurantName || '餐廳名稱'
)

const displayPartySize = computed(
  () => (props.partySize > 0 ? `${props.partySize}人` : '--人')
)

function handleConfirm() {
  if (isDisabled.value) return
  const bookingData: BookingData = {
    userName: userName.value,
    phone: phone.value,
    restaurantName: props.restaurantName,
    time: selectedTime.value || props.time,
    partySize: props.partySize,
  }
  emit('confirm', bookingData)
}
</script>

<template>
  <div class="booking-card">
    <!-- 餐廳名稱 -->
    <div class="booking-card__restaurant">
      <span class="booking-card__icon">🍽️</span>
      <span
        class="booking-card__restaurant-name"
        :class="{ 'booking-card__restaurant-name--placeholder': !props.restaurantName }"
      >
        {{ displayRestaurantName }}
      </span>
    </div>

    <!-- 用戶資訊列 -->
    <div class="booking-card__user">
      <span>👤 {{ userName }}</span>
      <span>📞 {{ phone }}</span>
    </div>

    <!-- 人數 -->
    <div class="booking-card__party">
      <span class="booking-card__label">用餐人數</span>
      <span class="booking-card__party-size">{{ displayPartySize }}</span>
    </div>

    <!-- 時段選擇 -->
    <div class="booking-card__timeline">
      <span class="booking-card__label">選擇時段</span>
      <UiTimelineSelector
        :slots="timeSlots"
        v-model:selected="selectedTime"
      />
    </div>

    <!-- 外送標籤 -->
    <div class="booking-card__badges">
      <UiStatusBadge type="delivery" label="🛵 支援外送" />
    </div>

    <!-- 確認訂位按鈕 -->
    <button
      class="booking-card__confirm"
      :disabled="isDisabled"
      @click="handleConfirm"
    >
      確認訂位
    </button>
  </div>
</template>

<style scoped>
.booking-card {
  background-color: #ffffff;
  background-color: var(--color-bg-card, #ffffff);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: 16px;
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  gap: var(--space-3, 12px);
}

/* 餐廳名稱區 */
.booking-card__restaurant {
  display: flex;
  align-items: center;
  gap: 6px;
}

.booking-card__icon {
  font-size: 20px;
  line-height: 1;
}

.booking-card__restaurant-name {
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

.booking-card__restaurant-name--placeholder {
  color: #cbd5e1;
  color: var(--color-text-disabled, #cbd5e1);
  font-weight: 400;
}

/* 用戶資訊列 */
.booking-card__user {
  display: flex;
  gap: 16px;
  gap: var(--space-4, 16px);
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
}

/* 人數列 */
.booking-card__party {
  display: flex;
  align-items: center;
  gap: 8px;
  gap: var(--space-2, 8px);
}

.booking-card__party-size {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
  font-weight: 500;
}

/* 小標題 */
.booking-card__label {
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  font-weight: 500;
  flex-shrink: 0;
}

/* 時段選擇列 */
.booking-card__timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  gap: var(--space-2, 8px);
}

/* 徽章區 */
.booking-card__badges {
  display: flex;
  gap: 8px;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
}

/* 確認訂位按鈕 */
.booking-card__confirm {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  background-color: #ff5252;
  background-color: var(--color-primary, #ff5252);
  color: #ffffff;
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.booking-card__confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
