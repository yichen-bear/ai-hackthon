/**
 * Property 3: Route Guard 未認證用戶一律導向登入頁
 *
 * 對任意路由路徑（排除 /login），若 isAuthenticated = false，
 * 驗證決策函式回傳 redirect 至 /login?redirect={path}
 *
 * **Validates: Requirements 4.1, 4.7**
 *
 * Feature: auth-and-ui-overhaul, Property 3: Route Guard 未認證用戶一律導向登入頁
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { getRouteDecision } from '../auth.global'

/**
 * 產生合法的 URL path segment：只包含常見 URL path 字元
 */
const pathSegmentArb = fc.string({
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'.split('')
  ),
  minLength: 1,
  maxLength: 20,
})

/**
 * 產生不等於 '/login' 的合法路由路徑
 * - 以 '/' 開頭
 * - 包含 1~5 段 path segments
 * - 最終結果不等於 '/login'
 */
const nonLoginPathArb = fc
  .array(pathSegmentArb, { minLength: 1, maxLength: 5 })
  .map((segments) => '/' + segments.join('/'))
  .filter((path) => path !== '/login')

describe('Property 3: Route Guard 未認證用戶一律導向登入頁', () => {
  it('對任意非 /login 路徑，未認證用戶一律被導向 /login?redirect={path}', () => {
    fc.assert(
      fc.property(nonLoginPathArb, (path) => {
        const result = getRouteDecision(path, false)

        // 必須回傳 redirect 物件
        expect(result).not.toBeNull()
        expect(result).toEqual({ redirect: `/login?redirect=${path}` })
      }),
      { numRuns: 100 }
    )
  })
})
