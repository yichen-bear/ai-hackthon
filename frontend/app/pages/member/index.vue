<script setup lang="ts">
/**
 * 會員中心主頁
 * 標籤：點數、條碼/錢包、活動票券、獎章
 */

const activeTab = ref<'points' | 'barcode' | 'tickets' | 'badges'>('points')

// ─── OPEN POINT 資料 ───
const userPoints = ref(2450)
const walletBalance = ref(1200)

// 每日簽到
const dailyCheckedIn = ref(false)
function handleDailyCheckIn() {
  if (dailyCheckedIn.value) return
  dailyCheckedIn.value = true
  userPoints.value += 5
}

// 轉盤抽獎
const spinResult = ref<string | null>(null)
const isSpinning = ref(false)
function handleSpin() {
  if (isSpinning.value || userPoints.value < 10) return
  isSpinning.value = true
  userPoints.value -= 10
  setTimeout(() => {
    const prizes = ['5 點', '10 點', '20 點', '50 點', '謝謝參與']
    const idx = Math.floor(Math.random() * prizes.length)
    spinResult.value = prizes[idx]
    if (prizes[idx] !== '謝謝參與') {
      userPoints.value += parseInt(prizes[idx])
    }
    isSpinning.value = false
  }, 1500)
}

// 任務列表
const tasks = ref([
  { id: 't1', name: '首次預訂活動', reward: 50, done: true },
  { id: 't2', name: '累計 3 個獎章', reward: 100, done: false },
  { id: 't3', name: '完成每日簽到 7 天', reward: 30, done: false },
  { id: 't4', name: '使用叫車服務', reward: 20, done: true },
  { id: 't5', name: '預購商品一次', reward: 15, done: false },
])

// 兌換專區
const coupons = [
  { id: 'c1', name: '咖啡第二杯半價', cost: 100 },
  { id: 'c2', name: '全家 50 元折價券', cost: 200 },
  { id: 'c3', name: '高鐵 9 折券', cost: 500 },
  { id: 'c4', name: '抽獎券 ×1', cost: 50 },
]
function redeemCoupon(cost: number) {
  if (userPoints.value >= cost) {
    userPoints.value -= cost
    alert('兌換成功！')
  }
}

// ─── 活動票券 ───
const mockTickets = ref([
  { id: 'tk1', type: '高鐵', name: '台北→桃園 1309車次', date: '2026-08-02', time: '19:00', venue: '台北車站', status: 'unused', points: 10, link: '/transport' },
  { id: 'tk2', type: '棒球', name: '中信兄弟 vs 統一獅', date: '2026-08-02', time: '18:35', venue: '台南亞太棒球場', status: 'unused', points: 20, link: '/entertainment' },
  { id: 'tk3', type: '預購', name: '中秋鳳梨酥禮盒', date: '2026-09-15', time: '', venue: '7-11 信義門市', status: 'pending', points: 5, link: '/booking' },
  { id: 'tk4', type: '社區', name: '中秋社區烤肉大會', date: '2026-09-21', time: '17:00', venue: '仁愛里活動中心', status: 'unused', points: 10, link: '/entertainment' },
  { id: 'tk5', type: '叫車', name: 'yoxi 叫車紀錄', date: '2026-07-28', time: '14:30', venue: '信義區→公司', status: 'used', points: 5, link: '/transport' },
])

// ─── 獎章 ───
const allBadges = ref([
  { id: 'b1', icon: '🌱', name: '綠色通勤', desc: '連續7天使用大眾運輸', module: '行', unlocked: true },
  { id: 'b2', icon: '🚴', name: '單車達人', desc: '累計騎乘50km', module: '行', unlocked: true },
  { id: 'b3', icon: '🌍', name: '減碳先鋒', desc: '本月碳排低於目標20%', module: '行', unlocked: false },
  { id: 'b4', icon: '🏟️', name: '球場初心者', desc: '參加首場統一獅球賽', module: '樂', unlocked: true },
  { id: 'b5', icon: '🎨', name: '藝文愛好者', desc: '累計看3場展覽', module: '樂', unlocked: true },
  { id: 'b6', icon: '🎵', name: '音樂狂熱', desc: '參加2場演唱會', module: '樂', unlocked: false },
  { id: 'b7', icon: '☕', name: '體驗玩家', desc: '參加3次門市體驗', module: '樂', unlocked: false },
  { id: 'b8', icon: '🍜', name: '美食探險家', desc: '訂位5間不同餐廳', module: '食', unlocked: true },
  { id: 'b9', icon: '🏥', name: '健康達人', desc: '完成3次線上問診', module: '醫', unlocked: false },
  { id: 'b10', icon: '🏠', name: '智慧生活家', desc: '使用智能家居控制30天', module: '住', unlocked: true },
  { id: 'b11', icon: '🛒', name: '團購高手', desc: '參加5次團購', module: '預', unlocked: false },
  { id: 'b12', icon: '📦', name: '預購達人', desc: '完成3次預購', module: '預', unlocked: true },
])
</script>

<template>
  <div class="member-center">
    <!-- 頂部資訊 -->
    <div class="member-header">
      <h1 class="member-title">會員中心</h1>
      <div class="points-badge">🪙 {{ userPoints.toLocaleString() }} 點</div>
    </div>

    <!-- 功能標籤 -->
    <nav class="member-tabs" aria-label="會員中心功能">
      <button class="tab-btn" :class="{ active: activeTab === 'points' }" @click="activeTab = 'points'">點數</button>
      <button class="tab-btn" :class="{ active: activeTab === 'barcode' }" @click="activeTab = 'barcode'">條碼/錢包</button>
      <button class="tab-btn" :class="{ active: activeTab === 'tickets' }" @click="activeTab = 'tickets'">活動票券</button>
      <button class="tab-btn" :class="{ active: activeTab === 'badges' }" @click="activeTab = 'badges'">獎章</button>
    </nav>

    <!-- ═══ 點數專區 ═══ -->
    <div v-if="activeTab === 'points'" class="tab-content">
      <!-- 點數總覽 -->
      <div class="card points-overview">
        <div class="points-big">{{ userPoints.toLocaleString() }}</div>
        <div class="points-label">OPEN POINT</div>
      </div>

      <!-- 每日簽到 -->
      <div class="card">
        <h3 class="card-title">📅 每日簽到</h3>
        <button class="action-btn" :class="{ done: dailyCheckedIn }" :disabled="dailyCheckedIn" @click="handleDailyCheckIn">
          {{ dailyCheckedIn ? '✓ 已簽到 (+5點)' : '立即簽到 +5點' }}
        </button>
      </div>

      <!-- 轉盤小遊戲 -->
      <div class="card">
        <h3 class="card-title">🎰 幸運轉盤</h3>
        <p class="card-desc">消耗 10 點抽獎，有機會獲得更多點數！</p>
        <button class="action-btn spin" :disabled="isSpinning || userPoints < 10" @click="handleSpin">
          {{ isSpinning ? '轉動中...' : '花 10 點轉一次' }}
        </button>
        <p v-if="spinResult" class="spin-result">🎉 結果：{{ spinResult }}</p>
      </div>

      <!-- 兌換專區 -->
      <div class="card">
        <h3 class="card-title">🎁 兌換專區</h3>
        <div class="coupon-grid">
          <div v-for="c in coupons" :key="c.id" class="coupon-item">
            <span class="coupon-name">{{ c.name }}</span>
            <button class="coupon-btn" :disabled="userPoints < c.cost" @click="redeemCoupon(c.cost)">
              {{ c.cost }} 點兌換
            </button>
          </div>
        </div>
      </div>

      <!-- 任務獲點 -->
      <div class="card">
        <h3 class="card-title">📋 任務獲點</h3>
        <div class="task-list">
          <div v-for="t in tasks" :key="t.id" class="task-item" :class="{ done: t.done }">
            <span class="task-name">{{ t.name }}</span>
            <span class="task-reward">{{ t.done ? '✓ 已完成' : `+${t.reward} 點` }}</span>
          </div>
        </div>
      </div>

      <!-- 點數說明 -->
      <div class="card">
        <h3 class="card-title">💡 點數功用說明</h3>
        <ul class="info-list">
          <li>🔄 兌換優惠券、折價券</li>
          <li>💳 付款時可折抵金額（1點 = 1元）</li>
          <li>🎰 參加抽獎活動</li>
          <li>📅 每日簽到可獲得 5 點</li>
          <li>🎫 透過平台預定活動可獲得點數</li>
          <li>🏆 完成任務和集獎章可獲得額外點數</li>
        </ul>
      </div>
    </div>

    <!-- ═══ 條碼/錢包 ═══ -->
    <div v-if="activeTab === 'barcode'" class="tab-content">
      <!-- 會員條碼 -->
      <div class="card barcode-card">
        <h3 class="card-title">🏪 會員條碼</h3>
        <p class="card-desc">出示條碼購物賺取 OPEN POINT</p>
        <div class="barcode-display">
          <div class="barcode-pattern"></div>
          <p class="barcode-number">2895 0012 3456 7890</p>
        </div>
      </div>

      <!-- OPEN 錢包 -->
      <div class="card wallet-card">
        <h3 class="card-title">👛 OPEN 錢包</h3>
        <div class="wallet-balance">
          <span class="wallet-amount">${{ walletBalance.toLocaleString() }}</span>
          <span class="wallet-label">可用餘額</span>
        </div>
        <div class="wallet-actions">
          <button class="wallet-btn" @click="walletBalance += 500">儲值 $500</button>
          <button class="wallet-btn" @click="walletBalance += 1000">儲值 $1000</button>
        </div>
        <p class="card-desc">可在付款時選擇 OPEN 錢包支付</p>
      </div>
    </div>

    <!-- ═══ 活動票券 ═══ -->
    <div v-if="activeTab === 'tickets'" class="tab-content">
      <div class="card" v-for="tk in mockTickets" :key="tk.id">
        <div class="ticket-card" :class="{ used: tk.status === 'used' }">
          <div class="ticket-header">
            <span class="ticket-type-badge">{{ tk.type }}</span>
            <span class="ticket-status" :class="tk.status">
              {{ tk.status === 'unused' ? '待使用' : tk.status === 'pending' ? '待取貨' : '已使用' }}
            </span>
          </div>
          <h4 class="ticket-name">{{ tk.name }}</h4>
          <div class="ticket-details">
            <p v-if="tk.date">📅 {{ tk.date }} {{ tk.time }}</p>
            <p v-if="tk.venue">📍 {{ tk.venue }}</p>
            <p class="ticket-points">🪙 獲得 {{ tk.points }} 點</p>
          </div>
          <div class="ticket-qr-mini">
            <div class="qr-box-mini">📱 QR</div>
          </div>
          <div class="ticket-actions">
            <NuxtLink :to="tk.link" class="ticket-link-btn">前往模組</NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ 獎章 ═══ -->
    <div v-if="activeTab === 'badges'" class="tab-content">
      <div class="badges-grid">
        <div v-for="b in allBadges" :key="b.id" class="badge-item" :class="{ locked: !b.unlocked }">
          <span class="badge-icon">{{ b.icon }}</span>
          <span class="badge-name">{{ b.name }}</span>
          <span class="badge-module">{{ b.module }}</span>
          <span class="badge-desc">{{ b.desc }}</span>
          <span v-if="!b.unlocked" class="badge-lock">🔒</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.member-center {
  padding: 16px;
  max-width: 430px;
  margin: 0 auto;
}

.member-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.member-title { font-size: 20px; font-weight: 700; margin: 0; }

.points-badge {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

/* 標籤 */
.member-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.member-tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #78716c;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.tab-content { display: flex; flex-direction: column; gap: 12px; }

/* 卡片 */
.card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.card-title { font-size: 15px; font-weight: 600; margin: 0 0 8px; }
.card-desc { font-size: 12px; color: #78716c; margin: 4px 0; }

/* 點數 */
.points-overview { text-align: center; background: linear-gradient(135deg, #fffbeb, #fef3c7); }
.points-big { font-size: 36px; font-weight: 800; color: #f59e0b; }
.points-label { font-size: 12px; color: #92400e; font-weight: 600; }

.action-btn {
  width: 100%; padding: 12px; min-height: 44px;
  border: none; border-radius: 10px;
  background: #f59e0b; color: #fff;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.action-btn:hover { opacity: 0.9; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.done { background: #10b981; }
.action-btn.spin { background: #8b5cf6; }
.spin-result { font-size: 14px; font-weight: 600; color: #8b5cf6; text-align: center; margin: 8px 0 0; }

.coupon-grid { display: flex; flex-direction: column; gap: 8px; }
.coupon-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.coupon-name { font-size: 13px; }
.coupon-btn { padding: 4px 10px; border: 1px solid #f59e0b; border-radius: 6px; background: transparent; color: #f59e0b; font-size: 11px; font-weight: 600; cursor: pointer; min-height: 32px; }
.coupon-btn:disabled { opacity: 0.4; }

.task-list { display: flex; flex-direction: column; gap: 6px; }
.task-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-radius: 8px; background: #f8fafc; }
.task-item.done { opacity: 0.6; }
.task-name { font-size: 13px; }
.task-reward { font-size: 12px; font-weight: 600; color: #f59e0b; }
.task-item.done .task-reward { color: #10b981; }

.info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.info-list li { font-size: 13px; color: #64748b; }

/* 條碼/錢包 */
.barcode-display { text-align: center; padding: 16px; background: #f8fafc; border-radius: 10px; margin-top: 8px; }
.barcode-pattern { height: 60px; background: repeating-linear-gradient(90deg, #1e293b 0, #1e293b 2px, transparent 2px, transparent 4px); border-radius: 4px; margin-bottom: 8px; }
.barcode-number { font-family: monospace; font-size: 14px; color: #1e293b; letter-spacing: 2px; margin: 0; }

.wallet-balance { text-align: center; padding: 16px 0; }
.wallet-amount { font-size: 28px; font-weight: 800; color: #10b981; display: block; }
.wallet-label { font-size: 12px; color: #78716c; }
.wallet-actions { display: flex; gap: 8px; margin: 8px 0; }
.wallet-btn { flex: 1; padding: 10px; border: 1.5px solid #10b981; border-radius: 10px; background: transparent; color: #10b981; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 40px; }
.wallet-btn:hover { background: #ecfdf5; }

/* 票券 */
.ticket-card { position: relative; }
.ticket-card.used { opacity: 0.5; }
.ticket-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.ticket-type-badge { font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 10px; }
.ticket-status { font-size: 11px; font-weight: 600; }
.ticket-status.unused { color: #10b981; }
.ticket-status.pending { color: #f59e0b; }
.ticket-status.used { color: #94a3b8; }
.ticket-name { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
.ticket-details p { font-size: 12px; color: #64748b; margin: 2px 0; }
.ticket-points { color: #f59e0b !important; font-weight: 600; }
.ticket-qr-mini { display: flex; justify-content: center; margin: 10px 0; }
.qr-box-mini { width: 60px; height: 60px; border: 2px dashed #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #94a3b8; }
.ticket-actions { display: flex; gap: 8px; }
.ticket-link-btn { flex: 1; text-align: center; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 500; color: #64748b; text-decoration: none; min-height: 36px; display: flex; align-items: center; justify-content: center; }
.ticket-link-btn:hover { border-color: #f59e0b; color: #f59e0b; }

/* 獎章 */
.badges-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.badge-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px 8px; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); position: relative; text-align: center; }
.badge-item.locked { opacity: 0.4; filter: grayscale(0.8); }
.badge-icon { font-size: 28px; }
.badge-name { font-size: 11px; font-weight: 600; color: #1e293b; }
.badge-module { font-size: 10px; color: #94a3b8; }
.badge-desc { font-size: 9px; color: #94a3b8; line-height: 1.3; }
.badge-lock { position: absolute; top: 4px; right: 4px; font-size: 12px; }
</style>
