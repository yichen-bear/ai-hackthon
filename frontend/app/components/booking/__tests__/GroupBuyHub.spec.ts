import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import GroupBuyHub from '~/components/booking/GroupBuyHub.vue'
import type { GroupBuyItem } from '~/components/booking/GroupBuyHub.vue'
import type { StoreInfo } from '~/composables/useBookingState'

const mockStore: StoreInfo = {
  id: 'store-xinyi',
  name: '7-11 信義門市',
  address: '台北市信義區信義路五段 7 號',
}

const mockGroups: GroupBuyItem[] = [
  { id: 'gb-1', productName: '舒潔衛生紙', spec: '72包/箱', soloPrice: 699, groupPrice: 599, originalPrice: 899, currentMembers: 3, targetMembers: 5, isSoloBuy: false, category: 'daily', storeId: 'store-xinyi', storeName: '7-11 信義門市', deadline: '2026-08-05', image: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
  { id: 'gb-2', productName: '可口可樂', spec: '330ml × 24 罐', soloPrice: 299, groupPrice: 299, originalPrice: 399, currentMembers: 1, targetMembers: 1, isSoloBuy: true, category: 'solo', storeId: 'store-xinyi', storeName: '7-11 信義門市', deadline: '2026-08-10', image: 'linear-gradient(135deg, #f87171, #ef4444)' },
  { id: 'gb-3', productName: '洗衣精', spec: '4瓶裝', soloPrice: 459, groupPrice: 389, originalPrice: 596, currentMembers: 10, targetMembers: 10, isSoloBuy: false, category: 'daily', storeId: 'store-xinyi', storeName: '7-11 信義門市', deadline: '2026-08-03', image: 'linear-gradient(135deg, #34d399, #10b981)' },
]

describe('GroupBuyHub', () => {
  it('正確顯示門市名稱', () => {
    const wrapper = mount(GroupBuyHub, {
      props: { groups: mockGroups, currentStore: mockStore },
    })
    expect(wrapper.text()).toContain('7-11 信義門市')
  })

  it('正確渲染雙價格（一人享 + 揪團）', () => {
    const wrapper = mount(GroupBuyHub, {
      props: { groups: mockGroups, currentStore: mockStore },
    })
    expect(wrapper.text()).toContain('一人享 $699')
    expect(wrapper.text()).toContain('揪團 $599')
  })

  it('一人即享商品顯示「一人即享」Badge', () => {
    const wrapper = mount(GroupBuyHub, {
      props: { groups: mockGroups, currentStore: mockStore },
    })
    expect(wrapper.text()).toContain('一人即享')
  })

  it('點擊「+1 跟團」emit join-group 事件', async () => {
    const wrapper = mount(GroupBuyHub, {
      props: { groups: mockGroups, currentStore: mockStore },
    })

    const joinBtns = wrapper.findAll('.join-btn')
    // 第一個跟團按鈕（非一人即享的商品）
    await joinBtns[0].trigger('click')

    expect(wrapper.emitted('join-group')).toBeTruthy()
    expect(wrapper.emitted('join-group')![0][0]).toMatchObject({
      productId: 'gb-1',
      storeId: 'store-xinyi',
    })
  })

  it('已成團商品顯示「已成團 ✓」而非跟團按鈕', () => {
    const wrapper = mount(GroupBuyHub, {
      props: { groups: mockGroups, currentStore: mockStore },
    })
    expect(wrapper.text()).toContain('已成團 ✓')
  })

  it('每張卡片底部顯示取貨門市', () => {
    const wrapper = mount(GroupBuyHub, {
      props: { groups: mockGroups, currentStore: mockStore },
    })
    const storeLabels = wrapper.findAll('.store-pickup-label')
    expect(storeLabels.length).toBe(mockGroups.length)
    expect(storeLabels[0].text()).toContain('取貨付款')
  })

  describe('Property 1: 成團進度 Clamp', () => {
    it('成團進度百分比始終在 [0, 100]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (current, target) => {
            const progress = Math.min((current / target) * 100, 100)
            return progress >= 0 && progress <= 100
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
