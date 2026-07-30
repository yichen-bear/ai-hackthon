'use strict';

/**
 * Rate_Limiter：限制單一識別碼（已登入使用者或 IP）在單位時間窗口內的 LLM 呼叫次數。
 * 對應 requirements.md Requirement 8、design.md Rate_Limiter 章節。
 */

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX_CALLS = 20;

/**
 * 純函式：檢查並消耗指定識別碼的呼叫額度。
 *
 * @param {Map<string, { count: number, windowStart: number }>} state 呼叫計數狀態（以識別碼為 key）
 * @param {string} identifier 識別碼（已登入使用者 sub 或 IP）
 * @param {number} now 目前時間（epoch 毫秒）
 * @param {number} windowSeconds 時間窗口長度（秒）
 * @param {number} maxCalls 每個時間窗口允許的最大呼叫次數
 * @returns {{ allowed: boolean, state: Map<string, { count: number, windowStart: number }>, retryAfterSeconds: number | null }}
 */
function checkAndConsume(state, identifier, now, windowSeconds, maxCalls) {
  const nextState = state instanceof Map ? new Map(state) : new Map();
  const windowMs = windowSeconds * 1000;

  const existing = nextState.get(identifier);
  const windowExpired = !existing || now >= existing.windowStart + windowMs;

  if (windowExpired) {
    // 目前時間窗口已到達結束時間（或該識別碼尚無紀錄）：重置計數器並以現在為起點開始新窗口
    nextState.set(identifier, { count: 1, windowStart: now });
    return { allowed: true, state: nextState, retryAfterSeconds: null };
  }

  if (existing.count >= maxCalls) {
    // 已達或超過上限：拒絕請求且不遞增計數器
    const windowEnd = existing.windowStart + windowMs;
    const retryAfterSeconds = Math.max(1, Math.min(windowSeconds, Math.ceil((windowEnd - now) / 1000)));
    return { allowed: false, state: nextState, retryAfterSeconds };
  }

  // 仍在額度內：遞增計數器並允許請求
  nextState.set(identifier, { count: existing.count + 1, windowStart: existing.windowStart });
  return { allowed: true, state: nextState, retryAfterSeconds: null };
}

/**
 * 建立 Express middleware，包裝 checkAndConsume 純函式並管理 in-memory 狀態。
 * 讀取環境變數 AI_CHAT_RATE_WINDOW_SECONDS（預設 60）、AI_CHAT_RATE_MAX_CALLS（預設 20）。
 * 識別碼取 req.user?.sub，若未登入則取 req.ip。
 * 拒絕時回應 HTTP 429，內含 retryAfterSeconds。
 *
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
function createAiChatRateLimiter() {
  /** @type {Map<string, { count: number, windowStart: number }>} */
  let state = new Map();

  return function aiChatRateLimiterMiddleware(req, res, next) {
    const windowSeconds = Number(process.env.AI_CHAT_RATE_WINDOW_SECONDS) || DEFAULT_WINDOW_SECONDS;
    const maxCalls = Number(process.env.AI_CHAT_RATE_MAX_CALLS) || DEFAULT_MAX_CALLS;
    const identifier = (req.user && req.user.sub) || req.ip;
    const now = Date.now();

    const result = checkAndConsume(state, identifier, now, windowSeconds, maxCalls);
    state = result.state;

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: '已達呼叫頻率限制，請稍後再試',
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    next();
  };
}

module.exports = {
  checkAndConsume,
  createAiChatRateLimiter,
};
