/**
 * Logger utility for consistent logging across the application
 * Respects NODE_ENV to enable/disable debug logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger with different log levels
 * Debug and info logs are only shown in development mode
 */
export const logger = {
  /**
   * Debug level logging (only in development)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info level logging (only in development)
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning level logging (always shown)
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error level logging (always shown)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Create a namespaced logger for specific components/features
   */
  create: (namespace: string) => ({
    debug: (...args: unknown[]) => {
      if (isDevelopment) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (isDevelopment) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      console.warn(`[${namespace}]`, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(`[${namespace}]`, ...args);
    },
  }),
};

export default logger;
