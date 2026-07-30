/**
 * Property-based tests for the STT listening state machine (`reduceListeningState`).
 *
 * Property 1: STT 監聽狀態機終將恢復可用
 * Validates: Requirements 1.3
 *
 * The state machine only ever has two states (`idle` / `listening`). The
 * property under test asserts that no matter what sequence of events is fed
 * into the machine, the resulting state is always one of the two valid
 * states, and whenever the machine is in `listening`, there always exists a
 * terminating event (FINAL_RESULT / TIMEOUT / NO_SPEECH / ERROR / STOP) that
 * brings it back to `idle` (i.e. the machine can never get stuck in
 * `listening` forever - it will always eventually recover to being
 * available again).
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { reduceListeningState, type ListeningEvent, type ListeningState } from './useSpeechRecognition'

/** Events that, when received while `listening`, always terminate the session. */
const terminatingEvents: ListeningEvent[] = [
  { type: 'FINAL_RESULT' },
  { type: 'TIMEOUT' },
  { type: 'NO_SPEECH' },
  { type: 'ERROR' },
  { type: 'STOP' },
]

const allEvents: ListeningEvent[] = [{ type: 'START' }, ...terminatingEvents]

const eventArbitrary = fc.constantFrom(...allEvents)

function isValidState(state: ListeningState): boolean {
  return state === 'idle' || state === 'listening'
}

describe('reduceListeningState property tests', () => {
  it('Property 1: 狀態機在任意事件序列後永遠停留在合法狀態，且處於 listening 時必存在事件可使其恢復為 idle', () => {
    fc.assert(
      fc.property(fc.array(eventArbitrary, { maxLength: 100 }), (events) => {
        let state: ListeningState = 'idle'

        for (const event of events) {
          state = reduceListeningState(state, event)
          // Invariant: the machine must always remain in a known, valid state.
          expect(isValidState(state)).toBe(true)
        }

        // Recovery guarantee: whenever the machine ends up in `listening`,
        // there must be at least one (in fact every) terminating event that
        // brings it back to `idle`, i.e. it is never permanently stuck.
        if (state === 'listening') {
          for (const terminating of terminatingEvents) {
            expect(reduceListeningState(state, terminating)).toBe('idle')
          }
        }
      }),
    )
  })

  it('Property 1 (完整恢復序列): 任意事件序列後接上一個終止事件，最終必回到 idle', () => {
    fc.assert(
      fc.property(
        fc.array(eventArbitrary, { maxLength: 100 }),
        fc.constantFrom(...terminatingEvents),
        (events, finalTerminatingEvent) => {
          let state: ListeningState = 'idle'
          for (const event of events) {
            state = reduceListeningState(state, event)
          }

          // Force a START first to guarantee we exercise the recovery path
          // even if the random sequence happened to end in `idle`.
          state = reduceListeningState(state, { type: 'START' })
          state = reduceListeningState(state, finalTerminatingEvent)

          expect(state).toBe('idle')
        },
      ),
    )
  })
})
