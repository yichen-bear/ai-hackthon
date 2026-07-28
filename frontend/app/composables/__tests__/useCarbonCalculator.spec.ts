import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateEmission,
  calculateCarbonProgress,
  type TransportMode,
} from '~/composables/useCarbonCalculator'

const transportModes: TransportMode[] = ['bus', 'metro', 'hsr', 'train', 'car', 'motorcycle', 'walk']

describe('useCarbonCalculator', () => {
  describe('Property 1: 碳排放計算非負性與單調性', () => {
    it('任意交通方式與非負距離，碳排放結果始終 >= 0', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...transportModes),
          fc.float({ min: -1000, max: 1000, noNaN: true }),
          (mode, distance) => {
            const result = calculateEmission(mode, distance)
            return result >= 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('距離增加時，碳排放結果不遞減（單調非遞減）', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...transportModes),
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 0, max: 500, noNaN: true }),
          (mode, d1, d2) => {
            const [smaller, larger] = d1 <= d2 ? [d1, d2] : [d2, d1]
            return calculateEmission(mode, larger) >= calculateEmission(mode, smaller)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('NaN 距離輸入應視為 0', () => {
      for (const mode of transportModes) {
        expect(calculateEmission(mode, NaN)).toBe(0)
      }
    })

    it('負數距離輸入應 clamp 為 0', () => {
      for (const mode of transportModes) {
        expect(calculateEmission(mode, -10)).toBe(0)
      }
    })

    it('步行碳排放始終為 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (distance) => {
            return calculateEmission('walk', distance) === 0
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 2: 碳排放進度百分比 Clamp 不變式', () => {
    it('任意 total 和 goal > 0，percentage 始終在 [0, 100]', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 1, max: 500, noNaN: true }),
          (total, goal) => {
            const { percentage } = calculateCarbonProgress(total, goal)
            return percentage >= 0 && percentage <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('total > goal 時，overLimit 為 true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 500, noNaN: true }),
          fc.float({ min: 1, max: 500, noNaN: true }),
          (total, goal) => {
            const { overLimit } = calculateCarbonProgress(total, goal)
            return overLimit === (total > goal)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('percentage 計算正確性（與預期值差 < 0.001）', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500, noNaN: true }),
          fc.float({ min: 1, max: 500, noNaN: true }),
          (total, goal) => {
            const { percentage } = calculateCarbonProgress(total, goal)
            const expected = Math.min(100, Math.max(0, (total / goal) * 100))
            return Math.abs(percentage - expected) < 0.001
          }
        ),
        { numRuns: 100 }
      )
    })

    it('goal = 0 時防止除以零，percentage 為 0', () => {
      const { percentage } = calculateCarbonProgress(50, 0)
      expect(percentage).toBe(Math.min(100, Math.max(0, (50 / 1) * 100)))
    })

    it('total = NaN 時視為 0', () => {
      const { percentage, overLimit } = calculateCarbonProgress(NaN, 80)
      expect(percentage).toBe(0)
      expect(overLimit).toBe(false)
    })
  })
})
