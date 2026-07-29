/**
 * Property 4: Route Guard 角色隔離
 *
 * Feature: auth-and-ui-overhaul, Property 4: Route Guard 角色隔離
 *
 * **Validates: Requirements 4.3, 4.4, 5.4**
 *
 * Property 4a: 對任意 path 以 '/admin' 開頭，已認證 member 一律 redirect 至 '/'
 * Property 4b: 對任意非 /admin 且非 /login 的 path，已認證 vendor 一律 redirect 至 '/admin'
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { getRouteDecision } from '../auth.global'

/**
 * 產生 admin 路徑 arbitrary：
 * - 以 '/admin' 開頭
 * - 可能只是 '/admin' 或 '/admin/...'
 */
const pathSegmentArb = fc.string({
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
  ),
  minLength: 1,
  maxLength: 20,
})

const adminPathArb = fc
  .array(pathSegmentArb, { minLength: 0, maxLength: 4 })
  .map((segments) =>
    segments.length === 0 ? '/admin' : '/admin/' + segments.join('/')
  )

/**
 * 產生非 /admin 且非 /login 的路徑 arbitrary：
 * - 以 '/' 開頭
 * - 不以 '/admin' 開頭
 * - 不等於 '/login'
 */
const nonAdminNonLoginPathArb = fc
  .array(pathSegmentArb, { minLength: 0, maxLength: 4 })
  .map((segments) =>
    segments.length === 0 ? '/' : '/' + segments.join('/')
  )
  .filter((path) => !path.startsWith('/admin') && path !== '/login')

describe('Feature: auth-and-ui-overhaul, Property 4: Route Guard 角色隔離', () => {
  it('Property 4a: 已認證 member 存取任意 /admin 路徑一律 redirect 至 /', () => {
    fc.assert(
      fc.property(adminPathArb, (path) => {
        const decision = getRouteDecision(path, true, 'member')

        expect(decision).not.toBeNull()
        expect(decision).toEqual({ redirect: '/' })
      }),
      { numRuns: 100 }
    )
  })

  it('Property 4b: 已認證 vendor 存取任意非 /admin 非 /login 路徑一律 redirect 至 /admin', () => {
    fc.assert(
      fc.property(nonAdminNonLoginPathArb, (path) => {
        const decision = getRouteDecision(path, true, 'vendor')

        expect(decision).not.toBeNull()
        expect(decision).toEqual({ redirect: '/admin' })
      }),
      { numRuns: 100 }
    )
  })
})
