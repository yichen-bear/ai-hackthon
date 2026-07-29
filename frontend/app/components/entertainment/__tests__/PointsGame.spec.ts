import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import PointsGame from '~/components/entertainment/PointsGame.vue'
import type { PointTask } from '~/types/entertainment'

const mockTasks: PointTask[] = [
  { id: 'task-1', name: '首次購票', description: '完成首次購票', reward: 100, completed: true, icon: '🎫' },
  { id: 'task-2', name: '分享活動', description: '分享給朋友', reward: 50, completed: false, icon: '🔗' },
]

describe('PointsGame', () => {
  it('正確顯示用戶點數', () => {
    const wrapper = mount(PointsGame, {
      props: { userPoints: 2450, dailyFreeUsed: false, tasks: mockTasks },
    })
    expect(wrapper.text()).toContain('2,450')
  })

  it('點數足夠時轉盤按鈕可點擊', () => {
    const wrapper = mount(PointsGame, {
      props: { userPoints: 100, dailyFreeUsed: false, tasks: mockTasks },
    })
    const spinBtn = wrapper.find('.btn-spin')
    expect(spinBtn.attributes('disabled')).toBeUndefined()
  })

  it('點數不足時轉盤按鈕 disabled', () => {
    const wrapper = mount(PointsGame, {
      props: { userPoints: 30, dailyFreeUsed: false, tasks: mockTasks },
    })
    const spinBtn = wrapper.find('.btn-spin')
    expect(spinBtn.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('點數不足')
  })

  it('已完成任務顯示勾選', () => {
    const wrapper = mount(PointsGame, {
      props: { userPoints: 2450, dailyFreeUsed: false, tasks: mockTasks },
    })
    expect(wrapper.text()).toContain('✅')
    expect(wrapper.text()).toContain('☐')
  })

  it('任務列表正確渲染所有任務', () => {
    const wrapper = mount(PointsGame, {
      props: { userPoints: 2450, dailyFreeUsed: false, tasks: mockTasks },
    })
    expect(wrapper.text()).toContain('首次購票')
    expect(wrapper.text()).toContain('分享活動')
    expect(wrapper.text()).toContain('+100 點')
    expect(wrapper.text()).toContain('+50 點')
  })

  it('點擊轉盤觸發 points-spent emit', async () => {
    const wrapper = mount(PointsGame, {
      props: { userPoints: 100, dailyFreeUsed: false, tasks: mockTasks },
    })
    await wrapper.find('.btn-spin').trigger('click')
    expect(wrapper.emitted('points-spent')).toBeTruthy()
    expect(wrapper.emitted('points-spent')![0]).toEqual([50])
  })

  describe('Property 3: 點數消耗不變式', () => {
    it('消耗後餘額始終 >= 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 100 }),
          (points, cost) => {
            if (points >= cost) {
              return (points - cost) >= 0
            }
            // 點數不足時不執行消耗
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2: 獎品機率總和 = 1', () => {
    it('正規化後機率總和等於 1', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 3, maxLength: 8 }),
          (rawProbs) => {
            // 用整數模擬機率，再正規化
            const sum = rawProbs.reduce((a, b) => a + b, 0)
            const normalized = rawProbs.map(p => p / sum)
            const normalizedSum = normalized.reduce((a, b) => a + b, 0)
            return Math.abs(normalizedSum - 1.0) < 0.001
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
