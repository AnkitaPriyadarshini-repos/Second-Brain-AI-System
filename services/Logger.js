/**
 * Production-Grade Structured JSON Observability Logger
 *
 * Emits strictly formatted single-line JSON logs with:
 * - timestamp (ISO 8601)
 * - level (INFO, WARN, ERROR, DEBUG)
 * - request_id (distributed trace correlation)
 * - user_id (tenant context)
 * - endpoint & method
 * - status_code
 * - duration_ms (high-resolution latency)
 * - token usage & model metrics
 */

const crypto = require('crypto');

function formatLog(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message: typeof message === 'string' ? message : JSON.stringify(message),
    ...meta
  };
  return JSON.stringify(logEntry);
}

const Logger = {
  info(message, meta = {}) {
    console.log(formatLog('INFO', message, meta));
  },

  warn(message, meta = {}) {
    console.warn(formatLog('WARN', message, meta));
  },

  error(message, meta = {}) {
    console.error(formatLog('ERROR', message, meta));
  },

  debug(message, meta = {}) {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(formatLog('DEBUG', message, meta));
    }
  },

  logRequest({ requestId, userId, method, endpoint, statusCode, durationMs, tokens, model, ip, error }) {
    const entry = {
      request_id: requestId || `req_${crypto.randomBytes(6).toString('hex')}`,
      user_id: userId || 'anonymous',
      method: method || 'GET',
      endpoint: endpoint || '/',
      status_code: statusCode || 200,
      duration_ms: Math.round(durationMs * 100) / 100,
      ...(tokens ? { tokens } : {}),
      ...(model ? { model } : {}),
      ...(ip ? { ip } : {}),
      ...(error ? { error } : {})
    };
    
    if (statusCode >= 500) {
      this.error('HTTP Request Failed', entry);
    } else if (statusCode >= 400) {
      this.warn('HTTP Client Warning', entry);
    } else {
      this.info('HTTP Request Completed', entry);
    }
  },

  middleware() {
    return (req, res, next) => {
      const start = process.hrtime.bigint();
      const requestId = req.headers['x-request-id'] || `req_${crypto.randomBytes(8).toString('hex')}`;
      req.requestId = requestId;

      if (typeof res.setHeader === 'function') {
        res.setHeader('X-Request-Id', requestId);
      }

      res.on('finish', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;

        let userId = req.userId || req.user?.id;
        if (!userId && req.headers['authorization']) {
          const auth = req.headers['authorization'];
          if (auth.startsWith('Bearer ')) {
            userId = auth.slice(7, 30); // snippet
          }
        }
        if (!userId && req.headers['x-milo-user-id']) {
          userId = req.headers['x-milo-user-id'];
        }

        const endpoint = req.originalUrl || req.url;
        const statusCode = res.statusCode;

        Logger.logRequest({
          requestId,
          userId: userId || 'anonymous',
          method: req.method,
          endpoint,
          statusCode,
          durationMs,
          tokens: res.tokenCount || req.tokenCount || null,
          model: res.aiModel || req.aiModel || null
        });
      });

      if (typeof next === 'function') {
        next();
      }
    };
  }
};

module.exports = Logger;
