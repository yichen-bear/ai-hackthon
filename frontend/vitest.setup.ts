/**
 * Vitest setup file
 * Provides Vue auto-imports (ref, computed, watch, etc.) and Nuxt composable stubs
 * that are normally auto-imported by Nuxt but not available in vitest.
 */

import { vi } from 'vitest'
import * as vue from 'vue'

// Make Vue composition API available globally (simulating Nuxt auto-imports)
Object.assign(globalThis, {
  ref: vue.ref,
  computed: vue.computed,
  watch: vue.watch,
  reactive: vue.reactive,
  readonly: vue.readonly,
  toRef: vue.toRef,
  toRefs: vue.toRefs,
  unref: vue.unref,
  isRef: vue.isRef,
  shallowRef: vue.shallowRef,
  onMounted: vue.onMounted,
  onUnmounted: vue.onUnmounted,
  onBeforeUnmount: vue.onBeforeUnmount,
  nextTick: vue.nextTick,
  defineProps: vue.defineProps,
  defineEmits: vue.defineEmits,
  withDefaults: vue.withDefaults,
})

// Stub Nuxt navigation
;(globalThis as any).navigateTo = vi.fn()

// Stub Nuxt route middleware helper
;(globalThis as any).defineNuxtRouteMiddleware = (handler: any) => handler

// Stub Nuxt composables
const mockState: Record<string, vue.Ref> = {}

;(globalThis as any).useState = <T>(key: string, init?: () => T): vue.Ref<T> => {
  if (!mockState[key]) {
    mockState[key] = vue.ref(init ? init() : undefined) as vue.Ref
  }
  return mockState[key] as vue.Ref<T>
}

// Stub useAuth for middleware/composable tests
;(globalThis as any).useAuth = () => ({
  state: vue.ref({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  }),
  login: vi.fn(),
  logout: vi.fn(),
  fetchUser: vi.fn(),
})

// Stub useTransportState for component tests
;(globalThis as any).useTransportState = () => ({
  sharedOrigin: vue.ref(''),
  sharedDestination: vue.ref(''),
  dismissedSuggestions: vue.ref(new Set<string>()),
  setRouteDestination: vi.fn(),
  setRideDestination: vi.fn(),
  dismissSuggestion: vi.fn(),
  scrollToSection: vi.fn(),
})

// Stub useBookingState for booking module component tests
;(globalThis as any).useBookingState = () => ({
  agentRecommendation: vue.ref(null),
  currentStore: vue.ref({ id: 'store-xinyi', name: '7-11 信義門市', address: '台北市信義區信義路五段 7 號' }),
  scrollToSection: vi.fn(),
  dismissRecommendation: vi.fn(),
  setAgentRecommendation: vi.fn(),
  switchStore: vi.fn(),
})
