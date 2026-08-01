<script setup lang="ts">
/**
 * i二手 - 社區永續二手市集
 * 含刊登表單 Overlay（真實圖片上傳）+ 私訊 + 預約面交
 */

type ItemCategory = 'all' | 'free' | 'electronics' | 'baby' | 'household'

interface SecondhandItem {
  id: string
  productName: string
  imageUrl: string | null
  price: number
  isFree: boolean
  sellerName: string
  sellerId: string
  pickupStore: string
  pickupMethod: string
  carbonSaved: number
  category: string
  creTime: string
}

const categories: { key: ItemCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'free', label: '🤝 免費贈送' },
  { key: 'electronics', label: '⚡ 二手家電' },
  { key: 'baby', label: '🍼 母嬰用品' },
  { key: 'household', label: '🏠 生活雜貨' },
]

const storeOptions = ['7-11 信義門市', '7-11 松山門市', '7-11 大安門市', '7-11 公館門市', '7-11 忠孝門市']

const activeCategory = ref<ItemCategory>('all')
const items = ref<SecondhandItem[]>([])
const isLoading = ref(false)

// 模擬當前用戶（使用 UUID 格式以匹配 DB）
const currentUser = { id: '00000000-0000-0000-0000-000000000001', name: '沈小姐' }

// ─── 取得商品列表 ───
async function fetchListings() {
  isLoading.value = true
  try {
    const data: any = await $fetch('/api/listings', { params: { category: activeCategory.value } })
    items.value = data
  } catch {
    // fallback mock（API 不可用時）
    items.value = [
      { id: '00000000-0000-0000-0000-100000000001', productName: '嬰兒推車（九成新）', imageUrl: null, price: 800, isFree: false, sellerName: '王媽媽', sellerId: '00000000-0000-0000-0000-000000000002', pickupStore: '7-11 信義門市', pickupMethod: '門市面交', carbonSaved: 5.2, category: 'baby', creTime: new Date(Date.now() - 172800000).toISOString() },
      { id: '00000000-0000-0000-0000-100000000002', productName: '小米空氣清淨機', imageUrl: null, price: 1200, isFree: false, sellerName: '李先生', sellerId: '00000000-0000-0000-0000-000000000003', pickupStore: '7-11 松山門市', pickupMethod: '門市代放', carbonSaved: 8.1, category: 'electronics', creTime: new Date(Date.now() - 86400000).toISOString() },
      { id: '00000000-0000-0000-0000-100000000003', productName: '兒童繪本套組 (20本)', imageUrl: null, price: 0, isFree: true, sellerName: '陳老師', sellerId: '00000000-0000-0000-0000-000000000004', pickupStore: '7-11 大安門市', pickupMethod: '門市面交', carbonSaved: 3.0, category: 'baby', creTime: new Date(Date.now() - 10800000).toISOString() },
      { id: '00000000-0000-0000-0000-100000000004', productName: '瑜珈墊 + 彈力帶', imageUrl: null, price: 0, isFree: true, sellerName: '林小姐', sellerId: '00000000-0000-0000-0000-000000000005', pickupStore: '7-11 忠孝門市', pickupMethod: '門市代放', carbonSaved: 1.5, category: 'household', creTime: new Date(Date.now() - 21600000).toISOString() },
    ]
  }
  isLoading.value = false
}

onMounted(() => { fetchListings() })
watch(activeCategory, () => { fetchListings() })

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return items.value
  if (activeCategory.value === 'free') return items.value.filter(i => i.isFree)
  return items.value.filter(i => i.category === activeCategory.value)
})

// ─── 刊登表單 ───
const showPostForm = ref(false)
const postForm = ref({ productName: '', description: '', price: 0, isFree: false, category: 'household', pickupStore: '7-11 信義門市', pickupMethod: '門市面交' })
const imagePreview = ref<string | null>(null)
const imageBase64 = ref<string | null>(null)
const isPosting = ref(false)

function handleImageSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    imageBase64.value = reader.result as string
    imagePreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

async function handlePost() {
  if (!postForm.value.productName || !postForm.value.pickupStore) return
  isPosting.value = true

  let imageUrl = null
  // 上傳圖片
  if (imageBase64.value) {
    try {
      const uploadRes: any = await $fetch('/api/upload', { method: 'POST', body: { image: imageBase64.value } })
      imageUrl = uploadRes.url
    } catch { /* 圖片上傳失敗仍可刊登 */ }
  }

  // 建立商品
  try {
    await $fetch('/api/listings', {
      method: 'POST',
      body: {
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        productName: postForm.value.productName,
        description: postForm.value.description,
        price: postForm.value.isFree ? 0 : postForm.value.price,
        isFree: postForm.value.isFree || postForm.value.price === 0,
        category: postForm.value.category,
        imageUrl,
        pickupStore: postForm.value.pickupStore,
        pickupMethod: postForm.value.pickupMethod,
        carbonSaved: Math.round(Math.random() * 5 + 1),
      },
    })
    alert('✅ 刊登成功！')
    showPostForm.value = false
    resetPostForm()
    await fetchListings()
  } catch (e: any) {
    console.error('刊登失敗:', e)
    alert('❌ 刊登失敗：' + (e?.data?.error || e?.message || '請確認後端已啟動'))
  }
  isPosting.value = false
}

function resetPostForm() {
  postForm.value = { productName: '', description: '', price: 0, isFree: false, category: 'household', pickupStore: '7-11 信義門市', pickupMethod: '門市面交' }
  imagePreview.value = null
  imageBase64.value = null
}

// ─── 私訊 ───
async function handleMessage(item: SecondhandItem) {
  const msg = prompt(`發送訊息給 ${item.sellerName}：`, `您好，我對「${item.productName}」有興趣！`)
  if (!msg) return
  try {
    await $fetch('/api/messages', {
      method: 'POST',
      body: { senderId: currentUser.id, senderName: currentUser.name, receiverId: item.sellerId, receiverName: item.sellerName, listingId: item.id, content: msg },
    })
    alert('✅ 訊息已發送！可在會員中心「私訊」查看回覆。')
  } catch (e: any) {
    console.error('私訊失敗:', e)
    alert('❌ 發送失敗：' + (e?.data?.error || e?.message || '請確認後端已啟動'))
  }
}

// ─── 預約面交 Modal ───
const showReserveModal = ref(false)
const reserveTarget = ref<SecondhandItem | null>(null)
const reserveDate = ref('')
const reserveTime = ref('')
const isReserving = ref(false)

function openReserveModal(item: SecondhandItem) {
  reserveTarget.value = item
  reserveDate.value = ''
  reserveTime.value = ''
  showReserveModal.value = true
}

async function handleReserve() {
  if (!reserveTarget.value) return
  const item = reserveTarget.value
  isReserving.value = true

  const scheduledAt = reserveDate.value && reserveTime.value
    ? `${reserveDate.value}T${reserveTime.value}:00`
    : null

  try {
    await $fetch('/api/reservations', {
      method: 'POST',
      body: {
        listingId: item.id,
        buyerId: currentUser.id,
        buyerName: currentUser.name,
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        pickupStore: item.pickupStore,
        pickupMethod: item.pickupMethod,
        scheduledAt,
      },
    })
    alert(`✅ 預約已送出！等待 ${item.sellerName} 確認。`)
    showReserveModal.value = false
    reserveTarget.value = null
    fetchListings()
  } catch (e: any) {
    console.error('預約失敗:', e)
    alert('❌ 預約失敗：' + (e?.data?.error || e?.message || '請確認後端已啟動'))
  }
  isReserving.value = false
}

// 統計
const totalTransactions = 128
const totalCarbonSaved = 42.5

// ─── 我的刊登 ───
const myListings = ref<SecondhandItem[]>([])
const showMyListings = ref(false)

async function fetchMyListings() {
  showMyListings.value = !showMyListings.value
  if (!showMyListings.value) return
  try {
    const data: any = await $fetch('/api/listings', { params: { category: 'all' } })
    myListings.value = data.filter((i: any) => i.sellerId === currentUser.id)
  } catch {
    myListings.value = []
  }
}

async function cancelMyListing(item: SecondhandItem) {
  if (!confirm(`確定要取消「${item.productName}」的刊登嗎？`)) return
  try {
    await $fetch(`/api/listings/${item.id}`, { method: 'PATCH', body: { status: 'cancelled' } })
    alert('✅ 已取消刊登')
    myListings.value = myListings.value.filter(i => i.id !== item.id)
    fetchListings()
  } catch (e: any) {
    alert('❌ 取消失敗：' + (e?.data?.error || e?.message || ''))
  }
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3600000)
  if (h < 1) return `${Math.floor(d / 60000)} 分鐘前`
  if (h < 24) return `${h} 小時前`
  return `${Math.floor(h / 24)} 天前`
}
</script>

<template>
  <section class="sh" aria-label="i二手社區市集">
    <!-- ESG Banner -->
    <div class="sh__banner">
      <div class="sh__banner-stats">
        <div class="sh__banner-item"><span>🌱</span><span>社區本月交易：<strong>{{ totalTransactions }}</strong> 件</span></div>
        <div class="sh__banner-item"><span>🌍</span><span>累積減碳：<strong>{{ totalCarbonSaved }} kg</strong> CO₂e</span></div>
      </div>
      <button class="sh__post-btn" @click="showPostForm = true">➕ 我要出清</button>
    </div>

    <!-- 我的刊登 -->
    <button class="sh__my-btn" @click="fetchMyListings">📋 {{ showMyListings ? '收合' : '查看' }}我的刊登</button>
    <div v-if="showMyListings" class="sh__my-list">
      <div v-if="myListings.length === 0" class="sh__empty">您目前沒有刊登中的商品</div>
      <div v-for="item in myListings" :key="item.id" class="sh__my-item">
        <div class="sh__my-info">
          <span class="sh__my-name">{{ item.productName }}</span>
          <span class="sh__my-status">{{ item.price === 0 ? '免費' : `$${item.price}` }} · {{ item.pickupStore }}</span>
        </div>
        <button class="sh__my-cancel" @click="cancelMyListing(item)">取消刊登</button>
      </div>
    </div>

    <!-- 分類 -->
    <div class="sh__categories">
      <button v-for="cat in categories" :key="cat.key" class="sh__cat" :class="{ 'sh__cat--active': activeCategory === cat.key }" @click="activeCategory = cat.key">{{ cat.label }}</button>
    </div>

    <!-- 商品列表 -->
    <div v-if="isLoading" class="sh__loading">載入中...</div>
    <div v-else class="sh__list">
      <div v-for="item in filteredItems" :key="item.id" class="sh__card">
        <div class="sh__card-image" :style="item.imageUrl ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover' } : { background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)' }">
          <span v-if="item.isFree" class="sh__free-badge">FREE</span>
          <span class="sh__carbon-badge">🌱 -{{ item.carbonSaved }}kg</span>
        </div>
        <div class="sh__card-body">
          <h4 class="sh__card-name">{{ item.productName }}</h4>
          <p class="sh__card-price" :class="{ 'sh__card-price--free': item.isFree }">{{ item.isFree ? '$0 免費贈送' : `$${item.price}` }}</p>
          <div class="sh__card-meta">
            <span class="sh__seller">👤 {{ item.sellerName }}</span>
            <span class="sh__pickup">📍 {{ item.pickupStore }} · {{ item.pickupMethod }}</span>
            <span class="sh__time">{{ timeAgo(item.creTime) }}</span>
          </div>
          <div class="sh__card-actions">
            <button class="sh__action sh__action--msg" @click="handleMessage(item)">💬 私訊賣家</button>
            <button class="sh__action sh__action--reserve" @click="openReserveModal(item)">🤝 預約面交</button>
          </div>
        </div>
      </div>
      <div v-if="filteredItems.length === 0" class="sh__empty">目前沒有符合的商品</div>
    </div>

    <!-- 刊登表單 Overlay -->
    <Teleport to="body">
      <div v-if="showPostForm" class="sh__overlay" @click.self="showPostForm = false">
        <div class="sh__form-panel">
          <div class="sh__form-header">
            <h3>➕ 刊登二手商品</h3>
            <button class="sh__form-close" @click="showPostForm = false">✕</button>
          </div>

          <!-- 圖片上傳 -->
          <div class="sh__form-field">
            <label class="sh__form-label">商品照片</label>
            <div class="sh__image-upload">
              <div v-if="imagePreview" class="sh__image-preview" :style="{ backgroundImage: `url(${imagePreview})` }"></div>
              <label v-else class="sh__image-placeholder">
                📷 點擊拍照或選擇圖片
                <input type="file" accept="image/*" capture="environment" class="sh__file-input" @change="handleImageSelect" />
              </label>
              <button v-if="imagePreview" class="sh__image-remove" @click="imagePreview = null; imageBase64 = null">✕ 移除</button>
            </div>
          </div>

          <!-- 商品名稱 -->
          <div class="sh__form-field">
            <label class="sh__form-label">商品名稱 *</label>
            <input v-model="postForm.productName" type="text" class="sh__form-input" placeholder="例如：嬰兒推車（九成新）" />
          </div>

          <!-- 描述 -->
          <div class="sh__form-field">
            <label class="sh__form-label">商品描述</label>
            <textarea v-model="postForm.description" class="sh__form-textarea" placeholder="品牌、使用狀況、附配件..." rows="3"></textarea>
          </div>

          <!-- 價格 -->
          <div class="sh__form-field">
            <label class="sh__form-label">價格</label>
            <div class="sh__price-row">
              <label class="sh__checkbox"><input type="checkbox" v-model="postForm.isFree" /> 免費贈送</label>
              <input v-if="!postForm.isFree" v-model.number="postForm.price" type="number" class="sh__form-input sh__form-input--sm" placeholder="$" />
            </div>
          </div>

          <!-- 分類 -->
          <div class="sh__form-field">
            <label class="sh__form-label">分類</label>
            <select v-model="postForm.category" class="sh__form-select">
              <option value="electronics">⚡ 二手家電</option>
              <option value="baby">🍼 母嬰用品</option>
              <option value="household">🏠 生活雜貨</option>
            </select>
          </div>

          <!-- 門市 -->
          <div class="sh__form-field">
            <label class="sh__form-label">面交門市 *</label>
            <select v-model="postForm.pickupStore" class="sh__form-select">
              <option v-for="s in storeOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- 面交方式 -->
          <div class="sh__form-field">
            <label class="sh__form-label">交貨方式</label>
            <div class="sh__method-row">
              <button class="sh__method" :class="{ 'sh__method--active': postForm.pickupMethod === '門市面交' }" @click="postForm.pickupMethod = '門市面交'">🤝 門市面交</button>
              <button class="sh__method" :class="{ 'sh__method--active': postForm.pickupMethod === '門市代放' }" @click="postForm.pickupMethod = '門市代放'">📦 門市代放</button>
            </div>
          </div>

          <button class="sh__form-submit" :disabled="!postForm.productName || isPosting" @click="handlePost">
            {{ isPosting ? '刊登中...' : '確認刊登' }}
          </button>
          <button class="sh__form-cancel" @click="showPostForm = false; resetPostForm()">取消</button>
        </div>
      </div>
    </Teleport>
    <!-- 預約面交 Modal -->
    <Teleport to="body">
      <div v-if="showReserveModal && reserveTarget" class="sh__overlay" @click.self="showReserveModal = false">
        <div class="sh__form-panel">
          <div class="sh__form-header">
            <h3>🤝 預約{{ reserveTarget.pickupMethod }}</h3>
            <button class="sh__form-close" @click="showReserveModal = false">✕</button>
          </div>
          <div class="sh__reserve-info">
            <p class="sh__reserve-product">{{ reserveTarget.productName }}</p>
            <p class="sh__reserve-meta">📍 {{ reserveTarget.pickupStore }} · {{ reserveTarget.pickupMethod }}</p>
            <p class="sh__reserve-meta">👤 賣家：{{ reserveTarget.sellerName }}</p>
          </div>
          <div v-if="reserveTarget.pickupMethod === '門市面交'" class="sh__form-field">
            <label class="sh__form-label">預約面交日期 *</label>
            <input v-model="reserveDate" type="date" class="sh__form-input" />
          </div>
          <div v-if="reserveTarget.pickupMethod === '門市面交'" class="sh__form-field">
            <label class="sh__form-label">預約面交時間 *</label>
            <input v-model="reserveTime" type="time" class="sh__form-input" />
          </div>
          <p v-if="reserveTarget.pickupMethod === '門市代放'" class="sh__reserve-hint">📦 賣家同意後會將商品寄放至門市，您有 7 天取貨期限。</p>
          <button class="sh__form-submit" :disabled="(reserveTarget.pickupMethod === '門市面交' && (!reserveDate || !reserveTime)) || isReserving" @click="handleReserve">
            {{ isReserving ? '送出中...' : '送出預約' }}
          </button>
          <button class="sh__form-cancel" @click="showReserveModal = false">取消</button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.sh { width: 100%; }
.sh__banner { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #86efac; border-radius: 16px; padding: 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sh__banner-stats { display: flex; flex-direction: column; gap: 4px; }
.sh__banner-item { font-size: 12px; color: #166534; display: flex; align-items: center; gap: 4px; }
.sh__banner-item strong { font-weight: 800; }
.sh__post-btn { padding: 8px 14px; background: #16a34a; color: #fff; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }

.sh__categories { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: 12px; }
.sh__categories::-webkit-scrollbar { display: none; }
.sh__cat { flex-shrink: 0; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 9999px; background: #fff; font-size: 11px; font-weight: 500; color: #78716c; cursor: pointer; }
.sh__cat--active { background: #16a34a; color: #fff; border-color: #16a34a; font-weight: 600; }

.sh__loading { text-align: center; padding: 24px; font-size: 13px; color: #78716c; }
.sh__list { display: flex; flex-direction: column; gap: 12px; }
.sh__empty { text-align: center; padding: 24px; font-size: 13px; color: #78716c; }
.sh__card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.sh__card-image { height: 120px; position: relative; background-size: cover; background-position: center; }
.sh__free-badge { position: absolute; top: 8px; left: 8px; background: #16a34a; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
.sh__carbon-badge { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,.9); color: #166534; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.sh__card-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.sh__card-name { margin: 0; font-size: 14px; font-weight: 600; color: #1c1917; }
.sh__card-price { margin: 0; font-size: 15px; font-weight: 800; color: #f59e0b; }
.sh__card-price--free { color: #16a34a; }
.sh__card-meta { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #78716c; }
.sh__seller { display: flex; align-items: center; gap: 4px; }
.sh__pickup { color: #0369a1; }
.sh__time { color: #9ca3af; }
.sh__card-actions { display: flex; gap: 8px; margin-top: 4px; }
.sh__action { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; border: none; }
.sh__action--msg { background: #fff; border: 1.5px solid #16a34a; color: #16a34a; }
.sh__action--reserve { background: #16a34a; color: #fff; }

/* Overlay */
.sh__overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
.sh__form-panel { background: #fff; border-radius: 16px 16px 0 0; width: 100%; max-width: 430px; max-height: 85vh; overflow-y: auto; padding: 20px; animation: slideUp .3s ease; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sh__form-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sh__form-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
.sh__form-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #78716c; }
.sh__form-field { margin-bottom: 14px; }
.sh__form-label { display: block; font-size: 12px; font-weight: 600; color: #1c1917; margin-bottom: 6px; }
.sh__form-input { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
.sh__form-input:focus { border-color: #16a34a; }
.sh__form-input--sm { width: 120px; }
.sh__form-textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; resize: none; box-sizing: border-box; }
.sh__form-textarea:focus { border-color: #16a34a; }
.sh__form-select { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-family: inherit; }
.sh__price-row { display: flex; align-items: center; gap: 12px; }
.sh__checkbox { font-size: 13px; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.sh__method-row { display: flex; gap: 8px; }
.sh__method { flex: 1; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; }
.sh__method--active { border-color: #16a34a; background: #ecfdf5; color: #16a34a; }
.sh__form-submit { width: 100%; padding: 14px; background: #16a34a; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 8px; }
.sh__form-submit:disabled { opacity: .5; cursor: not-allowed; }
.sh__form-cancel { width: 100%; padding: 12px; background: transparent; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 13px; font-weight: 600; color: #78716c; cursor: pointer; margin-top: 8px; }

/* Reserve Modal */
.sh__reserve-info { margin-bottom: 12px; }
.sh__reserve-product { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #1c1917; }
.sh__reserve-meta { margin: 0 0 2px; font-size: 12px; color: #78716c; }
.sh__reserve-hint { margin: 0; font-size: 12px; color: #0369a1; background: #e0f2fe; padding: 10px 12px; border-radius: 10px; }

/* 我的刊登 */
.sh__my-btn { width: 100%; padding: 10px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 13px; font-weight: 600; color: #1c1917; cursor: pointer; text-align: center; }
.sh__my-btn:hover { background: #f8fafc; }
.sh__my-list { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.sh__my-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; }
.sh__my-info { display: flex; flex-direction: column; gap: 2px; }
.sh__my-name { font-size: 13px; font-weight: 600; color: #1c1917; }
.sh__my-status { font-size: 11px; color: #78716c; }
.sh__my-cancel { padding: 6px 12px; border: 1px solid #e11d48; border-radius: 8px; background: transparent; color: #e11d48; font-size: 11px; font-weight: 600; cursor: pointer; }

/* Image upload */
.sh__image-upload { position: relative; }
.sh__image-preview { width: 100%; height: 160px; border-radius: 12px; background-size: cover; background-position: center; border: 1px solid #e2e8f0; }
.sh__image-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 120px; border: 2px dashed #d1d5db; border-radius: 12px; color: #78716c; font-size: 13px; cursor: pointer; }
.sh__file-input { display: none; }
.sh__image-remove { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; border: none; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
</style>
