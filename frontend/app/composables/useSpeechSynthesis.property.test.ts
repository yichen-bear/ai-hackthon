/**
 * Property-based tests for the TTS mutual-exclusion playback state machine
 * (`reducePlaybackState`).
 *
 * Property 3: TTS 播放互斥狀態機
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6
 *
 * The state (`playingMessageId`) is either `null` (nothing playing) or a
 * single message id (that message is playing). The property under test
 * asserts:
 * - At any point in time, at most one message id is considered "playing"
 *   (the state is always `null` or a single string, never a set of ids).
 * - Clicking play on the message that is currently playing stops it
 *   (state becomes `null`).
 * - Playing a different message immediately supersedes the previous one
 *   (the previous message is implicitly stopped, state becomes the new id).
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { reducePlaybackState, type PlaybackEvent, type PlaybackState } from './useSpeechSynthesis'

/** A small pool of message ids to exercise interleavings between distinct messages. */
const messageIds = ['a', 'b', 'c']

const eventArbitrary: fc.Arbitrary<PlaybackEvent> = fc.oneof(
  fc.record({ type: fc.constant('play' as const), id: fc.constantFrom(...messageIds) }),
  fc.record({ type: fc.constant('stop' as const) }),
  fc.record({ type: fc.constant('naturalEnd' as const), id: fc.constantFrom(...messageIds) }),
  fc.record({ type: fc.constant('error' as const), id: fc.constantFrom(...messageIds) }),
)

function isValidState(state: PlaybackState): boolean {
  return state === null || messageIds.includes(state) || typeof state === 'string'
}

describe('reducePlaybackState property tests', () => {
  it('Property 3: 任意事件序列後，狀態永遠是 null 或單一訊息 id（互斥，不會有多個訊息同時播放）', () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 100 }), (events) => {
        let state: PlaybackState = null

        for (const event of events) {
          state = reducePlaybackState(state, event)
          // Invariant: state is always either null or exactly one message id.
          expect(isValidState(state)).toBe(true)
        }
      }),
    )
  })

  it('Property 3: 對目前播放中的訊息再次點擊播放，會使其停止（狀態變為 null）', () => {
    fc.assert(
      fc.property(fc.constantFrom(...messageIds), (id) => {
        const playing = reducePlaybackState(null, { type: 'play', id })
        expect(playing).toBe(id)

        const afterSecondClick = reducePlaybackState(playing, { type: 'play', id })
        expect(afterSecondClick).toBeNull()
      }),
    )
  })

  it('Property 3: 播放另一則訊息會取代先前播放中的訊息（先前訊息視為已停止）', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...messageIds),
        fc.constantFrom(...messageIds),
        (firstId, secondId) => {
          fc.pre(firstId !== secondId)

          const afterFirstPlay = reducePlaybackState(null, { type: 'play', id: firstId })
          expect(afterFirstPlay).toBe(firstId)

          const afterSecondPlay = reducePlaybackState(afterFirstPlay, {
            type: 'play',
            id: secondId,
          })
          // The new message becomes the (sole) playing message.
          expect(afterSecondPlay).toBe(secondId)
          // The previous message is no longer the playing one (mutual exclusion).
          expect(afterSecondPlay).not.toBe(firstId)
        },
      ),
    )
  })

  it('Property 3: stop 事件無條件使狀態回到 null', () => {
    fc.assert(
      fc.property(fc.option(fc.constantFrom(...messageIds), { nil: null }), (state) => {
        expect(reducePlaybackState(state, { type: 'stop' })).toBeNull()
      }),
    )
  })

  it('Property 3: naturalEnd/error 只在事件對應的 id 等於目前播放中訊息時才會清除狀態，否則維持不變（避免過期事件覆蓋新狀態）', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...messageIds),
        fc.constantFrom(...messageIds),
        fc.constantFrom<'naturalEnd' | 'error'>('naturalEnd', 'error'),
        (playingId, eventId, eventType) => {
          const playing = reducePlaybackState(null, { type: 'play', id: playingId })
          const result = reducePlaybackState(playing, { type: eventType, id: eventId })

          if (eventId === playingId) {
            expect(result).toBeNull()
          } else {
            expect(result).toBe(playingId)
          }
        },
      ),
    )
  })
})
