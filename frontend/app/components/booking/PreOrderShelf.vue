<script setup lang="ts">
/**
 * PreOrderShelf - i預購虛擬貨架
 * 展示節慶禮盒、名店美食、限量預購與獨家商品
 * 支援分類 Tab、商品詳情 overlay、加入預購/收藏
 * 預購需線上付款（OPEN錢包/OPEN POINT/優惠券/線上支付）
 */

import type { PaymentOrderItem, PaymentResult } from '~/components/ui/PaymentFlow.vue'

export interface PreOrderProduct {
  id: string
  name: string
  image: string
  originalPrice: number
  preorderPrice: number
  tags: ('limited' | 'exclusive' | 'hot' | 'new')[]
  deadline: string
  category: 'festival' | 'famous' | 'limited' | 'exclusive'
  description?: string
  specs?: string[]
}

const props = defineProps<{
  products: PreOrderProduct[]
}>()

const emit = defineEmits<{
  'add-preorder': [payload: { productId: string; quantity: number; spec?: string }]
  'add-wishlist': [productId: string]
}>()

// ─── 分類 Tab ───
const categories = [
  { key: 'festival', label: '節慶禮盒🎁' },
  { key: 'famous', label: '名店美食🍰' },
  { key: 'limited', label: '限量預購⚡' },
  { key: 'exclusive', label: '獨家商品✨' },
] as const

type CategoryKey = (typeof categories)[number]['key']
const activeCategory = ref<CategoryKey | 'all'>('all')

const filteredProducts = computed(() => {
  if (activeCategory.value === 'all') return props.products
  return props.products.filter((p) => p.category === activeCategory.value)
})

// ─── 商品詳情 Overlay ───
const selectedProduct = ref<PreOrderProduct | null>(null)
const selectedSpec = ref<string>('')
const selectedQuantity = ref(1)

function openDetail(product: PreOrderProduct) {
  if (isExpired(product)) return
  selectedProduct.value = product
  selectedSpec.value = product.specs?.[0] || ''
  selectedQuantity.value = 1
}

function closeDetail() {
  selectedProduct.value = null
}

function handleAddPreorder() {
  if (!selectedProduct.value) return
  if (paymentType.value === 'online') {
    // 線上付款：開啟付款流程
    showPaymentFlow.value = true
  } else {
    // 取貨付款：直接確認訂單
    orderConfirmed.value = true
    lastPaymentResult.value = null
    emit('add-preorder', {
      productId: selectedProduct.value.id,
      quantity: selectedQuantity.value,
      spec: selectedSpec.value || undefined,
    })
  }
}

// ─── 付款方式選擇 ───
type PreorderPaymentType = 'online' | 'pickup'
const paymentType = ref<PreorderPaymentType>('online')

// ─── 付款流程 ───
const showPaymentFlow = ref(false)
const orderConfirmed = ref(false)
const lastPaymentResult = ref<PaymentResult | null>(null)

const paymentOrderItems = computed<PaymentOrderItem[]>(() => {
  if (!selectedProduct.value) return []
  const items: PaymentOrderItem[] = [
    { label: '商品名稱', value: selectedProduct.value.name },
  ]
  if (selectedSpec.value) {
    items.push({ label: '規格', value: selectedSpec.value })
  }
  items.push(
    { label: '數量', value: `${selectedQuantity.value} 件` },
    { label: '單價', value: `$${selectedProduct.value.preorderPrice}` },
  )
  return items
})

const paymentTotalAmount = computed(() => {
  if (!selectedProduct.value) return 0
  return selectedProduct.value.preorderPrice * selectedQuantity.value
})

function handlePaymentComplete(result: PaymentResult) {
  lastPaymentResult.value = result
  showPaymentFlow.value = false
  orderConfirmed.value = true

  // 通知父組件新增預購訂單
  emit('add-preorder', {
    productId: selectedProduct.value!.id,
    quantity: selectedQuantity.value,
    spec: selectedSpec.value || undefined,
  })
}

function handlePaymentClose() {
  showPaymentFlow.value = false
}

function closeOrderConfirm() {
  orderConfirmed.value = false
  lastPaymentResult.value = null
  closeDetail()
}

// 跨模組路線規劃跳轉
const router = useRouter()
function navigateToRoute() {
  // 導航至行模組路線規劃，目的地為取貨門市（使用 7-11 信義門市作為預設）
  const destination = '7-11 信義門市'
  closeOrderConfirm()
  router.push({ path: '/transport', query: { destination } })
}

function handleAddWishlist(productId: string) {
  emit('add-wishlist', productId)
}

// ─── 工具函數 ───
function isExpired(product: PreOrderProduct): boolean {
  return new Date(product.deadline) < new Date()
}

function getDaysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function getTagLabel(tag: string): string {
  const map: Record<string, string> = { limited: '限量', exclusive: '獨家', hot: '熱賣', new: '新品' }
  return map[tag] || tag
}

function getTagClass(tag: string): string {
  const map: Record<string, string> = { limited: 'tag-limited', exclusive: 'tag-exclusive', hot: 'tag-hot', new: 'tag-new' }
  return map[tag] || ''
}

function clampQuantity(val: number): number {
  return Math.max(1, Math.min(5, val))
}

function incrementQty() {
  selectedQuantity.value = clampQuantity(selectedQuantity.value + 1)
}

function decrementQty() {
  selectedQuantity.value = clampQuantity(selectedQuantity.value - 1)
}
</script>

<template>
  <UiDashboardCard>
    <div class="shelf-header">
      <h2 class="shelf-title">i預購</h2>
      <span class="shelf-subtitle">🏪 虛擬門市</span>
    </div>

    <!-- 分類 Tab -->
    <div class="category-tabs" role="tablist" aria-label="商品分類">
      <button
        class="category-tab"
        :class="{ active: activeCategory === 'all' }"
        role="tab"
        :aria-selected="activeCategory === 'all'"
        @click="activeCategory = 'all'"
      >
        全部
      </button>
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="category-tab"
        :class="{ active: activeCategory === cat.key }"
        role="tab"
        :aria-selected="activeCategory === cat.key"
        @click="activeCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 商品網格 -->
    <div class="product-grid" aria-live="polite">
      <button
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card"
        :class="{ expired: isExpired(product) }"
        :aria-label="`${product.name}，預購價 ${product.preorderPrice} 元${isExpired(product) ? '，已截止' : ''}`"
        @click="openDetail(product)"
      >
        <div class="product-image" :style="{ background: product.image }">
          <div class="product-tags">
            <span
              v-for="tag in product.tags"
              :key="tag"
              class="product-tag"
              :class="getTagClass(tag)"
            >
              {{ getTagLabel(tag) }}
            </span>
          </div>
          <span v-if="isExpired(product)" class="expired-badge">已截止</span>
        </div>
        <div class="product-info">
          <p class="product-name">{{ product.name }}</p>
          <div class="product-prices">
            <span class="price-original">{{ product.originalPrice }}</span>
            <span class="price-preorder">${{ product.preorderPrice }}</span>
          </div>
          <p v-if="!isExpired(product)" class="product-deadline">
            剩 {{ getDaysLeft(product.deadline) }} 天
          </p>
        </div>
      </button>
    </div>

    <!-- 商品詳情 Overlay -->
    <Teleport to="body">
      <div v-if="selectedProduct && !orderConfirmed" class="overlay-backdrop" @click.self="closeDetail">
        <div class="overlay-content" role="dialog" aria-modal="true" :aria-label="`${selectedProduct.name} 商品詳情`">
          <button class="overlay-close" aria-label="關閉商品詳情" @click="closeDetail">✕</button>

          <div class="overlay-image" :style="{ background: selectedProduct.image }"></div>

          <h3 class="overlay-name">{{ selectedProduct.name }}</h3>
          <p v-if="selectedProduct.description" class="overlay-desc">{{ selectedProduct.description }}</p>

          <div class="overlay-prices">
            <span class="price-original">{{ selectedProduct.originalPrice }}</span>
            <span class="price-preorder">${{ selectedProduct.preorderPrice }}</span>
          </div>

          <!-- 規格選擇 -->
          <div v-if="selectedProduct.specs && selectedProduct.specs.length > 0" class="overlay-specs">
            <p class="spec-label">規格</p>
            <div class="spec-options">
              <button
                v-for="spec in selectedProduct.specs"
                :key="spec"
                class="spec-btn"
                :class="{ active: selectedSpec === spec }"
                @click="selectedSpec = spec"
              >
                {{ spec }}
              </button>
            </div>
          </div>

          <!-- 數量選擇 -->
          <div class="overlay-quantity">
            <p class="spec-label">數量</p>
            <div class="quantity-control">
              <button class="qty-btn" aria-label="減少數量" @click="decrementQty">−</button>
              <span class="qty-value">{{ selectedQuantity }}</span>
              <button class="qty-btn" aria-label="增加數量" @click="incrementQty">+</button>
            </div>
          </div>

          <!-- 付款方式選擇 -->
          <div class="payment-type-section">
            <p class="spec-label">付款方式</p>
            <div class="payment-type-options">
              <button
                class="payment-type-btn"
                :class="{ active: paymentType === 'online' }"
                @click="paymentType = 'online'"
              >
                💳 線上付款
              </button>
              <button
                class="payment-type-btn"
                :class="{ active: paymentType === 'pickup' }"
                @click="paymentType = 'pickup'"
              >
                🏪 取貨付款
              </button>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="overlay-actions">
            <button class="btn-preorder" @click="handleAddPreorder">
              {{ paymentType === 'online' ? '前往付款' : '確認預購' }}
            </button>
            <button class="btn-wishlist" @click="handleAddWishlist(selectedProduct.id); closeDetail()">
              ❤️ 加入收藏
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 訂單確認 Overlay（付款成功後） -->
    <Teleport to="body">
      <div v-if="orderConfirmed && selectedProduct" class="overlay-backdrop" @click.self="closeOrderConfirm">
        <div class="overlay-content order-confirm-panel" role="dialog" aria-modal="true" aria-label="預購訂單確認">
          <div class="order-success-header">
            <span class="order-success-icon">✓</span>
            <h3 class="order-success-title">預購成功</h3>
          </div>

          <div class="order-confirm-card">
            <div class="order-confirm-row">
              <span class="order-confirm-label">商品</span>
              <span class="order-confirm-value">{{ selectedProduct.name }}</span>
            </div>
            <div v-if="selectedSpec" class="order-confirm-row">
              <span class="order-confirm-label">規格</span>
              <span class="order-confirm-value">{{ selectedSpec }}</span>
            </div>
            <div class="order-confirm-row">
              <span class="order-confirm-label">數量</span>
              <span class="order-confirm-value">{{ selectedQuantity }} 件</span>
            </div>
            <div class="order-confirm-row">
              <span class="order-confirm-label">付款方式</span>
              <span class="order-confirm-value">{{ lastPaymentResult ? lastPaymentResult.methodLabel : '取貨付款' }}</span>
            </div>
            <div class="order-confirm-row total">
              <span class="order-confirm-label">{{ lastPaymentResult ? '實付金額' : '應付金額' }}</span>
              <span class="order-confirm-value highlight">${{ lastPaymentResult ? lastPaymentResult.finalAmount.toLocaleString() : paymentTotalAmount.toLocaleString() }}</span>
            </div>
            <div v-if="lastPaymentResult" class="order-confirm-row">
              <span class="order-confirm-label">交易編號</span>
              <span class="order-confirm-value txn">{{ lastPaymentResult.transactionId }}</span>
            </div>
            <div class="order-confirm-row">
              <span class="order-confirm-label">{{ lastPaymentResult ? '預計取貨' : '付款方式' }}</span>
              <span class="order-confirm-value">{{ lastPaymentResult ? '商品到貨後通知取貨' : '門市取貨時付款' }}</span>
            </div>
          </div>

          <p class="order-confirm-hint">訂單成立後將於「訂單追蹤」中顯示進度</p>

          <div class="order-confirm-actions">
            <button class="btn-route-plan" @click="navigateToRoute">
              🗺️ 路線規劃至取貨門市
            </button>
            <button class="btn-preorder" @click="closeOrderConfirm">完成</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 付款流程 -->
    <UiPaymentFlow
      :visible="showPaymentFlow"
      :order-items="paymentOrderItems"
      :total-amount="paymentTotalAmount"
      accent-color="#10b981"
      success-title="付款成功"
      @payment-complete="handlePaymentComplete"
      @close="handlePaymentClose"
    />
  </UiDashboardCard>
</template>

<style scoped>
.shelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.shelf-title {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0;
}

.shelf-subtitle {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}

/* ─── 分類 Tab ─── */
.category-tabs {
  display: flex;
  gap: var(--space-1, 4px);
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: var(--space-2, 8px);
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: var(--text-xs, 11px);
  border: none;
  border-radius: var(--radius-full, 9999px);
  cursor: pointer;
  background: var(--color-bg-card, #fff);
  color: var(--color-text-secondary, #6b7280);
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}

.category-tab.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.category-tab:hover {
  opacity: 0.85;
}

.category-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ─── 商品網格 ─── */
.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3, 12px);
}

.product-card {
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.product-card:hover {
  opacity: 0.85;
}

.product-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.product-card.expired {
  filter: grayscale(1);
  opacity: 0.5;
  cursor: not-allowed;
}

.product-image {
  height: 120px;
  position: relative;
  border-radius: var(--radius-md, 12px) var(--radius-md, 12px) 0 0;
}

.product-tags {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.product-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-full, 9999px);
  font-weight: 600;
}

.tag-limited {
  background: #ef4444;
  color: #fff;
}

.tag-exclusive {
  background: var(--color-secondary);
  color: #fff;
}

.tag-hot {
  background: #fce7f3;
  color: #db2777;
}

.tag-new {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.expired-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 12px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 11px);
  font-weight: 600;
}

.product-info {
  padding: var(--space-2, 8px);
}

.product-name {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.product-prices {
  display: flex;
  align-items: center;
  gap: 6px;
}

.price-original {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-disabled, #9ca3af);
  text-decoration: line-through;
}

.price-preorder {
  font-size: var(--text-sm, 13px);
  font-weight: 700;
  color: var(--color-primary);
}

.product-deadline {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 4px 0 0;
}

/* ─── Overlay ─── */
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.overlay-content {
  background: #fff;
  border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0;
  width: 100%;
  max-width: 430px;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--space-4, 16px);
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.overlay-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-disabled, #9ca3af);
}

.overlay-image {
  height: 160px;
  border-radius: var(--radius-md, 12px);
  margin-bottom: var(--space-3, 12px);
}

.overlay-name {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  margin: 0 0 var(--space-2, 8px);
}

.overlay-desc {
  font-size: var(--text-sm, 13px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 var(--space-3, 12px);
  line-height: 1.5;
}

.overlay-prices {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-3, 12px);
}

.overlay-prices .price-preorder {
  font-size: var(--text-base, 15px);
}

.overlay-specs,
.overlay-quantity {
  margin-bottom: var(--space-3, 12px);
}

.spec-label {
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  margin: 0 0 var(--space-2, 8px);
}

.spec-options {
  display: flex;
  gap: var(--space-2, 8px);
  flex-wrap: wrap;
}

.spec-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  background: #fff;
  cursor: pointer;
  font-size: var(--text-sm, 13px);
  min-height: 44px;
  transition: all 0.15s ease;
}

.spec-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
}

.qty-btn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-full, 9999px);
  background: #fff;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s ease;
}

.qty-btn:hover {
  opacity: 0.85;
}

.qty-value {
  font-size: var(--text-base, 15px);
  font-weight: 700;
  min-width: 24px;
  text-align: center;
}

.overlay-actions {
  display: flex;
  gap: var(--space-2, 8px);
  margin-top: var(--space-4, 16px);
}

.btn-preorder {
  flex: 1;
  padding: 12px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.btn-preorder:hover {
  opacity: 0.85;
}

.btn-wishlist {
  padding: 12px 16px;
  background: none;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  font-size: var(--text-sm, 13px);
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.15s ease;
}

.btn-wishlist:hover {
  opacity: 0.85;
}

/* ─── 訂單確認 Overlay ─── */
.order-confirm-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3, 12px);
}

.order-success-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-2, 8px);
}

.order-success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary, #10b981);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounce-in 0.4s ease;
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.order-success-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.order-confirm-card {
  width: 100%;
  background: var(--color-primary-light, #ecfdf5);
  border: 1px solid var(--color-primary, #10b981);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-3, 12px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-confirm-row.total {
  border-top: 1px solid var(--color-border, #e5e7eb);
  padding-top: 8px;
  margin-top: 4px;
}

.order-confirm-label {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}

.order-confirm-value {
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: #1e293b;
  max-width: 60%;
  text-align: right;
}

.order-confirm-value.highlight {
  color: var(--color-primary, #10b981);
  font-weight: 700;
  font-size: var(--text-base, 15px);
}

.order-confirm-value.txn {
  font-family: monospace;
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
}

.order-confirm-hint {
  font-size: var(--text-xs, 11px);
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  text-align: center;
}

/* ─── 付款方式選擇 ─── */
.payment-type-section {
  margin-bottom: var(--space-2, 8px);
}

.payment-type-options {
  display: flex;
  gap: var(--space-2, 8px);
}

.payment-type-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 12px);
  background: #fff;
  font-size: var(--text-sm, 13px);
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s ease;
  text-align: center;
}

.payment-type-btn.active {
  border-color: var(--color-primary, #10b981);
  background: var(--color-primary-light, #ecfdf5);
  color: var(--color-primary, #10b981);
  font-weight: 600;
}

.payment-type-btn:hover {
  opacity: 0.85;
}

/* ─── 訂單確認操作 ─── */
.order-confirm-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-route-plan {
  width: 100%;
  padding: 12px;
  min-height: 44px;
  border: 1px solid var(--color-primary, #10b981);
  border-radius: var(--radius-md, 12px);
  background: transparent;
  color: var(--color-primary, #10b981);
  font-size: var(--text-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-route-plan:hover { background: var(--color-primary-light, #ecfdf5); }
.btn-route-plan:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
