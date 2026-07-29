/**
 * Property Test: 用戶名稱顯示截斷規則
 * Feature: auth-and-ui-overhaul, Property 7: 用戶名稱顯示截斷規則
 *
 * Validates: Requirements 12.5
 *
 * 對任意長度字串，若超過 20 字元則截斷為前 20 字元 + "…"，否則完整顯示
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { truncateName } from '../truncateName'

describe('Feature: auth-and-ui-overhaul, Property 7: 用戶名稱顯示截斷規則', () => {
  it('超過 20 字元的字串應截斷為前 20 字元 + "…"（長度 = 21）', () => {
    // For strings longer than 20 chars: result should be first 20 chars + "…"
    const longStringArbitrary = fc.string({ minLength: 21, maxLength: 200 })

    fc.assert(
      fc.property(longStringArbitrary, (name) => {
        const result = truncateName(name)
        expect(result).toBe(name.slice(0, 20) + '…')
        expect(result.length).toBe(21)
      }),
      { numRuns: 100 }
    )
  })

  it('長度 1~20 的字串應完整回傳', () => {
    // For strings of length 1-20: result should equal the input
    const shortStringArbitrary = fc.string({ minLength: 1, maxLength: 20 })

    fc.assert(
      fc.property(shortStringArbitrary, (name) => {
        const result = truncateName(name)
        expect(result).toBe(name)
      }),
      { numRuns: 100 }
    )
  })

  it('null 或 undefined 應回傳 "訪客"', () => {
    // For null/undefined: result should be "訪客"
    const nullishArbitrary = fc.constantFrom(null, undefined)

    fc.assert(
      fc.property(nullishArbitrary, (name) => {
        const result = truncateName(name)
        expect(result).toBe('訪客')
      }),
      { numRuns: 100 }
    )
  })
})
