<script setup lang="ts">
/**
 * OPEN POINT 娛樂化
 * 幸運轉盤抽獎 + 任務獎勵系統
 */
import type { Prize, PointTask, PrizeType } from '~/types/entertainment'

const props = defineProps<{
  userPoints: number
  dailyFreeUsed: boolean
  tasks: PointTask[]
  prizes?: Prize[]
}>()

const emit = defineEmits<{
  'prize-won': [payload: { prizeId: string; prizeName: string; prizeType: PrizeType }]
  'task-complete': [taskId: string]
  'points-spent': [amount: number]
}>()

const SPIN_COST = 50

// 預設獎品
const defaultPrizes: Prize[] = [
  { id: 'prize-1', name: '統一獅門票', type: 'ticket', probability: 0.05, description: '外野自由座' },
  { id: 'prize-2', name: '星巴克買一送一', type: 'coupon', probability: 0.10, description: '限大杯以上' },
  { id: 'prize-3', name: '100 點', type: 'points', value: 100, probability: 0.15 },
  { id: 'prize-4', name: '購物金 $50', type: 'cash', value: 50, probability: 0.15 },
  { id: 'prize-5', name: '10 點', type: 'points', value: 10, probability: 0.25 },
  { id: 'prize-6', name: '謝謝參加', type: 'none', probability: 0.30 },
]

const activePrizes = computed(() => props.prizes ?? defaultPrizes)

// 轉盤狀態
type SpinState = 'idle' | 'spinning' | 'result'
const spinState = ref<SpinState>('idle')
const currentRotation = ref(0)
const wonPrize = ref<Prize | null>(null)

const canSpin = computed(() => props.userPoints >= SPIN_COST && spinState.value === 'idle')

function spin() {
  if (!canSpin.value) return

  spinState.value = 'spinning'
  emit('points-spent', SPIN_COST)

  // 依機率決定中獎
  const rand = Math.random()
  let cumulative = 0
  let selected = activePrizes.value[activePrizes.value.length - 1]
  for (const prize of activePrizes.value) {
    cumulative += prize.probability
    if (rand <= cumulative) {
      selected = prize
      break
    }
  }

  // 計算旋轉角度（至少轉 4 圈 + 隨機偏移至獎品位置）
  const prizeIndex = activePrizes.value.indexOf(selected)
  const segmentAngle = 360 / activePrizes.value.length
  const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2)
  const totalRotation = 1440 + targetAngle + Math.random() * 10

  currentRotation.value += totalRotation
  wonPrize.value = selected

  // 動畫結束後顯示結果
  setTimeout(() => {
    spinState.value = 'result'
    if (selected) {
      emit('prize-won', {
        prizeId: selected.id,
        prizeName: selected.name,
        prizeType: selected.type,
      })
    }
  }, 4000)
}

function closeResult() {
  spinState.value = 'idle'
  wonPrize.value = null
}

// 轉盤色彩
const segmentColors = ['#ec4899', '#fdf2f8', '#8b5cf6', '#f5f3ff', '#ec4899', '#fdf2f8']
</script>

<template>
  <section class="points-game" aria-labelledby="points-game-title">
    <div class="card-header">
      <h2 id="points-game-title" class="card-title">OPEN POINT 點數中心</h2>
      <span class="points-badge" aria-live="polite" aria-atomic="true">🪙 {{ userPoints.toLocaleString() }} 點</span>
    </div>

    <!-- 點數來源說明 -->
    <div class="points-source">
      <p class="source-title">如何獲得點數？</p>
      <div class="source-tags">
        <span class="source-tag">🛒 平台購物</span>
        <span class="source-tag">🎫 購買票券</span>
        <span class="source-tag">📝 完成任務</span>
        <span class="source-tag">🎰 抽獎獎勵</span>
      </div>
    </div>

    <!-- 點數兌換區 -->
    <div class="redeem-section">
      <h3 class="section-subtitle">點數兌換</h3>
      <div class="redeem-grid">
        <div class="redeem-card">
          <span class="redeem-icon">☕</span>
          <span class="redeem-name">咖啡兌換</span>
          <span class="redeem-cost">200 點</span>
        </div>
        <div class="redeem-card">
          <span class="redeem-icon">🍔</span>
          <span class="redeem-name">美食折抵</span>
          <span class="redeem-cost">500 點抵 $50</span>
        </div>
        <div class="redeem-card">
          <span class="redeem-icon">🎫</span>
          <span class="redeem-name">消費折抵</span>
          <span class="redeem-cost">100 點抵 $10</span>
        </div>
      </div>
    </div>

    <!-- 幸運轉盤 -->
    <div class="wheel-section">
      <h3 class="section-subtitle">幸運轉盤</h3>
      <div class="wheel-container">
        <!-- 指針 -->
        <div class="wheel-pointer">▼</div>
        <!-- 轉盤 -->
        <div
          class="wheel"
          :style="{ transform: `rotate(${currentRotation}deg)` }"
          :class="{ spinning: spinState === 'spinning' }"
        >
          <div
            v-for="(prize, index) in activePrizes"
            :key="prize.id"
            class="wheel-segment"
            :style="{
              transform: `rotate(${index * (360 / activePrizes.length)}deg)`,
              background: segmentColors[index % segmentColors.length],
            }"
          >
            <span class="segment-label">{{ prize.name }}</span>
          </div>
        </div>
      </div>

      <button
        class="btn-spin"
        :disabled="!canSpin"
        :aria-label="`消耗 ${SPIN_COST} 點轉動轉盤`"
        @click="spin"
      >
        {{ spinState === 'spinning' ? '旋轉中...' : `轉！(${SPIN_COST}點)` }}
      </button>
      <p v-if="userPoints < SPIN_COST" class="points-warning">點數不足</p>
    </div>

    <!-- 中獎結果 Overlay -->
    <Teleport to="body">
      <div v-if="spinState === 'result'" class="result-overlay" @click.self="closeResult">
        <div class="result-panel" role="dialog" aria-modal="true" aria-label="抽獎結果" aria-live="assertive">
          <div class="result-content">
            <span class="result-emoji" aria-hidden="true">{{ wonPrize?.type === 'none' ? '😅' : '🎉' }}</span>
            <h3 class="result-title">{{ wonPrize?.type === 'none' ? '再接再厲！' : '恭喜中獎！' }}</h3>
            <p class="result-prize">{{ wonPrize?.name }}</p>
            <p v-if="wonPrize?.description" class="result-desc">{{ wonPrize.description }}</p>
            <button class="btn-primary" @click="closeResult">確認</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 任務獎勵 -->
    <div class="task-section">
      <h3 class="section-subtitle">任務獎勵</h3>
      <ul class="task-list">
        <li
          v-for="task in tasks"
          :key="task.id"
          class="task-item"
          :class="{ completed: task.completed }"
        >
          <span class="task-check">{{ task.completed ? '✅' : '☐' }}</span>
          <div class="task-info">
            <span class="task-icon" v-if="task.icon">{{ task.icon }}</span>
            <span class="task-name">{{ task.name }}</span>
            <span class="task-desc">{{ task.description }}</span>
          </div>
          <span class="task-reward">+{{ task.reward }} 點</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.points-game {
  background: var(--color-bg-card, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08));
  padding: var(--space-4, 16px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4, 16px);
}

.card-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin: 0;
}

.points-badge {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-primary, #ec4899);
  background: var(--color-primary-light, #fdf2f8);
  padding: 4px 10px;
  border-radius: var(--radius-full, 9999px);
}

.section-subtitle {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  margin: 0 0 var(--space-3, 12px);
}

/* 點數來源 */
.points-source {
  margin-bottom: var(--space-4, 16px);
  padding: var(--space-3, 12px);
  background: var(--color-primary-light, #fdf2f8);
  border-radius: var(--radius-md, 8px);
}
.source-title {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  margin: 0 0 8px;
}
.source-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.source-tag {
  font-size: var(--text-xs, 11px);
  padding: 4px 10px;
  background: #ffffff;
  border-radius: var(--radius-full, 9999px);
  color: var(--color-text-secondary, #64748b);
  border: 1px solid var(--color-border, #e2e8f0);
}

/* 兌換區 */
.redeem-section { margin-bottom: var(--space-4, 16px); padding-bottom: var(--space-4, 16px); border-bottom: 1px solid var(--color-border, #e2e8f0); }
.redeem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2, 8px); }
.redeem-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: var(--space-3, 12px) var(--space-2, 8px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  cursor: pointer; transition: all 0.15s ease;
}
.redeem-card:hover { border-color: var(--color-primary, #ec4899); background: var(--color-primary-light, #fdf2f8); }
.redeem-icon { font-size: 24px; }
.redeem-name { font-size: var(--text-xs, 11px); font-weight: 600; color: var(--color-text-primary, #1e293b); }
.redeem-cost { font-size: var(--text-xs, 11px); color: var(--color-primary, #ec4899); }

/* 轉盤 */
.wheel-section {
  text-align: center;
  margin-bottom: var(--space-4, 16px);
  padding-bottom: var(--space-4, 16px);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.wheel-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto var(--space-3, 12px);
}

.wheel-pointer {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  color: var(--color-primary, #ec4899);
  z-index: 2;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  border: 3px solid var(--color-primary, #ec4899);
  transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
}

.wheel-segment {
  position: absolute;
  width: 50%;
  height: 50%;
  top: 0;
  left: 50%;
  transform-origin: 0% 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(0% 100%, 100% 0%, 0% 0%);
}

.segment-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
  transform: rotate(-30deg) translateX(-8px);
  white-space: nowrap;
}

.btn-spin {
  padding: var(--space-3, 12px) var(--space-5, 20px);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-primary, #ec4899);
  color: #ffffff;
  font-size: var(--text-base, 15px);
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.btn-spin:hover:not(:disabled) { opacity: 0.85; transform: scale(1.02); }
.btn-spin:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-spin:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.points-warning {
  font-size: var(--text-xs, 11px);
  color: #ef4444;
  margin-top: 6px;
}

/* 結果 Overlay */
.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-panel {
  background: #ffffff;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-5, 20px);
  width: 280px;
  text-align: center;
  animation: bounce-in 0.4s ease;
}

@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.result-emoji { font-size: 48px; display: block; margin-bottom: 8px; }
.result-title {
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  margin: 0 0 4px;
}
.result-prize {
  font-size: var(--text-base, 15px);
  font-weight: 600;
  color: var(--color-primary, #ec4899);
  margin: 0 0 4px;
}
.result-desc {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #64748b);
  margin: 0 0 16px;
}

.btn-primary {
  width: 100%;
  padding: var(--space-3, 12px);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: var(--color-primary, #ec4899);
  color: #ffffff;
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.85; }

/* 任務列表 */
.task-section {
  margin-top: var(--space-3, 12px);
}

.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2, 8px);
}

.task-item {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 8px);
}
.task-item.completed { opacity: 0.6; }

.task-check { font-size: 16px; flex-shrink: 0; }

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.task-icon { font-size: 14px; }

.task-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-text-primary, #1e293b);
}

.task-desc {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #64748b);
}

.task-reward {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  color: var(--color-primary, #ec4899);
  flex-shrink: 0;
}
</style>
