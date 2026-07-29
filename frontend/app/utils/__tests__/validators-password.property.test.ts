/**
 * Property Test: 無效密碼長度一律被拒絕
 * Feature: auth-and-ui-overhaul, Property 2: 無效密碼長度一律被拒絕
 *
 * Validates: Requirements 1.5, 3.6
 *
 * 對任意字串若長度 < 8 或 > 72，驗證函式回傳 false
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { validatePassword } from '../validators'

describe('Feature: auth-and-ui-overhaul, Property 2: 無效密碼長度一律被拒絕', () => {
  it('should reject any string shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 7 }),
        (password) => {
          expect(validatePassword(password)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject any string longer than 72 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 73, maxLength: 200 }),
        (password) => {
          expect(validatePassword(password)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject empty string', () => {
    expect(validatePassword('')).toBe(false)
  })

  it('should accept any string of length 8 to 72', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 72 }),
        (password) => {
          expect(validatePassword(password)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
