'use strict';

// Feature: ai-chat-form-assistant, Property 21: 呼叫頻率限制計數與時間窗口

const fc = require('fast-check');
const { checkAndConsume } = require('../../middleware/aiChatRateLimiter');

describe('Feature: ai-chat-form-assistant, Property 21: 呼叫頻率限制計數與時間窗口', () => {
  it('同一時間窗口內：第 N 次呼叫 (N<=上限) 允許並遞增計數；(N>上限) 拒絕且不遞增，retryAfterSeconds 為正數且不超過窗口長度', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }), // identifier
        fc.integer({ min: 1, max: 3600 }), // windowSeconds
        fc.integer({ min: 1, max: 50 }), // maxCalls
        fc.integer({ min: 0, max: 1_700_000_000_000 }), // windowStart (now for first call)
        fc.integer({ min: 1, max: 80 }), // number of calls to make within the same window
        (identifier, windowSeconds, maxCalls, windowStart, callCount) => {
          let state = new Map();
          const windowMs = windowSeconds * 1000;
          // Keep every call's `now` strictly within [windowStart, windowStart + windowMs)
          // so all calls land in the same window as the first one.
          for (let n = 1; n <= callCount; n++) {
            // spread calls across the window without ever reaching/exceeding the end
            const offset = windowMs > 1 ? Math.floor(((n - 1) / callCount) * (windowMs - 1)) : 0;
            const now = windowStart + offset;

            const result = checkAndConsume(state, identifier, now, windowSeconds, maxCalls);
            state = result.state;

            if (n <= maxCalls) {
              expect(result.allowed).toBe(true);
              expect(result.state.get(identifier).count).toBe(n);
              expect(result.retryAfterSeconds).toBeNull();
            } else {
              expect(result.allowed).toBe(false);
              // counter must NOT increment beyond maxCalls
              expect(result.state.get(identifier).count).toBe(maxCalls);
              expect(result.retryAfterSeconds).not.toBeNull();
              expect(result.retryAfterSeconds).toBeGreaterThan(0);
              expect(result.retryAfterSeconds).toBeLessThanOrEqual(windowSeconds);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('當請求時間已到達/超過目前窗口結束時間，計數器重置為新窗口且從 1 起算（不累加前一窗口計數）', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }), // identifier
        fc.integer({ min: 1, max: 3600 }), // windowSeconds
        fc.integer({ min: 1, max: 50 }), // maxCalls
        fc.integer({ min: 0, max: 1_700_000_000_000 }), // windowStart
        fc.integer({ min: 1, max: 50 }), // number of calls in the first window (may exceed maxCalls)
        fc.integer({ min: 0, max: 100_000 }), // extra ms added on top of window end for the reset call
        (identifier, windowSeconds, maxCalls, windowStart, firstWindowCalls, extraMs) => {
          const windowMs = windowSeconds * 1000;
          let state = new Map();

          // Consume some calls within the first window (may exceed maxCalls).
          for (let n = 1; n <= firstWindowCalls; n++) {
            const offset = windowMs > 1 ? Math.floor(((n - 1) / firstWindowCalls) * (windowMs - 1)) : 0;
            const now = windowStart + offset;
            const result = checkAndConsume(state, identifier, now, windowSeconds, maxCalls);
            state = result.state;
          }

          // Now issue a call at/after the window's end -> must reset to a new window with count = 1.
          const nowAtOrAfterEnd = windowStart + windowMs + extraMs;
          const resetResult = checkAndConsume(state, identifier, nowAtOrAfterEnd, windowSeconds, maxCalls);

          expect(resetResult.allowed).toBe(true);
          expect(resetResult.state.get(identifier)).toEqual({ count: 1, windowStart: nowAtOrAfterEnd });
          expect(resetResult.retryAfterSeconds).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('不同識別碼的計數器彼此獨立，互不影響', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 3600 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 1_700_000_000_000 }),
        fc.integer({ min: 1, max: 60 }), // calls for identifier A
        fc.integer({ min: 1, max: 60 }), // calls for identifier B
        (idA, idB, windowSeconds, maxCalls, windowStart, callsA, callsB) => {
          fc.pre(idA !== idB);

          const windowMs = windowSeconds * 1000;
          let state = new Map();

          let lastResultA;
          for (let n = 1; n <= callsA; n++) {
            const offset = windowMs > 1 ? Math.floor(((n - 1) / callsA) * (windowMs - 1)) : 0;
            const now = windowStart + offset;
            lastResultA = checkAndConsume(state, idA, now, windowSeconds, maxCalls);
            state = lastResultA.state;
          }

          let lastResultB;
          for (let n = 1; n <= callsB; n++) {
            const offset = windowMs > 1 ? Math.floor(((n - 1) / callsB) * (windowMs - 1)) : 0;
            const now = windowStart + offset;
            lastResultB = checkAndConsume(state, idB, now, windowSeconds, maxCalls);
            state = lastResultB.state;
          }

          const expectedCountA = Math.min(callsA, maxCalls);
          const expectedCountB = Math.min(callsB, maxCalls);

          expect(state.get(idA).count).toBe(expectedCountA);
          expect(state.get(idB).count).toBe(expectedCountB);
        }
      ),
      { numRuns: 100 }
    );
  });
});
