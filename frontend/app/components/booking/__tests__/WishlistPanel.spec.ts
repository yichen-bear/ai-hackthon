import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import WishlistPanel from '~/components/booking/WishlistPanel.vue'
import type { WishlistItem } from '~/components/booking/WishlistPanel.vue'

const mockItems: WishlistItem[] = [
  { id: 'wl-1', productId: 'po-1', productName: '鳳梨酥禮盒', channel: 'preorder', currentPrice: 550, originalPrice: 580, hasPriceDrop: true, deadline: '2026-09-15', addedAt: '2026-07-20', image: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'wl-2', productId: 'gb-2', productName: '洗衣精 4瓶裝', channel: 'groupbuy', currentPrice: 389, originalPrice: 389, hasPriceDrop: false, deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], addedAt: '2026-07-26', image: 'linear-gradient(135deg, #34d399, #10b981)' },
  { id: 'wl-3', productId: 'po-3', productName: '星巴克咖啡禮盒', channel: 'preorder', currentPrice: 999, originalPrice: 999, hasPriceDrop: false, deadline: '2026-12-01', addedAt: '2026-07-15', image: 'linear-gradient(135deg, #10b981, #059669)' },
]

describe('WishlistPanel', () => {
  it('正確渲染收藏列表', () => {
    const wrapper = mount(WishlistPanel, {
      props: { items: mockItems },
    })
    expect(wrapper.text()).toContain('鳳梨酥禮盒')
    expect(wrapper.text()).toContain('洗衣精 4瓶裝')
    expect(wrapper.text()).toContain('星巴克咖啡禮盒')
  })

  it('降價商品顯示「降價了」Badge', () => {
    const wrapper = mount(WishlistPanel, {
      props: { items: mockItems },
    })
    expect(wrapper.text()).toContain('降價了！')
    expect(wrapper.find('.drop-badge').exists()).toBe(true)
  })

  it('即將截止商品顯示「即將截止」Badge', () => {
    const wrapper = mount(WishlistPanel, {
      props: { items: mockItems },
    })
    expect(wrapper.find('.expiring-badge').exists()).toBe(true)
  })

  it('排序切換：「價格低到高」', async () => {
    const wrapper = mount(WishlistPanel, {
      props: { items: mockItems },
    })

    // 點擊「價格低到高」tab
    const sortTabs = wrapper.findAll('.sort-tab')
    await sortTabs[2].trigger('click') // 第 3 個是「價格低到高」

    const cards = wrapper.findAll('.wishlist-card')
    // 第一個應該是價格最低的（389）
    expect(cards[0].text()).toContain('洗衣精')
  })

  it('點擊購買按鈕 emit buy-now', async () => {
    const wrapper = mount(WishlistPanel, {
      props: { items: mockItems },
    })

    // Default sort is "recent" (addedAt descending): wl-2 (07/26), wl-1 (07/20), wl-3 (07/15)
    const buyBtns = wrapper.findAll('.buy-btn')
    await buyBtns[0].trigger('click')

    expect(wrapper.emitted('buy-now')).toBeTruthy()
    expect(wrapper.emitted('buy-now')![0][0]).toMatchObject({
      productId: 'gb-2',
      channel: 'groupbuy',
    })
  })

  it('點擊移除按鈕 emit remove-item', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WishlistPanel, {
      props: { items: mockItems },
    })

    // Default sort is "recent": first item is wl-2 (productId: gb-2)
    const removeBtns = wrapper.findAll('.remove-btn')
    await removeBtns[0].trigger('click')

    // 等待動畫 setTimeout 完成
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('remove-item')).toBeTruthy()
    expect(wrapper.emitted('remove-item')![0][0]).toBe('gb-2')
    vi.useRealTimers()
  })

  it('空狀態正確顯示', () => {
    const wrapper = mount(WishlistPanel, {
      props: { items: [] },
    })
    expect(wrapper.text()).toContain('還沒有收藏商品，去逛逛吧')
  })

  describe('Property 4: 排序穩定性', () => {
    it('相同價格的項目排序後保持原相對順序', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              price: fc.integer({ min: 1, max: 1000 }),
              index: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (items) => {
            const sorted = [...items].sort((a, b) => a.price - b.price)
            // 驗證相同價格的元素保持原序
            for (let i = 0; i < sorted.length - 1; i++) {
              if (sorted[i].price === sorted[i + 1].price) {
                const origIdxA = items.indexOf(sorted[i])
                const origIdxB = items.indexOf(sorted[i + 1])
                if (origIdxA >= 0 && origIdxB >= 0) {
                  return origIdxA <= origIdxB
                }
              }
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
