/**
 * Logger utility for application logging
 * Provides structured logging with different severity levels
 */

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(context: LogContext | string, message?: string) {
    const msg = typeof context === 'string' ? context : message;
    if (this.isDevelopment || process.env.LOG_LEVEL === 'info') {
      console.log('[INFO]', msg, typeof context !== 'string' ? context : {});
    }
  }

  warn(context: LogContext | string, message?: string) {
    const msg = typeof context === 'string' ? context : message;
    if (this.isDevelopment || process.env.LOG_LEVEL === 'warn') {
      console.warn('[WARN]', msg, typeof context !== 'string' ? context : {});
    }
  }

  error(context: LogContext | string, message?: string) {
    const msg = typeof context === 'string' ? context : message;
    console.error('[ERROR]', msg, typeof context !== 'string' ? context : {});
  }

  debug(context: LogContext | string, message?: string) {
    const msg = typeof context === 'string' ? context : message;
    if (this.isDevelopment || process.env.LOG_LEVEL === 'debug') {
      console.debug('[DEBUG]', msg, typeof context !== 'string' ? context : {});
    }
  }
}

export const logger = new Logger();
