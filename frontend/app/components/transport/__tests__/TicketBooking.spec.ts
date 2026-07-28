import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketBooking from '~/components/transport/TicketBooking.vue'

describe('TicketBooking', () => {
  it('初始狀態為 form 步驟，顯示查詢班次按鈕', () => {
    const wrapper = mount(TicketBooking)

    expect(wrapper.find('.step-form').exists()).toBe(true)
    expect(wrapper.find('.step-select').exists()).toBe(false)
    expect(wrapper.find('.step-confirm').exists()).toBe(false)
    expect(wrapper.find('.primary-btn').text()).toContain('查詢班次')
  })

  it('出發站與到達站相同時顯示驗證錯誤', async () => {
    const wrapper = mount(TicketBooking)

    // 先選到達站，再將出發站改為相同值
    // （因為 availableDestinations 會過濾 originId，所以先選 dest 再改 origin）
    const selects = wrapper.findAll('.field-select')
    await selects[1].setValue('taipei')  // 先選到達站
    await selects[0].setValue('taipei')  // 再選相同出發站

    // 選擇日期
    const dateInput = wrapper.find('input[type="date"]')
    await dateInput.setValue('2026-08-01')

    // 點擊查詢
    await wrapper.find('.primary-btn').trigger('click')

    expect(wrapper.find('.form-error').exists()).toBe(true)
    expect(wrapper.find('.form-error').text()).toContain('不可相同')
  })

  it('必填欄位未填時顯示驗證錯誤', async () => {
    const wrapper = mount(TicketBooking)

    // 不填任何欄位直接點擊查詢
    await wrapper.find('.primary-btn').trigger('click')

    expect(wrapper.find('.form-error').exists()).toBe(true)
    expect(wrapper.find('.form-error').text()).toContain('請選擇出發站與到達站')
  })

  it('表單驗證通過後切換至 select-train 步驟', async () => {
    const wrapper = mount(TicketBooking)

    // 填寫表單
    const selects = wrapper.findAll('.field-select')
    await selects[0].setValue('taipei')
    await selects[1].setValue('zuoying')

    const dateInput = wrapper.find('input[type="date"]')
    await dateInput.setValue('2026-08-01')

    // 點擊查詢
    await wrapper.find('.primary-btn').trigger('click')

    // 應切換至 select-train 步驟
    expect(wrapper.find('.step-select').exists()).toBe(true)
    expect(wrapper.find('.step-form').exists()).toBe(false)
    expect(wrapper.findAll('.schedule-card').length).toBeGreaterThan(0)
  })

  it('已滿班次禁用，無法選取', async () => {
    const wrapper = mount(TicketBooking)

    // 填寫表單並進入 step 2
    const selects = wrapper.findAll('.field-select')
    await selects[0].setValue('taipei')
    await selects[1].setValue('zuoying')
    await wrapper.find('input[type="date"]').setValue('2026-08-01')
    await wrapper.find('.primary-btn').trigger('click')

    // 找到已滿的班次卡片（第5筆是 full）
    const disabledCards = wrapper.findAll('.schedule-card.disabled')
    expect(disabledCards.length).toBeGreaterThan(0)

    // 確認已滿班次有 disabled 屬性
    const disabledBtn = disabledCards[0]
    expect(disabledBtn.attributes('disabled')).toBeDefined()
  })

  it('張數控制 clamp 在 1~10 範圍內', async () => {
    const wrapper = mount(TicketBooking)

    const qtyBtns = wrapper.findAll('.qty-btn')
    const minusBtn = qtyBtns[0]
    const plusBtn = qtyBtns[1]

    // 初始值為 1，減少按鈕應禁用
    expect(minusBtn.attributes('disabled')).toBeDefined()

    // 連續增加到 10
    for (let i = 0; i < 12; i++) {
      await plusBtn.trigger('click')
    }

    // 值應限制在 10
    expect(wrapper.find('.qty-value').text()).toBe('10')
    expect(plusBtn.attributes('disabled')).toBeDefined()
  })

  it('高鐵/台鐵切換時重置表單', async () => {
    const wrapper = mount(TicketBooking)

    // 選擇出發站
    const selects = wrapper.findAll('.field-select')
    await selects[0].setValue('taipei')

    // 切換到台鐵
    const typeBtns = wrapper.findAll('.type-btn')
    await typeBtns[1].trigger('click')

    // 出發站應被重置
    const updatedSelects = wrapper.findAll('.field-select')
    expect((updatedSelects[0].element as HTMLSelectElement).value).toBe('')
  })
})
