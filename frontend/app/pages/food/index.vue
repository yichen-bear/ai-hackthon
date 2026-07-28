<script setup lang="ts">
import FoodBookingCard from '~/components/food/BookingCard.vue'
import FoodMap from '~/components/food/FoodMap.vue'
import CalorieDashboard from '~/components/food/CalorieDashboard.vue'
import FoodPassport from '~/components/food/FoodPassport.vue'

interface BookingData {
  userName: string
  phone: string
  restaurantName: string
  time: string
  partySize: number
}

function handleConfirm(data: BookingData) {
  console.log('訂位確認：', data)
  // TODO: 串接後端 API
}

const foodBadges = [
  { icon: '🍜', name: '拉麵大師', unlocked: true },
  { icon: '🍣', name: '壽司職人', unlocked: true },
  { icon: '☕', name: '咖啡品鑑', unlocked: false },
  { icon: '🌮', name: '異國料理', unlocked: false },
  { icon: '🍕', name: '義式職人', unlocked: false },
  { icon: '🥩', name: '燒肉達人', unlocked: false },
  { icon: '🍱', name: '便當收藏', unlocked: false },
  { icon: '🍰', name: '甜點探索', unlocked: false },
]
</script>

<template>
  <div class="food-module">
    <main class="food-page" role="main">

      <!-- 訂位卡片：內建推薦列表 ↔ 訂位確認雙狀態 -->
      <FoodBookingCard @confirm="handleConfirm" />

      <!-- Google Maps 周邊餐廳 -->
      <FoodMap
        :latitude="25.0330"
        :longitude="121.5654"
        :zoom="15"
      />

      <!-- 熱量儀表板 -->
      <CalorieDashboard
        :calories="850"
        :goal="2000"
      />

      <!-- 美食護照 -->
      <FoodPassport :badges="foodBadges" />

    </main>
  </div>
</template>

<style scoped>
/* 食模組作用域 Token 覆寫 */
.food-module {
  --color-primary: #ff5252;
  --color-primary-light: #fff1f2;
  --color-secondary: #00a86b;
  --color-secondary-light: #d1fae5;
}

.food-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}
</style>
