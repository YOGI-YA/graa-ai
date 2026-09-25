type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'database_url',
  'groq_api_key',
  'jina_api_key',
])

function sanitize(data: unknown, depth = 0): unknown {
  if (depth > 3 || data === null || data === undefined) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item, depth + 1))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value, depth + 1)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

function formatLog(level: LogLevel, context: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString()
  const tag = `[GRAA-AI] [${timestamp}] [${level.toUpperCase()}] [${context}]`
  if (data !== undefined) {
    const cleanData = sanitize(data)
    return `${tag} ${message} -> ${JSON.stringify(cleanData)}`
  }
  return `${tag} ${message}`
}

export const logger = {
  info(context: string, message: string, data?: unknown) {
    console.log(formatLog('info', context, message, data))
  },

  warn(context: string, message: string, data?: unknown) {
    console.warn(formatLog('warn', context, message, data))
  },

  error(context: string, message: string, error?: unknown, metadata?: Record<string, unknown>) {
    const errObj = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
    const payload = metadata ? { error: errObj, ...metadata } : { error: errObj }
    console.error(formatLog('error', context, message, payload))
  },

  debug(context: string, message: string, data?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', context, message, data))
    }
  },
}
