import { describe, it, expect } from 'vitest'
import { getRouteDecision } from './auth.global'

describe('getRouteDecision', () => {
  describe('未認證用戶', () => {
    it('存取 /login → 允許（不 redirect）', () => {
      const result = getRouteDecision('/login', false)
      expect(result).toBeNull()
    })

    it('存取受保護頁面 / → redirect 至 /login?redirect=/', () => {
      const result = getRouteDecision('/', false)
      expect(result).toEqual({ redirect: '/login?redirect=/' })
    })

    it('存取 /food → redirect 至 /login?redirect=/food', () => {
      const result = getRouteDecision('/food', false)
      expect(result).toEqual({ redirect: '/login?redirect=/food' })
    })

    it('存取 /admin → redirect 至 /login?redirect=/admin', () => {
      const result = getRouteDecision('/admin', false)
      expect(result).toEqual({ redirect: '/login?redirect=/admin' })
    })

    it('存取 /admin/food → redirect 至 /login?redirect=/admin/food', () => {
      const result = getRouteDecision('/admin/food', false)
      expect(result).toEqual({ redirect: '/login?redirect=/admin/food' })
    })
  })

  describe('已認證 member', () => {
    it('存取 /login → redirect 至 /', () => {
      const result = getRouteDecision('/login', true, 'member')
      expect(result).toEqual({ redirect: '/' })
    })

    it('存取 / → 允許', () => {
      const result = getRouteDecision('/', true, 'member')
      expect(result).toBeNull()
    })

    it('存取 /food → 允許', () => {
      const result = getRouteDecision('/food', true, 'member')
      expect(result).toBeNull()
    })

    it('存取 /admin → redirect 至 /', () => {
      const result = getRouteDecision('/admin', true, 'member')
      expect(result).toEqual({ redirect: '/' })
    })

    it('存取 /admin/food → redirect 至 /', () => {
      const result = getRouteDecision('/admin/food', true, 'member')
      expect(result).toEqual({ redirect: '/' })
    })
  })

  describe('已認證 vendor', () => {
    it('存取 /login → redirect 至 /admin', () => {
      const result = getRouteDecision('/login', true, 'vendor')
      expect(result).toEqual({ redirect: '/admin' })
    })

    it('存取 /admin → 允許', () => {
      const result = getRouteDecision('/admin', true, 'vendor')
      expect(result).toBeNull()
    })

    it('存取 /admin/food → 允許', () => {
      const result = getRouteDecision('/admin/food', true, 'vendor')
      expect(result).toBeNull()
    })

    it('存取 / → redirect 至 /admin', () => {
      const result = getRouteDecision('/', true, 'vendor')
      expect(result).toEqual({ redirect: '/admin' })
    })

    it('存取 /food → redirect 至 /admin', () => {
      const result = getRouteDecision('/food', true, 'vendor')
      expect(result).toEqual({ redirect: '/admin' })
    })
  })
})
