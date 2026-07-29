/**
 * Property Test: 無效 email 格式一律被拒絕
 * Feature: auth-and-ui-overhaul, Property 1: 無效 email 格式一律被拒絕
 *
 * Validates: Requirements 1.5, 3.6
 *
 * 對任意字串若不符合基本 email 格式規則，驗證函式回傳 false
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { validateEmail } from '../validators'

describe('Feature: auth-and-ui-overhaul, Property 1: 無效 email 格式一律被拒絕', () => {
  it('空字串一律回傳 false', () => {
    // Empty string should always be rejected
    fc.assert(
      fc.property(fc.constant(''), (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('不含 @ 的字串一律回傳 false', () => {
    // Strings without '@' should always be rejected
    const noAtArbitrary = fc.string({ minLength: 1 }).filter((s) => !s.includes('@'))
    fc.assert(
      fc.property(noAtArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('以 @ 開頭（無 local part）的字串一律回傳 false', () => {
    // Strings starting with '@' (no local part) should be rejected
    const noLocalPartArbitrary = fc
      .string({ minLength: 1 })
      .map((s) => '@' + s.replace(/@/g, ''))
    fc.assert(
      fc.property(noLocalPartArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('含 @ 但無 domain 部分的字串一律回傳 false', () => {
    // Strings with '@' at the end (no domain) should be rejected
    const noDomainArbitrary = fc
      .string({ minLength: 1 })
      .filter((s) => !s.includes('@'))
      .map((local) => local + '@')
    fc.assert(
      fc.property(noDomainArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('domain 不含 "." 的字串一律回傳 false', () => {
    // Strings with '@' and domain but domain has no '.'
    const noDotDomainArbitrary = fc
      .tuple(
        fc.string({ minLength: 1 }).filter((s) => !s.includes('@')),
        fc.string({ minLength: 1 }).filter((s) => !s.includes('.') && !s.includes('@'))
      )
      .map(([local, domain]) => `${local}@${domain}`)
    fc.assert(
      fc.property(noDotDomainArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('domain 以 "." 開頭或結尾的字串一律回傳 false', () => {
    // Domain starts or ends with '.'
    const dotStartArbitrary = fc
      .tuple(
        fc.string({ minLength: 1 }).filter((s) => !s.includes('@')),
        fc.string({ minLength: 1 }).filter((s) => !s.includes('@'))
      )
      .map(([local, domainBody]) => `${local}@.${domainBody}`)

    const dotEndArbitrary = fc
      .tuple(
        fc.string({ minLength: 1 }).filter((s) => !s.includes('@')),
        fc.string({ minLength: 1 }).filter((s) => !s.includes('@'))
      )
      .map(([local, domainBody]) => `${local}@${domainBody}.`)

    fc.assert(
      fc.property(dotStartArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )

    fc.assert(
      fc.property(dotEndArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('長度超過 254 字元的字串一律回傳 false', () => {
    // Strings longer than 254 characters should be rejected
    const longEmailArbitrary = fc
      .string({ minLength: 255, maxLength: 500 })
    fc.assert(
      fc.property(longEmailArbitrary, (email) => {
        expect(validateEmail(email)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})
