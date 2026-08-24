import { createRequestMetrics, requestContext } from '../lib/requestContext.js'

const SLOW_API_MS = 1000

export function apiTimingMiddleware(req, res, next) {
  if (process.env.API_TIMING === 'false') {
    return next()
  }

  const start = Date.now()
  const metrics = createRequestMetrics()

  requestContext.run(metrics, () => {
    res.on('finish', () => {
      const totalMs = Date.now() - start
      const dbSpanMs =
        metrics.firstQueryAt != null && metrics.lastQueryEndAt != null
          ? metrics.lastQueryEndAt - metrics.firstQueryAt
          : 0
      const handlerMs = Math.max(0, totalMs - dbSpanMs)
      const slow = totalMs >= SLOW_API_MS ? ' SLOW' : ''
      const timestamp = new Date().toISOString()

      console.log(
        `[API${slow} ${totalMs}ms] ${timestamp} ${req.method} ${req.originalUrl} ${res.statusCode} | db: ${metrics.queryCount} queries, ${dbSpanMs}ms span, ${metrics.queryTimeMs}ms cumulative (slowest ${metrics.slowestQueryMs}ms), handler: ${handlerMs}ms`
      )
    })

    next()
  })
}
