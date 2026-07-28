import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParkingFinder from '~/components/transport/ParkingFinder.vue'

describe('ParkingFinder', () => {
  it('初始為 no-record 狀態，顯示「記錄停車位置」按鈕', () => {
    const wrapper = mount(ParkingFinder)

    expect(wrapper.find('.start-record-btn').exists()).toBe(true)
    expect(wrapper.find('.parked-record').exists()).toBe(false)
  })

  it('停車場列表顯示使用率 ProgressBar', () => {
    const wrapper = mount(ParkingFinder)

    const progressBars = wrapper.findAll('.progress-bar-fill')
    expect(progressBars.length).toBeGreaterThan(0)

    // 第一筆停車場：(150-12)/150 * 100 = 92%
    const firstBar = progressBars[0]
    expect(firstBar.attributes('aria-valuenow')).toBe('92')
  })

  it('剩餘車位 ≤ 5 時顯示紅色警示與「即將額滿」文字', () => {
    const wrapper = mount(ParkingFinder)

    // 模擬資料中信義威秀(3位)和統一時代(2位)都 ≤ 5
    const nearlyFullTexts = wrapper.findAll('.nearly-full')
    expect(nearlyFullTexts.length).toBeGreaterThan(0)
    expect(nearlyFullTexts[0].text()).toBe('即將額滿')

    // 紅色進度條（over-limit class）
    const overLimitBars = wrapper.findAll('.progress-bar-fill.over-limit')
    expect(overLimitBars.length).toBeGreaterThan(0)
  })

  it('點擊記錄按鈕後顯示記錄表單', async () => {
    const wrapper = mount(ParkingFinder)

    await wrapper.find('.start-record-btn').trigger('click')

    expect(wrapper.find('.record-form').exists()).toBe(true)
    expect(wrapper.find('.start-record-btn').exists()).toBe(false)
  })

  it('填寫表單並確認後切換至 has-record 狀態', async () => {
    const wrapper = mount(ParkingFinder)

    // 開啟記錄表單
    await wrapper.find('.start-record-btn').trigger('click')

    // 填寫停車場名稱
    const inputs = wrapper.findAll('.field-input')
    await inputs[0].setValue('台北101停車場')
    await inputs[1].setValue('B2')

    // 確認記錄
    await wrapper.find('.confirm-record-btn').trigger('click')

    // 應顯示已記錄狀態
    expect(wrapper.find('.parked-record').exists()).toBe(true)
    expect(wrapper.find('.record-form').exists()).toBe(false)
    expect(wrapper.text()).toContain('台北101停車場')
    expect(wrapper.text()).toContain('B2')

    // 應 emit park-recorded
    expect(wrapper.emitted('park-recorded')).toBeTruthy()
    expect(wrapper.emitted('park-recorded')![0][0]).toMatchObject({
      lotName: '台北101停車場',
      floor: 'B2',
    })
  })

  it('結束停車後切回 no-record 狀態', async () => {
    const wrapper = mount(ParkingFinder)

    // 先記錄
    await wrapper.find('.start-record-btn').trigger('click')
    const inputs = wrapper.findAll('.field-input')
    await inputs[0].setValue('信義停車場')
    await wrapper.find('.confirm-record-btn').trigger('click')

    // 點擊結束停車
    await wrapper.find('.clear-btn').trigger('click')

    // 應回到 no-record
    expect(wrapper.find('.parked-record').exists()).toBe(false)
    expect(wrapper.find('.start-record-btn').exists()).toBe(true)
    expect(wrapper.emitted('park-cleared')).toBeTruthy()
  })

  it('停車場已滿時顯示「已滿」狀態 Badge', () => {
    const wrapper = mount(ParkingFinder)

    const fullBadges = wrapper.findAll('.lot-status-full')
    expect(fullBadges.length).toBeGreaterThan(0)
    expect(fullBadges[0].text()).toBe('已滿')
  })
})
