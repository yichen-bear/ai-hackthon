/**
 * Property Test: 已認證用戶存取登入頁一律被導走
 *
 * Feature: auth-and-ui-overhaul, Property 5: 已認證用戶存取登入頁一律被導走
 *
 * **Validates: Requirements 4.6**
 *
 * 對任意已認證使用者（role 為 member 或 vendor），
 * 驗證存取 /login 時被導向對應首頁（member → `/`，vendor → `/admin`）
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { getRouteDecision } from '../auth.global'

describe('Feature: auth-and-ui-overhaul, Property 5: 已認證用戶存取登入頁一律被導走', () => {
  it('已認證用戶存取 /login 一律被重新導向至對應首頁', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('member', 'vendor'),
        (role) => {
          const decision = getRouteDecision('/login', true, role)

          // 必定回傳 redirect（不為 null）
          expect(decision).not.toBeNull()

          if (role === 'member') {
            expect(decision).toEqual({ redirect: '/' })
          } else {
            expect(decision).toEqual({ redirect: '/admin' })
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
