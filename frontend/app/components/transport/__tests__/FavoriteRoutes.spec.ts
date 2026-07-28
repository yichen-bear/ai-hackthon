import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FavoriteRoutes from '~/components/transport/FavoriteRoutes.vue'
import type { FavoriteRoute } from '~/components/transport/FavoriteRoutes.vue'

const mockRoutes: FavoriteRoute[] = [
  { id: 'fav-1', name: '上班通勤', origin: '家', destination: '公司', preferredMode: 'metro', lastUsed: new Date().toISOString() },
  { id: 'fav-2', name: '回家', origin: '公司', destination: '家', preferredMode: 'metro', lastUsed: new Date(Date.now() - 86400000).toISOString() },
  { id: 'fav-3', name: '常去餐廳', origin: '公司', destination: '鼎泰豐', preferredMode: 'walk', lastUsed: new Date(Date.now() - 172800000).toISOString() },
]

describe('FavoriteRoutes', () => {
  it('正確渲染路線卡片列表', () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    const cards = wrapper.findAll('.route-card:not(.add-card)')
    expect(cards.length).toBe(3)
    expect(wrapper.text()).toContain('上班通勤')
    expect(wrapper.text()).toContain('回家')
    expect(wrapper.text()).toContain('常去餐廳')
  })

  it('顯示路線數量計數（x/10）', () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    expect(wrapper.find('.routes-count').text()).toBe('3/10')
  })

  it('點擊路線卡片 emit select-route 事件', async () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    const firstCard = wrapper.findAll('.route-card-main')[0]
    await firstCard.trigger('click')

    expect(wrapper.emitted('select-route')).toBeTruthy()
    expect(wrapper.emitted('select-route')![0][0]).toMatchObject({
      id: 'fav-1',
      name: '上班通勤',
      origin: '家',
      destination: '公司',
    })
  })

  it('點擊叫車按鈕 emit call-ride 事件', async () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    // 第一張卡片的叫車按鈕（操作列第一個按鈕）
    const actionBtns = wrapper.findAll('.route-action-btn')
    // 每張卡片3個按鈕，第一張的第一個是叫車
    await actionBtns[0].trigger('click')

    expect(wrapper.emitted('call-ride')).toBeTruthy()
    expect(wrapper.emitted('call-ride')![0][0]).toMatchObject({
      id: 'fav-1',
    })
  })

  it('未達上限（< 10 筆）時顯示可點擊的新增按鈕', () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    const addBtn = wrapper.find('.add-card .add-btn')
    expect(addBtn.exists()).toBe(true)
    expect(addBtn.attributes('disabled')).toBeUndefined()
    expect(addBtn.text()).toContain('新增')
  })

  it('已達上限（10 筆）時新增按鈕禁用並顯示「已達上限」', () => {
    const tenRoutes: FavoriteRoute[] = Array.from({ length: 10 }, (_, i) => ({
      id: `fav-${i}`,
      name: `路線 ${i}`,
      origin: '起點',
      destination: '終點',
      preferredMode: 'metro' as const,
      lastUsed: new Date().toISOString(),
    }))

    const wrapper = mount(FavoriteRoutes, {
      props: { routes: tenRoutes },
    })

    const addBtn = wrapper.find('.add-card .add-btn')
    expect(addBtn.attributes('disabled')).toBeDefined()
    expect(addBtn.text()).toContain('已達上限')
    expect(wrapper.find('.routes-count').text()).toBe('10/10')
  })

  it('點擊新增按鈕 emit add 事件', async () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    const addBtn = wrapper.find('.add-card .add-btn')
    await addBtn.trigger('click')

    expect(wrapper.emitted('add')).toBeTruthy()
  })

  it('點擊刪除按鈕 emit delete 事件並帶入 routeId', async () => {
    const wrapper = mount(FavoriteRoutes, {
      props: { routes: mockRoutes },
    })

    // 每張卡片的第三個操作按鈕是刪除
    const actionBtns = wrapper.findAll('.route-action-btn')
    // 第一張卡片的第三個按鈕（index 2）
    await actionBtns[2].trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0][0]).toBe('fav-1')
  })
})
