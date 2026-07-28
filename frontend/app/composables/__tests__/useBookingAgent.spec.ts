import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { matchKeywords } from '~/composables/useBookingAgent'

describe('useBookingAgent', () => {
  describe('Property 5: matchKeywords 任意輸入返回有效 BookingRecommendation', () => {
    it('任意字串輸入始終返回有效結果', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          (input) => {
            const result = matchKeywords(input)
            return (
              result !== null &&
              result !== undefined &&
              ['preorder', 'groupbuy'].includes(result.channel) &&
              result.products.length >= 0 &&
              result.products.length <= 3 &&
              result.message.length > 0 &&
              Array.isArray(result.keywords)
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空字串返回預設推薦', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '  ', '\n', '\t'),
          (input) => {
            const result = matchKeywords(input)
            return (
              result.channel !== undefined &&
              result.products.length >= 0 &&
              result.message.length > 0
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('例子測試：關鍵字匹配', () => {
    it('「衛生紙」匹配到 i划算', () => {
      const result = matchKeywords('衛生紙快沒了')
      expect(result.channel).toBe('groupbuy')
      expect(result.keywords).toContain('衛生紙')
      expect(result.products.length).toBeGreaterThan(0)
    })

    it('「中秋禮盒」匹配到 i預購', () => {
      const result = matchKeywords('中秋節要送禮盒')
      expect(result.channel).toBe('preorder')
      expect(result.keywords.some((k) => ['中秋', '禮盒'].includes(k))).toBe(true)
    })

    it('「團購」匹配到 i划算', () => {
      const result = matchKeywords('辦公室想揪團購')
      expect(result.channel).toBe('groupbuy')
      expect(result.keywords.some((k) => ['團購', '揪團', '辦公室'].includes(k))).toBe(true)
    })

    it('「名店甜點」匹配到 i預購', () => {
      const result = matchKeywords('想買名店蛋糕')
      expect(result.channel).toBe('preorder')
      expect(result.keywords.some((k) => ['名店', '蛋糕'].includes(k))).toBe(true)
    })

    it('無匹配關鍵字返回預設推薦', () => {
      const result = matchKeywords('今天天氣很好')
      expect(result.channel).toBeDefined()
      expect(result.message).toBe('為您精選熱門商品，限時優惠別錯過！')
      expect(result.keywords).toEqual([])
    })

    it('空字串返回有效結果', () => {
      const result = matchKeywords('')
      expect(result.channel).toBeDefined()
      expect(result.products.length).toBeGreaterThanOrEqual(0)
      expect(result.message.length).toBeGreaterThan(0)
    })
  })
})
