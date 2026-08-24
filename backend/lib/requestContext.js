import { AsyncLocalStorage } from 'async_hooks'

export const requestContext = new AsyncLocalStorage()

export function createRequestMetrics() {
  return {
    queryCount: 0,
    queryTimeMs: 0,
    slowestQueryMs: 0,
    firstQueryAt: null,
    lastQueryEndAt: null,
  }
}

export function recordQuery(startMs, durationMs) {
  const store = requestContext.getStore()
  if (!store) return

  store.queryCount += 1
  store.queryTimeMs += durationMs
  if (durationMs > store.slowestQueryMs) {
    store.slowestQueryMs = durationMs
  }

  const endMs = startMs + durationMs
  if (store.firstQueryAt == null || startMs < store.firstQueryAt) {
    store.firstQueryAt = startMs
  }
  if (store.lastQueryEndAt == null || endMs > store.lastQueryEndAt) {
    store.lastQueryEndAt = endMs
  }
}
