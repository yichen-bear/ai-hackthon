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
  toRef: vue.toRef,
  toRefs: vue.toRefs,
  unref: vue.unref,
  isRef: vue.isRef,
  shallowRef: vue.shallowRef,
  onMounted: vue.onMounted,
  onUnmounted: vue.onUnmounted,
  nextTick: vue.nextTick,
  defineProps: vue.defineProps,
  defineEmits: vue.defineEmits,
  withDefaults: vue.withDefaults,
})

// Stub Nuxt composables
const mockState: Record<string, vue.Ref> = {}

;(globalThis as any).useState = <T>(key: string, init?: () => T): vue.Ref<T> => {
  if (!mockState[key]) {
    mockState[key] = vue.ref(init ? init() : undefined) as vue.Ref
  }
  return mockState[key] as vue.Ref<T>
}

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
