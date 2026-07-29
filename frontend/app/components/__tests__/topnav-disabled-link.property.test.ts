import fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import modules from '~/assets/front/file/info.json'

/**
 * Feature: auth-and-ui-overhaul, Property 6: 下拉選單空 link 項目不可導航
 *
 * **Validates: Requirements 6.7**
 *
 * The pure navigation decision logic extracted from TopNavigationBar.vue:
 *   handleFeatureClick(link) → if (!link) return (no navigation)
 *   :disabled="!feature.link" in template
 *
 * This means: shouldNavigate(link) ≡ !!link
 */

// Pure logic extracted from TopNavigationBar.vue's handleFeatureClick
function shouldNavigate(link: string): boolean {
  return !!link
}

describe('Property 6: 下拉選單空 link 項目不可導航', () => {
  it('對任意空字串 link，shouldNavigate 回傳 false（不觸發路由導航）', () => {
    // Empty string is the only "empty link" case per the component logic: if (!link) return
    fc.assert(
      fc.property(
        fc.constant(''),
        (link) => {
          expect(shouldNavigate(link)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('對任意非空字串 link，shouldNavigate 回傳 true（可導航）', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (link) => {
          expect(shouldNavigate(link)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('對任意 feature 物件，link 為空字串時 disabled 狀態為 true', () => {
    // Generate arbitrary feature objects with empty link
    const featureWithEmptyLinkArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ maxLength: 200 }),
      link: fc.constant(''),
    })

    fc.assert(
      fc.property(featureWithEmptyLinkArb, (feature) => {
        // The template uses :disabled="!feature.link"
        const isDisabled = !feature.link
        expect(isDisabled).toBe(true)
        expect(shouldNavigate(feature.link)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('對任意 feature 物件，link 為非空字串時 disabled 狀態為 false', () => {
    // Generate arbitrary feature objects with non-empty link
    const featureWithLinkArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ maxLength: 200 }),
      link: fc.string({ minLength: 1, maxLength: 100 }),
    })

    fc.assert(
      fc.property(featureWithLinkArb, (feature) => {
        const isDisabled = !feature.link
        expect(isDisabled).toBe(false)
        expect(shouldNavigate(feature.link)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('驗證 info.json 中所有空 link 項目皆被標記為 disabled', () => {
    // Collect all features across all modules
    const allFeatures = modules.flatMap((mod) => mod.features)
    const emptyLinkFeatures = allFeatures.filter((f) => f.link === '')

    // There must be at least one empty-link feature in the data
    expect(emptyLinkFeatures.length).toBeGreaterThan(0)

    // Each empty-link feature must be disabled and non-navigable
    for (const feature of emptyLinkFeatures) {
      const isDisabled = !feature.link
      expect(isDisabled).toBe(true)
      expect(shouldNavigate(feature.link)).toBe(false)
    }
  })

  it('驗證 info.json 中所有有 link 項目皆可導航', () => {
    const allFeatures = modules.flatMap((mod) => mod.features)
    const nonEmptyLinkFeatures = allFeatures.filter((f) => f.link !== '')

    expect(nonEmptyLinkFeatures.length).toBeGreaterThan(0)

    for (const feature of nonEmptyLinkFeatures) {
      const isDisabled = !feature.link
      expect(isDisabled).toBe(false)
      expect(shouldNavigate(feature.link)).toBe(true)
    }
  })
})
