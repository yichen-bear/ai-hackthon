import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomActionBar from './BottomActionBar.vue'

/**
 * Feature: ai-chat-form-assistant, Task 17.4
 *
 * **Validates: Requirements 10.2**
 *
 * 點擊「AI 聊天」按鈕應呼叫 navigateTo('/ai-chat') 進行頁面導航，
 * 而不是切換 overlay 顯示狀態。
 */

describe('BottomActionBar.vue', () => {
  beforeEach(() => {
    ;(globalThis as any).navigateTo = vi.fn()
  })

  it('點擊「AI 聊天」按鈕會呼叫 navigateTo(\'/ai-chat\')', async () => {
    const wrapper = mount(BottomActionBar)

    const aiButton = wrapper.get('button[aria-label="AI 聊天"]')
    await aiButton.trigger('click')

    expect((globalThis as any).navigateTo).toHaveBeenCalledTimes(1)
    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/ai-chat')
  })

  it('點擊「會員中心」按鈕會呼叫 navigateTo(\'/member\')', async () => {
    const wrapper = mount(BottomActionBar)

    const memberButton = wrapper.get('button[aria-label="會員中心"]')
    await memberButton.trigger('click')

    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/member')
  })

  it('點擊「行事曆」按鈕會呼叫 navigateTo(\'/calendar\')', async () => {
    const wrapper = mount(BottomActionBar)

    const calendarButton = wrapper.get('button[aria-label="行事曆"]')
    await calendarButton.trigger('click')

    expect((globalThis as any).navigateTo).toHaveBeenCalledWith('/calendar')
  })
})
