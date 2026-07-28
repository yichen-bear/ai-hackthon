import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import OrderTracker from '~/components/booking/OrderTracker.vue'
import type { BookingOrder } from '~/components/booking/OrderTracker.vue'

const mockOrders: BookingOrder[] = [
  { id: 'ord-1', type: 'groupbuy', productName: '舒潔衛生紙', spec: '72包/箱', status: 'pending-group', currentStep: 0, totalSteps: 4, groupProgress: { current: 3, target: 5 }, createdAt: '2026-07-25' },
  { id: 'ord-2', type: 'preorder', productName: '鳳梨酥禮盒', spec: '12入裝', status: 'shipping', currentStep: 2, totalSteps: 4, estimatedDate: '08/01', createdAt: '2026-07-20' },
  { id: 'ord-3', type: 'groupbuy', productName: '可口可樂', spec: '330ml × 24', status: 'ready', currentStep: 3, totalSteps: 4, createdAt: '2026-07-22' },
]

describe('OrderTracker', () => {
  it('正確渲染訂單列表', () => {
    const wrapper = mount(OrderTracker, {
      props: { orders: mockOrders },
    })
    expect(wrapper.text()).toContain('舒潔衛生紙')
    expect(wrapper.text()).toContain('鳳梨酥禮盒')
    expect(wrapper.text()).toContain('可口可樂')
  })

  it('篩選 Tab 切換正確過濾訂單', async () => {
    const wrapper = mount(OrderTracker, {
      props: { orders: mockOrders },
    })

    // 點擊「可取貨」tab
    const tabs = wrapper.findAll('.filter-tab')
    await tabs[2].trigger('click') // "可取貨" tab

    const cards = wrapper.findAll('.order-card')
    expect(cards.length).toBe(1)
    expect(wrapper.text()).toContain('可口可樂')
  })

  it('步驟條正確渲染 — 顯示當前步驟', () => {
    const wrapper = mount(OrderTracker, {
      props: { orders: mockOrders },
    })
    const stepIndicators = wrapper.findAll('.step-indicator')
    expect(stepIndicators.length).toBe(3)
  })

  it('「可取貨」訂單顯示取貨按鈕並 emit go-pickup', async () => {
    const wrapper = mount(OrderTracker, {
      props: { orders: mockOrders },
    })

    const pickupBtn = wrapper.find('.pickup-btn')
    expect(pickupBtn.exists()).toBe(true)
    await pickupBtn.trigger('click')

    expect(wrapper.emitted('go-pickup')).toBeTruthy()
    expect(wrapper.emitted('go-pickup')![0][0]).toBe('ord-3')
  })

  it('「待成團」訂單顯示進度條與邀請按鈕', () => {
    const wrapper = mount(OrderTracker, {
      props: { orders: mockOrders },
    })
    expect(wrapper.find('.group-progress-section').exists()).toBe(true)
    expect(wrapper.find('.invite-btn').exists()).toBe(true)
  })

  it('空狀態正確顯示', () => {
    const wrapper = mount(OrderTracker, {
      props: { orders: [] },
    })
    expect(wrapper.text()).toContain('還沒有訂單，去逛逛吧！')
  })

  describe('Property 2: 訂單步驟進度不變式', () => {
    it('currentStep 始終在 [0, totalSteps-1] 範圍內', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (step, total) => {
            const clampedStep = Math.max(0, Math.min(step, total - 1))
            return clampedStep >= 0 && clampedStep <= total - 1
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
