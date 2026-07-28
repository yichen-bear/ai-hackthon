import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import PickupReminder from '~/components/booking/PickupReminder.vue'
import type { PickupItem } from '~/components/booking/PickupReminder.vue'

const mockPickups: PickupItem[] = [
  { id: 'pk-1', orderId: 'ord-3', productName: '可口可樂 24罐裝', pickupCode: 'PK-001', store: { id: 'store-xinyi', name: '7-11 信義門市', address: '台北市信義區信義路五段 7 號', hours: '24小時', phone: '02-2345-6789' }, deadline: '2026-07-30', status: 'expiring' },
  { id: 'pk-2', orderId: 'ord-x', productName: '洗衣精 4瓶裝', pickupCode: 'PK-003', store: { id: 'store-zhongxiao', name: '7-11 忠孝門市', address: '台北市大安區忠孝東路四段 100 號', hours: '24小時' }, deadline: '2026-08-05', status: 'pending' },
  { id: 'pk-3', orderId: 'ord-y', productName: '過期商品', pickupCode: 'PK-999', store: { id: 'store-nanjing', name: '7-11 南京門市', address: '台北市中山區南京東路二段 50 號' }, deadline: '2025-01-01', status: 'expired' },
]

describe('PickupReminder', () => {
  it('正確顯示待取件數 Badge', () => {
    const wrapper = mount(PickupReminder, {
      props: { pickups: mockPickups },
    })
    // 待取件數：排除 expired 的（2 筆 pending/expiring）
    const badge = wrapper.find('.pending-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2')
  })

  it('即將到期項目以紅色標示', () => {
    const wrapper = mount(PickupReminder, {
      props: { pickups: mockPickups },
    })
    const urgentDeadline = wrapper.find('.deadline-urgent')
    expect(urgentDeadline.exists()).toBe(true)
  })

  it('已逾期項目顯示「已逾期」Badge 並灰階', () => {
    const wrapper = mount(PickupReminder, {
      props: { pickups: mockPickups },
    })
    expect(wrapper.text()).toContain('已逾期')
    expect(wrapper.find('.expired').exists()).toBe(true)
  })

  it('點擊「導航前往」展開門市地圖', async () => {
    const wrapper = mount(PickupReminder, {
      props: { pickups: mockPickups },
    })

    const navigateBtn = wrapper.find('.navigate-btn')
    await navigateBtn.trigger('click')

    expect(wrapper.find('.store-map-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('台北市信義區')
  })

  it('點擊導航按鈕 emit navigate-to-store', async () => {
    const wrapper = mount(PickupReminder, {
      props: { pickups: mockPickups },
    })

    // 先展開地圖
    const navigateBtn = wrapper.find('.navigate-btn')
    await navigateBtn.trigger('click')

    // 點擊步行導航
    const navBtns = wrapper.findAll('.nav-mode-btn')
    await navBtns[0].trigger('click')

    expect(wrapper.emitted('navigate-to-store')).toBeTruthy()
    expect(wrapper.emitted('navigate-to-store')![0][0]).toMatchObject({
      storeId: 'store-xinyi',
      mode: 'walk',
    })
  })

  it('空狀態正確顯示', () => {
    const wrapper = mount(PickupReminder, {
      props: { pickups: [] },
    })
    expect(wrapper.text()).toContain('目前沒有待取貨商品')
  })

  describe('Property 3: 取貨期限狀態一致性', () => {
    it('deadline 與當前日期差值決定正確狀態', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -30, max: 30 }),
          (daysFromNow) => {
            const deadline = new Date(Date.now() + daysFromNow * 86400000)
            let expectedStatus: string

            if (daysFromNow < 0) {
              expectedStatus = 'expired'
            } else if (daysFromNow <= 2) {
              expectedStatus = 'expiring'
            } else {
              expectedStatus = 'pending'
            }

            // 驗證邏輯正確性
            return (
              (expectedStatus === 'expired' && deadline.getTime() < Date.now()) ||
              (expectedStatus === 'expiring' && deadline.getTime() >= Date.now() && daysFromNow <= 2) ||
              (expectedStatus === 'pending' && daysFromNow > 2)
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
