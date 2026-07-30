/**
 * Unit tests for `useSpeechRecognition`.
 *
 * Covers:
 * - Requirement 1.4：瀏覽器不支援語音辨識時 `isSupported` 為 false，`start()` 為 no-op
 * - Requirement 1.5：5 秒無語音偵測 / 辨識錯誤事件觸發錯誤訊息並恢復為可再次啟動狀態
 *
 * _Requirements: 1.4, 1.5_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpeechRecognition } from './useSpeechRecognition'

/** Minimal fake SpeechRecognition implementation controllable from tests. */
class FakeSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onend: (() => void) | null = null
  onspeechstart: (() => void) | null = null

  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
}

describe('useSpeechRecognition', () => {
  const originalSpeechRecognition = (window as any).SpeechRecognition
  const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition

  afterEach(() => {
    vi.useRealTimers()
    ;(window as any).SpeechRecognition = originalSpeechRecognition
    ;(window as any).webkitSpeechRecognition = originalWebkitSpeechRecognition
  })

  describe('瀏覽器不支援語音辨識分支 (Requirement 1.4)', () => {
    beforeEach(() => {
      delete (window as any).SpeechRecognition
      delete (window as any).webkitSpeechRecognition
    })

    it('isSupported 為 false', () => {
      const { isSupported } = useSpeechRecognition()
      expect(isSupported.value).toBe(false)
    })

    it('呼叫 start() 為 no-op：不會進入 listening 狀態、不會產生 transcript 或 error', () => {
      const { isSupported, isListening, start, transcript, error } = useSpeechRecognition()

      start()

      expect(isSupported.value).toBe(false)
      expect(isListening.value).toBe(false)
      expect(transcript.value).toBe('')
      expect(error.value).toBeNull()
    })
  })

  describe('5 秒無語音偵測 / 辨識錯誤分支 (Requirement 1.5)', () => {
    let lastInstance: FakeSpeechRecognition | null = null

    beforeEach(() => {
      vi.useFakeTimers()
      lastInstance = null
      ;(window as any).SpeechRecognition = class {
        constructor() {
          lastInstance = new FakeSpeechRecognition()
          return lastInstance
        }
      }
      delete (window as any).webkitSpeechRecognition
    })

    it('isSupported 為 true', () => {
      const { isSupported } = useSpeechRecognition()
      expect(isSupported.value).toBe(true)
    })

    it('啟動後 5 秒內未偵測到語音（未觸發 onspeechstart）：顯示錯誤訊息並停止聆聽', () => {
      const { isListening, start, error } = useSpeechRecognition()

      start()
      expect(isListening.value).toBe(true)
      expect(error.value).toBeNull()

      vi.advanceTimersByTime(5_000)

      expect(error.value).toBe('未偵測到語音輸入，請重試或改用文字輸入')
      expect(isListening.value).toBe(false)
      expect(lastInstance?.stop).toHaveBeenCalled()
    })

    it('偵測到語音開始後（onspeechstart）不會觸發無語音逾時錯誤', () => {
      const { isListening, start, error } = useSpeechRecognition()

      start()
      lastInstance?.onspeechstart?.()

      vi.advanceTimersByTime(5_000)

      expect(error.value).toBeNull()
      expect(isListening.value).toBe(true)
    })

    it('辨識過程發生 onerror：顯示錯誤訊息並停止聆聽，狀態恢復為可再次啟動', () => {
      const { isListening, start, error } = useSpeechRecognition()

      start()
      lastInstance?.onerror?.({})

      expect(error.value).toBe('語音辨識發生錯誤，請重試或改用文字輸入')
      expect(isListening.value).toBe(false)
      expect(lastInstance?.stop).toHaveBeenCalled()

      // 恢復可用：清除錯誤並可重新啟動
      error.value = null
      start()
      expect(isListening.value).toBe(true)
    })
  })
})
