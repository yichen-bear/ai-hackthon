<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ htmlAttrs: { lang: 'zh-TW' } })

// ─── Types ───
type OrderSource = 'preorder' | 'groupbuy'
type StoreOrderStatus = 'pending' | 'submitted' | 'shipping' | 'arrived' | 'notified' | 'completed'
type RegionRequestStatus = 'pending_approval' | 'approved' | 'delivering' | 'delivered'

interface CustomerOrder {
  id: string
  source: OrderSource
  contactName: string
  contactPhone: string
  productName: string
  spec?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  paymentMethod: string
  aiNote: string
  createdAt: string
}

interface GroupBuyOrder {
  id: string
  productName: string
  spec: string
  targetMembers: number
  currentMembers: number
  members: CustomerOrder[]
  isForceGrouped: boolean
}

interface StoreOrder {
  id: string
  storeName: string
  source: OrderSource
  productName: string
  spec?: string
  totalQuantity: number
  customers: CustomerOrder[]
  groupBuy?: GroupBuyOrder
  status: StoreOrderStatus
  submittedAt?: string
  shippingAt?: string
  arrivedAt?: string
}

interface RegionRequest {
  id: string
  storeName: string
  items: { productName: string; spec?: string; quantity: number; unitPrice?: number }[]
  totalAmount?: number
  submittedAt: string
  status: RegionRequestStatus
  approvedAt?: string
  deliveredAt?: string
  eta?: string
}

// ─── RBAC 角色切換（Dropdown） ───
type ViewRole = 'store' | 'region'
interface RoleOption {
  key: ViewRole
  label: string
  desc: string
}
const roleOptions: RoleOption[] = [
  { key: 'store', label: '🏪 門市店長', desc: '可查看個資、操作接單叫貨' },
  { key: 'region', label: '🏢 台北信義區 區域總部', desc: '區經理 — 去個資化、批准調撥物流' },
]
const currentRole = ref<ViewRole>('store')

// ─── 門市選擇 ───
const allStores = ['7-11 信義門市', '7-11 松山門市', '7-11 大安門市', '7-11 公館門市']
const selectedStore = ref('7-11 信義門市')

// ─── Toast ───
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// ─── 工具函數 ───
function getSourceLabel(s: OrderSource) { return s === 'preorder' ? 'i預購' : 'i划算' }
function getSourceIcon(s: OrderSource) { return s === 'preorder' ? '🏪' : '🛒' }

// ─── Mock：門市訂單（客戶下單/團購後門市收到） ───
// 格式對齊 DB pms_form_feedback.feedback_content (formId=1006)
// contactName/Phone 來自解密後的加密欄位
// productName/spec/quantity 來自 feedbackContent.data (topicId 3021~3023)
// 門市來自 feedbackContent.data (topicId 3024)
const storeOrders = ref<StoreOrder[]>([
  {
    id: 'so-1',
    storeName: '7-11 信義門市',
    source: 'groupbuy',
    productName: '舒潔衛生紙箱購',
    spec: '100抽 x 72包',
    totalQuantity: 10,
    groupBuy: {
      id: 'gb-1', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', targetMembers: 5, currentMembers: 3, isForceGrouped: false,
      members: [
        { id: 'c-1', source: 'groupbuy', contactName: '王小姐', contactPhone: '0912-***-678', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 4, unitPrice: 599, totalAmount: 2396, paymentMethod: '🏪 取貨付款', aiNote: '🤖 社區團購常客', createdAt: '08/01 10:15' },
        { id: 'c-2', source: 'groupbuy', contactName: '林先生', contactPhone: '0933-***-789', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 3, unitPrice: 599, totalAmount: 1797, paymentMethod: '🏪 取貨付款', aiNote: '🤖 首次參團', createdAt: '08/01 14:30' },
        { id: 'c-3', source: 'groupbuy', contactName: '陳媽媽', contactPhone: '0922-***-890', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 3, unitPrice: 599, totalAmount: 1797, paymentMethod: '🏪 取貨付款', aiNote: '🤖 家庭大量購買', createdAt: '08/02 09:00' },
      ],
    },
    customers: [],
    status: 'pending',
  },
  {
    id: 'so-2',
    storeName: '7-11 信義門市',
    source: 'groupbuy',
    productName: '光泉鮮乳量販組',
    spec: '1858ml x 6瓶',
    totalQuantity: 5,
    groupBuy: {
      id: 'gb-2', productName: '光泉鮮乳量販組', spec: '1858ml x 6瓶', targetMembers: 5, currentMembers: 5, isForceGrouped: false,
      members: [
        { id: 'c-4', source: 'groupbuy', contactName: '張同學', contactPhone: '0955-***-901', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '🤖 學生優惠', createdAt: '08/01 16:00' },
        { id: 'c-5', source: 'groupbuy', contactName: '李太太', contactPhone: '0966-***-012', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/01 18:00' },
        { id: 'c-6', source: 'groupbuy', contactName: '趙先生', contactPhone: '0977-***-123', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '08/02 08:00' },
        { id: 'c-7', source: 'groupbuy', contactName: '孫小姐', contactPhone: '0988-***-234', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/02 10:00' },
        { id: 'c-8', source: 'groupbuy', contactName: '周媽媽', contactPhone: '0911-***-345', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '🤖 冷藏品需快速通知', createdAt: '08/02 12:00' },
      ],
    },
    customers: [],
    status: 'pending',
  },
  {
    id: 'so-3',
    storeName: '7-11 信義門市',
    source: 'preorder',
    productName: '中秋限定月餅禮盒',
    spec: '經典蛋黃酥 x6入',
    totalQuantity: 3,
    customers: [
      { id: 'c-9', source: 'preorder', contactName: '黃經理', contactPhone: '0912-***-222', productName: '中秋限定月餅禮盒', spec: '經典蛋黃酥 x6入', quantity: 2, unitPrice: 680, totalAmount: 1360, paymentMethod: '💳 線上付款（OPEN錢包）', aiNote: '🤖 VIP 企業訂單 / 送禮需求', createdAt: '08/02 15:30' },
      { id: 'c-10', source: 'preorder', contactName: '吳小姐', contactPhone: '0933-***-333', productName: '中秋限定月餅禮盒', spec: '經典蛋黃酥 x6入', quantity: 1, unitPrice: 680, totalAmount: 680, paymentMethod: '💳 線上付款（信用卡）', aiNote: '🤖 自用', createdAt: '08/03 09:00' },
    ],
    status: 'pending',
  },
  // ─── 松山門市 ───
  {
    id: 'so-4',
    storeName: '7-11 松山門市',
    source: 'groupbuy',
    productName: '舒潔衛生紙箱購',
    spec: '100抽 x 72包',
    totalQuantity: 15,
    groupBuy: {
      id: 'gb-3', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', targetMembers: 8, currentMembers: 6, isForceGrouped: false,
      members: [
        { id: 'c-40', source: 'groupbuy', contactName: '鄭太太', contactPhone: '0912-***-200', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 3, unitPrice: 599, totalAmount: 1797, paymentMethod: '🏪 取貨付款', aiNote: '🤖 社區主婦團', createdAt: '08/01 11:00' },
        { id: 'c-41', source: 'groupbuy', contactName: '曾先生', contactPhone: '0922-***-300', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 2, unitPrice: 599, totalAmount: 1198, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/01 13:00' },
        { id: 'c-42', source: 'groupbuy', contactName: '謝小姐', contactPhone: '0933-***-400', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 3, unitPrice: 599, totalAmount: 1797, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '08/01 15:00' },
        { id: 'c-43', source: 'groupbuy', contactName: '何媽媽', contactPhone: '0955-***-500', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 2, unitPrice: 599, totalAmount: 1198, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/02 08:00' },
        { id: 'c-44', source: 'groupbuy', contactName: '宋先生', contactPhone: '0966-***-600', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 3, unitPrice: 599, totalAmount: 1797, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/02 10:00' },
        { id: 'c-45', source: 'groupbuy', contactName: '蕭太太', contactPhone: '0977-***-700', productName: '舒潔衛生紙箱購', spec: '100抽 x 72包', quantity: 2, unitPrice: 599, totalAmount: 1198, paymentMethod: '🏪 取貨付款', aiNote: '🤖 固定每月團購', createdAt: '08/02 14:00' },
      ],
    },
    customers: [],
    status: 'pending',
  },
  {
    id: 'so-5',
    storeName: '7-11 松山門市',
    source: 'preorder',
    productName: '日本A5和牛禮盒',
    spec: '300g 霜降片',
    totalQuantity: 4,
    customers: [
      { id: 'c-46', source: 'preorder', contactName: '方經理', contactPhone: '0988-***-800', productName: '日本A5和牛禮盒', spec: '300g 霜降片', quantity: 2, unitPrice: 1980, totalAmount: 3960, paymentMethod: '💳 線上付款', aiNote: '🤖 公司中秋贈禮', createdAt: '08/02 11:00' },
      { id: 'c-47', source: 'preorder', contactName: '邱小姐', contactPhone: '0911-***-900', productName: '日本A5和牛禮盒', spec: '300g 霜降片', quantity: 2, unitPrice: 1980, totalAmount: 3960, paymentMethod: '💳 線上付款（OPEN錢包）', aiNote: '🤖 冷凍宅配需求', createdAt: '08/03 08:30' },
    ],
    status: 'pending',
  },
  // ─── 大安門市 ───
  {
    id: 'so-6',
    storeName: '7-11 大安門市',
    source: 'groupbuy',
    productName: '光泉鮮乳量販組',
    spec: '1858ml x 6瓶',
    totalQuantity: 8,
    groupBuy: {
      id: 'gb-4', productName: '光泉鮮乳量販組', spec: '1858ml x 6瓶', targetMembers: 8, currentMembers: 8, isForceGrouped: false,
      members: [
        { id: 'c-50', source: 'groupbuy', contactName: '游太太', contactPhone: '0912-***-002', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/01 09:00' },
        { id: 'c-51', source: 'groupbuy', contactName: '呂先生', contactPhone: '0922-***-003', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/01 10:00' },
        { id: 'c-52', source: 'groupbuy', contactName: '施小姐', contactPhone: '0933-***-004', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '08/01 11:00' },
        { id: 'c-53', source: 'groupbuy', contactName: '廖媽媽', contactPhone: '0955-***-005', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/01 14:00' },
        { id: 'c-54', source: 'groupbuy', contactName: '鍾先生', contactPhone: '0966-***-006', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/02 08:00' },
        { id: 'c-55', source: 'groupbuy', contactName: '葉小姐', contactPhone: '0977-***-007', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/02 09:00' },
        { id: 'c-56', source: 'groupbuy', contactName: '蘇先生', contactPhone: '0988-***-008', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '08/02 12:00' },
        { id: 'c-57', source: 'groupbuy', contactName: '盧太太', contactPhone: '0911-***-009', productName: '光泉鮮乳量販組', quantity: 1, unitPrice: 399, totalAmount: 399, paymentMethod: '🏪 取貨付款', aiNote: '🤖 每週固定訂購', createdAt: '08/02 15:00' },
      ],
    },
    customers: [],
    status: 'pending',
  },
  // ─── 公館門市 ───
  {
    id: 'so-7',
    storeName: '7-11 公館門市',
    source: 'groupbuy',
    productName: '可口可樂量販箱',
    spec: '330ml x 24罐',
    totalQuantity: 10,
    groupBuy: {
      id: 'gb-5', productName: '可口可樂量販箱', spec: '330ml x 24罐', targetMembers: 6, currentMembers: 4, isForceGrouped: false,
      members: [
        { id: 'c-60', source: 'groupbuy', contactName: '洪同學', contactPhone: '0912-***-020', productName: '可口可樂量販箱', quantity: 3, unitPrice: 249, totalAmount: 747, paymentMethod: '🏪 取貨付款', aiNote: '🤖 宿舍團購', createdAt: '08/02 16:00' },
        { id: 'c-61', source: 'groupbuy', contactName: '余同學', contactPhone: '0922-***-030', productName: '可口可樂量販箱', quantity: 2, unitPrice: 249, totalAmount: 498, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '08/02 17:00' },
        { id: 'c-62', source: 'groupbuy', contactName: '潘同學', contactPhone: '0933-***-040', productName: '可口可樂量販箱', quantity: 3, unitPrice: 249, totalAmount: 747, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '08/02 18:00' },
        { id: 'c-63', source: 'groupbuy', contactName: '范同學', contactPhone: '0955-***-050', productName: '可口可樂量販箱', quantity: 2, unitPrice: 249, totalAmount: 498, paymentMethod: '🏪 取貨付款', aiNote: '🤖 學生固定補貨', createdAt: '08/03 10:00' },
      ],
    },
    customers: [],
    status: 'pending',
  },
  {
    id: 'so-8',
    storeName: '7-11 公館門市',
    source: 'preorder',
    productName: '法式甜點禮盒',
    spec: '馬卡龍 12入',
    totalQuantity: 2,
    customers: [
      { id: 'c-64', source: 'preorder', contactName: '楊教授', contactPhone: '0966-***-060', productName: '法式甜點禮盒', spec: '馬卡龍 12入', quantity: 1, unitPrice: 880, totalAmount: 880, paymentMethod: '💳 線上付款', aiNote: '🤖 教師節禮品', createdAt: '08/03 11:00' },
      { id: 'c-65', source: 'preorder', contactName: '江同學', contactPhone: '0977-***-070', productName: '法式甜點禮盒', spec: '馬卡龍 12入', quantity: 1, unitPrice: 880, totalAmount: 880, paymentMethod: '💳 線上付款（OPEN錢包）', aiNote: '', createdAt: '08/03 12:00' },
    ],
    status: 'pending',
  },
])

// ─── Mock：已提交至區域 / 配送中 / 已到店 ───
const shippingOrders = ref<StoreOrder[]>([
  {
    id: 'so-ship-1',
    storeName: '7-11 信義門市',
    source: 'groupbuy',
    productName: '可口可樂量販箱',
    spec: '330ml x 24罐',
    totalQuantity: 8,
    customers: [
      { id: 'c-20', source: 'groupbuy', contactName: '鄭先生', contactPhone: '0955-***-444', productName: '可口可樂量販箱', quantity: 3, unitPrice: 249, totalAmount: 747, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/30' },
      { id: 'c-21', source: 'groupbuy', contactName: '馬太太', contactPhone: '0966-***-555', productName: '可口可樂量販箱', quantity: 5, unitPrice: 249, totalAmount: 1245, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/30' },
    ],
    status: 'shipping',
    submittedAt: '07/31 14:00',
    shippingAt: '08/01 09:00',
  },
  {
    id: 'so-ship-2',
    storeName: '7-11 信義門市',
    source: 'preorder',
    productName: '日本A5和牛禮盒',
    spec: '300g 霜降片',
    totalQuantity: 2,
    customers: [
      { id: 'c-22', source: 'preorder', contactName: '高先生', contactPhone: '0977-***-666', productName: '日本A5和牛禮盒', spec: '300g 霜降片', quantity: 2, unitPrice: 1980, totalAmount: 3960, paymentMethod: '💳 線上付款', aiNote: '🤖 冷凍配送', createdAt: '07/29' },
    ],
    status: 'shipping',
    submittedAt: '07/30 10:00',
    shippingAt: '07/31 15:00',
  },
])

const arrivedOrders = ref<StoreOrder[]>([
  {
    id: 'so-arr-1',
    storeName: '7-11 信義門市',
    source: 'groupbuy',
    productName: '花王洗衣精超值組',
    spec: '2.4kg x 3瓶',
    totalQuantity: 12,
    customers: [
      { id: 'c-30', source: 'groupbuy', contactName: '劉媽媽', contactPhone: '0911-***-777', productName: '花王洗衣精超值組', quantity: 2, unitPrice: 469, totalAmount: 938, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/26' },
      { id: 'c-31', source: 'groupbuy', contactName: '許先生', contactPhone: '0922-***-888', productName: '花王洗衣精超值組', quantity: 3, unitPrice: 469, totalAmount: 1407, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/26' },
      { id: 'c-32', source: 'groupbuy', contactName: '蔡小姐', contactPhone: '0933-***-999', productName: '花王洗衣精超值組', quantity: 2, unitPrice: 469, totalAmount: 938, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '07/27' },
    ],
    status: 'arrived',
    submittedAt: '07/28 10:00',
    shippingAt: '07/25 08:00',
    arrivedAt: '07/27 14:00',
  },
  {
    id: 'so-arr-2',
    storeName: '7-11 松山門市',
    source: 'preorder',
    productName: '中秋限定月餅禮盒',
    spec: '經典蛋黃酥 x6入',
    totalQuantity: 5,
    customers: [
      { id: 'c-33', source: 'preorder', contactName: '楊先生', contactPhone: '0955-111-000', productName: '中秋限定月餅禮盒', quantity: 3, unitPrice: 680, totalAmount: 2040, paymentMethod: '💳 線上付款', aiNote: '', createdAt: '07/20' },
      { id: 'c-34', source: 'preorder', contactName: '韓太太', contactPhone: '0966-222-111', productName: '中秋限定月餅禮盒', quantity: 2, unitPrice: 680, totalAmount: 1360, paymentMethod: '💳 線上付款（OPEN錢包）', aiNote: '', createdAt: '07/21' },
    ],
    status: 'arrived',
    submittedAt: '07/22 09:00',
    shippingAt: '07/23 10:00',
    arrivedAt: '07/26 11:00',
  },
  {
    id: 'so-arr-3',
    storeName: '7-11 大安門市',
    source: 'groupbuy',
    productName: '舒潔衛生紙箱購',
    spec: '100抽 x 72包',
    totalQuantity: 6,
    customers: [
      { id: 'c-35', source: 'groupbuy', contactName: '魏先生', contactPhone: '0977-333-222', productName: '舒潔衛生紙箱購', quantity: 2, unitPrice: 599, totalAmount: 1198, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/20' },
      { id: 'c-36', source: 'groupbuy', contactName: '沈小姐', contactPhone: '0988-444-333', productName: '舒潔衛生紙箱購', quantity: 2, unitPrice: 599, totalAmount: 1198, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/20' },
      { id: 'c-37', source: 'groupbuy', contactName: '田太太', contactPhone: '0911-555-444', productName: '舒潔衛生紙箱購', quantity: 2, unitPrice: 599, totalAmount: 1198, paymentMethod: '🏪 取貨付款', aiNote: '', createdAt: '07/21' },
    ],
    status: 'arrived',
    submittedAt: '07/23 14:00',
    shippingAt: '07/24 09:00',
    arrivedAt: '07/27 10:00',
  },
])

// ─── Mock：區域總部收到的叫貨請求 ───
const regionRequests = ref<RegionRequest[]>([
  {
    id: 'rr-1',
    storeName: '7-11 信義門市',
    items: [
      { productName: '舒潔衛生紙箱購', spec: '100抽x72包', quantity: 10, unitPrice: 599 },
      { productName: '光泉鮮乳量販組', spec: '1858ml x 6瓶', quantity: 5, unitPrice: 399 },
      { productName: '中秋限定月餅禮盒', spec: '經典蛋黃酥 x6入', quantity: 3, unitPrice: 680 },
    ],
    totalAmount: 9025,
    submittedAt: '07/30 11:00',
    status: 'pending_approval',
  },
  {
    id: 'rr-2',
    storeName: '7-11 松山門市',
    items: [
      { productName: '舒潔衛生紙箱購', spec: '100抽x72包', quantity: 15, unitPrice: 599 },
      { productName: '可口可樂量販箱', spec: '330ml x 24罐', quantity: 6, unitPrice: 249 },
    ],
    totalAmount: 10479,
    submittedAt: '07/30 10:30',
    status: 'pending_approval',
  },
  {
    id: 'rr-3',
    storeName: '7-11 大安門市',
    items: [
      { productName: '光泉鮮乳量販組', spec: '1858ml x 6瓶', quantity: 8, unitPrice: 399 },
    ],
    totalAmount: 3192,
    submittedAt: '07/29 16:00',
    status: 'delivering',
    approvedAt: '07/29 17:00',
    eta: '07/31 14:00',
  },
  {
    id: 'rr-4',
    storeName: '7-11 公館門市',
    items: [
      { productName: '花王洗衣精超值組', spec: '2.4kg x 3瓶', quantity: 12, unitPrice: 469 },
    ],
    totalAmount: 5628,
    submittedAt: '07/27 09:00',
    status: 'delivered',
    approvedAt: '07/27 10:00',
    deliveredAt: '07/28 14:00',
  },
])

// ─── Computed：依門市篩選 ───
const filteredStoreOrders = computed(() => storeOrders.value.filter(o => o.storeName === selectedStore.value))
const filteredShipping = computed(() => shippingOrders.value.filter(o => o.storeName === selectedStore.value))
const filteredArrived = computed(() => arrivedOrders.value.filter(o => o.storeName === selectedStore.value))

// ─── Computed：門市 Tab 計數 ───
const pendingCount = computed(() => filteredStoreOrders.value.filter(o => o.status === 'pending').length)
const shippingCount = computed(() => filteredShipping.value.length)
const arrivedCount = computed(() => filteredArrived.value.reduce((sum, o) => sum + o.customers.length, 0))

// ─── 計算訂單總金額 ───
function getOrderTotalAmount(order: StoreOrder): number {
  if (order.groupBuy) {
    return order.groupBuy.members.reduce((sum, m) => sum + m.totalAmount, 0)
  }
  return order.customers.reduce((sum, c) => sum + c.totalAmount, 0)
}

// ─── 取貨倒數（7 天期限）───
function getDaysLeft(arrivedAt?: string): number {
  if (!arrivedAt) return 7
  // 簡化：用 mock 日期算差距，以 07/30 為今天
  const today = new Date('2024-07-30')
  const parts = arrivedAt.split(' ')[0].split('/')
  const arrived = new Date(`2024/${parts[0]}/${parts[1]}`)
  const diff = 7 - Math.floor((today.getTime() - arrived.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function getDaysLeftClass(days: number): string {
  if (days <= 3) return 'bk__countdown--danger'
  if (days <= 5) return 'bk__countdown--warn'
  return 'bk__countdown--ok'
}

// ─── 配送 ETA（預計到貨）───
function getShippingEta(order: StoreOrder): string {
  // 模擬：發車後 2 天到貨
  if (!order.shippingAt) return '待區域發車'
  const parts = order.shippingAt.split(' ')[0].split('/')
  const ship = new Date(`2024/${parts[0]}/${parts[1]}`)
  ship.setDate(ship.getDate() + 2)
  return `${String(ship.getMonth() + 1).padStart(2, '0')}/${String(ship.getDate()).padStart(2, '0')} 預計到貨`
}

// ─── 一鍵全部叫貨 ───
function submitAllToRegion() {
  const pending = filteredStoreOrders.value.filter(o => o.status === 'pending')
  if (pending.length === 0) return

  const items = pending.map(o => ({
    productName: o.productName,
    spec: o.spec,
    quantity: o.totalQuantity,
    unitPrice: o.groupBuy ? o.groupBuy.members[0]?.unitPrice : o.customers[0]?.unitPrice,
  }))
  const total = pending.reduce((sum, o) => sum + getOrderTotalAmount(o), 0)

  regionRequests.value.unshift({
    id: `rr-batch-${Date.now()}`,
    storeName: selectedStore.value,
    items,
    totalAmount: total,
    submittedAt: new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    status: 'pending_approval',
  })

  pending.forEach(o => {
    o.status = 'submitted'
    o.submittedAt = new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    shippingOrders.value.unshift({ ...o, status: 'shipping' })
  })
  storeOrders.value = storeOrders.value.filter(o => o.status === 'pending' && o.storeName !== selectedStore.value || o.status !== 'pending')

  showToast(`📤 一鍵送出 ${pending.length} 筆補貨單（總額 $${total.toLocaleString()}）至區域總部`)
}

// ─── 自動通知邏輯提示 ───
function getAutoNotifyStatus(order: StoreOrder): string {
  const days = getDaysLeft(order.arrivedAt)
  if (days === 7) return '✅ 到貨已自動通知客戶取貨'
  if (days <= 3) return `⚠️ 剩 ${days} 天！系統已自動發送催取通知`
  return `✅ 到貨已自動通知（剩 ${days} 天取貨）`
}

// ─── Computed：區域 Tab 計數 ───
const regionPendingCount = computed(() => regionRequests.value.filter(r => r.status === 'pending_approval').length)
const regionDeliveringCount = computed(() => regionRequests.value.filter(r => r.status === 'delivering').length)
const regionDeliveredCount = computed(() => regionRequests.value.filter(r => r.status === 'delivered').length)

// ─── Tab 狀態 ───
const storeTab = ref(0)
const regionTab = ref(0)

// ─── 個資遮蔽（區域模式不顯示） ───
function maskName(name: string): string {
  if (currentRole.value === 'store') return name
  return name[0] + '○'.repeat(name.length - 1)
}
function maskPhone(phone: string): string {
  if (currentRole.value === 'store') return phone
  return '****-***-***'
}

// ─── 門市 Actions ───
function forceGroup(order: StoreOrder) {
  if (order.groupBuy) {
    order.groupBuy.isForceGrouped = true
    order.groupBuy.currentMembers = order.groupBuy.targetMembers
    showToast(`⚡ 已手動成團：${order.productName}`)
  }
}

function submitToRegion(order: StoreOrder) {
  order.status = 'submitted'
  order.submittedAt = new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  // 同步推送到區域端
  regionRequests.value.unshift({
    id: `rr-new-${Date.now()}`,
    storeName: order.storeName,
    items: [{ productName: order.productName, spec: order.spec, quantity: order.totalQuantity }],
    totalAmount: getOrderTotalAmount(order),
    submittedAt: order.submittedAt,
    status: 'pending_approval',
  })
  // 移入配送中列表
  shippingOrders.value.unshift({ ...order, status: 'shipping' })
  storeOrders.value = storeOrders.value.filter(o => o.id !== order.id)
  showToast(`📤 已彙整送出補貨單至區域總部：${order.productName} x ${order.totalQuantity}`)
}

function notifyCustomer(order: StoreOrder, customer: CustomerOrder) {
  showToast(`📱 已通知 ${customer.contactName} 前來取貨：${customer.productName}`)
}

function confirmPickup(order: StoreOrder, customer: CustomerOrder) {
  order.customers = order.customers.filter(c => c.id !== customer.id)
  if (order.customers.length === 0) {
    arrivedOrders.value = arrivedOrders.value.filter(o => o.id !== order.id)
  }
  showToast(`✅ 核銷完成：${customer.contactName} — ${customer.productName}`)
}

// ─── 區域 Actions ───
function approveRequest(request: RegionRequest) {
  request.status = 'delivering'
  request.approvedAt = new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  // 同步門市狀態
  const matchShip = shippingOrders.value.find(o => o.storeName === request.storeName && request.items.some(i => i.productName === o.productName))
  if (matchShip) matchShip.shippingAt = request.approvedAt
  showToast(`🚚 已批准調撥並通知物流：${request.storeName}`)
}

function markDelivered(request: RegionRequest) {
  request.status = 'delivered'
  request.deliveredAt = new Date().toLocaleString('zh-TW', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  // 門市端移入已到店
  const matchShip = shippingOrders.value.find(o => o.storeName === request.storeName && request.items.some(i => i.productName === o.productName))
  if (matchShip) {
    matchShip.status = 'arrived'
    matchShip.arrivedAt = request.deliveredAt
    arrivedOrders.value.unshift(matchShip)
    shippingOrders.value = shippingOrders.value.filter(o => o.id !== matchShip.id)
  }
  showToast(`✅ 已送達門市：${request.storeName}`)
}

// ─── Demo 重設 ───
function resetDemo() {
  location.reload()
}
</script>

<template>
  <div class="w-full max-w-[430px] mx-auto min-h-screen bg-[#fafaf9] relative flex flex-col pb-20 shadow-xl border-x border-[#e2e8f0]">

    <!-- ═══ Header ═══ -->
    <header class="bk__header">
      <span class="bk__header-title">🛒 i預購 / i划算 賣家端</span>
      <NuxtLink class="bk__header-link" to="/booking">📱 用戶端</NuxtLink>
    </header>

    <!-- ═══ RBAC 角色 Dropdown ═══ -->
    <div class="bk__rbac">
      <select v-model="currentRole" class="bk__rbac-select" aria-label="角色切換">
        <option v-for="role in roleOptions" :key="role.key" :value="role.key">
          {{ role.label }}
        </option>
      </select>
      <p class="bk__rbac-desc">{{ roleOptions.find(r => r.key === currentRole)?.desc }}</p>
    </div>

    <main class="bk__content" role="main">

      <!-- ════════════════════════════════════════════ -->
      <!-- ═══ 門市視角 ═══ -->
      <!-- ════════════════════════════════════════════ -->
      <template v-if="currentRole === 'store'">

        <!-- 門市選擇 Dropdown -->
        <div class="bk__store-select">
          <label class="bk__store-select-label" for="store-picker">📍 操作門市</label>
          <select id="store-picker" v-model="selectedStore" class="bk__store-select-input" aria-label="選擇操作門市">
            <option v-for="store in allStores" :key="store" :value="store">{{ store }}</option>
          </select>
        </div>

        <!-- 門市 Tab -->
        <nav class="bk__tabs" role="tablist" aria-label="門市管理">
          <button class="bk__tab" :class="{ 'bk__tab--active': storeTab === 0 }" @click="storeTab = 0">
            📋 待彙整叫貨 ({{ pendingCount }})
          </button>
          <button class="bk__tab" :class="{ 'bk__tab--active': storeTab === 1 }" @click="storeTab = 1">
            🚚 總部配送中 ({{ shippingCount }})
          </button>
          <button class="bk__tab" :class="{ 'bk__tab--active': storeTab === 2 }" @click="storeTab = 2">
            🏪 已到店可取貨 ({{ arrivedCount }})
          </button>
        </nav>

        <!-- ═══ 門市 Tab 1：待彙整叫貨 ═══ -->
        <section v-show="storeTab === 0" aria-label="待彙整叫貨">
          <div v-if="filteredStoreOrders.filter(o => o.status === 'pending').length === 0" class="bk__empty">
            <p>🎉 所有訂單已彙整送出</p>
          </div>
          <!-- 一鍵全部叫貨 -->
          <button
            v-if="filteredStoreOrders.filter(o => o.status === 'pending').length > 1"
            class="bk__btn bk__btn--batch"
            @click="submitAllToRegion"
          >
            📤 一鍵全部叫貨（{{ filteredStoreOrders.filter(o => o.status === 'pending').length }} 筆）
          </button>
          <div v-for="order in filteredStoreOrders.filter(o => o.status === 'pending')" :key="order.id" class="bk__card">

            <!-- 來源 + 商品 -->
            <div class="bk__card-top">
              <span class="bk__source">{{ getSourceIcon(order.source) }} {{ getSourceLabel(order.source) }}</span>
              <span class="bk__badge bk__badge--amber">⏳ 待彙整</span>
            </div>
            <h4 class="bk__card-title">{{ order.productName }}</h4>
            <p v-if="order.spec" class="bk__card-meta">規格：{{ order.spec }} · 需求量：{{ order.totalQuantity }} 件</p>
            <p class="bk__card-total">💰 本批叫貨總金額：<strong>${{ getOrderTotalAmount(order).toLocaleString() }}</strong></p>

            <!-- 團購進度（i划算） -->
            <div v-if="order.groupBuy" class="bk__group-progress">
              <div class="bk__progress-bar">
                <div class="bk__progress-fill" :style="{ width: `${(order.groupBuy.currentMembers / order.groupBuy.targetMembers) * 100}%` }"></div>
              </div>
              <span class="bk__progress-text">
                👥 {{ order.groupBuy.currentMembers }} / {{ order.groupBuy.targetMembers }} 人
                <span v-if="order.groupBuy.isForceGrouped || order.groupBuy.currentMembers >= order.groupBuy.targetMembers" class="bk__grouped-label">✓ 已成團</span>
              </span>
            </div>

            <!-- 消費者明細 -->
            <details class="bk__details">
              <summary class="bk__details-summary">👤 查看消費者明細 ({{ order.groupBuy ? order.groupBuy.members.length : order.customers.length }} 人)</summary>
              <div class="bk__customer-list">
                <div v-for="c in (order.groupBuy ? order.groupBuy.members : order.customers)" :key="c.id" class="bk__customer-row">
                  <span class="bk__customer-name">{{ maskName(c.contactName) }}</span>
                  <span class="bk__customer-phone">{{ maskPhone(c.contactPhone) }}</span>
                  <span class="bk__customer-qty">x{{ c.quantity }}</span>
                  <span class="bk__customer-amount">${{ c.totalAmount }}</span>
                </div>
              </div>
            </details>

            <!-- AI 標註（第一筆有的話顯示） -->
            <p v-if="(order.groupBuy?.members[0]?.aiNote || order.customers[0]?.aiNote)" class="bk__ai-note">
              {{ order.groupBuy?.members[0]?.aiNote || order.customers[0]?.aiNote }}
            </p>

            <!-- 門市操作按鈕 -->
            <div class="bk__actions">
              <button
                v-if="order.groupBuy && !order.groupBuy.isForceGrouped && order.groupBuy.currentMembers < order.groupBuy.targetMembers"
                class="bk__btn bk__btn--outline"
                @click="forceGroup(order)"
              >
                ⚡ 手動提前成團
              </button>
              <button class="bk__btn bk__btn--primary" @click="submitToRegion(order)">
                📤 彙整並送出補貨單至區域總部
              </button>
            </div>
          </div>
        </section>

        <!-- ═══ 門市 Tab 2：總部配送中 ═══ -->
        <section v-show="storeTab === 1" aria-label="總部配送中">
          <div v-if="filteredShipping.length === 0" class="bk__empty">
            <p>🚚 目前沒有配送中的商品</p>
          </div>
          <div v-for="order in filteredShipping" :key="order.id" class="bk__card">
            <div class="bk__card-top">
              <span class="bk__source">{{ getSourceIcon(order.source) }} {{ getSourceLabel(order.source) }}</span>
              <span class="bk__badge bk__badge--blue">🚚 配送中</span>
            </div>
            <h4 class="bk__card-title">{{ order.productName }}</h4>
            <p class="bk__card-meta">規格：{{ order.spec }} · 數量：{{ order.totalQuantity }} 件</p>
            <div class="bk__timeline">
              <span>📤 送出：{{ order.submittedAt }}</span>
              <span v-if="order.shippingAt">🚚 發車：{{ order.shippingAt }}</span>
              <span>📦 {{ getShippingEta(order) }}</span>
            </div>
            <div class="bk__status-msg bk__status-msg--info">
              等待區域總部配送至門市...
            </div>
          </div>
        </section>

        <!-- ═══ 門市 Tab 3：已到店可取貨（依門市分組） ═══ -->
        <section v-show="storeTab === 2" aria-label="已到店可取貨">
          <div v-if="filteredArrived.length === 0" class="bk__empty">
            <p>📦 目前沒有待取貨的商品</p>
          </div>
          <div v-for="order in filteredArrived" :key="order.id" class="bk__card">
            <div class="bk__card-top">
              <span class="bk__source">{{ getSourceIcon(order.source) }} {{ getSourceLabel(order.source) }}</span>
              <span class="bk__badge bk__badge--green">🏪 可取貨</span>
            </div>
            <h4 class="bk__card-title">{{ order.productName }}</h4>
            <p class="bk__card-meta">到貨時間：{{ order.arrivedAt }}</p>

            <!-- 取貨倒數 + 自動通知狀態 -->
            <div class="bk__countdown-row">
              <span class="bk__countdown" :class="getDaysLeftClass(getDaysLeft(order.arrivedAt))">
                ⏱️ 取貨期限剩 {{ getDaysLeft(order.arrivedAt) }} 天
              </span>
            </div>
            <p class="bk__auto-notify">{{ getAutoNotifyStatus(order) }}</p>

            <!-- 逐位客戶通知 + 核銷 -->
            <div v-for="c in order.customers" :key="c.id" class="bk__pickup-row">
              <div class="bk__pickup-info">
                <span class="bk__customer-name">{{ c.contactName }}</span>
                <span class="bk__customer-phone">{{ c.contactPhone }}</span>
                <span class="bk__customer-qty">x{{ c.quantity }} · ${{ c.totalAmount }}</span>
              </div>
              <div class="bk__pickup-actions">
                <button class="bk__btn-sm bk__btn-sm--outline" @click="notifyCustomer(order, c)">📱 通知</button>
                <button class="bk__btn-sm bk__btn-sm--green" @click="confirmPickup(order, c)">✅ 核銷</button>
              </div>
            </div>
          </div>
        </section>

      </template>

      <!-- ════════════════════════════════════════════ -->
      <!-- ═══ 區域總部視角 ═══ -->
      <!-- ════════════════════════════════════════════ -->
      <template v-else>

        <!-- 區域 Tab -->
        <nav class="bk__tabs" role="tablist" aria-label="區域總部管理">
          <button class="bk__tab" :class="{ 'bk__tab--active': regionTab === 0 }" @click="regionTab = 0">
            📋 待批准 ({{ regionPendingCount }})
          </button>
          <button class="bk__tab" :class="{ 'bk__tab--active': regionTab === 1 }" @click="regionTab = 1">
            🚚 配送中 ({{ regionDeliveringCount }})
          </button>
          <button class="bk__tab" :class="{ 'bk__tab--active': regionTab === 2 }" @click="regionTab = 2">
            ✅ 已送達 ({{ regionDeliveredCount }})
          </button>
        </nav>

        <!-- ═══ 區域 Tab 1：待批准叫貨 ═══ -->
        <section v-show="regionTab === 0" aria-label="待批准叫貨需求">
          <div v-if="regionRequests.filter(r => r.status === 'pending_approval').length === 0" class="bk__empty">
            <p>🎉 所有叫貨需求已處理</p>
          </div>
          <div v-for="req in regionRequests.filter(r => r.status === 'pending_approval')" :key="req.id" class="bk__card">
            <div class="bk__card-top">
              <span class="bk__store-label">🏪 {{ req.storeName }}</span>
              <span class="bk__badge bk__badge--amber">⏳ 待批准</span>
            </div>
            <p class="bk__card-meta">送出時間：{{ req.submittedAt }}</p>

            <!-- 叫貨總金額 -->
            <p v-if="req.totalAmount" class="bk__card-total">💰 本批調撥總金額：<strong>${{ req.totalAmount.toLocaleString() }}</strong></p>

            <!-- 叫貨明細 -->
            <div class="bk__region-items">
              <div v-for="(item, idx) in req.items" :key="idx" class="bk__region-item">
                <span class="bk__region-product">{{ item.productName }}</span>
                <span v-if="item.spec" class="bk__region-spec">{{ item.spec }}</span>
                <span class="bk__region-qty">x {{ item.quantity }}</span>
              </div>
            </div>

            <button class="bk__btn bk__btn--primary" @click="approveRequest(req)">
              🚚 批准調撥並通知物流派送
            </button>
          </div>
        </section>

        <!-- ═══ 區域 Tab 2：物流配送中 ═══ -->
        <section v-show="regionTab === 1" aria-label="物流配送中">
          <div v-if="regionRequests.filter(r => r.status === 'delivering').length === 0" class="bk__empty">
            <p>🚚 目前沒有配送中的調撥單</p>
          </div>
          <div v-for="req in regionRequests.filter(r => r.status === 'delivering')" :key="req.id" class="bk__card">
            <div class="bk__card-top">
              <span class="bk__store-label">🏪 {{ req.storeName }}</span>
              <span class="bk__badge bk__badge--blue">🚚 配送中</span>
            </div>
            <div class="bk__region-items">
              <div v-for="(item, idx) in req.items" :key="idx" class="bk__region-item">
                <span class="bk__region-product">{{ item.productName }}</span>
                <span class="bk__region-qty">x {{ item.quantity }}</span>
              </div>
            </div>
            <div class="bk__timeline">
              <span>📤 送出：{{ req.submittedAt }}</span>
              <span>✅ 批准：{{ req.approvedAt }}</span>
            </div>
            <button class="bk__btn bk__btn--green" @click="markDelivered(req)">
              📦 確認已送達門市
            </button>
          </div>
        </section>

        <!-- ═══ 區域 Tab 3：已送達門市 ═══ -->
        <section v-show="regionTab === 2" aria-label="已送達門市">
          <div v-if="regionRequests.filter(r => r.status === 'delivered').length === 0" class="bk__empty">
            <p>📦 尚無已送達的調撥單</p>
          </div>
          <div v-for="req in regionRequests.filter(r => r.status === 'delivered')" :key="req.id" class="bk__card">
            <div class="bk__card-top">
              <span class="bk__store-label">🏪 {{ req.storeName }}</span>
              <span class="bk__badge bk__badge--green">✅ 已送達</span>
            </div>
            <div class="bk__region-items">
              <div v-for="(item, idx) in req.items" :key="idx" class="bk__region-item">
                <span class="bk__region-product">{{ item.productName }}</span>
                <span class="bk__region-qty">x {{ item.quantity }}</span>
              </div>
            </div>
            <div class="bk__timeline">
              <span>📤 {{ req.submittedAt }}</span>
              <span>✅ {{ req.approvedAt }}</span>
              <span>📦 {{ req.deliveredAt }}</span>
            </div>
            <div class="bk__status-msg bk__status-msg--success">已完成配送</div>
          </div>
        </section>

      </template>

    </main>

    <!-- Toast -->
    <Transition name="toast-fade">
      <div v-if="toastMessage" class="bk__toast">{{ toastMessage }}</div>
    </Transition>

    <!-- Demo -->
    <div class="bk__demo-panel">
      <button class="bk__demo-btn" @click="resetDemo">🔄 重設</button>
    </div>

  </div>
</template>

<style scoped>
/* ═══ Header ═══ */
.bk__header {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  height: 50px; padding: 0 16px;
  background: #fff; border-bottom: 1px solid #e2e8f0;
}
.bk__header-title { font-size: 13px; font-weight: 600; color: #1c1917; }
.bk__header-link {
  padding: 4px 10px; font-size: 11px; font-weight: 700;
  color: #10b981; background: #ecfdf5; border: 1px solid rgba(16,185,129,.2);
  border-radius: 9999px; text-decoration: none;
}

/* ═══ RBAC Dropdown ═══ */
.bk__rbac { padding: 12px 16px 0; }
.bk__rbac-select {
  width: 100%; padding: 10px 12px;
  border: 1.5px solid #e2e8f0; border-radius: 12px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  color: #1c1917; background: #fff; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
}
.bk__rbac-select:focus { outline: 2px solid #10b981; outline-offset: 2px; border-color: #10b981; }
.bk__rbac-desc { margin: 6px 0 0; font-size: 11px; color: #78716c; }

/* ═══ Content ═══ */
.bk__content { display: flex; flex-direction: column; gap: 16px; padding: 16px; flex: 1; }

/* ═══ Store Select ═══ */
.bk__store-select { display: flex; align-items: center; gap: 8px; }
.bk__store-select-label { font-size: 13px; font-weight: 600; color: #1c1917; white-space: nowrap; }
.bk__store-select-input {
  flex: 1; padding: 8px 12px;
  border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  color: #1c1917; background: #fff; cursor: pointer;
}
.bk__store-select-input:focus { outline: 2px solid #10b981; outline-offset: 2px; }

/* ═══ Tabs ═══ */
.bk__tabs {
  display: flex; gap: 0; background: #fff;
  border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;
}
.bk__tab {
  flex: 1; padding: 10px 4px; border: none; background: transparent;
  font-size: 11px; font-weight: 600; font-family: inherit;
  color: #78716c; cursor: pointer; text-align: center;
  white-space: nowrap; transition: all .15s ease;
}
.bk__tab:not(:last-child) { border-right: 1px solid #e2e8f0; }
.bk__tab--active { background: #10b981; color: #fff; }
.bk__tab:focus { outline: 2px solid #10b981; outline-offset: -2px; }

/* ═══ Card ═══ */
.bk__card {
  background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
  padding: 16px; display: flex; flex-direction: column; gap: 12px;
  margin-bottom: 12px;
}
.bk__card:last-child { margin-bottom: 0; }

.bk__card-top { display: flex; align-items: center; justify-content: space-between; }
.bk__card-title { margin: 0; font-size: 15px; font-weight: 700; color: #1c1917; }
.bk__card-meta { margin: 0; font-size: 13px; color: #78716c; }
.bk__card-total { margin: 0; font-size: 13px; color: #10b981; background: #ecfdf5; border-radius: 8px; padding: 6px 10px; }
.bk__card-total strong { font-size: 15px; }

/* ═══ Source / Store label ═══ */
.bk__source {
  font-size: 11px; font-weight: 600; color: #7c3aed;
  background: #f3e8ff; padding: 2px 10px; border-radius: 9999px;
}
.bk__store-label {
  font-size: 13px; font-weight: 700; color: #1c1917;
}

/* ═══ Badge ═══ */
.bk__badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.bk__badge--amber { background: #fef3c7; color: #d97706; }
.bk__badge--blue { background: #e0f2fe; color: #0369a1; }
.bk__badge--green { background: #dcfce7; color: #16a34a; }
.bk__badge--gray { background: #f1f5f9; color: #64748b; }

/* ═══ Group Progress ═══ */
.bk__group-progress { display: flex; flex-direction: column; gap: 4px; }
.bk__progress-bar { height: 8px; background: #e0f2fe; border-radius: 9999px; overflow: hidden; }
.bk__progress-fill { height: 100%; background: #10b981; border-radius: 9999px; transition: width .3s ease; }
.bk__progress-text { font-size: 11px; color: #78716c; }
.bk__grouped-label { color: #16a34a; font-weight: 700; margin-left: 6px; }

/* ═══ Details (消費者明細) ═══ */
.bk__details { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.bk__details-summary {
  padding: 10px 12px; font-size: 13px; font-weight: 600;
  color: #1c1917; cursor: pointer; background: #f8fafc;
  list-style: none;
}
.bk__details-summary::-webkit-details-marker { display: none; }
.bk__details[open] .bk__details-summary { border-bottom: 1px solid #e2e8f0; }
.bk__customer-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.bk__customer-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.bk__customer-name { font-weight: 600; color: #1c1917; min-width: 56px; }
.bk__customer-phone { color: #78716c; flex: 1; }
.bk__customer-qty { color: #78716c; }
.bk__customer-amount { font-weight: 700; color: #10b981; }

/* ═══ AI Note ═══ */
.bk__ai-note {
  margin: 0; font-size: 12px; color: #92400e;
  background: #fffbeb; border: 1px solid #fde68a;
  border-radius: 10px; padding: 8px 12px; line-height: 1.5;
}

/* ═══ Countdown & Auto Notify ═══ */
.bk__countdown-row { display: flex; align-items: center; }
.bk__countdown { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px; }
.bk__countdown--ok { background: #dcfce7; color: #16a34a; }
.bk__countdown--warn { background: #fef3c7; color: #d97706; }
.bk__countdown--danger { background: #ffe4e6; color: #e11d48; animation: pulse-danger 1s infinite; }
@keyframes pulse-danger { 0%,100% { opacity: 1; } 50% { opacity: .7; } }
.bk__auto-notify { margin: 0; font-size: 11px; color: #78716c; font-style: italic; }

/* ═══ Pickup Row (已到店核銷) ═══ */
.bk__pickup-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid #f1f5f9;
}
.bk__pickup-row:last-child { border-bottom: none; }
.bk__pickup-info { display: flex; flex-direction: column; gap: 2px; }
.bk__pickup-info .bk__customer-name { font-size: 13px; }
.bk__pickup-info .bk__customer-phone { font-size: 11px; }
.bk__pickup-info .bk__customer-qty { font-size: 11px; color: #10b981; font-weight: 600; }
.bk__pickup-actions { display: flex; gap: 6px; }

/* ═══ Region Items (區域叫貨明細) ═══ */
.bk__region-items { display: flex; flex-direction: column; gap: 6px; background: #f8fafc; border-radius: 10px; padding: 10px 12px; }
.bk__region-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.bk__region-product { font-weight: 600; color: #1c1917; flex: 1; }
.bk__region-spec { font-size: 11px; color: #78716c; }
.bk__region-qty { font-weight: 700; color: #10b981; white-space: nowrap; }

/* ═══ Timeline ═══ */
.bk__timeline { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #78716c; }

/* ═══ Buttons ═══ */
.bk__btn {
  display: flex; align-items: center; justify-content: center;
  width: 100%; padding: 12px 16px; border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: opacity .15s ease, transform .1s ease;
}
.bk__btn:hover { opacity: .85; }
.bk__btn:active { transform: scale(.97); }
.bk__btn:focus { outline: 2px solid #10b981; outline-offset: 2px; }
.bk__btn--primary { background: #10b981; color: #fff; }
.bk__btn--green { background: #16a34a; color: #fff; }
.bk__btn--outline { background: transparent; border: 1.5px solid #10b981; color: #10b981; margin-bottom: 8px; }
.bk__btn--batch { background: linear-gradient(135deg, #10b981, #0d9488); color: #fff; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(16,185,129,.3); }

.bk__btn-sm {
  padding: 6px 10px; border-radius: 8px; font-size: 11px;
  font-weight: 600; font-family: inherit; cursor: pointer;
  border: none; transition: opacity .15s ease;
}
.bk__btn-sm:hover { opacity: .85; }
.bk__btn-sm--outline { background: transparent; border: 1px solid #2563eb; color: #2563eb; }
.bk__btn-sm--green { background: #16a34a; color: #fff; }

.bk__actions { display: flex; flex-direction: column; gap: 0; }

/* ═══ Status Messages ═══ */
.bk__status-msg { font-size: 12px; font-weight: 600; padding: 8px 12px; border-radius: 10px; text-align: center; }
.bk__status-msg--success { background: #dcfce7; color: #16a34a; }
.bk__status-msg--info { background: #e0f2fe; color: #0369a1; }

/* ═══ Empty State ═══ */
.bk__empty { text-align: center; padding: 32px 16px; color: #78716c; font-size: 14px; }

/* ═══ Toast ═══ */
.bk__toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 200; padding: 12px 20px; background: #1e293b; color: #fff;
  font-size: 13px; font-weight: 600; border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,.15); white-space: nowrap;
}

/* ═══ Demo ═══ */
.bk__demo-panel { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
.bk__demo-btn {
  padding: 8px 14px; border: none; border-radius: 20px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15);
  background: #78716c; color: #fff;
}
.bk__demo-btn:active { transform: scale(.95); }

/* ═══ Toast Animation ═══ */
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
.toast-fade-enter-to, .toast-fade-leave-from { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
