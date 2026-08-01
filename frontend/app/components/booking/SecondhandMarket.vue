<script setup lang="ts">
/**
 * i二手 - 社區永續二手市集
 * 門市便利面交 + ESG 減碳點數
 */

type ItemCategory = 'all' | 'free' | 'electronics' | 'baby' | 'household'

interface SecondhandItem {
  id: string
  name: string
  image: string
  price: number
  isFree: boolean
  seller: string
  sellerVerified: boolean
  pickupStore: string
  pickupMethod: '門市面交' | '門市代放'
  carbonSaved: number
  category: Exclude<ItemCategory, 'all'>
  postedAt: string
}

const categories: { key: ItemCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'free', label: '🤝 免費贈送' },
  { key: 'electronics', label: '⚡ 二手家電' },
  { key: 'baby', label: '🍼 母嬰用品' },
  { key: 'household', label: '🏠 生活雜貨' },
]

const activeCategory = ref<ItemCategory>('all')

const items = ref<SecondhandItem[]>([
  { id: 'sh-1', name: '嬰兒推車（九成新）', image: 'linear-gradient(135deg, #fde68a, #f59e0b)', price: 800, isFree: false, seller: '王媽媽', sellerVerified: true, pickupStore: '7-11 信義門市', pickupMethod: '門市面交', carbonSaved: 5.2, category: 'baby', postedAt: '2 天前' },
  { id: 'sh-2', name: '小米空氣清淨機', image: 'linear-gradient(135deg, #a5f3fc, #06b6d4)', price: 1200, isFree: false, seller: '李先生', sellerVerified: true, pickupStore: '7-11 松山門市', pickupMethod: '門市代放', carbonSaved: 8.1, category: 'electronics', postedAt: '1 天前' },
  { id: 'sh-3', name: '兒童繪本套組 (20本)', image: 'linear-gradient(135deg, #c4b5fd, #8b5cf6)', price: 0, isFree: true, seller: '陳老師', sellerVerified: true, pickupStore: '7-11 大安門市', pickupMethod: '門市面交', carbonSaved: 3.0, category: 'baby', postedAt: '3 小時前' },
  { id: 'sh-4', name: '電鍋（大同10人份）', image: 'linear-gradient(135deg, #fca5a5, #ef4444)', price: 500, isFree: false, seller: '張奶奶', sellerVerified: false, pickupStore: '7-11 公館門市', pickupMethod: '門市面交', carbonSaved: 6.8, category: 'electronics', postedAt: '5 天前' },
  { id: 'sh-5', name: '瑜珈墊 + 彈力帶', image: 'linear-gradient(135deg, #86efac, #22c55e)', price: 0, isFree: true, seller: '林小姐', sellerVerified: true, pickupStore: '7-11 忠孝門市', pickupMethod: '門市代放', carbonSaved: 1.5, category: 'household', postedAt: '6 小時前' },
  { id: 'sh-6', name: '折疊曬衣架', image: 'linear-gradient(135deg, #fdba74, #f97316)', price: 150, isFree: false, seller: '趙太太', sellerVerified: true, pickupStore: '7-11 信義門市', pickupMethod: '門市面交', carbonSaved: 2.0, category: 'household', postedAt: '1 天前' },
])

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return items.value
  if (activeCategory.value === 'free') return items.value.filter(i => i.isFree)
  return items.value.filter(i => i.category === activeCategory.value)
})

// 統計
const totalTransactions = 128
const totalCarbonSaved = 42.5

function handleMessage(item: SecondhandItem) {
  alert(`已發送私訊給 ${item.seller}：「您好，我對「${item.name}」有興趣！」`)
}

function handleReserve(item: SecondhandItem) {
  alert(`已預約在 ${item.pickupStore} ${item.pickupMethod}「${item.name}」，請等待賣家確認。`)
}

function handlePost() {
  alert('刊登功能：請拍攝商品照片、填寫描述與價格，選擇面交門市。')
}
</script>

<template>
  <section class="sh" aria-label="i二手社區市集">
    <!-- ESG Banner -->
    <div class="sh__banner">
      <div class="sh__banner-stats">
        <div class="sh__banner-item"><span class="sh__banner-icon">🌱</span><span>社區本月成功交易：<strong>{{ totalTransactions }}</strong> 件</span></div>
        <div class="sh__banner-item"><span class="sh__banner-icon">🌍</span><span>累積減碳：<strong>{{ totalCarbonSaved }} kg</strong> CO₂e</span></div>
      </div>
      <button class="sh__post-btn" @click="handlePost">➕ 我要出清</button>
    </div>

    <!-- 分類 Tag -->
    <div class="sh__categories">
      <button v-for="cat in categories" :key="cat.key" class="sh__cat" :class="{ 'sh__cat--active': activeCategory === cat.key }" @click="activeCategory = cat.key">{{ cat.label }}</button>
    </div>

    <!-- 商品列表 -->
    <div class="sh__list">
      <div v-for="item in filteredItems" :key="item.id" class="sh__card">
        <div class="sh__card-image" :style="{ background: item.image }">
          <span v-if="item.isFree" class="sh__free-badge">FREE</span>
          <span class="sh__carbon-badge">🌱 -{{ item.carbonSaved }}kg</span>
        </div>
        <div class="sh__card-body">
          <h4 class="sh__card-name">{{ item.name }}</h4>
          <p class="sh__card-price" :class="{ 'sh__card-price--free': item.isFree }">{{ item.isFree ? '$0 免費贈送' : `$${item.price}` }}</p>
          <div class="sh__card-meta">
            <span class="sh__seller">👤 {{ item.seller }} <span v-if="item.sellerVerified" class="sh__verified">✓ 鄰居認證</span></span>
            <span class="sh__pickup">📍 {{ item.pickupStore }} · {{ item.pickupMethod }}</span>
            <span class="sh__time">{{ item.postedAt }}</span>
          </div>
          <div class="sh__card-actions">
            <button class="sh__action sh__action--msg" @click="handleMessage(item)">💬 私訊賣家</button>
            <button class="sh__action sh__action--reserve" @click="handleReserve(item)">🤝 預約面交</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sh { width: 100%; }

.sh__banner { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #86efac; border-radius: 16px; padding: 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sh__banner-stats { display: flex; flex-direction: column; gap: 4px; }
.sh__banner-item { font-size: 12px; color: #166534; display: flex; align-items: center; gap: 4px; }
.sh__banner-item strong { font-weight: 800; }
.sh__banner-icon { font-size: 14px; }
.sh__post-btn { padding: 8px 14px; background: #16a34a; color: #fff; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }

.sh__categories { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: 12px; }
.sh__categories::-webkit-scrollbar { display: none; }
.sh__cat { flex-shrink: 0; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 9999px; background: #fff; font-size: 11px; font-weight: 500; color: #78716c; cursor: pointer; }
.sh__cat--active { background: #16a34a; color: #fff; border-color: #16a34a; font-weight: 600; }

.sh__list { display: flex; flex-direction: column; gap: 12px; }
.sh__card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.sh__card-image { height: 120px; position: relative; }
.sh__free-badge { position: absolute; top: 8px; left: 8px; background: #16a34a; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
.sh__carbon-badge { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,.9); color: #166534; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }

.sh__card-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.sh__card-name { margin: 0; font-size: 14px; font-weight: 600; color: #1c1917; }
.sh__card-price { margin: 0; font-size: 15px; font-weight: 800; color: #f59e0b; }
.sh__card-price--free { color: #16a34a; }
.sh__card-meta { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #78716c; }
.sh__seller { display: flex; align-items: center; gap: 4px; }
.sh__verified { color: #16a34a; font-weight: 600; font-size: 10px; }
.sh__pickup { color: #0369a1; }
.sh__time { color: #9ca3af; }

.sh__card-actions { display: flex; gap: 8px; margin-top: 4px; }
.sh__action { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; border: none; }
.sh__action--msg { background: #fff; border: 1.5px solid #16a34a; color: #16a34a; }
.sh__action--reserve { background: #16a34a; color: #fff; }
</style>
