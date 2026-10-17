export interface LogContext {
  operation: string;
  userId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'api_key',
  'apikey',
  'secret',
  'jwt',
  'key',
  'session',
  'cookie',
  'access_token',
  'accesstoken'
]);

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const sanitized = (context ? sanitize(context) : {}) as Record<string, unknown>;
    console.log(JSON.stringify({ level: 'info', timestamp, message, ...sanitized }));
  },

  warn(message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const sanitized = (context ? sanitize(context) : {}) as Record<string, unknown>;
    console.warn(JSON.stringify({ level: 'warn', timestamp, message, ...sanitized }));
  },

  error(message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const sanitized = (context ? sanitize(context) : {}) as Record<string, unknown>;
    console.error(JSON.stringify({ level: 'error', timestamp, message, ...sanitized }));
  }
};
