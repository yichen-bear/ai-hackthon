<script setup lang="ts">
// 設定頁面 lang 屬性
useHead({
  htmlAttrs: {
    lang: 'zh-TW',
  },
})

// ─── Mock 資料 ───
const parcels = ref([
  { id: 'pkg-1', name: '鮮食宅配', type: 'frozen' as const, urgent: true },
  { id: 'pkg-2', name: '生鮮蔬果包', type: 'refrigerated' as const, urgent: true },
  { id: 'pkg-3', name: '書籍包裹', type: 'normal' as const, urgent: false },
])

const announcements = ref([
  { id: 'ann-1', title: '電梯保養通知', date: '2024-01-15', summary: 'B1-1F 電梯將於本週六 09:00-12:00 進行年度保養，届時請改搭另一部電梯。' },
  { id: 'ann-2', title: '水塔清洗公告', date: '2024-01-10', summary: '本週日凌晨 2:00-5:00 進行水塔清洗作業，届時將暫停供水，請提前儲水備用。' },
])

const technicianName = '王師傅'
const etaMinutes = ref(15)

// ─── 響應式狀態 ───
const hasActiveRepair = ref<boolean>(true)
const truckMinutes = ref<number>(8)

// ─── 事件處理 ───
function handleReportMalfunction() { console.log('公設故障回報觸發') }
function handleSubmitRecycling(data: { itemType: string; date: string }) { console.log('回收預約：', data) }
function handleSubmitRepair(data: { faultType: string; photo: string; description: string }) { console.log('報修提交：', data) }

// ─── Demo 用：重設所有狀態 ───
function resetDemo() {
  hasActiveRepair.value = true
  truckMinutes.value = 8
  etaMinutes.value = 15
}
</script>

<template>
  <div class="housing-module">
    <main class="housing-page" role="main">

      <!-- 社區公告與公設故障回報 -->
      <HousingCommunityService
        :announcements="announcements"
        @report-malfunction="handleReportMalfunction"
      />

      <!-- 包裹管理 -->
      <HousingParcelDashboard :parcels="parcels" />

      <!-- AI 垃圾分類 -->
      <HousingGarbageAiAssistant
        :truck-minutes="truckMinutes"
        @submit-recycling="handleSubmitRecycling"
      />

      <!-- 水電修繕 -->
      <HousingRepairTracker
        :has-active-repair="hasActiveRepair"
        :technician-name="technicianName"
        :eta-minutes="etaMinutes"
        @submit-repair="handleSubmitRepair"
      />

    </main>

    <!-- ═══════════════════════════════════
         Demo 控制面板（Hackathon 展示用）
         ═══════════════════════════════════ -->
    <div class="housing-demo-panel">
      <button
        class="housing-demo-btn housing-demo-btn--toggle"
        @click="hasActiveRepair = !hasActiveRepair"
      >
        🔧 切換派工
      </button>
      <button
        class="housing-demo-btn housing-demo-btn--reset"
        @click="resetDemo"
      >
        🔄 重設
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 住模組作用域 Token 覆寫 */
.housing-module {
  --color-primary: #d97706;
  --color-primary-light: #fffbeb;
  --color-secondary: #0d9488;
  --color-secondary-light: #ccfbf1;
}

.housing-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
}

/* ═══════════════════════════════
   Demo 控制面板（固定右下角）
   ═══════════════════════════════ */
.housing-demo-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 999;
}

.housing-demo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.15s, transform 0.1s;
  white-space: nowrap;
}

.housing-demo-btn:active {
  transform: scale(0.95);
}

.housing-demo-btn--toggle {
  background: #d97706;
  color: #ffffff;
}

.housing-demo-btn--reset {
  background: #78716c;
  color: #ffffff;
}
</style>
