/**
 * Unit tests for the `useSpeechSynthesis` composable.
 *
 * Covers the branch where the browser does not support speech synthesis
 * (`window.speechSynthesis` is unavailable), in which case `isSupported`
 * must be `false` so the UI can hide the playback button, and `speak()`
 * must be a no-op that never touches `window.speechSynthesis` or mutates
 * `playingMessageId`.
 *
 * Validates: Requirements 2.5
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpeechSynthesis } from './useSpeechSynthesis'

describe('useSpeechSynthesis - unsupported browser branch', () => {
  const originalSpeechSynthesis = (window as any).speechSynthesis

  afterEach(() => {
    // Restore original state between tests so other suites are unaffected.
    if (originalSpeechSynthesis === undefined) {
      delete (window as any).speechSynthesis
    } else {
      (window as any).speechSynthesis = originalSpeechSynthesis
    }
    vi.restoreAllMocks()
  })

  it('isSupported 為 false，當 window.speechSynthesis 不存在（供 UI 隱藏播放按鈕）', () => {
    delete (window as any).speechSynthesis

    const { isSupported } = useSpeechSynthesis()

    expect(isSupported).toBe(false)
  })

  it('speak() 在不支援時為 no-op，不會拋出例外且 playingMessageId 維持 null', () => {
    delete (window as any).speechSynthesis

    const { isSupported, playingMessageId, speak } = useSpeechSynthesis()
    expect(isSupported).toBe(false)

    expect(() => speak('msg-1', '測試文字')).not.toThrow()
    expect(playingMessageId.value).toBeNull()
  })

  it('stop() 在不支援時為 no-op，不會拋出例外', () => {
    delete (window as any).speechSynthesis

    const { stop, playingMessageId } = useSpeechSynthesis()

    expect(() => stop()).not.toThrow()
    expect(playingMessageId.value).toBeNull()
  })

  it('isSupported 為 true，當 window.speechSynthesis 存在', () => {
    ;(window as any).speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
    }

    const { isSupported } = useSpeechSynthesis()

    expect(isSupported).toBe(true)
  })
})
