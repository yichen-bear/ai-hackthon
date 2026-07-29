import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchIntent } from '~/composables/useEntertainmentAgent'

describe('useEntertainmentAgent', () => {
  describe('Property 6: matchIntent 任意輸入返回有效 EntertainmentRecommendation', () => {
    it('任意字串輸入始終返回有效結果', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          (input) => {
            const result = matchIntent(input)
            return (
              result !== null &&
              result !== undefined &&
              ['weekend', 'date', 'family', 'friends'].includes(result.scenario) &&
              result.events.length >= 0 &&
              result.events.length <= 3 &&
              result.message.length > 0
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空白字串返回有效結果', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '  ', '\n', '\t'),
          (input) => {
            const result = matchIntent(input)
            return (
              result.scenario === 'weekend' &&
              result.events.length > 0 &&
              result.message.length > 0
            )
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('例子測試：情境意圖匹配', () => {
    it('「週末想出去玩」匹配到 weekend', () => {
      const result = matchIntent('週末想出去玩')
      expect(result.scenario).toBe('weekend')
      expect(result.message).toContain('週末')
      expect(result.events.length).toBeGreaterThan(0)
    })

    it('「約會」匹配到 date', () => {
      const result = matchIntent('想找約會的地方')
      expect(result.scenario).toBe('date')
      expect(result.message).toContain('浪漫')
    })

    it('「帶小孩」匹配到 family', () => {
      const result = matchIntent('帶小孩去哪裡玩')
      expect(result.scenario).toBe('family')
      expect(result.message).toContain('親子')
    })

    it('「朋友聚會」匹配到 friends', () => {
      const result = matchIntent('朋友聚會推薦')
      expect(result.scenario).toBe('friends')
      expect(result.message).toContain('朋友')
    })

    it('「另一半紀念日」匹配到 date', () => {
      const result = matchIntent('另一半紀念日要幹嘛')
      expect(result.scenario).toBe('date')
    })

    it('「全家出遊」匹配到 family', () => {
      const result = matchIntent('全家出遊推薦')
      expect(result.scenario).toBe('family')
    })

    it('「同事揪團」匹配到 friends', () => {
      const result = matchIntent('同事想揪團看球賽')
      expect(result.scenario).toBe('friends')
    })

    it('無匹配關鍵字返回 weekend 預設推薦', () => {
      const result = matchIntent('今天天氣很好')
      expect(result.scenario).toBe('weekend')
      expect(result.message).toBe('為你推薦近期熱門活動！')
    })

    it('空字串返回有效結果', () => {
      const result = matchIntent('')
      expect(result.scenario).toBe('weekend')
      expect(result.events.length).toBeGreaterThan(0)
      expect(result.triggerText).toBeUndefined()
    })

    it('推薦結果的 events 每筆都有必要欄位', () => {
      const result = matchIntent('週末想看展覽')
      for (const event of result.events) {
        expect(event.id).toBeDefined()
        expect(event.type).toBeDefined()
        expect(event.title.length).toBeGreaterThan(0)
        expect(event.date).toBeDefined()
        expect(event.venue.length).toBeGreaterThan(0)
        expect(event.price.length).toBeGreaterThan(0)
        expect(event.coverImage.length).toBeGreaterThan(0)
      }
    })
  })
})
